import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { languageAttestationIssues } from "../src/attestation-checks.js";
import { germanArticleCell } from "../src/index.js";

type Member = { attested: string; orthography: string } & Record<
	string,
	unknown
>;

/** An Attestation as Dumling parses it; Dumling never checks agreement. */
function attest(input: Record<string, unknown>): Dumling.Attestation {
	const parsed = parseUnit({
		unitKind: "Attestation",
		realizationCoverage: "Full",
		...input,
	});
	if (!parsed.success || parsed.chain.unitKind !== "Attestation")
		throw Error(`Dumling rejects ${JSON.stringify(input)}`);
	return parsed.chain.value;
}
const standard = (attested: string): Member => ({
	attested,
	orthography: "Standard",
});

const germanNoun = (
	canonicalForm: string,
	normalizedSurface: string,
	gender: string | null,
	inflectionalFeatures: Record<string, unknown>,
) => ({
	unitKind: "Surface",
	language: "de",
	normalizedSurface,
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm,
		coreFeatures: { gender },
	},
	inflectionalFeatures: { gender: null, ...inflectionalFeatures },
});
const owning = (surface: unknown, members: Member[]) =>
	attest({
		surface,
		members,
		articleEvidence: { kind: "Owned", member: 0 },
		valencyEvidence: [],
	});
const houses = germanNoun("Haus", "Häuser", "Neut", {
	case: "Nom",
	number: "Plur",
});
const issues = (attestation: Dumling.Attestation) =>
	languageAttestationIssues(attestation)
		.filter((issue) => issue.check === "ArticleAgreement")
		.map((issue) => issue.message);

test("an owned article must name a der or ein cell for its Head", () => {
	expect(
		issues(owning(houses, [standard("die"), standard("Häuser")])),
	).toEqual([]);
	// ein Häuser passes Dumling and fails dumcorpus.
	expect(
		issues(owning(houses, [standard("ein"), standard("Häuser")])),
	).toEqual(["ein names no cell of der or ein for Nom.Plur"]);
	// An owned member that is no article fails as well.
	expect(
		issues(
			owning(
				germanNoun("Haus", "Haus", "Neut", {
					case: "Nom",
					number: "Sing",
				}),
				[standard("Haus")],
			),
		),
	).toEqual(["Haus names no cell of der or ein for Nom.Neut.Sing"]);
	// kein Haus: kein is a DET of its own, and Haus names no evidence.
	expect(
		issues(
			attest({
				surface: germanNoun("Haus", "Haus", "Neut", {
					case: "Nom",
					number: "Sing",
				}),
				members: [standard("Haus")],
				articleEvidence: null,
				valencyEvidence: [],
			}),
		),
	).toEqual([]);
});

test("a fused or shortened article is read as the article it stands for", () => {
	const im = {
		spelling: "im",
		components: [
			{ span: "i", surface: "in" },
			{ span: "m", surface: "dem" },
		],
	};
	const m = { attested: "m", orthography: "Fused", fusion: im, component: 1 };
	const wald = germanNoun("Wald", "Wald", "Masc", {
		case: "Dat",
		number: "Sing",
	});
	expect(issues(owning(wald, [m, standard("Wald")]))).toEqual([]);
	expect(
		germanArticleCell(m, { case: "Dat", number: "Sing", gender: "Masc" })
			?.lemma,
	).toMatchObject({
		canonicalForm: "dem",
		coreFeatures: { case: "Dat", gender: "Masc", number: "Sing" },
	});
	const frage = germanNoun("Frage", "Frage", "Fem", {
		case: "Acc",
		number: "Sing",
	});
	const ne = { attested: "'ne", orthography: "Shorthand" };
	expect(issues(owning(frage, [ne, standard("Frage")]))).toEqual([]);
	expect(
		issues(
			owning(
				{
					...frage,
					inflectionalFeatures: {
						...frage.inflectionalFeatures,
						case: "Dat",
					},
				},
				[ne, standard("Frage")],
			),
		),
	).toHaveLength(1);
});

test("a genderless noun's article agrees with the gender its Surface shows", () => {
	const reisende = germanNoun("Reisende", "Reisende", null, {
		case: "Nom",
		gender: "Masc",
		number: "Sing",
	});
	expect(
		issues(owning(reisende, [standard("Der"), standard("Reisende")])),
	).toEqual([]);
	expect(
		issues(owning(reisende, [standard("Die"), standard("Reisende")])),
	).toHaveLength(1);
	const verletzter = germanNoun("Verletzte", "Verletzter", null, {
		case: "Nom",
		gender: "Masc",
		number: "Sing",
	});
	expect(
		issues(owning(verletzter, [standard("Ein"), standard("Verletzter")])),
	).toEqual([]);
});

test("any Head that stands in for an elided noun owns its article", () => {
	// Ich nehme den roten.
	const roten = attest({
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
		members: [standard("den"), standard("roten")],
		articleEvidence: { kind: "Owned", member: 0 },
		valencyEvidence: [],
	});
	expect(issues(roten)).toEqual([]);
	// das alte Berlin: a name cited bare owns the article it takes.
	const berlin = attest({
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: "Berlin",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "PROPN",
				canonicalForm: "Berlin",
				coreFeatures: {
					article: null,
					gender: "Neut",
				},
			},
			inflectionalFeatures: { case: "Nom", gender: null, number: "Sing" },
		},
		members: [standard("das"), standard("Berlin")],
		articleEvidence: { kind: "Owned", member: 0 },
	});
	expect(issues(berlin)).toEqual([]);
});

test("a surname that owns its article shows its gender on the Surface (system ADR 0040)", () => {
	// der junge Schwarzkopf: the surname has no Core gender, and der shows it.
	const schwarzkopf = (gender: string | null) =>
		attest({
			surface: {
				unitKind: "Surface",
				language: "de",
				normalizedSurface: "Schwarzkopf",
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "PROPN",
					canonicalForm: "Schwarzkopf",
					coreFeatures: { article: null, gender: null },
				},
				inflectionalFeatures: { case: "Nom", gender, number: "Sing" },
			},
			members: [standard("der"), standard("Schwarzkopf")],
			articleEvidence: { kind: "Owned", member: 0 },
		});
	expect(issues(schwarzkopf("Masc"))).toEqual([]);
	expect(issues(schwarzkopf("Fem"))).toHaveLength(1);
	expect(issues(schwarzkopf(null))).toEqual([
		"Schwarzkopf owns der, so its Surface marks the gender the article shows",
	]);
});

test("a shared article agrees with the Head that shares it", () => {
	// der Aufstieg und Abstieg
	const abstieg = germanNoun("Abstieg", "Abstieg", "Masc", {
		case: "Nom",
		number: "Sing",
	});
	const shared = (article: string) =>
		attest({
			surface: abstieg,
			members: [standard("Abstieg")],
			realizationCoverage: "Partial",
			articleEvidence: { kind: "Shared", article: standard(article) },
			valencyEvidence: [],
		});
	expect(issues(shared("der"))).toEqual([]);
	expect(issues(shared("die"))).toHaveLength(1);
});

test("English a or an takes no plural Head, the takes any", () => {
	const books = {
		unitKind: "Surface",
		language: "en",
		normalizedSurface: "books",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		lemma: {
			unitKind: "Lemma",
			language: "en",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "book",
			coreFeatures: {
				abbr: null,
				extPos: null,
				numForm: null,
				numType: null,
			},
		},
		inflectionalFeatures: { number: "Plur" },
	};
	const english = (surface: unknown, members: Member[]) =>
		attest({
			surface,
			members,
			articleEvidence: { kind: "Owned", member: 0 },
		});
	expect(
		issues(english(books, [standard("the"), standard("books")])),
	).toEqual([]);
	expect(issues(english(books, [standard("a"), standard("books")]))).toEqual([
		"a does not agree with a Plur Head",
	]);
	const book = {
		...books,
		normalizedSurface: "book",
		inflectionalFeatures: { number: "Sing" },
	};
	expect(issues(english(book, [standard("A"), standard("book")]))).toEqual(
		[],
	);
	expect(issues(english(book, [standard("some"), standard("book")]))).toEqual(
		["some is not an English article"],
	);
});

test("a NOUN Locution's article agrees with its Core gender (system ADR 0040)", () => {
	// unter einem weißen Raben: the Locution heads its phrase and owns einem.
	const raben = (article: string) =>
		attest({
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
			members: [standard(article), standard("weißen"), standard("Raben")],
			articleEvidence: { kind: "Owned", member: 0 },
			valencyEvidence: [],
		});
	expect(issues(raben("einem"))).toEqual([]);
	expect(issues(raben("einer"))).toEqual([
		"einer names no cell of der or ein for Dat.Masc.Sing",
	]);
	// This exam was a walk in the park: English reads only the number.
	const owned = { articleEvidence: { kind: "Owned", member: 0 } };
	const walk = (
		article: string,
		number: string,
		evidence: Record<string, unknown> = owned,
	) =>
		attest({
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
				inflectionalFeatures: { number },
			},
			members: [article, "walk", "in", "the", "park"].map(standard),
			...evidence,
		});
	expect(issues(walk("a", "Sing"))).toEqual([]);
	expect(issues(walk("a", "Plur"))).toEqual([
		"a does not agree with a Plur Head",
	]);
	// A Locution recorded before it could own an article names no evidence.
	expect(issues(walk("a", "Sing", {}))).toEqual([]);
});
