import { expect, test } from "bun:test";
import { parseUnit } from "../src/index.js";
import { noun, verb } from "./composition-fixtures.js";

test("a noun Surface is its own form and marks no article", () => {
	const result = parseUnit(noun);
	expect(result.success).toBe(true);
	if (!result.success || result.chain.unitKind !== "Surface")
		throw Error("Expected Surface");
	expect(result.chain.value.lemma).toEqual(noun.lemma);
	for (const invalid of [
		{ ...noun, articleReference: null },
		{
			...noun,
			inflectionalFeatures: {
				...noun.inflectionalFeatures,
				article: "Definite",
			},
		},
	])
		expect(parseUnit(invalid).success).toBe(false);
});
test("a genderless noun marks the gender its singular form shows", () => {
	// der Reisende, ein Verletzter: the Lemma has no gender, the Surface does.
	const reisende = {
		...noun,
		normalizedSurface: "Reisende",
		lemma: {
			...noun.lemma,
			canonicalForm: "Reisende",
			coreFeatures: { gender: null },
		},
		inflectionalFeatures: { case: "Nom", gender: "Masc", number: "Sing" },
	} as const;
	const verletzter = {
		...reisende,
		normalizedSurface: "Verletzter",
		lemma: { ...reisende.lemma, canonicalForm: "Verletzte" },
	} as const;
	const angestellten = {
		...reisende,
		normalizedSurface: "Angestellten",
		lemma: { ...reisende.lemma, canonicalForm: "Angestellte" },
		inflectionalFeatures: {
			...reisende.inflectionalFeatures,
			gender: null,
			number: "Plur",
		},
	} as const;
	for (const valid of [reisende, verletzter, angestellten])
		expect(parseUnit(valid).success).toBe(true);
	for (const invalid of [
		// A singular with neither a Lemma nor a Surface gender.
		{
			...reisende,
			inflectionalFeatures: {
				...reisende.inflectionalFeatures,
				gender: null,
			},
		},
		// A plural marks none.
		{
			...angestellten,
			inflectionalFeatures: {
				...angestellten.inflectionalFeatures,
				gender: "Masc",
			},
		},
		// A Lemma with a gender leaves the Surface's unmarked.
		{
			...noun,
			inflectionalFeatures: {
				...noun.inflectionalFeatures,
				gender: "Neut",
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
			valencyEvidence: [],
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
// A clitic 's is a way of writing es: Fused in Mir geht's gut, Shorthand in
// Wenn 's morgen regnet.
const fusedEs = (attested: string, spelling: string) => ({
	attested,
	orthography: "Fused",
	fusion: {
		spelling,
		components: [
			{ span: "geht", surface: "geht" },
			{ span: attested, surface: "es" },
		],
	},
	component: 1,
});
const gehtEs = {
	...verb,
	normalizedSurface: "geht es",
	lemma: { ...verb.lemma, canonicalForm: "gehen" },
} as const;
const expletiveAttestation = (evidence: object) => ({
	unitKind: "Attestation",
	surface: gehtEs,
	realizationCoverage: "Full",
	members: [{ attested: "geht", orthography: "Standard" }, evidence],
	expletiveEvidence: evidence,
	valencyEvidence: [],
});
test("subject evidence is an owned member, whatever it spells", () => {
	// dumcorpus checks that the member spells es (ADR 0041).
	for (const evidence of [
		fusedEs("'s", "geht's"),
		{ attested: "'s", orthography: "Shorthand" },
		{ attested: "'n", orthography: "Shorthand" },
	])
		expect(parseUnit(expletiveAttestation(evidence)).success).toBe(true);
	const unowned = expletiveAttestation(fusedEs("'s", "geht's"));
	expect(
		parseUnit({ ...unowned, members: [unowned.members[0]] }).success,
	).toBe(false);
});
// Ich bin im Wald: i is the ADP in, m the article the noun owns (ADR 0035).
