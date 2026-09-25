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
const preposition = (canonicalForm: string, adpType = "Prep") => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {
		abbr: null,
		adpType,
		extPos: null,
		foreign: null,
		partType: null,
	},
});
test("valency evidence names the owned member realizing its preposition", () => {
	const slot = {
		member: 1,
		complement: {
			kind: "Preposition",
			preposition: preposition("auf"),
			case: "Acc",
			referent: "Something",
		},
		realizedCase: "Acc",
	};
	const attestation = {
		unitKind: "Attestation",
		surface: {
			...verb,
			normalizedSurface: "wartet",
			inflectionalFeatures: {
				...verb.inflectionalFeatures,
				expletive: null,
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "wartet", orthography: "Standard" },
			{ attested: "auf", orthography: "Standard" },
		],
		expletiveEvidence: null,
		valencyEvidence: [slot],
	};
	expect(parseUnit(attestation).success).toBe(true);
	for (const valid of [[], [{ ...slot, member: null }]])
		expect(
			parseUnit({ ...attestation, valencyEvidence: valid }).success,
		).toBe(true);
	for (const invalid of [
		[{ ...slot, member: 0 }],
		[{ ...slot, member: 2 }],
		[slot, slot],
		[{ ...slot, realizedCase: "Dat" }],
		[
			{
				...slot,
				complement: {
					...slot.complement,
					preposition: preposition("für"),
				},
			},
		],
		[
			{
				...slot,
				complement: { kind: "Case", case: "Dat", referent: "Someone" },
			},
		],
	])
		expect(
			parseUnit({ ...attestation, valencyEvidence: invalid }).success,
		).toBe(false);
	expect(
		parseUnit({
			...attestation,
			members: [
				{ attested: "wartet", orthography: "Standard" },
				{ attested: "uaf", orthography: "Typo" },
			],
		}).success,
	).toBe(true);
});
test("a governor's preposition slot takes a case the ADP Case Table allows", () => {
	const attestation = (canonicalForm: string, grammaticalCase: string) => ({
		unitKind: "Attestation",
		surface: {
			...verb,
			normalizedSurface: "wartet",
			inflectionalFeatures: {
				...verb.inflectionalFeatures,
				expletive: null,
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "wartet", orthography: "Standard" },
			{ attested: canonicalForm, orthography: "Standard" },
		],
		expletiveEvidence: null,
		valencyEvidence: [
			{
				member: 1,
				complement: {
					kind: "Preposition",
					preposition: preposition(canonicalForm),
					case: grammaticalCase,
					referent: "Either",
				},
				realizedCase: grammaticalCase,
			},
		],
	});
	expect(parseUnit(attestation("auf", "Acc")).success).toBe(true);
	expect(parseUnit(attestation("auf", "Dat")).success).toBe(true);
	expect(parseUnit(attestation("für", "Acc")).success).toBe(true);
	expect(parseUnit(attestation("für", "Dat")).success).toBe(false);
});

// A free ADP occurrence records the case its complement took (ADR 0034).
const adpAttestation = (
	attested: string,
	canonicalForm: string,
	realizedCase: string | null,
	adpType = "Prep",
) => ({
	unitKind: "Attestation",
	members: [{ attested, orthography: "Standard" }],
	realizationCoverage: "Full",
	valencyEvidence:
		realizedCase === null
			? []
			: [
					{
						member: null,
						complement: {
							kind: "Case",
							case: realizedCase,
							referent: "Either",
						},
						realizedCase,
					},
				],
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: canonicalForm,
		spelling: "Canonical",
		surfaceFeatures: null,
		lemma: preposition(canonicalForm, adpType),
	},
});
test("an ADP Attestation records its realized case in a case the table allows", () => {
	for (const [attested, canonicalForm, realizedCase, adpType] of [
		["auf", "auf", "Dat", "Prep"],
		["auf", "auf", "Acc", "Prep"],
		["Wegen", "wegen", "Dat", "Prep"],
		["Wegen", "wegen", "Gen", "Prep"],
		["entlang", "entlang", "Acc", "Post"],
		["Entlang", "entlang", "Gen", "Prep"],
		["in", "in", "Dat", "Prep"],
		["Anstatt", "anstatt", null, "Prep"],
		["versus", "versus", "Acc", "Prep"],
	] as const)
		expect(
			parseUnit(
				adpAttestation(attested, canonicalForm, realizedCase, adpType),
			).success,
		).toBe(true);
	for (const [attested, canonicalForm, realizedCase, adpType] of [
		["für", "für", "Dat", "Prep"],
		["mit", "mit", "Acc", "Prep"],
		["auf", "auf", "Gen", "Prep"],
		["entlang", "entlang", "Gen", "Post"],
		["Entlang", "entlang", "Acc", "Prep"],
		["auf", "auf", "Nom", "Prep"],
	] as const)
		expect(
			parseUnit(
				adpAttestation(attested, canonicalForm, realizedCase, adpType),
			).success,
		).toBe(false);
	const valid = adpAttestation("auf", "auf", "Dat");
	const [slot] = valid.valencyEvidence;
	for (const invalid of [
		[slot, slot],
		[{ ...slot, member: 0 }],
		[{ ...slot, realizedCase: "Acc" }],
	])
		expect(parseUnit({ ...valid, valencyEvidence: invalid }).success).toBe(
			false,
		);
	const { valencyEvidence: _, ...missing } = valid;
	expect(parseUnit(missing).success).toBe(false);
});
