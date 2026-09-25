import { expect, test } from "bun:test";
import { checkIfGrundform, parseUnit } from "../src/index.js";

const noun = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "Haus",
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
test("noun parsing validates article agreement and rejects obsolete embedded fields", () => {
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
		{
			...noun,
			inflectionalFeatures: {
				...noun.inflectionalFeatures,
				article: null,
			},
		},
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
// Ich bin im Wald: i is the ADP in, m the article the noun owns (ADR 0035).
const im = {
	spelling: "im",
	components: [
		{ span: "i", surface: "in" },
		{ span: "m", surface: "dem" },
	],
};
const wald = {
	unitKind: "Attestation",
	surface: {
		...noun,
		normalizedSurface: "Wald",
		lemma: {
			...noun.lemma,
			canonicalForm: "Wald",
			coreFeatures: { gender: "Masc", hyph: null },
		},
	},
	realizationCoverage: "Full",
	members: [
		{ attested: "m", orthography: "Fused", fusion: im, component: 1 },
		{ attested: "Wald", orthography: "Standard" },
	],
	articleEvidence: { kind: "Owned", member: 0 },
	valencyEvidence: [],
};
test("a fused article is an owned Fused member of its noun", () => {
	expect(parseUnit(wald).success).toBe(true);
	for (const invalid of [
		{ ...wald, realizationCoverage: "Partial" },
		{ ...wald, articleEvidence: null },
		{ ...wald, articleEvidence: { kind: "Owned", member: 2 } },
		{
			...wald,
			members: [{ ...wald.members[0], component: 0 }, wald.members[1]],
		},
		{
			...wald,
			members: [
				{
					...wald.members[0],
					fusion: {
						...im,
						components: [
							{ span: "in", surface: "in" },
							{ span: "m", surface: "dem" },
						],
					},
				},
				wald.members[1],
			],
		},
		{
			...wald,
			members: [{ attested: "m", orthography: "Standard", component: 1 }],
		},
	])
		expect(parseUnit(invalid).success).toBe(false);
	// im Wald und Feld: Feld shares the article m and does not own it.
	const feld = {
		...wald,
		surface: {
			...wald.surface,
			normalizedSurface: "Feld",
			lemma: {
				...wald.surface.lemma,
				canonicalForm: "Feld",
				coreFeatures: { gender: "Neut", hyph: null },
			},
		},
		realizationCoverage: "Partial",
		members: [{ attested: "Feld", orthography: "Standard" }],
		articleEvidence: { kind: "Shared", article: wald.members[0] },
	};
	expect(parseUnit(feld).success).toBe(true);
	expect(parseUnit({ ...feld, realizationCoverage: "Full" }).success).toBe(
		false,
	);
	// Ich bin in Wald und Flur: a bare noun owns no article.
	const bare = {
		...wald,
		surface: {
			...wald.surface,
			inflectionalFeatures: {
				...wald.surface.inflectionalFeatures,
				article: "None",
			},
		},
		members: [wald.members[1]],
		articleEvidence: null,
	};
	expect(parseUnit(bare).success).toBe(true);
	expect(
		parseUnit({ ...bare, articleEvidence: { kind: "Owned", member: 0 } })
			.success,
	).toBe(false);
	expect(parseUnit({ ...bare, realizationCoverage: "Partial" }).success).toBe(
		false,
	);
});
test("a shortened article is a Shorthand member of its noun", () => {
	// Hast du 'ne Frage?
	expect(
		parseUnit({
			...wald,
			surface: {
				...noun,
				normalizedSurface: "Frage",
				lemma: {
					...noun.lemma,
					canonicalForm: "Frage",
					coreFeatures: { gender: "Fem", hyph: null },
				},
				inflectionalFeatures: {
					article: "Indefinite",
					case: "Acc",
					number: "Sing",
				},
			},
			members: [
				{ attested: "'ne", orthography: "Shorthand" },
				{ attested: "Frage", orthography: "Standard" },
			],
		}).success,
	).toBe(true);
});
test("an English noun owns its article across an adjective", () => {
	// the big house
	const house = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "en",
			normalizedSurface: "house",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "en",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "house",
				coreFeatures: {
					abbr: null,
					extPos: null,
					foreign: null,
					numForm: null,
					numType: null,
					style: null,
				},
			},
			inflectionalFeatures: { article: "Definite", number: "Sing" },
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "the", orthography: "Standard" },
			{ attested: "house", orthography: "Standard" },
		],
		articleEvidence: { kind: "Owned", member: 0 },
	};
	expect(parseUnit(house).success).toBe(true);
	expect(parseUnit({ ...house, articleEvidence: null }).success).toBe(false);
});
test("a hidden Hebrew article is a Fusion component that leaves its noun Partial", () => {
	// ישבנו בבית: ב is the ADP, the article ה has no letters of its own.
	const fusion = {
		spelling: "בבית",
		components: [
			{ span: "ב", surface: "ב" },
			{ span: "", surface: "ה" },
			{ span: "בית", surface: "בית" },
		],
	};
	const bayit = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "he",
			normalizedSurface: "בית",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "he",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "בית",
				coreFeatures: { abbr: null, gender: "Masc" },
			},
			inflectionalFeatures: { definite: "Def", number: "Sing" },
		},
		realizationCoverage: "Partial",
		members: [
			{ attested: "בית", orthography: "Fused", fusion, component: 2 },
		],
		articleEvidence: { kind: "Hidden", fusion, component: 1 },
	};
	expect(parseUnit(bayit).success).toBe(true);
	for (const invalid of [
		{ ...bayit, realizationCoverage: "Full" },
		{ ...bayit, articleEvidence: { kind: "Hidden", fusion, component: 2 } },
		{
			...bayit,
			surface: {
				...bayit.surface,
				inflectionalFeatures: { definite: "Ind", number: "Sing" },
			},
		},
	])
		expect(parseUnit(invalid).success).toBe(false);
});
const properNoun = (
	canonicalForm: string,
	article: "Definite" | null,
	gender: "Fem" | "Masc" | "Neut",
	grammaticalCase: "Acc" | "Dat" | "Nom",
) => ({
	unitKind: "Surface",
	language: "de",
	normalizedSurface: canonicalForm,
	spelling: "Canonical",
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "PROPN",
		canonicalForm,
		coreFeatures: { abbr: null, article, foreign: null, gender },
	},
	inflectionalFeatures: { case: grammaticalCase, number: "Sing" },
});
test("a proper noun cited with its article owns it like a common noun", () => {
	// Wir fahren in die Schweiz.
	const schweiz = {
		unitKind: "Attestation",
		surface: properNoun("Schweiz", "Definite", "Fem", "Acc"),
		realizationCoverage: "Full",
		members: [
			{ attested: "die", orthography: "Standard" },
			{ attested: "Schweiz", orthography: "Standard" },
		],
		articleEvidence: { kind: "Owned", member: 0 },
	};
	expect(parseUnit(schweiz).success).toBe(true);
	// Er badet im Rhein.
	const rhein = {
		...schweiz,
		surface: properNoun("Rhein", "Definite", "Masc", "Dat"),
		members: [
			{ attested: "m", orthography: "Fused", fusion: im, component: 1 },
			{ attested: "Rhein", orthography: "Standard" },
		],
	};
	expect(parseUnit(rhein).success).toBe(true);
	// unsere Schweiz: the name keeps its article where none is attested.
	expect(
		parseUnit({
			...schweiz,
			members: [schweiz.members[1]],
			articleEvidence: null,
		}).success,
	).toBe(true);
	for (const invalid of [
		{ ...schweiz, realizationCoverage: "Partial" },
		{ ...schweiz, articleEvidence: { kind: "Owned", member: 2 } },
		{
			...schweiz,
			surface: {
				...schweiz.surface,
				lemma: {
					...schweiz.surface.lemma,
					coreFeatures: {
						...schweiz.surface.lemma.coreFeatures,
						article: "Indefinite",
					},
				},
			},
		},
		// A singular name with an article needs a gender for its form.
		{
			...schweiz,
			surface: {
				...schweiz.surface,
				lemma: {
					...schweiz.surface.lemma,
					coreFeatures: {
						...schweiz.surface.lemma.coreFeatures,
						gender: null,
					},
				},
			},
		},
	])
		expect(parseUnit(invalid).success).toBe(false);
});
test("a proper noun cited bare owns no article", () => {
	// Ich wohne in Berlin.
	const berlin = {
		unitKind: "Attestation",
		surface: properNoun("Berlin", null, "Neut", "Dat"),
		realizationCoverage: "Full",
		members: [{ attested: "Berlin", orthography: "Standard" }],
		articleEvidence: null,
	};
	expect(parseUnit(berlin).success).toBe(true);
	// das alte Berlin: das is its own DET, never Berlin's article.
	expect(
		parseUnit({
			...berlin,
			members: [
				{ attested: "das", orthography: "Standard" },
				{ attested: "Berlin", orthography: "Standard" },
			],
			articleEvidence: { kind: "Owned", member: 0 },
		}).success,
	).toBe(false);
	expect(
		parseUnit({
			...berlin,
			realizationCoverage: "Partial",
			articleEvidence: {
				kind: "Shared",
				article: { attested: "das", orthography: "Standard" },
			},
		}).success,
	).toBe(false);
});
test("an English and a Hebrew proper noun own the article they are cited with", () => {
	// the Netherlands
	const netherlands = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "en",
			normalizedSurface: "Netherlands",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "en",
				family: "Lexeme",
				kind: "PROPN",
				canonicalForm: "Netherlands",
				coreFeatures: {
					abbr: null,
					article: "Definite",
					extPos: null,
					style: null,
				},
			},
			inflectionalFeatures: { number: "Plur" },
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "the", orthography: "Standard" },
			{ attested: "Netherlands", orthography: "Standard" },
		],
		articleEvidence: { kind: "Owned", member: 0 },
	};
	expect(parseUnit(netherlands).success).toBe(true);
	// הירדן: ה is the name's own Fused member.
	const fusion = {
		spelling: "הירדן",
		components: [
			{ span: "ה", surface: "ה" },
			{ span: "ירדן", surface: "ירדן" },
		],
	};
	const yarden = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "he",
			normalizedSurface: "ירדן",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "he",
				family: "Lexeme",
				kind: "PROPN",
				canonicalForm: "ירדן",
				coreFeatures: {
					abbr: null,
					article: "Definite",
					gender: "Masc",
				},
			},
			inflectionalFeatures: { number: "Sing" },
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "ה", orthography: "Fused", fusion, component: 0 },
			{ attested: "ירדן", orthography: "Fused", fusion, component: 1 },
		],
		articleEvidence: { kind: "Owned", member: 0 },
	};
	expect(parseUnit(yarden).success).toBe(true);
	const bare = {
		...yarden,
		surface: {
			...yarden.surface,
			lemma: {
				...yarden.surface.lemma,
				coreFeatures: {
					...yarden.surface.lemma.coreFeatures,
					article: null,
				},
			},
		},
	};
	expect(parseUnit(bare).success).toBe(false);
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
test("an adjective or noun Attestation names its owned governed preposition like a verb", () => {
	const auf = preposition("auf");
	const slot = {
		member: 0,
		complement: {
			kind: "Preposition",
			preposition: auf,
			case: "Acc",
			referent: "Someone",
		},
		realizedCase: "Acc",
	};
	// Auf ihn bin ich stolz: the governed auf stands apart from its adjective.
	const adjective = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: "stolz",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "ADJ",
				canonicalForm: "stolz",
				coreFeatures: {
					abbr: null,
					foreign: null,
					numType: null,
					variant: null,
				},
			},
			inflectionalFeatures: {
				case: null,
				degree: "Pos",
				gender: null,
				number: null,
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "Auf", orthography: "Standard" },
			{ attested: "stolz", orthography: "Standard" },
		],
		valencyEvidence: [slot],
	};
	expect(parseUnit(adjective).success).toBe(true);
	expect(parseUnit({ ...adjective, valencyEvidence: [] }).success).toBe(true);
	for (const invalid of [
		[{ ...slot, member: 1 }],
		[{ ...slot, member: 2 }],
		[slot, slot],
	])
		expect(
			parseUnit({ ...adjective, valencyEvidence: invalid }).success,
		).toBe(false);
	const { valencyEvidence: _omitted, ...withoutEvidence } = adjective;
	expect(parseUnit(withoutEvidence).success).toBe(false);
	// die Angst ... vor Hunden: the article opens the noun, vor is governed.
	const angst = {
		unitKind: "Attestation",
		surface: {
			...noun,
			normalizedSurface: "Angst",
			lemma: {
				...noun.lemma,
				canonicalForm: "Angst",
				coreFeatures: { gender: "Fem", hyph: null },
			},
			inflectionalFeatures: {
				article: "Definite",
				case: "Nom",
				number: "Sing",
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "die", orthography: "Standard" },
			{ attested: "Angst", orthography: "Standard" },
			{ attested: "vor", orthography: "Standard" },
		],
		articleEvidence: { kind: "Owned", member: 0 },
		valencyEvidence: [
			{
				member: 2,
				complement: {
					kind: "Preposition",
					preposition: preposition("vor"),
					case: "Dat",
					referent: "Something",
				},
				realizedCase: "Dat",
			},
		],
	};
	expect(parseUnit(angst).success).toBe(true);
	expect(
		parseUnit({
			...angst,
			valencyEvidence: [{ ...angst.valencyEvidence[0], member: 1 }],
		}).success,
	).toBe(false);
});
