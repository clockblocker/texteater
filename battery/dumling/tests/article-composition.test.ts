import { expect, test } from "bun:test";
import { parseUnit } from "../src/index.js";
import { noun } from "./composition-fixtures.js";

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
			coreFeatures: { gender: "Masc" },
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
				coreFeatures: { gender: "Neut" },
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
					coreFeatures: { gender: "Fem" },
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
			spelling: { kind: "Canonical" },
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
					numForm: null,
					numType: null,
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
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "ADJ",
				canonicalForm: "rot",
				coreFeatures: {
					comparable: "Yes",
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
			spelling: { kind: "Canonical" },
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
			spelling: { kind: "Canonical" },
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
	gender: "Fem" | "Masc" | "Neut" | null,
	grammaticalCase: "Acc" | "Dat" | "Nom",
	surfaceGender: "Fem" | "Masc" | "Neut" | null = null,
	number: "Plur" | "Sing" = "Sing",
) => ({
	unitKind: "Surface",
	language: "de",
	normalizedSurface: canonicalForm,
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "PROPN",
		canonicalForm,
		coreFeatures: { article, gender },
	},
	inflectionalFeatures: {
		case: grammaticalCase,
		gender: surfaceGender,
		number,
	},
});
test("a surname has no Core gender, and its singular Surface marks the gender the sentence shows", () => {
	// der junge Schwarzkopf
	expect(
		parseUnit(properNoun("Schwarzkopf", null, null, "Nom", "Masc")).success,
	).toBe(true);
	// Odradek, with nothing in the sentence to show a gender
	expect(parseUnit(properNoun("Odradek", null, null, "Dat")).success).toBe(
		true,
	);
	for (const invalid of [
		properNoun("Berlin", null, "Neut", "Nom", "Neut"),
		properNoun("Treibel", null, null, "Nom", "Masc", "Plur"),
	])
		expect(parseUnit(invalid).success).toBe(false);
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
			spelling: { kind: "Canonical" },
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
			spelling: { kind: "Canonical" },
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
// A NOUN Locution heads its phrase and owns its article as a Lexeme NOUN does
// (ADR 0040). The evidence is optional, and the
// Locution's other fixed words may leave it Partial.
test("a German or English NOUN Locution owns its article", () => {
	const walk = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "en",
			normalizedSurface: "walk in the park",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "en",
				family: "Locution",
				kind: "NOUN",
				canonicalForm: "walk in the park",
				coreFeatures: {},
			},
			inflectionalFeatures: { number: "Sing" },
		},
		realizationCoverage: "Full",
		members: ["a", "walk", "in", "the", "park"].map((attested) => ({
			attested,
			orthography: "Standard",
		})),
		articleEvidence: { kind: "Owned", member: 0 },
	};
	expect(parseUnit(walk).success).toBe(true);
	const { articleEvidence: _, ...unrecorded } = walk;
	for (const valid of [
		unrecorded,
		{ ...walk, members: walk.members.slice(1), articleEvidence: null },
		{ ...walk, realizationCoverage: "Partial" },
		{ ...unrecorded, realizationCoverage: "Partial" },
	])
		expect(parseUnit(valid).success).toBe(true);
	for (const invalid of [
		{ ...walk, articleEvidence: { kind: "Owned", member: 5 } },
		{
			...walk,
			articleEvidence: { kind: "Shared", article: walk.members[0] },
		},
	])
		expect(parseUnit(invalid).success).toBe(false);
	// unter einem weißen Raben: Core gender lets dumcorpus check the article.
	const rabe = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: "weißen Raben",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Locution",
				kind: "NOUN",
				canonicalForm: "weißer Rabe",
				coreFeatures: { gender: "Masc" },
			},
			inflectionalFeatures: { case: "Dat", number: "Sing" },
		},
		realizationCoverage: "Full",
		members: ["einem", "weißen", "Raben"].map((attested) => ({
			attested,
			orthography: "Standard",
		})),
		articleEvidence: { kind: "Owned", member: 0 },
		valencyEvidence: [],
	};
	expect(parseUnit(rabe).success).toBe(true);
	// Only NOUN Locutions own an article: a thank you is an INTJ.
	const { inflectionalFeatures: __, ...invariant } = walk.surface;
	const thanks = {
		...unrecorded,
		members: ["thank", "you"].map((attested) => ({
			attested,
			orthography: "Standard",
		})),
		surface: {
			...invariant,
			normalizedSurface: "thank you",
			lemma: {
				...invariant.lemma,
				kind: "INTJ",
				canonicalForm: "thank you",
			},
		},
	};
	expect(parseUnit(thanks).success).toBe(true);
	expect(
		parseUnit({ ...thanks, articleEvidence: { kind: "Owned", member: 0 } })
			.success,
	).toBe(false);
});
