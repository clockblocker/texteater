import { expect, test } from "bun:test";
import {
	hebrewGrammarEvidencePrompt,
	hebrewGrammarEvidenceSchema,
	validateHebrewGrammarEvidence,
} from "../../src/resolve/he/grammar-evidence.js";

const noun = (definite = "Cons") => ({
	unitKind: "Surface",
	language: "he",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "גג",
		coreFeatures: { abbr: null, gender: "Masc" },
	},
	normalizedSurface: "גג",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: { definite, number: "Sing" },
});
const complement = { memberIndexes: [2, 3], exactText: "הַבַּיִת" };
const construct = { kind: "NOUN", state: "Construct", complement };
const base = {
	route: "NOUN",
	surface: noun(),
	evidence: construct,
	segments: ["גַּג", " ", "הַ", "בַּיִת"],
	targetIndexes: [0],
};
const valid = (
	changes: Partial<Parameters<typeof validateHebrewGrammarEvidence>[0]> = {},
) => validateHebrewGrammarEvidence({ ...base, ...changes });

test("construct witness uses exact ordered source segments outside target", () => {
	expect(valid()).toBe(true);
});

test("construct rejects absent, empty, duplicate, unsorted, fractional and out-of-range witnesses", () => {
	for (const memberIndexes of [[], [0], [-1], [4], [2, 2], [3, 2], [2.5]]) {
		expect(
			valid({
				evidence: {
					...construct,
					complement: { memberIndexes, exactText: "הַבַּיִת" },
				},
			}),
		).toBe(false);
	}
	for (const complement of [null, {}, { memberIndexes: [2, 3] }])
		expect(valid({ evidence: { ...construct, complement } })).toBe(false);
});

test("source anchors do not normalize niqqud or invent whitespace", () => {
	for (const exactText of ["הבית", "הַ בַּיִת", "invented"])
		expect(
			valid({
				evidence: {
					...construct,
					complement: { ...complement, exactText },
				},
			}),
		).toBe(false);
});

test("noun state must agree with native Surface inflectionalFeatures", () => {
	for (const definite of ["Ind", "Def"])
		expect(valid({ surface: noun(definite) })).toBe(false);
	for (const definite of ["Ind", "Def"])
		expect(
			valid({
				surface: noun(definite),
				evidence: { kind: "NOUN", state: "Absolute", complement: null },
			}),
		).toBe(true);
	expect(
		valid({
			evidence: { kind: "NOUN", state: "Absolute", complement: null },
		}),
	).toBe(false);
});

test("Unknown abstains even when surface is absolute; elliptical construct without witness abstains", () => {
	expect(
		valid({
			surface: noun("Ind"),
			evidence: { kind: "NOUN", state: "Unknown", complement: null },
		}),
	).toBe(false);
	expect(valid({ evidence: { ...construct, complement: null } })).toBe(false);
});

test("evidence and anchors are strict objects", () => {
	for (const evidence of [
		null,
		{ ...construct, explanation: "guess" },
		{ ...construct, kind: "VERB" },
		{ ...construct, complement: { ...complement, extra: true } },
	])
		expect(valid({ evidence })).toBe(false);
});

test("malformed source, target membership and route mismatch reject without throwing", () => {
	for (const targetIndexes of [[], [4], [-1], [0, 0], [0.5]])
		expect(valid({ targetIndexes })).toBe(false);
	for (const surface of [
		null,
		{},
		{ ...noun(), language: "de" },
		{ ...noun(), lemma: { ...noun().lemma, kind: "VERB" } },
	])
		expect(valid({ surface })).toBe(false);
});

const verb = {
	unitKind: "Surface",
	language: "he",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "אמר",
		coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
	},
	normalizedSurface: "אומרים",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: {
		definite: null,
		gender: "Masc",
		mood: null,
		number: "Plur",
		person: null,
		polarity: null,
		tense: null,
		verbForm: "Part",
		voice: "Act",
	},
};
const verbEvidence = {
	kind: "VERB",
	binyan: "PAAL",
	citationRole: "Past3ms",
	occurrence: { memberIndexes: [1], exactText: "אוֹמְרִים" },
};
const verbBase = {
	route: "VERB",
	surface: verb,
	evidence: verbEvidence,
	segments: ["הם ", "אוֹמְרִים"],
	targetIndexes: [1],
};
const validVerb = (
	changes: Partial<Parameters<typeof validateHebrewGrammarEvidence>[0]> = {},
) => validateHebrewGrammarEvidence({ ...verbBase, ...changes });

test("verb binyan agrees with native Lemma core and both citation roles are supported", () => {
	expect(validVerb()).toBe(true);
	expect(
		validVerb({
			evidence: { ...verbEvidence, citationRole: "Restricted" },
		}),
	).toBe(true);
	for (const binyan of [null, "PIEL", "invented"])
		expect(validVerb({ evidence: { ...verbEvidence, binyan } })).toBe(
			false,
		);
	expect(
		validVerb({
			surface: {
				...verb,
				lemma: {
					...verb.lemma,
					coreFeatures: { hebBinyan: null, hebExistential: null },
				},
			},
		}),
	).toBe(false);
});

test("Part cannot carry finite person or tense", () => {
	for (const features of [{ person: "3" }, { tense: "Past" }])
		expect(
			validVerb({
				surface: {
					...verb,
					inflectionalFeatures: {
						...verb.inflectionalFeatures,
						...features,
					},
				},
			}),
		).toBe(false);
});

test("verb occurrence must anchor exactly this target, not another source member", () => {
	for (const occurrence of [
		{ memberIndexes: [0], exactText: "הם " },
		{ memberIndexes: [1], exactText: "אומרים" },
		{ memberIndexes: [0, 1], exactText: "הם אוֹמְרִים" },
	])
		expect(validVerb({ evidence: { ...verbEvidence, occurrence } })).toBe(
			false,
		);
});

test("verb discriminator, citationRole, missing fields and unknown keys are strict", () => {
	for (const evidence of [
		{ ...verbEvidence, citationRole: "Infinitive" },
		{ ...verbEvidence, extra: true },
		{ ...verbEvidence, occurrence: null },
		{ ...verbEvidence, binyan: undefined },
	])
		expect(validVerb({ evidence })).toBe(false);
});

test("other routes accept null evidence only", () => {
	expect(valid({ route: "ADJ", evidence: null })).toBe(true);
	expect(valid({ route: "ADJ", evidence: construct })).toBe(false);
});

test("schema and prompt expose transient evidence without semantic identity fields", () => {
	expect(hebrewGrammarEvidenceSchema).toHaveProperty("anyOf");
	const serialized = JSON.stringify(hebrewGrammarEvidenceSchema);
	for (const field of [
		"memberIndexes",
		"exactText",
		"citationRole",
		"Unknown",
	])
		expect(serialized).toContain(field);
	expect(serialized).not.toContain("emoji");
	expect(hebrewGrammarEvidencePrompt).toContain("not proof");
	expect(hebrewGrammarEvidencePrompt).toContain("Unknown");
});
