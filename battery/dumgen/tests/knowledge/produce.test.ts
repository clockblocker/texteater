import { expect, test } from "bun:test";
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { createDumgen } from "../../src/create-dumgen.js";
import type { GermanKnowledgeChange } from "../../src/knowledge/types.js";
import {
	adp,
	attestedPreposition,
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	produceOnce,
} from "./support.js";

const noun = {
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Strauß",
	coreFeatures: { gender: "Masc" },
};
const verb = (canonicalForm: string, hasSepPrefix: string | null = null) => ({
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix, lexicallyReflexive: null },
});
const adjective = (canonicalForm: string) => ({
	family: "Lexeme",
	kind: "ADJ",
	canonicalForm,
	coreFeatures: { comparable: null },
});

/** The frame a run contributed, if any. */
const frameOf = (changes: readonly GermanKnowledgeChange[]) =>
	(
		changes.find(({ aspect }) => aspect === "valency") as
			| {
					readonly value: {
						readonly complements: unknown[];
						readonly [key: string]: unknown;
					}[];
			  }
			| undefined
	)?.value;

const caseSlot = (governedCase: string, status = "Required") => ({
	status,
	complements: [{ kind: "Case", governedCase, referent: "Someone" }],
});
const prepositionSlot = (
	preposition: string,
	governedCase: string,
	status = "Optional",
	referent = "Either",
) => ({
	status,
	complements: [
		{
			kind: "Preposition",
			preposition,
			governedCase,
			referent,
		},
	],
});

test("Luna writes the text, the forms and the frame; jev judges every choice (#862, #883 point 9)", async () => {
	const jev = knowledgeJev({ plurality: "HasPlural" });
	const luna = knowledgeLuna({
		transcription: "/ʃtʁaʊ̯s/",
		definition: "Gebundene Blumen.",
		translations: ({ language }: { language?: string }) =>
			language === "en" ? ["bouquet"] : ["букет"],
		plural: ["Sträuße"],
		valency: { valency: [] },
	});
	const { result, trace } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
			request: {
				transcription: null,
				definition: null,
				translations: { en: null, ru: null },
				plural: null,
				valency: null,
			},
		}),
	);
	expect(result.failures).toEqual([]);
	expect(result.changes).toContainEqual({
		kind: "Contribute",
		aspect: "transcription",
		value: "ʃtʁaʊ̯s",
	});
	expect(result.changes).toContainEqual({
		kind: "Contribute",
		aspect: "translations",
		language: "ru",
		value: ["букет"],
	});
	expect(result.changes).toContainEqual({
		kind: "Contribute",
		aspect: "plural",
		value: ["Sträuße"],
	});
	// An empty frame stores nothing (ADR 0034).
	expect(result.changes.some(({ aspect }) => aspect === "valency")).toBe(
		false,
	);
	const executors = Object.fromEntries(
		(trace?.calls ?? []).map(({ stage, executor }) => [stage, executor]),
	);
	expect(executors).toEqual({
		transcription: "luna",
		definition: "luna",
		translations: "luna",
		plural: "luna",
		plurality: "jev",
		valency: "luna",
	});
	expect(trace?.operation).toBe("knowledge.produce");
	// The transcription belongs to the headword; the others see the Sentence.
	const inputs = luna.sent.map(
		(request) => request.input as Record<string, unknown>,
	);
	expect(
		inputs.find(({ aspect }) => aspect === "transcription"),
	).not.toHaveProperty("markedSentence");
	expect(
		inputs.find(({ aspect }) => aspect === "definition")?.markedSentence,
	).toBe("Sie bekam einen <TARGET>Strauß</TARGET>.");
	// Every prompt names the Emoji Description as the sense boundary (#623).
	for (const input of inputs)
		expect(input.reading).toMatchObject({ emojiDescription: "💐" });
});

test("each aspect is isolated: a failed one is a value, and its siblings land (#883 point 3)", async () => {
	const jev = knowledgeJev({ plurality: "HasPlural" });
	const luna = knowledgeLuna({
		transcription: "ʃtʁaʊ̯s",
		definition: new Error("Luna is down"),
		translations: ({ language }: { language?: string }) =>
			language === "en" ? ["bouquet"] : { not: "a list" },
		plural: ["Sträuße", "zwei Wörter"],
	});
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
			request: {
				transcription: null,
				definition: null,
				translations: { en: null, ru: null },
				plural: null,
			},
		}),
	);
	expect(
		result.failures.map(({ aspect, leaf, code }) => ({
			aspect,
			leaf,
			code,
		})),
	).toEqual(
		expect.arrayContaining([
			{ aspect: "definition", leaf: undefined, code: "ProviderFailure" },
			{ aspect: "translations", leaf: "ru", code: "InvalidModelOutput" },
			{ aspect: "plural", leaf: undefined, code: "InvalidModelOutput" },
		]),
	);
	expect(result.failures).toHaveLength(3);
	expect(result.changes.map(({ aspect }) => aspect).sort()).toEqual([
		"transcription",
		"translations",
	]);
});

test("a jev failure is the aspect's ProviderFailure, never the run's error (#883 point 6)", async () => {
	const jev = knowledgeJev({}, { fail: () => true });
	const luna = knowledgeLuna({ plural: ["Sträuße"] });
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
			request: { plural: null },
		}),
	);
	expect(result).toEqual({
		changes: [],
		pendingRelations: [],
		failures: [
			{
				aspect: "plural",
				code: "ProviderFailure",
				message: "jev is down",
			},
		],
	});
});

test("onContribution receives each aspect's changes as it finishes, one at a time (#883 point 4)", async () => {
	const jev = knowledgeJev({ plurality: "PluralOnly" });
	const luna = knowledgeLuna(
		{
			transcription: "ʃtʁaʊ̯s",
			definition: "Gebundene Blumen.",
			plural: [],
		},
		{ delayMs: (aspect) => (aspect === "definition" ? 30 : 1) },
	);
	const received: string[][] = [];
	let inside = 0;
	let overlapped = false;
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
			request: { definition: null, transcription: null, plural: null },
			onContribution: (changes) =>
				Effect.gen(function* () {
					inside++;
					if (inside > 1) overlapped = true;
					yield* Effect.sleep("5 millis");
					received.push(changes.map(({ aspect }) => aspect));
					inside--;
				}),
		}),
	);
	expect(overlapped).toBe(false);
	expect(received).toHaveLength(3);
	expect(received.at(-1)).toEqual(["definition"]);
	expect(received.flat().sort()).toEqual(
		["definition", "plural", "transcription"].sort(),
	);
	expect(result.changes).toHaveLength(3);
});

class PublicationFailed extends Data.TaggedError("PublicationFailed")<{
	readonly reason: string;
}> {}

test("onContribution's error is the run's only error, and it interrupts the aspects still running (#883 point 6)", async () => {
	const jev = knowledgeJev();
	const luna = knowledgeLuna(
		{ transcription: "ʃtʁaʊ̯s", definition: "Gebundene Blumen." },
		{ delayMs: (aspect) => (aspect === "definition" ? 200 : 1) },
	);
	const exit = await Effect.runPromiseExit(
		createDumgen({ jev: jev.ask, luna: luna.ask }).knowledge.produce(
			knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
				request: { transcription: null, definition: null },
				onContribution: () =>
					Effect.fail(
						new PublicationFailed({ reason: "store full" }),
					),
			}),
		),
	);
	expect(Exit.isFailure(exit)).toBe(true);
	if (Exit.isFailure(exit)) {
		const [failure] = exit.cause.reasons.filter(Cause.isFailReason);
		expect(failure?.error).toBeInstanceOf(PublicationFailed);
	}
	expect(luna.aborted).toEqual(["definition"]);
});

test("the creating occurrence contributes the governed preposition the proposal omitted (#677, #616)", async () => {
	const jev = knowledgeJev();
	const luna = knowledgeLuna({
		valency: { valency: [caseSlot("Nom"), prepositionSlot("für", "Acc")] },
	});
	const input = knowledgeInput(
		verb("bedanken"),
		"🙏",
		"Sie bedankte sich bei ihm.",
		["bedankte", "bei"],
		{
			request: { valency: null },
			valencyEvidence: [attestedPreposition("bei", "Dat")],
		},
	);
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		input,
	);
	expect(result.failures).toEqual([]);
	const change = { value: frameOf(result.changes) };
	expect(change?.value).toEqual([
		{
			status: "Required",
			complements: [
				{ kind: "Case", governedCase: "Nom", referent: "Someone" },
			],
		},
		{
			status: "Optional",
			complements: [
				{
					kind: "Preposition",
					preposition: adp("für"),
					governedCase: "Acc",
					referent: "Either",
				},
			],
		},
		{
			status: "Optional",
			complements: [
				{
					kind: "Preposition",
					preposition: adp("bei"),
					governedCase: "Dat",
					referent: "Either",
				},
			],
		},
	]);

	// A reused Reading's occurrence never appends its government.
	const topUp = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		{ ...input, origin: "TopUp" },
	);
	expect(frameOf(topUp.result.changes)).toHaveLength(2);
});

test("on TopUp a later sentence's government yields no valency change and no model call (#677)", async () => {
	const jev = knowledgeJev();
	const luna = knowledgeLuna({});
	const { result, trace } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(
			verb("bedanken"),
			"🙏",
			"Sie bedankte sich bei ihm.",
			["bedankte", "bei"],
			{
				origin: "TopUp",
				request: {},
				valencyEvidence: [attestedPreposition("bei", "Dat")],
			},
		),
	);
	expect(result).toEqual({ changes: [], pendingRelations: [], failures: [] });
	expect(trace?.calls).toEqual([]);
});

test("an attested preposition no governor selects stays an attributable failure (#677)", async () => {
	const luna = knowledgeLuna({ valency: { valency: [caseSlot("Nom")] } });
	const { result } = await produceOnce(
		{ jev: knowledgeJev().ask, luna: luna.ask },
		knowledgeInput(
			verb("zittern"),
			"🥶",
			"Sie zitterte wegen der Kälte.",
			["zitterte", "wegen"],
			{
				request: { valency: null },
				valencyEvidence: [attestedPreposition("wegen", "Gen")],
			},
		),
	);
	expect(result.failures).toEqual([
		expect.objectContaining({
			aspect: "valency",
			leaf: "wegen",
			code: "Unresolved",
		}),
	]);
	expect(result.changes).toHaveLength(1);
});

test("a Slot holds alternatives, and the covered set counts every one of them (#675)", async () => {
	const alternatives = {
		status: "Optional",
		complements: [
			{
				kind: "Preposition",
				preposition: "über",
				governedCase: "Acc",
				referent: "Either",
			},
			{
				kind: "Preposition",
				preposition: "von",
				governedCase: "Dat",
				referent: "Either",
			},
		],
	};
	const luna = knowledgeLuna({
		valency: { valency: [caseSlot("Nom"), alternatives] },
	});
	const { result } = await produceOnce(
		{ jev: knowledgeJev().ask, luna: luna.ask },
		knowledgeInput(
			verb("reden"),
			"🗣",
			"Sie redeten von alten Zeiten.",
			["redeten", "von"],
			{
				request: { valency: null },
				valencyEvidence: [attestedPreposition("von", "Dat")],
			},
		),
	);
	const change = { value: frameOf(result.changes) };
	expect(change?.value).toHaveLength(2);
	expect(change.value?.[1]?.complements).toHaveLength(2);
	// The frame request names the route's complement kinds, a verb's all five.
	const input = luna.sent[0]?.input as { complementKinds?: string[] };
	expect(input.complementKinds).toEqual([
		"Case",
		"Preposition",
		"Adverbial",
		"Predicative",
		"Clause",
	]);
});

test("free-marker complements land, and a Place on a German noun is dropped with a DroppedValencySlots event (#675)", async () => {
	const place = {
		status: "Required",
		complements: [{ kind: "Adverbial", standIn: "Irgendwo" }],
	};
	const verbLuna = knowledgeLuna({
		valency: { valency: [caseSlot("Nom"), place] },
	});
	const hausen = await produceOnce(
		{ jev: knowledgeJev().ask, luna: verbLuna.ask },
		knowledgeInput(
			verb("hausen"),
			"🏚",
			"Sie hausten im Keller.",
			["hausten"],
			{
				request: { valency: null },
			},
		),
	);
	expect(hausen.result.changes).toHaveLength(1);
	expect(hausen.trace?.events).toBeUndefined();

	const nounLuna = knowledgeLuna({
		valency: { valency: [place, prepositionSlot("nach", "Dat")] },
	});
	const { result, trace } = await produceOnce(
		{ jev: knowledgeJev().ask, luna: nounLuna.ask },
		knowledgeInput(
			{
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Sehnsucht",
				coreFeatures: { gender: "Fem" },
			},
			"💭",
			"Ihre Sehnsucht nach dem Meer wuchs.",
			["Sehnsucht", "nach"],
			{ request: { valency: null } },
		),
	);
	const change = { value: frameOf(result.changes) };
	expect(change?.value).toEqual([
		{
			status: "Optional",
			complements: [
				{
					kind: "Preposition",
					preposition: adp("nach"),
					governedCase: "Dat",
					referent: "Either",
				},
			],
		},
	]);
	expect(trace?.events?.map(({ name }) => name)).toEqual([
		"DroppedValencySlots",
	]);
	// The frame request offers a noun only its kinds.
	const nounInput = nounLuna.sent[0]?.input as
		| { readonly complementKinds?: string[] }
		| undefined;
	expect(nounInput?.complementKinds).toEqual(["Preposition", "Clause"]);
});

test("a preposition in a case it never governs is dropped too", async () => {
	const luna = knowledgeLuna({
		valency: { valency: [caseSlot("Nom"), prepositionSlot("für", "Dat")] },
	});
	const { result, trace } = await produceOnce(
		{ jev: knowledgeJev().ask, luna: luna.ask },
		knowledgeInput(
			verb("kämpfen"),
			"⚔",
			"Sie kämpften für ihr Recht.",
			["kämpften"],
			{
				request: { valency: null },
			},
		),
	);
	const change = { value: frameOf(result.changes) };
	expect(change?.value).toHaveLength(1);
	expect(trace?.events?.[0]?.name).toBe("DroppedValencySlots");
});

test("a Closed Route or an authored Reading answers every requested aspect with a CatalogMiss and no call (#883 point 8)", async () => {
	const jev = knowledgeJev();
	const luna = knowledgeLuna({});
	const { result, trace } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(
			{
				family: "Lexeme",
				kind: "PRON",
				canonicalForm: "jemand",
				coreFeatures: {
					case: null,
					number: null,
					person: null,
					polite: null,
					poss: null,
					pronType: "Ind",
					gender: null,
				},
			},
			"🧑",
			"Da ist jemand.",
			["jemand"],
			{
				request: {
					definition: null,
					translations: { en: null },
				},
			},
		),
	);
	expect(trace?.calls).toEqual([]);
	expect(result.changes).toEqual([]);
	expect(
		result.failures.map(({ aspect, leaf, code }) => ({
			aspect,
			leaf,
			code,
		})),
	).toEqual([
		{ aspect: "definition", leaf: undefined, code: "CatalogMiss" },
		{ aspect: "translations", leaf: "en", code: "CatalogMiss" },
	]);
});

test("aspects the route does not apply, and the deferred tree, are skipped (Dumgen ADR 0003)", async () => {
	const luna = knowledgeLuna({ conjugationClass: ["ritt"] });
	const { result, trace } = await produceOnce(
		{ jev: knowledgeJev().ask, luna: luna.ask },
		knowledgeInput(verb("reiten"), "🏇", "Sie ritt aus.", ["ritt"], {
			request: {
				plural: null,
				formulaRole: null,
				morphologicalTree: null,
				conjugationClass: null,
			},
		}),
	);
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "conjugationClass", value: ["Strong"] },
	]);
	expect(luna.aspects()).toEqual(["conjugationClass"]);
	expect(trace?.events).toEqual([
		{
			name: "SkippedAspects",
			data: { skipped: ["plural", "formulaRole", "morphologicalTree"] },
		},
	]);
});

test("bad input is a Defect, raised before anything is asked (#883 point 6)", async () => {
	const luna = knowledgeLuna({});
	const dumgen = createDumgen({ jev: knowledgeJev().ask, luna: luna.ask });
	const base = knowledgeInput(
		noun,
		"💐",
		"Sie bekam einen Strauß.",
		["Strauß"],
		{
			request: { definition: null },
		},
	);
	for (const input of [
		{ ...base, language: "en" as never },
		{
			...base,
			attestation: {
				...base.attestation,
				surface: {
					...base.attestation.surface,
					lemma: {
						...base.attestation.surface.lemma,
						canonicalForm: "Bund",
					},
				},
			} as never,
		},
		{ ...base, sentence: { ...base.sentence, target: [99] } },
		{ ...base, request: { breakdown: null } as never },
	]) {
		const exit = await Effect.runPromiseExit(
			dumgen.knowledge.produce(input),
		);
		expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
	}
	expect(luna.sent).toEqual([]);
});

test("conjugation classes come from the Präteritum Luna writes, judged on the stem (ADR 0038)", async () => {
	const luna = knowledgeLuna({
		conjugationClass: ({ reading }: { reading: { lemma: string } }) =>
			reading.lemma === "aufziehen" ? ["zog auf"] : ["molk", "melkte"],
	});
	const run = (lemma: ReturnType<typeof verb>, word: string) =>
		produceOnce(
			{ jev: knowledgeJev().ask, luna: luna.ask },
			knowledgeInput(lemma, "🐄", `Sie ${word} es.`, [word], {
				request: { conjugationClass: null },
			}),
		);
	expect((await run(verb("aufziehen", "auf"), "zog")).result.changes).toEqual(
		[{ kind: "Contribute", aspect: "conjugationClass", value: ["Strong"] }],
	);
	expect((await run(verb("melken"), "molk")).result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "conjugationClass",
			value: ["Strong", "Weak"],
		},
	]);
});

test("the plural is the forms when jev judges a plural, else jev's marker; a plural with no form is Unresolved", async () => {
	const run = (plurality: string, forms: string[]) =>
		produceOnce(
			{
				jev: knowledgeJev({ plurality }).ask,
				luna: knowledgeLuna({ plural: forms }).ask,
			},
			knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
				request: { plural: null },
			}),
		);
	expect((await run("PluralOnly", ["Sträuße"])).result.changes).toEqual([
		{ kind: "Contribute", aspect: "plural", value: "PluralOnly" },
	]);
	expect((await run("NoPlural", [])).result.changes).toEqual([
		{ kind: "Contribute", aspect: "plural", value: "NoPlural" },
	]);
	expect((await run("HasPlural", [])).result.failures).toEqual([
		expect.objectContaining({ aspect: "plural", code: "Unresolved" }),
	]);
});

test("a participle's source verb is named by form, checked by jev, and its meaning judged (ADR 0036)", async () => {
	const source = {
		verb: "verlieben",
		reflexive: "Acc",
		separablePrefix: null,
		preterite: "verliebte",
		participle: "verliebt",
	};
	const verbal = knowledgeJev({ form: "Participle", meaning: "Verbal" });
	const { result } = await produceOnce(
		{
			jev: verbal.ask,
			luna: knowledgeLuna({ participleSource: source }).ask,
		},
		knowledgeInput(
			adjective("verliebt"),
			"😍",
			"Sie ist verliebt.",
			["verliebt"],
			{
				request: { participleSource: null },
			},
		),
	);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "participleSource",
			value: {
				verb: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "VERB",
					canonicalForm: "sich verlieben",
					coreFeatures: {
						hasSepPrefix: null,
						lexicallyReflexive: "Acc",
					},
				},
				meaning: "Verbal",
			},
		},
	]);
	expect(verbal.stages()).toEqual(["participleJudgment"]);

	// The judge refuses the form: no source.
	const refused = await produceOnce(
		{
			jev: knowledgeJev({ form: "NotParticiple", meaning: "Verbal" }).ask,
			luna: knowledgeLuna({ participleSource: source }).ask,
		},
		knowledgeInput(
			adjective("verliebt"),
			"😍",
			"Sie ist verliebt.",
			["verliebt"],
			{
				request: { participleSource: null },
			},
		),
	);
	expect(refused.result).toEqual({
		changes: [],
		pendingRelations: [],
		failures: [],
	});

	// A plain adjective, or a participle spelled otherwise, takes no judgment.
	const plain = knowledgeJev();
	const none = await produceOnce(
		{
			jev: plain.ask,
			luna: knowledgeLuna({
				participleSource: { ...source, participle: "verlobt" },
			}).ask,
		},
		knowledgeInput(
			adjective("verliebt"),
			"😍",
			"Sie ist verliebt.",
			["verliebt"],
			{
				request: { participleSource: null },
			},
		),
	);
	expect(none.result.changes).toEqual([]);
	expect(plain.sent).toEqual([]);
});

test("a Partizip I is checked by code, so jev judges only its meaning; an inseparable prefix is never separable (#887)", async () => {
	// Luna names the Partizip II, but the adjective is the Partizip I.
	const judge = knowledgeJev({ meaning: "Verbal" });
	const { result } = await produceOnce(
		{
			jev: judge.ask,
			luna: knowledgeLuna({
				participleSource: {
					verb: "duften",
					reflexive: null,
					separablePrefix: null,
					preterite: "duftete",
					participle: "geduftet",
				},
			}).ask,
		},
		knowledgeInput(
			adjective("duftend"),
			"👃",
			"Ein duftend Brot.",
			["duftend"],
			{ request: { participleSource: null } },
		),
	);
	expect(result.changes).toEqual([
		expect.objectContaining({
			aspect: "participleSource",
			value: expect.objectContaining({ meaning: "Verbal" }),
		}),
	]);
	expect(Object.keys(judge.sent[0]?.questions ?? {})).toEqual(["meaning"]);

	const inseparable = await produceOnce(
		{
			jev: knowledgeJev({ form: "Participle", meaning: "Verbal" }).ask,
			luna: knowledgeLuna({
				participleSource: {
					verb: "verstecken",
					reflexive: null,
					separablePrefix: "ver",
					preterite: "versteckte",
					participle: "versteckt",
				},
			}).ask,
		},
		knowledgeInput(
			adjective("versteckt"),
			"🙈",
			"Ein versteckt Haus.",
			["versteckt"],
			{ request: { participleSource: null } },
		),
	);
	expect(inseparable.result.changes).toEqual([
		expect.objectContaining({
			value: expect.objectContaining({
				verb: expect.objectContaining({
					canonicalForm: "verstecken",
					coreFeatures: {
						hasSepPrefix: null,
						lexicallyReflexive: null,
					},
				}),
			}),
		}),
	]);
});

const locution = (
	kind: string,
	canonicalForm: string,
	coreFeatures: Readonly<Record<string, unknown>> = {},
) => ({
	family: "Locution",
	kind,
	canonicalForm,
	coreFeatures,
});

test("Locution Type, Saying Type with its attribution and Formula Role are judged; Collocation is offered only to a VERB (#669)", async () => {
	const jev = knowledgeJev({ locutionType: "Collocation" });
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: knowledgeLuna({}).ask },
		knowledgeInput(
			locution("VERB", "in Erwägung ziehen"),
			"🤔",
			"Sie zogen es in Erwägung.",
			["zogen", "in", "Erwägung"],
			{ request: { locutionType: null } },
		),
	);
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "locutionType", value: "Collocation" },
	]);
	const adverbJev = knowledgeJev({ locutionType: "Neither" });
	const adverb = await produceOnce(
		{ jev: adverbJev.ask, luna: knowledgeLuna({}).ask },
		knowledgeInput(
			locution("ADV", "Knall auf Fall", { comparable: null }),
			"⚡",
			"Er ging Knall auf Fall.",
			["Knall", "auf", "Fall"],
			{ request: { locutionType: null } },
		),
	);
	expect(adverb.result.changes).toEqual([]);
	const question = adverbJev.sent[0]?.questions.locutionType;
	expect(
		question?.type === "choice" ? Object.keys(question.criteria ?? {}) : [],
	).toEqual(["Idiom", "Neither"]);

	const sayingLuna = knowledgeLuna({
		attribution: "Friedrich Schiller, Wilhelm Tell",
	});
	const saying = await produceOnce(
		{
			jev: knowledgeJev({ sayingType: "WingedWord" }).ask,
			luna: sayingLuna.ask,
		},
		knowledgeInput(
			{
				family: "Saying",
				kind: "Saying",
				canonicalForm: "Die Axt im Haus erspart den Zimmermann",
				coreFeatures: {},
			},
			"🪓",
			"Die Axt im Haus erspart den Zimmermann.",
			["Die", "Axt", "im", "Haus", "erspart", "den", "Zimmermann"],
			{ request: { sayingType: null } },
		),
	);
	expect(saying.result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "sayingType",
			value: {
				type: "WingedWord",
				attribution: "Friedrich Schiller, Wilhelm Tell",
			},
		},
	]);
	expect(sayingLuna.aspects()).toEqual(["attribution"]);

	const formula = await produceOnce(
		{
			jev: knowledgeJev({ formulaRole: "Farewell" }).ask,
			luna: knowledgeLuna({}).ask,
		},
		knowledgeInput(
			locution("INTJ", "bis bald"),
			"👋",
			"Bis bald!",
			["Bis", "bald"],
			{ request: { formulaRole: null } },
		),
	);
	expect(formula.result.changes).toEqual([
		{ kind: "Contribute", aspect: "formulaRole", value: "Farewell" },
	]);
});

test("relation candidates are judged in one request that states the policy once; each relation keeps its three most confident claims (#697, ADR 0003)", async () => {
	const candidates = [
		"Gaul",
		"Ross",
		"Mähre",
		"Klepper",
		"Pferd",
		"Tier",
		"Huftier",
		"auf dem hohen Ross sitzen",
	];
	// "Pferd" is the source and drops out, so indices count from "Gaul".
	const picks: Record<string, { choice: string; confidence: number }> = {
		relation_0: { choice: "synonym", confidence: 0.9 },
		relation_1: { choice: "synonym", confidence: 0.8 },
		relation_2: { choice: "synonym", confidence: 0.7 },
		relation_3: { choice: "synonym", confidence: 0.95 },
		relation_4: { choice: "hypernym", confidence: 0.9 },
		relation_5: { choice: "Unsure", confidence: 0.6 },
		relation_6: { choice: "None", confidence: 0.9 },
	};
	const jev = knowledgeJev((id) =>
		id.startsWith("kind_")
			? id === "kind_6"
				? "VERB"
				: "NOUN"
			: picks[id],
	);
	const luna = knowledgeLuna({ relationCandidates: candidates });
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(
			{
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Pferd",
				coreFeatures: { gender: "Neut" },
			},
			"🐎",
			"Das Pferd wiehert.",
			["Pferd"],
			{
				request: {
					semanticRelations: { synonym: null, hypernym: null },
				},
			},
		),
	);
	expect(result.failures).toEqual([]);
	expect(result.pendingRelations).toEqual([
		{
			relation: "synonym",
			target: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Klepper",
			},
		},
		{
			relation: "synonym",
			target: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Gaul",
			},
		},
		{
			relation: "synonym",
			target: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Ross",
			},
		},
		{
			relation: "hypernym",
			target: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Tier",
			},
		},
	]);
	expect(jev.stages()).toEqual(["relationJudgment"]);
	const request = jev.sent[0];
	// The source itself is never a candidate.
	expect(request?.state.candidates).not.toContain("Pferd");
	// The policy and definitions are stated once, in the state.
	expect(request?.state).toHaveProperty("policy");
	expect(Object.keys(request?.state.relations as object)).toEqual([
		"synonym",
		"hypernym",
	]);
	const questions = Object.values(request?.questions ?? {});
	const text = JSON.stringify(questions);
	expect(text).not.toContain("Oberbegriff");
	// No bare or undefined Kinds: no AUX, PUNCT or Collocation option (#669).
	const kindOptions = new Set(
		questions.flatMap((question) =>
			question.type === "choice"
				? Object.keys(question.criteria ?? {})
				: [],
		),
	);
	for (const bare of ["AUX", "PUNCT", "SYM", "Collocation"])
		expect(kindOptions.has(bare)).toBe(false);
	expect(Object.keys(request?.state.kinds as object)).toContain("NOUN");
	// A multiword candidate is a Locution, a one-word one a Lexeme.
	expect(JSON.stringify(request?.questions.kind_6?.instructions)).toContain(
		"Locution",
	);
	expect(JSON.stringify(request?.questions.kind_0?.instructions)).toContain(
		"Lexeme",
	);
});

test("a failed candidate call fails every requested relation at once, as one failure with no leaf", async () => {
	const { result } = await produceOnce(
		{
			jev: knowledgeJev().ask,
			luna: knowledgeLuna({
				relationCandidates: new Error("Luna is down"),
			}).ask,
		},
		knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
			request: { semanticRelations: { synonym: null } },
		}),
	);
	expect(result.failures).toEqual([
		{
			aspect: "semanticRelations",
			code: "ProviderFailure",
			message: "Luna is down",
		},
	]);
});
