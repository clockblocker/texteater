import { expect, test } from "bun:test";
import { isSyncreticUnit, isSyncretism } from "dumling";
import * as Effect from "effect/Effect";
import { InvalidModelOutput, ProviderFailure } from "../../src/errors.js";
import { fakeDumgen } from "./../service-test-adapter.js";
import { writes } from "./grammar-fixtures.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
} from "./support.js";

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
	const dumgen = fakeDumgen({ jev: jev.ask, luna: fakeLuna().ask });
	const sentence = sentenceOf("Er kommt.");
	const input = {
		language: "de" as const,
		sentence,
		unit: unitOf([2], "Lexeme/VERB"),
		neighbours: {},
		lemmaCandidates: [],
	};
	await expect(
		Effect.runPromise(
			dumgen.resolve.grammar({ ...input, language: "en" as "de" }),
		),
	).rejects.toThrow('No grammar resolver registered for "en"');
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
				unit: unitOf([1], "Lexeme/VERB"),
			}),
		),
	).rejects.toThrow("ResolvableText");
	expect(jev.sent).toEqual([]);
});

// The click API's error channel (#859, #858).

test("a transport failure is a ProviderFailure and an unusable answer an InvalidModelOutput; nothing is retried", async () => {
	const sentence = sentenceOf("Er kommt.");
	const unit = unitOf([2], "Lexeme/VERB");
	const down = fakeJev({}, { fail: () => true });
	const failure = await Effect.runPromise(
		Effect.flip(
			fakeDumgen({
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
			fakeDumgen({
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
	// Er0 _1 grüßt2 _3 der4 _5 Anna6 .7 (a PROPN's Case runs beside Luna)
	const jev = fakeJev(
		{ gender: "die", number: "Sing", article: "Bare" },
		{ fail: (stage) => stage === "case" },
	);
	const luna = fakeLuna(undefined, { delayMs: 50 });
	const failure = await Effect.runPromise(
		Effect.flip(
			fakeDumgen({ jev: jev.ask, luna: luna.ask }).resolve.grammar({
				language: "de",
				sentence: sentenceOf("Er hilft der Anna."),
				unit: unitOf([4, 6], "Lexeme/PROPN"),
				neighbours: {},
				lemmaCandidates: [],
			}),
		),
	);
	expect(failure).toBeInstanceOf(ProviderFailure);
	expect(luna.aborted).toEqual(["canonical"]);
});

test("a common NOUN's gender is the article Luna writes with its headword, and its Case is asked over the cells that gender leaves", async () => {
	// jev leans das for Kran; Luna writes der.
	const jev = fakeJev({ gender: "das", number: "Sing", case: "Acc" });
	const luna = fakeLuna(({ members }) => ({
		canonicalForm: "Kran",
		members: members.map(({ text }) => text),
		article: "der",
	}));
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: luna.ask },
		{
			sentence: sentenceOf("Sie sieht den Kran."),
			unit: unitOf([4, 6], "Lexeme/NOUN"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.coreFeatures).toEqual({ gender: "Masc" });
	expect(attestation.surface).toMatchObject({
		inflectionalFeatures: {
			case: "Acc",
			number: "Sing",
		},
	});
	expect(luna.sent[0]?.outputSchema).toMatchObject({
		properties: { article: { enum: ["der", "die", "das", "none"] } },
	});
	// A Luna article the singular head's own article rules out gives way
	// to jev's reading: der Tisch is never das.
	const wrong = fakeLuna(({ members }) => ({
		canonicalForm: "Tisch",
		members: members.map(({ text }) => text),
		article: "das",
	}));
	const table = await resolveOnce(
		{
			jev: fakeJev({ gender: "der", number: "Sing" }).ask,
			luna: wrong.ask,
		},
		{
			sentence: sentenceOf("Der Tisch wackelt."),
			unit: unitOf([0, 2], "Lexeme/NOUN"),
		},
	);
	expect(attested(table.result).surface.lemma.coreFeatures).toEqual({
		gender: "Masc",
	});
	// none: a plural-only noun has no gender.
	const people = fakeLuna(({ members }) => ({
		canonicalForm: "Leute",
		members: members.map(({ text }) => text),
		article: "none",
	}));
	const plural = await resolveOnce(
		{
			jev: fakeJev({ gender: "die", number: "Plur" }).ask,
			luna: people.ask,
		},
		{
			sentence: sentenceOf("Leute warten."),
			unit: unitOf([0], "Lexeme/NOUN"),
		},
	);
	expect(attested(plural.result).surface.lemma.coreFeatures).toEqual({
		gender: null,
	});
	// A noun dumcorpus lists as having no singular stays genderless even when
	// Luna writes die (Rule de/plural-only-noun-has-no-gender).
	const costs = fakeLuna(({ members }) => ({
		canonicalForm: "Kosten",
		members: members.map(({ text }) => text),
		article: "die",
	}));
	const pluraleTantum = await resolveOnce(
		{
			jev: fakeJev({ gender: "die", number: "Plur", case: "Nom" }).ask,
			luna: costs.ask,
		},
		{
			sentence: sentenceOf("Die Kosten steigen."),
			unit: unitOf([0, 2], "Lexeme/NOUN"),
		},
	);
	const tantum = attested(pluraleTantum.result).surface;
	expect(tantum.lemma.coreFeatures).toEqual({ gender: null });
	expect(tantum).toMatchObject({
		inflectionalFeatures: {
			gender: null,
			number: "Plur",
		},
	});
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
			unit: unitOf([4, 6], "Lexeme/NOUN"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma).toMatchObject({
		canonicalForm: "Kind",
		coreFeatures: { gender: "Neut" },
	});
	expect(attestation.surface).toHaveProperty("inflectionalFeatures", {
		case: "Dat",
		gender: null,
		number: "Plur",
	});
	expect(attestation).toHaveProperty("articleEvidence", {
		kind: "Owned",
		member: 0,
	});
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
			unit: unitOf([0, 2], "Lexeme/NOUN"),
		},
	);
	expect(attested(result).surface).toMatchObject({
		inflectionalFeatures: {
			case: "Nom",
		},
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
	const unit = unitOf([4, 6], "Lexeme/NOUN");
	const jev = fakeJev({ gender: "die", number: "Sing", case: "Dat" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: writes("Frau", ["der", "Frau"]).ask },
		{ sentence, unit },
	);
	expect(attested(result).surface).toMatchObject({
		inflectionalFeatures: {
			case: "Dat",
		},
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
			unit: unitOf([2], "Lexeme/NOUN"),
		},
	);
	expect(attested(result).surface).toHaveProperty("inflectionalFeatures", {
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
			unit: unitOf([0], "Lexeme/DET", {
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
			unit: unitOf([0], "Lexeme/PRON", {
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
			unit: unitOf([0], "Lexeme/PRON"),
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
			unit: unitOf([0], "Lexeme/PRON", {
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
	unit: unitOf([4], "Lexeme/PRON", {
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
	expect(isSyncreticUnit(lemma) && lemma.syncretic).toEqual(["gender"]);
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
	expect(isSyncreticUnit(lemma)).toBe(false);
	expect(lemma.coreFeatures).toHaveProperty(
		"gender",
		expect.stringMatching(/^(Masc|Neut)$/),
	);
});

const jedem = {
	sentence: sentenceOf("Ich helfe jedem."),
	unit: unitOf([4], "Lexeme/PRON", {
		kind: "PRON",
		canonicalForm: "jeder",
		pronType: "Tot",
	}),
};

test("a stem's gender-only cells offer its Surface Syncretism, which an open referent attests", async () => {
	const jev = fakeJev({ cell: "s0" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{ ...jedem, neighbours: { before: "Heute ist Markt." } },
	);
	const { surface } = attested(result);
	expect(surface.lemma.canonicalForm).toBe("jeder");
	expect(surface.lemma).not.toHaveProperty("syncretic");
	expect(surface).toMatchObject({
		normalizedSurface: "jedem",
		syncretic: ["gender"],
		inflectionalFeatures: { case: "Dat", number: "Sing", gender: null },
	});
	const syncretism =
		result._tag === "Resolved" ? result.attestation.surface : undefined;
	if (syncretism === undefined || !isSyncretism(syncretism))
		throw Error("Expected a Surface Syncretism");
	expect(
		syncretism.syncretized.map((unit) => {
			const bag: Readonly<Record<string, unknown>> | null =
				"inflectionalFeatures" in unit
					? unit.inflectionalFeatures
					: null;
			return bag?.gender;
		}),
	).toEqual(["Masc", "Neut"]);
	const cell = jev.sent[0]?.questions.cell;
	expect(Object.keys(cell?.type === "choice" ? cell.criteria : {})).toEqual([
		"o0",
		"o1",
		"s0",
		"Unresolved",
	]);
	expect(jev.sent[0]?.state.neighbours).toEqual({
		before: "Heute ist Markt.",
	});
});

test("a stem whose referent the sentence settles attests the settled Surface", async () => {
	const jev = fakeJev({ cell: "o1" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Von den Kindern helfe ich jedem."),
			unit: unitOf([10], "Lexeme/PRON", {
				kind: "PRON",
				canonicalForm: "jeder",
				pronType: "Tot",
			}),
		},
	);
	const { surface } = attested(result);
	expect(surface).not.toHaveProperty("syncretic");
	expect(surface).toMatchObject({
		inflectionalFeatures: { case: "Dat", gender: "Neut" },
	});
});

test("standalone allem means 'everything': its cell question offers no Syncretism", async () => {
	const jev = fakeJev({ cell: "o1" });
	const { result } = await resolveOnce(
		{ jev: jev.ask, luna: fakeLuna().ask },
		{
			sentence: sentenceOf("Mit allem bin ich einverstanden."),
			unit: unitOf([2], "Lexeme/PRON", {
				kind: "PRON",
				canonicalForm: "alle",
				pronType: "Tot",
			}),
			neighbours: { before: "Heute ist Markt." },
		},
	);
	const cell = jev.sent[0]?.questions.cell;
	const criteria = cell?.type === "choice" ? cell.criteria : {};
	expect(Object.keys(criteria)).toEqual(["o0", "o1", "Unresolved"]);
	expect(criteria.o1).toContain("neuter");
	const { surface } = attested(result);
	expect(surface).not.toHaveProperty("syncretic");
	expect(surface).toMatchObject({
		normalizedSurface: "allem",
		inflectionalFeatures: { case: "Dat", number: "Sing", gender: "Neut" },
	});
});
