import { expect, test } from "bun:test";
import { checkIfGrundform, parseUnit } from "../src/index.js";

const noun = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "dem Haus",
	spelling: "Canonical",
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Haus",
		coreFeatures: { gender: "Neut", hyph: null },
	},
	inflectionalFeatures: { article: "Definite", case: "Dat", number: "Sing" },
} as const;
const verb = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "es gibt",
	spelling: "Canonical",
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "geben",
		coreFeatures: {
			hasGovPrep: null,
			hasSepPrefix: null,
			lexicallyReflexive: null,
			verbType: null,
		},
	},
	inflectionalFeatures: {
		verbForm: "Fin",
		tense: "Pres",
		mood: "Ind",
		person: "3",
		number: "Sing",
		expletive: "Subject",
		perfect: null,
		future: null,
		passive: null,
		voice: null,
	},
} as const;
test("noun parsing validates feature-derived agreement and rejects obsolete embedded fields", () => {
	const result = parseUnit(noun);
	expect(result.success).toBe(true);
	if (!result.success || result.chain.unitKind !== "Surface")
		throw Error("Expected Surface");
	expect(checkIfGrundform(result.chain.value)).toEqual({
		success: true,
		value: false,
	});
	expect(result.chain.value.lemma).toEqual(noun.lemma);
	for (const invalid of [
		{ ...noun, articleReference: null },
		{ ...noun, normalizedSurface: "den Haus" },
		{
			...noun,
			inflectionalFeatures: { ...noun.inflectionalFeatures, case: null },
		},
		{
			...noun,
			inflectionalFeatures: {
				...noun.inflectionalFeatures,
				article: "Indefinite",
				number: "Plur",
			},
		},
	])
		expect(parseUnit(invalid).success).toBe(false);
});
test("expletive grammar validates agreement without changing the verb Lemma", () => {
	expect(parseUnit(verb).success).toBe(true);
	for (const invalid of [
		{ ...verb, expletiveReference: null },
		{ ...verb, normalizedSurface: "gibt" },
		{
			...verb,
			inflectionalFeatures: { ...verb.inflectionalFeatures, person: "1" },
		},
		{
			...verb,
			inflectionalFeatures: {
				...verb.inflectionalFeatures,
				number: "Plur",
			},
		},
		{
			...verb,
			inflectionalFeatures: {
				...verb.inflectionalFeatures,
				expletive: "Object",
			},
		},
	])
		expect(parseUnit(invalid).success).toBe(false);
	const ordinary = parseUnit({
		...verb,
		normalizedSurface: "gibt",
		inflectionalFeatures: { ...verb.inflectionalFeatures, expletive: null },
	});
	expect(ordinary.success).toBe(true);
	if (ordinary.success && ordinary.chain.unitKind === "Surface")
		expect(ordinary.chain.value.lemma).toEqual(verb.lemma);
});
test("subject evidence retains capitalization and genuine typos in an owned member", () => {
	for (const evidence of [
		{ attested: "Es", orthography: "Standard" },
		{ attested: "Ess", orthography: "Typo" },
	]) {
		const attestation = {
			unitKind: "Attestation",
			surface: verb,
			realizationCoverage: "Full",
			members: [evidence, { attested: "gibt", orthography: "Standard" }],
			expletiveEvidence: evidence,
		};
		expect(parseUnit(attestation).success).toBe(true);
		expect(
			parseUnit({ ...attestation, expletiveEvidence: null }).success,
		).toBe(false);
		expect(
			parseUnit({
				...attestation,
				expletiveEvidence: { attested: "unowned", orthography: "Typo" },
			}).success,
		).toBe(false);
		expect(
			parseUnit({ ...attestation, realizationCoverage: "Partial" })
				.success,
		).toBe(false);
	}
});
