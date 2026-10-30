import { expect, test } from "bun:test";
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type { GermanKnowledgeChange } from "../../src/knowledge/types.js";
import { operations } from "../../src/operations.js";
import { liveOver } from "../live-over.js";
import {
	adp,
	attestedPreposition,
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	knowledgeLunaInput,
	produceOnce,
	texts,
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
	coreFeatures: { hasSepPrefix },
});
/** The frame a run contributed, if any. */
const frameOf = (changes: readonly GermanKnowledgeChange[]) => {
	const change = changes.find((change) => change.aspect === "valency");
	return change && "value" in change ? change.value : undefined;
};

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
			language === "en"
				? texts("bouquet")
				: [
						[
							{ kind: "Text", text: "букет" },
							{ kind: "Preposition", text: "из" },
							{ kind: "Slot", text: "чего-то" },
						],
					],
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
				valency: null,
			},
			paradigm: { dimensions: ["plural"] },
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
		value: [
			[
				{ kind: "Text", text: "букет" },
				{ kind: "Preposition", text: "из" },
				{ kind: "Slot", text: "чего-то" },
			],
		],
	});
	// The plural is no Knowledge: it licenses the Reading a Paradigm Variant (ADR 0048).
	expect(result.paradigmChanges).toEqual([
		{
			kind: "Contribute",
			dimension: "plural",
			value: "Sträuße",
			provenance: "Produced",
		},
		{
			kind: "License",
			dimension: "plural",
			reading: expect.objectContaining({ emojiDescription: "💐" }),
			variants: ["sträuße"],
		},
	]);
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
	const inputs = luna.sent.map((request) =>
		knowledgeLunaInput(request.input),
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
			language === "en" ? texts("bouquet") : ["букет"],
		plural: ["Sträuße", "zwei Wörter"],
	});
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
			request: {
				transcription: null,
				definition: null,
				translations: { en: null, ru: null },
			},
			paradigm: { dimensions: ["plural"] },
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
			request: {},
			paradigm: { dimensions: ["plural"] },
		}),
	);
	expect(result).toEqual({
		changes: [],
		paradigmChanges: [],
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

test("onContribution receives each aspect's Knowledge changes as it finishes, one at a time (#883 point 4)", async () => {
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
			request: { definition: null, transcription: null },
			paradigm: { dimensions: ["plural"] },
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
	expect(received).toHaveLength(2);
	expect(received.at(-1)).toEqual(["definition"]);
	expect(received.flat().sort()).toEqual(["definition", "transcription"]);
	expect(result.changes).toHaveLength(2);
	// Paradigm Changes come back with the result only.
	expect(result.paradigmChanges).toContainEqual({
		kind: "Contribute",
		dimension: "plural",
		value: "PluralOnly",
		provenance: "Produced",
	});
});

test("the result reads in job order, however the jobs finish (#1122)", async () => {
	const jev = knowledgeJev({ plurality: "HasPlural" });
	const luna = knowledgeLuna(
		{
			transcription: new Error("Luna is down"),
			definition: "Gebundene Blumen.",
			translations: texts("bouquet"),
			plural: ["Sträuße", "zwei Wörter"],
		},
		{
			delayMs: (aspect) =>
				aspect === "transcription"
					? 40
					: aspect === "definition"
						? 20
						: 1,
		},
	);
	const finished: string[] = [];
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
			request: {
				transcription: null,
				definition: null,
				translations: { en: null },
			},
			paradigm: { dimensions: ["plural"] },
			onContribution: (changes) =>
				Effect.sync(() => {
					finished.push(...changes.map(({ aspect }) => aspect));
				}),
		}),
	);
	// The later job finished first ...
	expect(finished).toEqual(["translations", "definition"]);
	// ... and the result still reads in the request's order.
	expect(result.changes.map(({ aspect }) => aspect)).toEqual([
		"definition",
		"translations",
	]);
	expect(
		result.failures.map(({ aspect, code }) => ({ aspect, code })),
	).toEqual([
		{ aspect: "transcription", code: "ProviderFailure" },
		{ aspect: "plural", code: "InvalidModelOutput" },
	]);
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
		operations.knowledge
			.produce(
				knowledgeInput(
					noun,
					"💐",
					"Sie bekam einen Strauß.",
					["Strauß"],
					{
						request: { transcription: null, definition: null },
						onContribution: () =>
							Effect.fail(
								new PublicationFailed({ reason: "store full" }),
							),
					},
				),
			)
			.pipe(Effect.provide(liveOver({ jev: jev.ask, luna: luna.ask }))),
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
	expect(result).toEqual({
		changes: [],
		paradigmChanges: [],
		pendingRelations: [],
		failures: [],
	});
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
	// The frame request names the route's complement kinds, a verb's all six.
	expect(luna.sent[0]?.input).toHaveProperty("complementKinds", [
		"Case",
		"Preposition",
		"Adverbial",
		"Predicative",
		"Clause",
		"Reflexive",
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
	expect(nounLuna.sent[0]?.input).toHaveProperty("complementKinds", [
		"Preposition",
		"Clause",
	]);
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

test("aspects the route does not apply are skipped (Dumgen ADR 0003)", async () => {
	const luna = knowledgeLuna({ verbForms: { preterite: ["ritt"] } });
	const { result, trace } = await produceOnce(
		{ jev: knowledgeJev().ask, luna: luna.ask },
		knowledgeInput(verb("reiten"), "🏇", "Sie ritt aus.", ["ritt"], {
			request: { formulaRole: null },
			paradigm: { dimensions: ["plural", "preterite"] },
		}),
	);
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([]);
	expect(result.paradigmChanges).toContainEqual({
		kind: "Contribute",
		dimension: "preterite",
		value: "ritt",
		provenance: "Produced",
	});
	expect(luna.aspects()).toEqual(["verbForms"]);
	expect(trace?.events).toEqual([
		{
			name: "SkippedAspects",
			data: {
				skipped: ["formulaRole", "paradigm.plural"],
			},
		},
	]);
});

test("bad input is a Defect, raised before anything is asked (#883 point 6)", async () => {
	const luna = knowledgeLuna({});
	const live = liveOver({ jev: knowledgeJev().ask, luna: luna.ask });
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
		// Deliberately invalid: Knowledge takes German input only.
		{ ...base, language: "en" as never },
		{
			...base,
			attestation: knowledgeInput(
				{ ...noun, canonicalForm: "Bund" },
				"💐",
				"Sie bekam einen Strauß.",
				["Strauß"],
			).attestation,
		},
		{ ...base, sentence: { ...base.sentence, target: [99] } },
		// Deliberately invalid: breakdown is no Knowledge aspect.
		{ ...base, request: { breakdown: null } as never },
		// Deliberately invalid: conjugationClass is no Variation Dimension.
		{
			...base,
			paradigm: { dimensions: ["conjugationClass"] as never },
		},
	]) {
		const exit = await Effect.runPromiseExit(
			operations.knowledge.produce(input).pipe(Effect.provide(live)),
		);
		expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
	}
	expect(luna.sent).toEqual([]);
});
