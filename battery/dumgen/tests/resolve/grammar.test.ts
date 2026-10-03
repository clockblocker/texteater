import { expect, test } from "bun:test";
import { sameLemma } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { createDumgen } from "../../src/create-dumgen.js";
import { InvalidModelOutput, ProviderFailure } from "../../src/errors.js";
import type { LunaAsk } from "../../src/luna.js";
import { guardedHeadword } from "../../src/resolve/de/headword-guards.js";
import { verbHeadword } from "../../src/resolve/de/open-route.js";
import { targetOf } from "../../src/resolve/de/target.js";
import type { JevAsk } from "../../src/segment/jev.js";
import type { Route, Segment } from "../../src/segment/segmented-sentence.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	picked,
	resolveOnce,
	sentenceOf,
	unitOf,
} from "./support.js";

const word = (text: string, surface?: string): Segment => ({
	kind: "ResolvableText",
	text,
	...(surface === undefined ? {} : { surface }),
});
const space: Segment = { kind: "Whitespace", text: " " };
const stop: Segment = { kind: "Punctuation", text: "." };

/**
 * Luna writing `canonicalForm` and the members as attested. For a
 * Locution or Saying it ties each word of the form to the member, or run
 * of members, that spells it, a finite verb citing its infinitive last.
 */
const writes = (canonicalForm: string, members?: readonly string[]) =>
	fakeLuna(({ members: sent }) => {
		const spelled = members ?? sent.map(({ text }) => text);
		const used = new Set<number>();
		const words = canonicalForm.split(" ").flatMap((word) => {
			for (let start = 0; start < spelled.length; start++) {
				let joined = "";
				for (let end = start; end < spelled.length; end++) {
					if (used.has(end)) break;
					joined += spelled[end];
					if (joined.toLowerCase() === word.toLowerCase()) {
						const run = Array.from(
							{ length: end - start + 1 },
							(_, offset) => start + offset,
						);
						for (const position of run) used.add(position);
						return run.map((position) => ({
							member: `m${position}`,
							text: "",
							comma: false,
						}));
					}
				}
			}
			const spare = spelled.findIndex(
				(_, position) => !used.has(position),
			);
			if (spare >= 0) used.add(spare);
			return [
				{
					member: spare >= 0 ? `m${spare}` : "",
					text: word,
					comma: false,
				},
			];
		});
		return { canonicalForm, words, members: spelled };
	});

// Unresolved and failed input (#861, #859).

test("a unit intake left Unresolved stays Unresolved and asks nothing", async () => {
	const jev = fakeJev();
	const luna = fakeLuna();
	const { result, trace } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Blarg kommt."),
			unit: { segments: [0], route: "Unresolved" },
		},
	);
	expect(result).toEqual({ _tag: "Unresolved" });
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toEqual([]);
	expect(trace).toMatchObject({
		operation: "resolve.grammar",
		calls: [],
		resolution: { outcome: "Unresolved", reason: "UnresolvedUnit" },
	});
});

test("another language, a failed Sentence or a unit outside its Sentence is a Defect before anything is asked", async () => {
	const jev = fakeJev();
	const dumgen = createDumgen({ jev: jev.ask, luna: fakeLuna().ask });
	const sentence = sentenceOf("Er kommt.");
	const input = {
		language: "de" as const,
		sentence,
		unit: unitOf([2], "Lexeme", "VERB"),
		neighbours: {},
		lemmaCandidates: [],
	};
	await expect(
		Effect.runPromise(
			dumgen.resolve.grammar({ ...input, language: "en" as "de" }),
		),
	).rejects.toThrow('German ("de") only');
	await expect(
		Effect.runPromise(
			dumgen.resolve.grammar({
				...input,
				sentence: { ...sentence, units: [], failed: true },
			}),
		),
	).rejects.toThrow("segment it again");
	await expect(
		Effect.runPromise(
			dumgen.resolve.grammar({
				...input,
				unit: unitOf([1], "Lexeme", "VERB"),
			}),
		),
	).rejects.toThrow("ResolvableText");
	expect(jev.sent).toEqual([]);
});

// The click API's error channel (#859, #858).

test("a transport failure is a ProviderFailure and an unusable answer an InvalidModelOutput; nothing is retried", async () => {
	const sentence = sentenceOf("Er kommt.");
	const unit = unitOf([2], "Lexeme", "VERB");
	const down = fakeJev({}, { fail: () => true });
	const failure = await Effect.runPromise(
		Effect.flip(
			createDumgen({
				jev: down.ask,
				luna: fakeLuna().ask,
			}).resolve.grammar({
				language: "de",
				sentence,
				unit,
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
	expect(failure).toBeInstanceOf(ProviderFailure);
	expect(down.sent).toHaveLength(1);
	const garbled = fakeLuna(() => ({ canonicalForm: "kommen" }));
	const unusable = await Effect.runPromise(
		Effect.flip(
			createDumgen({
				jev: fakeJev().ask,
				luna: garbled.ask,
			}).resolve.grammar({
				language: "de",
				sentence,
				unit,
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
	expect(unusable).toBeInstanceOf(InvalidModelOutput);
	expect(unusable).toMatchObject({ stage: "canonical" });
	expect(garbled.sent).toHaveLength(1);
});

test("a click is all-or-nothing: a failed Case question interrupts Luna's call in flight", async () => {
	// Er0 _1 gibt2 _3 der4 _5 Frau6 _7 ein8 _9 Buch10 .11
	const jev = fakeJev(
		{ gender: "Fem", number: "Sing" },
		{ fail: (stage) => stage === "case" },
	);
	const luna = fakeLuna(undefined, { delayMs: 50 });
	const failure = await Effect.runPromise(
		Effect.flip(
			createDumgen({ jev: jev.ask, luna: luna.ask }).resolve.grammar({
				language: "de",
				sentence: sentenceOf("Er gibt der Frau ein Buch."),
				unit: unitOf([4, 6], "Lexeme", "NOUN"),
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
	expect(failure).toBeInstanceOf(ProviderFailure);
	expect(luna.aborted).toEqual(["canonical"]);
});

// NOUN Case: narrowed in code, asked at most once (#625).

test("an article and the noun's form that leave one cell settle Case with no question", async () => {
	// Wir0 _1 helfen2 _3 den4 _5 Kindern6 .7
	const jev = fakeJev({ gender: "das", number: "Plur" });
	const luna = writes("Kind", ["den", "Kindern"]);
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Wir helfen den Kindern."),
			unit: unitOf([4, 6], "Lexeme", "NOUN"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma).toMatchObject({
		canonicalForm: "Kind",
		coreFeatures: { gender: "Neut" },
	});
	expect(attestation.surface.inflectionalFeatures).toEqual({
		case: "Dat",
		gender: null,
		number: "Plur",
	});
	expect(attestation.articleEvidence).toEqual({ kind: "Owned", member: 0 });
	expect(attestation.surface.normalizedSurface).toBe("Kindern");
	expect(jev.stages()).toEqual(["grammar"]);
	// No article question, and no Case question.
	expect(jev.questions("grammar")).not.toContain("case");
	expect(jev.questions("grammar")).not.toContain("article");
});

test("an article whose cells agreement cannot narrow asks Case once, in the first request", async () => {
	// Die0 _1 Frau2 _3 lacht4 .5
	const jev = fakeJev({ gender: "die", number: "Sing", case: "Nom" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("Frau", ["die", "Frau"]).ask },
		{
			sentence: sentenceOf("Die Frau lacht."),
			unit: unitOf([0, 2], "Lexeme", "NOUN"),
		},
	);
	expect(attested(result).surface.inflectionalFeatures).toMatchObject({
		case: "Nom",
	});
	expect(jev.stages()).toEqual(["grammar"]);
	const asked = jev.sent[0]?.questions.case;
	expect(asked?.type === "choice" && Object.keys(asked.criteria)).toEqual([
		"Nom",
		"Acc",
		"Unresolved",
	]);
});

test("cells agreement leaves open get one Case question over those cells, and its Unresolved makes the click Unresolved", async () => {
	// Er0 _1 gibt2 _3 der4 _5 Frau6 _7 ein8 _9 Buch10 .11
	const sentence = sentenceOf("Er gibt der Frau ein Buch.");
	const unit = unitOf([4, 6], "Lexeme", "NOUN");
	const jev = fakeJev({ gender: "die", number: "Sing", case: "Dat" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("Frau", ["der", "Frau"]).ask },
		{ sentence, unit },
	);
	expect(attested(result).surface.inflectionalFeatures).toMatchObject({
		case: "Dat",
	});
	expect(jev.stages()).toEqual(["grammar", "case"]);
	const asked = jev.sent[1]?.questions.case;
	expect(asked?.type === "choice" && Object.keys(asked.criteria)).toEqual([
		"Dat",
		"Gen",
		"Unresolved",
	]);
	const open = fakeJev({ gender: "die", number: "Sing", case: "Unresolved" });
	const unresolved = await resolveOnce(
		{ jev: open.ask, luna: writes("Frau", ["der", "Frau"]).ask },
		{ sentence, unit },
	);
	expect(unresolved.result).toEqual({ _tag: "Unresolved" });
	// Never a follow-up question.
	expect(open.stages()).toEqual(["grammar", "case"]);
	expect(unresolved.trace?.resolution).toEqual({
		outcome: "Unresolved",
		reason: "Unresolved case",
	});
});

test("a bare noun asks Case over every case and the empty case of direct address", async () => {
	// Hallo0 _1 Leute2 !3
	const jev = fakeJev({ gender: "None", number: "Plur", case: "Unmarked" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("Leute").ask },
		{
			sentence: sentenceOf("Hallo Leute!"),
			unit: unitOf([2], "Lexeme", "NOUN"),
		},
	);
	expect(attested(result).surface.inflectionalFeatures).toEqual({
		case: null,
		gender: null,
		number: "Plur",
	});
	const asked = jev.sent[0]?.questions.case;
	expect(asked?.type === "choice" && Object.keys(asked.criteria)).toEqual([
		"Nom",
		"Acc",
		"Dat",
		"Gen",
		"Unmarked",
		"Unresolved",
	]);
});

// The closed-class identity intake stored (#864, ADR 0021).

test("a closed-class unit builds its Lemma from the stored identity, with no identity question and no Luna", async () => {
	// Dieses0 _1 Haus2 _3 ist4 _5 alt6 .7
	const jev = fakeJev();
	const luna = fakeLuna();
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Dieses Haus ist alt."),
			unit: unitOf([0], "Lexeme", "DET", {
				kind: "DET",
				canonicalForm: "dieser",
				pronType: "Dem",
			}),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.canonicalForm).toBe("dieser");
	expect(attestation.surface.normalizedSurface).toBe("dieses");
	expect(luna.sent).toEqual([]);
	// One question, about the occurrence's cell only, without neighbours.
	expect(jev.stages()).toEqual(["cell"]);
	expect(Object.keys(jev.sent[0]?.questions ?? {})).toEqual(["cell"]);
	expect(jev.sent[0]?.state.neighbours).toBeUndefined();
});

test("an identity whose spelling names one cell asks nothing", async () => {
	// Ich0 _1 komme2 .3
	const jev = fakeJev();
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Ich komme."),
			unit: unitOf([0], "Lexeme", "PRON", {
				kind: "PRON",
				canonicalForm: "ich",
				pronType: "Prs",
			}),
		},
	);
	expect(attested(result).surface.lemma.coreFeatures).toMatchObject({
		case: "Nom",
		person: "1",
	});
	expect(jev.sent).toEqual([]);
});

test("a DET or PRON unit without an identity, or one the inventory lacks, is a Catalog Miss", async () => {
	const jev = fakeJev();
	const none = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Blubb kommt."),
			unit: unitOf([0], "Lexeme", "PRON"),
		},
	);
	expect(none.result).toMatchObject({
		_tag: "CatalogMiss",
		route: { family: "Lexeme", kind: "PRON" },
	});
	const unrealized = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Ihm hilft keiner."),
			unit: unitOf([0], "Lexeme", "PRON", {
				kind: "PRON",
				canonicalForm: "er",
				pronType: "Prs",
			}),
		},
	);
	expect(unrealized.result._tag).toBe("CatalogMiss");
	expect(unrealized.trace?.resolution?.outcome).toBe("CatalogMiss");
	expect(jev.sent).toEqual([]);
});

// The referent decides only some pronoun forms (ADR 0044, ADR 0046).

const ihm = {
	sentence: sentenceOf("Ich gebe ihm das Buch."),
	unit: unitOf([4], "Lexeme", "PRON", {
		kind: "PRON",
		canonicalForm: "ihm",
		pronType: "Prs",
	}),
};

test("a referent no text settles attests the form's Syncretism, never a guessed cell", async () => {
	const jev = fakeJev({ cell: "s0" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{ ...ihm, neighbours: { before: "Das Kind weint." } },
	);
	const lemma = attested(result).surface.lemma;
	expect(lemma.syncretic).toEqual(["gender"]);
	expect(lemma.coreFeatures).toMatchObject({ case: "Dat", gender: null });
	// The neighbours go only to the question the referent decides.
	expect(jev.sent[0]?.state.neighbours).toEqual({
		before: "Das Kind weint.",
	});
	expect(jev.sent[0]?.state.policy).toHaveProperty("referent");
});

test("a referent the neighbours settle attests its cell", async () => {
	const settled = fakeJev({ cell: "o0" });
	const { result } = await resolveOnce(
		{ jev: settled.ask, luna: fakeLuna().ask },
		{ ...ihm, neighbours: { before: "Mein Bruder kommt." } },
	);
	const lemma = attested(result).surface.lemma;
	expect(lemma.syncretic).toBeUndefined();
	expect(["Masc", "Neut"]).toContain(String(lemma.coreFeatures.gender));
});

// Luna writes the Canonical Form and spellings (#862, #639, #764).

test("Luna writes the Canonical Form in lexical casing with the unit's stored Lemmas as hints, and nothing lowercases by position", async () => {
	// Mangels0 _1 Beweisen2 _3 kam4 _5 er6 _7 frei8 .9
	const luna = writes("mangels", ["mangels"]);
	const stored: Dumling.Lemma<"de"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: "mangels",
		coreFeatures: {},
	};
	const elsewhere: Dumling.Lemma<"de"> = { ...stored, canonicalForm: "mit" };
	const { result } = await resolveOnce(
		{ jev: fakeJev().ask, luna: luna.ask },
		{
			sentence: sentenceOf("Mangels Beweisen kam er frei."),
			unit: unitOf([0], "Lexeme", "ADP"),
			lemmaCandidates: [
				{ lemma: stored, foundUnder: ["Mangels"] },
				{ lemma: elsewhere, foundUnder: ["mit"] },
			],
		},
	);
	expect(attested(result).surface.normalizedSurface).toBe("mangels");
	const input = luna.sent[0]?.input as {
		lemmaCandidates?: readonly unknown[];
		members: readonly unknown[];
	};
	expect(input.lemmaCandidates).toEqual([
		{ canonicalForm: "mangels", coreFeatures: {} },
	]);
	expect(input.members).toEqual([
		{ member: "m0", text: "Mangels", orthography: "Standard" },
	]);
	expect(luna.sent[0]?.systemPrompt).toContain(
		"never the casing the word's position gives",
	);
	// Luna keeping the position's capital is kept: code never lowercases.
	const capital = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("mangels", ["Mangels"]).ask },
		{
			sentence: sentenceOf("Mangels Beweisen kam er frei."),
			unit: unitOf([0], "Lexeme", "ADP"),
		},
	);
	expect(attested(capital.result).surface.normalizedSurface).toBe("Mangels");
});

test("Luna may correct a Typo, while a Standard member keeps its letters in Luna's casing", async () => {
	const sentence = sentenceOf("Er kommt.");
	const unit = unitOf([2], "Lexeme", "VERB");
	// Luna writing the headword form of a Standard member changes nothing.
	const changed = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("kommen", ["kam"]).ask },
		{ sentence, unit },
	);
	expect(attested(changed.result).surface.normalizedSurface).toBe("kommt");
	const typo = await resolveOnce(
		{
			jev: fakeJev({ orthography: "t0" }).ask,
			luna: writes("kommen", ["kommt"]).ask,
		},
		{ sentence: sentenceOf("Er komt."), unit },
	);
	const attestation = attested(typo.result);
	expect(attestation.members[0]).toEqual({
		attested: "komt",
		orthography: "Typo",
	});
	expect(attestation.surface.normalizedSurface).toBe("kommt");
	// A Standard member Luna dropped keeps its letters; the Typo still gets
	// Luna's word, and a Standard member Luna recased keeps that casing.
	const dropped = await resolveOnce(
		{
			jev: fakeJev({ orthography: "t2" }).ask,
			luna: writes("hereinkommen", ["komm", "herein"]).ask,
		},
		{
			sentence: sentenceOf("Komm doch herrein."),
			unit: unitOf([0, 2, 4], "Lexeme", "VERB"),
		},
	);
	expect(attested(dropped.result).surface.normalizedSurface).toBe(
		"komm doch herein",
	);
	// Too few words for the members Luna writes is no answer.
	const short = await Effect.runPromise(
		Effect.flip(
			createDumgen({
				jev: fakeJev({ orthography: "t2" }).ask,
				luna: writes("hereinkommen", ["komm", "doch"]).ask,
			}).resolve.grammar({
				language: "de",
				sentence: sentenceOf("Komm doch herrein."),
				unit: unitOf([0, 2, 4], "Lexeme", "VERB"),
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
	expect(short).toBeInstanceOf(InvalidModelOutput);
});

test("INTJ LOL and lol resolve to one Lemma, while NOUN Morgen and ADV morgen stay two", async () => {
	const stored: Dumling.Lemma<"de"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "INTJ",
		canonicalForm: "LOL",
		coreFeatures: { partType: null },
	};
	const lol = async (text: string, written: string) =>
		attested(
			(
				await resolveOnce(
					{
						jev: fakeJev({ answer: "None" }).ask,
						luna: writes(written).ask,
					},
					{
						sentence: sentenceOf(`Er schrieb ${text}.`),
						unit: unitOf([4], "Lexeme", "INTJ"),
						lemmaCandidates: [
							{ lemma: stored, foundUnder: [text] },
						],
					},
				)
			).result,
		).surface.lemma as unknown as Dumling.Lemma;
	const upper = await lol("LOL", "LOL");
	const lower = await lol("lol", "lol");
	expect(sameLemma(upper, lower)).toBe(true);
	expect(sameLemma(upper, stored)).toBe(true);
	const noun = attested(
		(
			await resolveOnce(
				{
					jev: fakeJev({
						gender: "der",
						number: "Sing",
						case: "Nom",
					}).ask,
					luna: writes("Morgen").ask,
				},
				{
					sentence: sentenceOf("Der Morgen kam."),
					unit: unitOf([0, 2], "Lexeme", "NOUN"),
				},
			)
		).result,
	).surface.lemma as unknown as Dumling.Lemma;
	const adverb = attested(
		(
			await resolveOnce(
				{
					jev: fakeJev({ comparable: "No" }).ask,
					luna: writes("morgen").ask,
				},
				{
					sentence: sentenceOf("Wir kommen morgen."),
					unit: unitOf([4], "Lexeme", "ADV"),
				},
			)
		).result,
	).surface.lemma as unknown as Dumling.Lemma;
	expect(sameLemma(noun, adverb)).toBe(false);
});

// valencyEvidence (ADR 0034) and auxiliaries (#686).

test("a governed preposition is the verb's valencyEvidence and stays out of its Surface and Lemma", async () => {
	// Sie0 _1 wartet2 _3 auf4 _5 den6 _7 Bus8 .9
	const jev = fakeJev({
		prefix: "None",
		governed_m1: "Governed",
		governedCase_m1: "Acc",
		governedReferent_m1: "Something",
		verbForm: "Fin",
		mood: "Ind",
		tense: "Pres",
		person: "3",
		number: "Sing",
	});
	const luna = writes("warten");
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Sie wartet auf den Bus."),
			unit: unitOf([2, 4], "Lexeme", "VERB"),
		},
	);
	const attestation = attested(result);
	expect(attestation.valencyEvidence).toEqual([
		{
			member: 1,
			complement: {
				kind: "Preposition",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: "auf",
					coreFeatures: {},
				},
				governedCase: "Acc",
				referent: "Something",
			},
			realizedCase: "Acc",
		},
	]);
	expect(attestation.surface.normalizedSurface).toBe("wartet");
	expect(
		(luna.sent[0]?.input as { outsideHeadword?: string[] } | undefined)
			?.outsideHeadword,
	).toEqual(["m1"]);
});

test("an adposition records the case its complement took, asked only where the ADP Case Table allows several", async () => {
	// Wir0 _1 sitzen2 _3 auf4 _5 dem6 _7 Sofa8 .9
	const twoWay = fakeJev({ realizedCase: "Dat" });
	const { result } = await resolveOnce(
		{ jev: twoWay.ask, luna: writes("auf").ask },
		{
			sentence: sentenceOf("Wir sitzen auf dem Sofa."),
			unit: unitOf([4], "Lexeme", "ADP"),
		},
	);
	expect(attested(result).valencyEvidence).toEqual([
		{
			member: null,
			complement: {
				kind: "Case",
				governedCase: "Dat",
				referent: "Either",
			},
			realizedCase: "Dat",
		},
	]);
	const oneCase = fakeJev();
	const mit = await resolveOnce(
		{ jev: oneCase.ask, luna: writes("mit").ask },
		{
			sentence: sentenceOf("Er kam mit dem Rad."),
			unit: unitOf([4], "Lexeme", "ADP"),
		},
	);
	expect(attested(mit.result).valencyEvidence?.[0]).toMatchObject({
		realizedCase: "Dat",
	});
	expect(oneCase.questions("grammar")).not.toContain("realizedCase");
});

test("perfect, future and passive come from the auxiliaries' uses; a Locution VERB has no Core Features", async () => {
	// Er0 _1 hat2 _3 den4 _5 Faden6 _7 verloren8 .9
	const jev = fakeJev({ aux_m0: "u0", coverage: "Full" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("den Faden verlieren").ask },
		{
			sentence: sentenceOf("Er hat den Faden verloren."),
			unit: unitOf([2, 4, 6, 8], "Locution", "VERB"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.coreFeatures).toEqual({});
	expect(attestation.surface.inflectionalFeatures).toMatchObject({
		perfect: "Yes",
		future: null,
		passive: null,
		voice: null,
	});
	const asked = jev.sent[0]?.questions.aux_m0;
	expect(asked?.type === "choice" && asked.criteria.u0).toContain("perfect");
	expect(jev.questions("grammar")).toContain("coverage");
	expect(jev.questions("grammar")).not.toContain("prefix");
});

// Locutions and Sayings (ADR 0039), Fused members (ADR 0035), member roles (ADR 0041).

test("a Saying resolves with its coverage and fused pieces spelled as written", async () => {
	const segments: Segment[] = [
		word("Morgenstund"),
		space,
		word("hat"),
		space,
		word("Gold"),
		space,
		word("i", "in"),
		word("m", "dem"),
		space,
		word("Mund"),
		stop,
	];
	const jev = fakeJev({ coverage: "Full" });
	const luna = writes("Morgenstund hat Gold im Mund");
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([0, 2, 4, 6, 7, 9], "Saying", "Saying"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.normalizedSurface).toBe(
		"Morgenstund hat Gold im Mund",
	);
	expect(attestation.surface).not.toHaveProperty("inflectionalFeatures");
	expect(attestation.members[3]).toMatchObject({
		attested: "i",
		orthography: "Fused",
		component: 0,
	});
	expect(
		(luna.sent[0]?.input as { fixedMembers?: unknown } | undefined)
			?.fixedMembers,
	).toEqual({ m3: "i", m4: "m" });
	// No Member Role anywhere on the Attestation (ADR 0041).
	for (const member of attestation.members)
		expect(
			Object.keys(member).every((key) =>
				["attested", "orthography", "fusion", "component"].includes(
					key,
				),
			),
		).toBe(true);
});

test("a fused article piece is the noun's owned article and narrows its Case", async () => {
	const segments: Segment[] = [
		word("Wir"),
		space,
		word("sind"),
		space,
		word("i", "in"),
		word("m", "dem"),
		space,
		word("Wald"),
		stop,
	];
	const jev = fakeJev({ gender: "der", number: "Sing" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("Wald", ["dem", "Wald"]).ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([5, 7], "Lexeme", "NOUN"),
		},
	);
	const attestation = attested(result);
	expect(attestation.members[0]).toMatchObject({
		attested: "m",
		orthography: "Fused",
		fusion: {
			spelling: "im",
			components: [
				{ span: "i", surface: "in" },
				{ span: "m", surface: "dem" },
			],
		},
	});
	expect(attestation.surface.inflectionalFeatures).toMatchObject({
		case: "Dat",
	});
	expect(attestation.surface.normalizedSurface).toBe("Wald");
	// The table spells m; only Wald's spelling is judged.
	const asked = jev.sent[0]?.questions.orthography;
	expect(asked?.type === "choice" && Object.keys(asked.criteria)).toEqual([
		"None",
		"t1",
		"s1",
		"Unresolved",
	]);
});

test("an infinitive split at its infixed zu keeps its pieces' letters, glued in its Surface", async () => {
	const segments: Segment[] = [
		word("Er"),
		space,
		word("versucht"),
		space,
		word("hinaus"),
		word("zu"),
		word("laufen"),
		stop,
	];
	const jev = fakeJev({ prefix: "p0", verbForm: "Inf" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("hinauslaufen").ask },
		{
			sentence: sentenceOf("", segments),
			unit: unitOf([4, 6], "Lexeme", "VERB"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.normalizedSurface).toBe("hinauslaufen");
	expect(attestation.surface.lemma.coreFeatures).toMatchObject({
		hasSepPrefix: "hinaus",
	});
	expect(attestation.members[1]).toMatchObject({
		attested: "laufen",
		orthography: "Fused",
		component: 2,
	});
});

// The trace (#858).

test("the trace names the operation, its calls by executor and how the click came out", async () => {
	const { trace } = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("kommen").ask },
		{
			sentence: sentenceOf("Er kommt."),
			unit: unitOf([2], "Lexeme", "VERB"),
		},
	);
	expect(trace?.operation).toBe("resolve.grammar");
	expect(
		trace?.calls.map(({ stage, executor }) => [stage, executor]),
	).toEqual([
		["grammar", "jev"],
		["canonical", "luna"],
	]);
	expect(trace?.calls.map(({ inputTokens }) => inputTokens)).toEqual([
		100, 50,
	]);
	expect(trace?.resolution).toEqual({ outcome: "Resolved" });
});

test("PART is closed: an authored particle resolves with no Luna call, and a spelling none names is a Catalog Miss", async () => {
	// Er0 _1 kommt2 _3 nicht4 .5
	const luna = fakeLuna();
	const nicht = await resolveOnce(
		{ jev: fakeJev().ask, luna: luna.ask },
		{
			sentence: sentenceOf("Er kommt nicht."),
			unit: unitOf([4], "Lexeme", "PART"),
		},
	);
	expect(attested(nicht.result).surface.lemma).toMatchObject({
		canonicalForm: "nicht",
		coreFeatures: { polarity: "Neg" },
	});
	expect(luna.sent).toEqual([]);
	const unknown = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("blubb").ask },
		{
			sentence: sentenceOf("Er kommt blubb."),
			unit: unitOf([4], "Lexeme", "PART"),
		},
	);
	expect(unknown.result).toMatchObject({ _tag: "CatalogMiss" });
});

test("a VERB's Canonical Form carries its judged separable prefix and lexical reflexive", () => {
	const core = (
		hasSepPrefix: string | null,
		lexicallyReflexive = null as string | null,
	) => ({
		hasSepPrefix,
		lexicallyReflexive,
	});
	expect(verbHeadword("führen", core("vorbei"))).toBe("vorbeiführen");
	expect(verbHeadword("reinkommen", core("herein"))).toBe("hereinkommen");
	expect(verbHeadword("umkommen", core("herum"))).toBe("herumkommen");
	expect(verbHeadword("gehen", core("entlang"))).toBe("entlanggehen");
	expect(verbHeadword("übrig bleiben", core("übrig"))).toBe("übrig bleiben");
	expect(verbHeadword("erinnern", core(null, "Acc"))).toBe("sich erinnern");
	expect(verbHeadword("sich abfinden", core("ab", "Acc"))).toBe(
		"sich abfinden",
	);
	expect(verbHeadword("finden", core(null))).toBe("finden");
});

test("a judged gender the owned article rules out gives way to the likeliest gender jev weighed that agrees", async () => {
	const base = fakeJev({ number: "Sing" });
	// jev leans Neut for Tisch, which der in the nominative rules out.
	const jev: JevAsk = async (request, context) => {
		const response = await base.ask(request, context);
		return "gender" in request.questions
			? {
					...response,
					answers: {
						...response.answers,
						gender: {
							type: "choice",
							choice: "das",
							confidence: 0.6,
							probabilities: { das: 0.6, der: 0.35, die: 0.05 },
						},
					},
				}
			: response;
	};
	const { result } = await resolveOnce(
		{ jev, luna: writes("Tisch").ask },
		{
			sentence: sentenceOf("Der Tisch wackelt."),
			unit: unitOf([0, 2], "Lexeme", "NOUN"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.coreFeatures).toEqual({ gender: "Masc" });
	expect(attestation.surface.inflectionalFeatures).toMatchObject({
		case: "Nom",
		number: "Sing",
	});
});

test("an r- adverb is Shorthand without a judge: its her- or hin- words are the prefix options, and the judged prefix spells it", async () => {
	const jev = fakeJev({ prefix: "p0", mood: "Imp" });
	const luna = writes("reinkommen", ["komm", "rein"]);
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Komm doch rein!"),
			unit: unitOf([0, 4], "Lexeme", "VERB"),
		},
	);
	const prefix = jev.sent[0]?.questions.prefix;
	expect(prefix?.type === "choice" && prefix.criteria).toMatchObject({
		p0: "herein",
		p1: "hinein",
	});
	expect(
		prefix?.type === "choice" && Object.values(prefix.criteria),
	).not.toContain("rein");
	// The table spells rein, so no orthography question names it.
	expect(jev.sent[0]?.questions.orthography).toMatchObject({
		criteria: { t0: expect.any(String), s0: expect.any(String) },
	});
	const orthography = jev.sent[0]?.questions.orthography;
	expect(
		orthography?.type === "choice" && Object.keys(orthography.criteria),
	).not.toContain("t1");
	expect(
		(luna.sent[0]?.input as { fixedMembers?: unknown } | undefined)
			?.fixedMembers,
	).toEqual({ m1: "herein" });
	const attestation = attested(result);
	expect(attestation.surface.lemma).toMatchObject({
		canonicalForm: "hereinkommen",
		coreFeatures: { hasSepPrefix: "herein" },
	});
	expect(attestation.surface.normalizedSurface).toBe("komm herein");
	expect(attestation.members[1]).toEqual({
		attested: "rein",
		orthography: "Shorthand",
	});
});

test("a VERB's prefix options never offer a member that is no particle, such as its own participle", async () => {
	const jev = fakeJev({ prefix: "None" });
	await resolveOnce(
		{ jev: jev.ask, luna: writes("zerreiben").ask },
		{
			sentence: sentenceOf("Er hat es zerrieben."),
			unit: unitOf([2, 6], "Lexeme", "VERB"),
		},
	);
	const prefix = jev.sent[0]?.questions.prefix;
	expect(
		prefix === undefined ||
			(prefix.type === "choice" &&
				!Object.values(prefix.criteria).includes("zerrieben")),
	).toBe(true);
});

test("Luna is told which members are auxiliaries, which stay out of the headword", async () => {
	const luna = writes("schwimmen");
	await resolveOnce(
		{ jev: fakeJev({ aux_m0: "u0" }).ask, luna: luna.ask },
		{
			sentence: sentenceOf("Sie wird schwimmen."),
			unit: unitOf([2, 4], "Lexeme", "VERB"),
		},
	);
	expect(
		(luna.sent[0]?.input as { auxiliaries?: unknown } | undefined)
			?.auxiliaries,
	).toEqual(["m0"]);
	expect(luna.sent[0]?.systemPrompt).toContain("`auxiliaries`");
});

test("a Luna answer the transport kept no output for is refused with the transport's reason", async () => {
	const luna: LunaAsk = async () => ({
		output: undefined,
		metadata: { problem: "Luna refused: no" },
	});
	const failure = await Effect.runPromise(
		Effect.flip(
			createDumgen({ jev: fakeJev().ask, luna }).resolve.grammar({
				language: "de",
				sentence: sentenceOf("Er kommt."),
				unit: unitOf([2], "Lexeme", "VERB"),
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
	expect(failure).toBeInstanceOf(InvalidModelOutput);
	expect(String((failure as InvalidModelOutput).message)).toContain(
		"Luna refused: no",
	);
});

test("an ordinary noun shown in its plural keeps its singular's gender, while a plural-only noun has none", async () => {
	const base = fakeJev({ number: "Plur" });
	const leaning =
		(kind: string): JevAsk =>
		async (request, context) => {
			const response = await base.ask(request, context);
			return "gender" in request.questions
				? {
						...response,
						answers: {
							...response.answers,
							nounKind: picked(kind),
							gender: {
								type: "choice",
								choice: "None",
								confidence: 0.4,
								probabilities: {
									None: 0.4,
									die: 0.35,
									das: 0.2,
								},
							},
						},
					}
				: response;
		};
	const hands = await resolveOnce(
		{ jev: leaning("Ordinary"), luna: writes("Hand").ask },
		{
			sentence: sentenceOf("Hände klatschen."),
			unit: unitOf([0], "Lexeme", "NOUN"),
		},
	);
	expect(attested(hands.result).surface.lemma.coreFeatures).toEqual({
		gender: "Fem",
	});
	const people = await resolveOnce(
		{ jev: leaning("PluralOnly"), luna: writes("Leute").ask },
		{
			sentence: sentenceOf("Leute klatschen."),
			unit: unitOf([0], "Lexeme", "NOUN"),
		},
	);
	expect(attested(people.result).surface.lemma.coreFeatures).toEqual({
		gender: null,
	});
});

test("a split da or wo adverb and a bare w-word judged Shorthand get the headword the Rules give them", async () => {
	const split = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("da").ask },
		{
			sentence: sentenceOf("Da weiß ich nichts an."),
			unit: unitOf([0, 8], "Lexeme", "ADV"),
		},
	);
	expect(attested(split.result).surface.lemma.canonicalForm).toBe("daran");
	const shorthand = await resolveOnce(
		{
			jev: fakeJev({ orthography: "s0" }).ask,
			luna: writes("wo", ["wo"]).ask,
		},
		{
			sentence: sentenceOf("Es liegt wo."),
			unit: unitOf([4], "Lexeme", "ADV"),
		},
	);
	const attestation = attested(shorthand.result);
	expect(attestation.surface.lemma.canonicalForm).toBe("irgendwo");
	expect(attestation.surface.normalizedSurface).toBe("irgendwo");
	// raus on an ADV is judged heraus or hinaus, then spells the headword.
	const jev = fakeJev({ short_s6: "w1" });
	const out = await resolveOnce(
		{ jev: jev.ask, luna: writes("raus").ask },
		{
			sentence: sentenceOf("Der Zahn muss raus."),
			unit: unitOf([6], "Lexeme", "ADV"),
		},
	);
	expect(jev.questions("grammar")).toContain("short_s6");
	expect(attested(out.result).surface.lemma.canonicalForm).toBe("hinaus");
});

test("the comparable question offers No for a demonstrative or interrogative adverb such as so, and code reads it as no Degree", async () => {
	const jev = fakeJev({ comparable: "No" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("so").ask },
		{
			sentence: sentenceOf("Es war so laut."),
			unit: unitOf([4], "Lexeme", "ADV"),
		},
	);
	const asked = jev.sent[0]?.questions.comparable;
	expect(asked?.type === "choice" && asked.criteria.No).toContain(
		"a demonstrative, interrogative or relative adverb",
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.coreFeatures).toEqual({
		comparable: null,
	});
	expect(attestation.surface.inflectionalFeatures ?? null).toBeNull();
});

test("a Locution's or interjection's headword drops placeholders and members outside it, and an adpositional or conjunctional Locution has … exactly at its gaps", () => {
	const at = (
		text: string,
		segments: number[],
		family: string,
		kind: string,
	) => {
		const sentence = sentenceOf(text);
		const unit = unitOf(segments, family, kind);
		return targetOf(sentence, unit, unit.route as Route);
	};
	const nose = at(
		"Er tanzte ihr auf der Nase herum.",
		[2, 6, 8, 10, 12],
		"Locution",
		"VERB",
	);
	expect(
		guardedHeadword(nose, "jemandem auf der Nase herumtanzen", new Set()),
	).toBe("auf der Nase herumtanzen");
	const thanks = at("Vielen Dank für alles.", [0, 2, 4], "Locution", "INTJ");
	expect(guardedHeadword(thanks, "vielen Dank für …", new Set([2]))).toBe(
		"vielen Dank",
	);
	const care = at(
		"Sie nahm Rücksicht auf ihn.",
		[2, 4, 6],
		"Locution",
		"VERB",
	);
	expect(guardedHeadword(care, "Rücksicht auf … nehmen", new Set([2]))).toBe(
		"Rücksicht nehmen",
	);
	const similar = at(
		"Sie mag Äpfel oder Ähnliches.",
		[6, 8],
		"Locution",
		"ADV",
	);
	expect(guardedHeadword(similar, "oder … Ähnliches", new Set())).toBe(
		"oder Ähnliches",
	);
	const without = at("Er ging ohne zu grüßen.", [4, 6], "Locution", "SCONJ");
	expect(guardedHeadword(without, "ohne zu", new Set())).toBe("ohne … zu");
	const so = at(
		"Er sprach so leise, dass keiner es hörte.",
		[4, 9],
		"Locution",
		"SCONJ",
	);
	expect(guardedHeadword(so, "so dass", new Set())).toBe("so … dass");
});

test("an r- word's prefix jev leaves Unresolved is the likelier of its her- and hin- words, never None", async () => {
	const base = fakeJev({ mood: "Imp" });
	const jev: JevAsk = async (request, context) => {
		const response = await base.ask(request, context);
		return "prefix" in request.questions
			? {
					...response,
					answers: {
						...response.answers,
						prefix: {
							type: "choice",
							choice: "Unresolved",
							confidence: 0.4,
							probabilities: {
								Unresolved: 0.4,
								None: 0.3,
								p1: 0.2,
								p0: 0.1,
							},
						},
					},
				}
			: response;
	};
	const { result } = await resolveOnce(
		{ jev, luna: writes("reinkommen").ask },
		{
			sentence: sentenceOf("Komm doch rein!"),
			unit: unitOf([0, 4], "Lexeme", "VERB"),
		},
	);
	expect(attested(result).surface.lemma).toMatchObject({
		canonicalForm: "hineinkommen",
		coreFeatures: { hasSepPrefix: "hinein" },
	});
});
