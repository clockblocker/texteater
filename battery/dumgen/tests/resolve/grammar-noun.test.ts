import { expect, test } from "bun:test";
import type { JevAsk } from "../../src/segment/jev.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	picked,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

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
			unit: unitOf([0, 2], "Lexeme/NOUN"),
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.coreFeatures).toEqual({ gender: "Masc" });
	expect(attestation.surface).toMatchObject({
		inflectionalFeatures: {
			case: "Nom",
			number: "Sing",
		},
	});
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
			unit: unitOf([0], "Lexeme/NOUN"),
		},
	);
	expect(attested(hands.result).surface.lemma.coreFeatures).toEqual({
		gender: "Fem",
	});
	const people = await resolveOnce(
		{ jev: leaning("PluralOnly"), luna: writes("Leute").ask },
		{
			sentence: sentenceOf("Leute klatschen."),
			unit: unitOf([0], "Lexeme/NOUN"),
		},
	);
	expect(attested(people.result).surface.lemma.coreFeatures).toEqual({
		gender: null,
	});
});
