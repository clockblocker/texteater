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
	inflectionalFeatures: { case: "Dat", gender: null, number: "Sing" },
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
test("a noun Surface is its own form and marks no article", () => {
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
			coreFeatures: { gender: null, hyph: null },
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
	// Ich bin in Wald und Flur: a bare noun owns no article, and its Surface
	// is the same as the one with an article.
	const bare = { ...wald, members: [wald.members[1]], articleEvidence: null };
	expect(parseUnit(bare).success).toBe(true);
	expect(parseUnit({ ...bare, realizationCoverage: "Partial" }).success).toBe(
		false,
	);
	// kein Haus: kein is a DET of its own, so Haus has no article evidence.
	expect(
		parseUnit({
			...bare,
			surface: {
				...noun,
				inflectionalFeatures: {
					...noun.inflectionalFeatures,
					case: "Nom",
				},
			},
			members: [{ attested: "Haus", orthography: "Standard" }],
		}).success,
	).toBe(true);
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
					case: "Acc",
					gender: null,
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
test("an English noun owns its article across an adjective, and its Surface stays one", () => {
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
			inflectionalFeatures: { number: "Sing" },
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "the", orthography: "Standard" },
			{ attested: "house", orthography: "Standard" },
		],
		articleEvidence: { kind: "Owned", member: 0 },
	};
	expect(parseUnit(house).success).toBe(true);
	// the books, books and some books attest one Surface books.
	const books = {
		...house.surface,
		normalizedSurface: "books",
		lemma: { ...house.surface.lemma, canonicalForm: "book" },
		inflectionalFeatures: { number: "Plur" },
	};
	const surfaces = [
		{
			...house,
			surface: books,
			members: [
				house.members[0],
				{ attested: "books", orthography: "Standard" },
			],
		},
		{
			...house,
			surface: books,
			members: [{ attested: "books", orthography: "Standard" }],
			articleEvidence: null,
		},
	].map((attestation) => {
		const parsed = parseUnit(attestation);
		if (!parsed.success || parsed.chain.unitKind !== "Attestation")
			throw Error("Expected an Attestation");
		return parsed.chain.value.surface;
	});
	expect(surfaces[0]).toEqual(surfaces[1]);
	expect(
		parseUnit({
			...books,
			inflectionalFeatures: { article: "Definite", number: "Plur" },
		}).success,
	).toBe(false);
});
test("the Head standing in for an elided noun owns the article", () => {
	// Ich nehme den roten.
	const roten = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: "roten",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "ADJ",
				canonicalForm: "rot",
				coreFeatures: {
					abbr: null,
					comparable: "Yes",
					foreign: null,
					numType: null,
					variant: null,
				},
			},
			inflectionalFeatures: {
				case: "Acc",
				degree: "Pos",
				gender: "Masc",
				number: "Sing",
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "den", orthography: "Standard" },
			{ attested: "roten", orthography: "Standard" },
		],
		articleEvidence: { kind: "Owned", member: 0 },
		valencyEvidence: [],
	};
	expect(parseUnit(roten).success).toBe(true);
	expect(
		parseUnit({ ...roten, realizationCoverage: "Partial" }).success,
	).toBe(false);
	// the rich
	const rich = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "en",
			normalizedSurface: "rich",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "en",
				family: "Lexeme",
				kind: "ADJ",
				canonicalForm: "rich",
				coreFeatures: {
					abbr: null,
					comparable: "Yes",
					extPos: null,
					numForm: null,
					numType: null,
					style: null,
				},
			},
			inflectionalFeatures: { degree: "Pos" },
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "the", orthography: "Standard" },
			{ attested: "rich", orthography: "Standard" },
		],
		articleEvidence: { kind: "Owned", member: 0 },
	};
	expect(parseUnit(rich).success).toBe(true);
	// An adjective without an article names none.
	expect(
		parseUnit({
			...roten,
			members: [roten.members[1]],
			articleEvidence: null,
		}).success,
	).toBe(true);
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
	])
		expect(parseUnit(invalid).success).toBe(false);
});
test("a proper noun cited bare owns the article it takes", () => {
	// Ich wohne in Berlin.
	const berlin = {
		unitKind: "Attestation",
		surface: properNoun("Berlin", null, "Neut", "Dat"),
		realizationCoverage: "Full",
		members: [{ attested: "Berlin", orthography: "Standard" }],
		articleEvidence: null,
	};
	expect(parseUnit(berlin).success).toBe(true);
	// das alte Berlin: the name owns das without a Core article.
	expect(
		parseUnit({
			...berlin,
			surface: properNoun("Berlin", null, "Neut", "Nom"),
			members: [
				{ attested: "das", orthography: "Standard" },
				{ attested: "Berlin", orthography: "Standard" },
			],
			articleEvidence: { kind: "Owned", member: 0 },
		}).success,
	).toBe(true);
	expect(
		parseUnit({
			...berlin,
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
// Which cases a preposition takes is checked in dumspec (ADR 0041).
test("a governor's preposition slot takes any oblique case", () => {
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
	expect(parseUnit(attestation("für", "Dat")).success).toBe(true);
	expect(parseUnit(attestation("für", "Nom")).success).toBe(false);
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
// Which cases an ADP takes is checked in dumspec (ADR 0041).
test("an ADP Attestation records its realized case in any oblique case", () => {
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
		["für", "für", "Dat", "Prep"],
		["auf", "auf", "Gen", "Prep"],
	] as const)
		expect(
			parseUnit(
				adpAttestation(attested, canonicalForm, realizedCase, adpType),
			).success,
		).toBe(true);
	expect(parseUnit(adpAttestation("auf", "auf", "Nom")).success).toBe(false);
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
					comparable: "Yes",
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
		articleEvidence: null,
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
			inflectionalFeatures: { case: "Nom", gender: null, number: "Sing" },
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
test("a Hebrew governor may name its governed preposition with no case", () => {
	// הוא בחר בבית: the verb owns the ב of בבית, which it governs.
	const fusion = {
		spelling: "בבית",
		components: [
			{ span: "ב", surface: "ב" },
			{ span: "", surface: "ה" },
			{ span: "בית", surface: "בית" },
		],
	};
	const be = {
		kind: "Preposition",
		preposition: {
			unitKind: "Lemma",
			language: "he",
			family: "Lexeme",
			kind: "ADP",
			canonicalForm: "ב",
			coreFeatures: { abbr: null, case: null },
		},
		referent: "Something",
	};
	const subject = { kind: "Subject", referent: "Someone" };
	const bachar = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "he",
			normalizedSurface: "בחר",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "he",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm: "בחר",
				coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
			},
			inflectionalFeatures: {
				definite: null,
				gender: "Masc",
				mood: null,
				number: "Sing",
				person: "3",
				polarity: null,
				tense: "Past",
				verbForm: null,
				voice: "Act",
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "בחר", orthography: "Standard" },
			{ attested: "ב", orthography: "Fused", fusion, component: 0 },
		],
		valencyEvidence: [
			{ member: null, complement: subject },
			{ member: 1, complement: be },
		],
	};
	expect(parseUnit(bachar).success).toBe(true);
	const { valencyEvidence: _omitted, ...withoutEvidence } = bachar;
	expect(parseUnit(withoutEvidence).success).toBe(true);
	for (const invalid of [
		[{ member: 0, complement: be }],
		[{ member: 1, complement: subject }],
		[{ member: 1, complement: { ...be, case: "Acc" } }],
		[{ member: 1, complement: be, realizedCase: "Dat" }],
		[
			{
				member: 1,
				complement: { kind: "Case", case: "Acc", referent: "Someone" },
			},
		],
	])
		expect(parseUnit({ ...bachar, valencyEvidence: invalid }).success).toBe(
			false,
		);
	// A route that takes no frame takes no valency evidence either.
	const adverb = {
		unitKind: "Attestation",
		realizationCoverage: "Full",
		surface: {
			unitKind: "Surface",
			language: "he",
			normalizedSurface: "מהר",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "he",
				family: "Lexeme",
				kind: "ADV",
				canonicalForm: "מהר",
				coreFeatures: { prefix: null },
			},
		},
		members: [{ attested: "מהר", orthography: "Standard" }],
	};
	expect(parseUnit(adverb).success).toBe(true);
	expect(parseUnit({ ...adverb, valencyEvidence: [] }).success).toBe(false);
});
test("an English governor may name its governed preposition with no case", () => {
	// We depend on accurate labels: the verb owns the on it governs.
	const onLemma = {
		unitKind: "Lemma",
		language: "en",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: "on",
		coreFeatures: { abbr: null, extPos: null },
	};
	const on = {
		kind: "Preposition",
		preposition: onLemma,
		referent: "Something",
	};
	const subject = { kind: "Subject", referent: "Someone" };
	const indirectObject = { kind: "IndirectObject", referent: "Someone" };
	const depend = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "en",
			normalizedSurface: "depend",
			spelling: "Canonical",
			inflectionalFeatures: null,
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "en",
				family: "Lexeme",
				kind: "VERB",
				canonicalForm: "depend",
				coreFeatures: {
					abbr: null,
					extPos: null,
					phrasal: null,
					style: null,
				},
			},
		},
		realizationCoverage: "Full",
		members: [
			{ attested: "depend", orthography: "Standard" },
			{ attested: "on", orthography: "Standard" },
		],
		valencyEvidence: [
			{ member: null, complement: subject },
			{ member: 1, complement: on },
		],
	};
	expect(parseUnit(depend).success).toBe(true);
	expect(
		parseUnit({
			...depend,
			valencyEvidence: [{ member: null, complement: indirectObject }],
		}).success,
	).toBe(true);
	const { valencyEvidence: _omitted, ...withoutEvidence } = depend;
	expect(parseUnit(withoutEvidence).success).toBe(true);
	for (const invalid of [
		[{ member: 0, complement: on }],
		[{ member: 1, complement: indirectObject }],
		[{ member: 1, complement: { ...on, case: "Acc" } }],
		[{ member: 1, complement: on, realizedCase: "Acc" }],
		[
			{
				member: 1,
				complement: { kind: "Case", case: "Dat", referent: "Someone" },
			},
		],
	])
		expect(parseUnit({ ...depend, valencyEvidence: invalid }).success).toBe(
			false,
		);
	// A route that takes no frame takes no valency evidence either.
	const preposition = {
		unitKind: "Attestation",
		realizationCoverage: "Full",
		surface: {
			unitKind: "Surface",
			language: "en",
			normalizedSurface: "on",
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: onLemma,
		},
		members: [{ attested: "on", orthography: "Standard" }],
	};
	expect(parseUnit(preposition).success).toBe(true);
	expect(parseUnit({ ...preposition, valencyEvidence: [] }).success).toBe(
		false,
	);
});
