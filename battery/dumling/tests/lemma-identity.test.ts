import { describe, expect, test } from "bun:test";
import {
	checkIfGrundform,
	foldCase,
	type Lemma,
	lemmaIdentityKey,
	type Reading,
	readingIdentityKey,
	type Surface,
	sameLemma,
} from "dumling";

const interjection = (canonicalForm: string) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "INTJ",
		canonicalForm,
		coreFeatures: { partType: null },
	}) satisfies Lemma<"de", "Lexeme", "INTJ">;
/** Formal Sie is the third person plural with polite Form (system ADR 0044). */
const personal = (canonicalForm: string, polite: "Form" | null) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm,
		coreFeatures: {
			extPos: null,
			person: "3",
			polite,
			poss: null,
			pronType: "Prs",
			case: "Nom",
			number: "Plur",
			gender: null,
		},
	}) satisfies Lemma<"de", "Lexeme", "PRON">;

describe("case folding", () => {
	test("folds by the language's rules", () => {
		expect(foldCase("LOL", "de")).toBe("lol");
		expect(foldCase("Straße", "de")).toBe("straße");
		expect(foldCase("Hello", "en")).toBe("hello");
		expect(foldCase("שלום", "he")).toBe("שלום");
	});
});

describe("Lemma identity (system ADR 0002)", () => {
	test("ignores the case of the Canonical Form: LOL and lol are one INTJ", () => {
		expect(sameLemma(interjection("LOL"), interjection("lol"))).toBe(true);
		expect(lemmaIdentityKey(interjection("LOL"))).toBe(
			lemmaIdentityKey(interjection("lol")),
		);
		expect(sameLemma(interjection("hurra"), interjection("Hurra"))).toBe(
			true,
		);
	});

	test("keeps words apart by Kind: NOUN Morgen and ADV morgen", () => {
		const noun = {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Morgen",
			coreFeatures: { gender: "Masc", hyph: null },
		} satisfies Lemma<"de", "Lexeme", "NOUN">;
		const adverb = {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "ADV",
			canonicalForm: "morgen",
			coreFeatures: { comparable: null, numType: null, pronType: null },
		} satisfies Lemma<"de", "Lexeme", "ADV">;
		expect(sameLemma(noun, adverb)).toBe(false);
	});

	test("keeps words apart by Core: formal Sie and third-person sie", () => {
		expect(sameLemma(personal("Sie", "Form"), personal("sie", null))).toBe(
			false,
		);
		expect(
			sameLemma(personal("Sie", "Form"), personal("sie", "Form")),
		).toBe(true);
	});

	test("keeps words apart by spelling and Family", () => {
		expect(sameLemma(interjection("lol"), interjection("lool"))).toBe(
			false,
		);
		const locution = {
			...interjection("ach so"),
			family: "Locution",
			coreFeatures: {},
		} as unknown as Lemma;
		expect(sameLemma(interjection("ach so"), locution)).toBe(false);
	});

	test("counts Core Features by their set values, in any order", () => {
		const reordered = {
			...personal("sie", null),
			coreFeatures: {
				gender: null,
				number: "Plur",
				case: "Nom",
				pronType: "Prs",
				person: "3",
			},
		} as unknown as Lemma;
		expect(sameLemma(personal("sie", null), reordered)).toBe(true);
	});

	test("normalizes the Canonical Form as parsing would", () => {
		const slot = (canonicalForm: string) =>
			({
				unitKind: "Lemma",
				language: "de",
				family: "Locution",
				kind: "ADP",
				canonicalForm,
				coreFeatures: {},
			}) as unknown as Lemma;
		expect(sameLemma(slot(" Um ... willen"), slot("um … willen"))).toBe(
			true,
		);
	});
});

describe("Reading identity", () => {
	const reading = (canonicalForm: string, emojiDescription: string) =>
		({
			unitKind: "Reading",
			lemma: interjection(canonicalForm),
			emojiDescription,
		}) satisfies Reading<"de", "Lexeme", "INTJ">;

	test("is the Lemma's identity and the Emoji Description", () => {
		expect(readingIdentityKey(reading("LOL", "😂"))).toBe(
			readingIdentityKey(reading("lol", "😂")),
		);
		expect(readingIdentityKey(reading("lol", "😂"))).not.toBe(
			readingIdentityKey(reading("lol", "🙄")),
		);
		expect(readingIdentityKey(reading("lol", "🖱️"))).toBe(
			readingIdentityKey(reading("lol", "🖱")),
		);
	});

	test("of a Foreign Reading is its Lemma's", () => {
		const foreign = (canonicalForm: string) =>
			({
				unitKind: "Reading",
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Foreign",
					kind: "Foreign",
					canonicalForm,
					coreFeatures: { sourceLang: "en" },
				},
			}) as unknown as Reading;
		expect(readingIdentityKey(foreign("Whatever"))).toBe(
			readingIdentityKey(foreign("whatever")),
		);
	});
});

describe("Grundform spelling", () => {
	test("compares the Surface with its Canonical Form without case", () => {
		const surface = (normalizedSurface: string) =>
			({
				unitKind: "Surface",
				language: "de",
				lemma: interjection("LOL"),
				normalizedSurface,
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
			}) satisfies Surface<"de", "Lexeme", "INTJ">;
		expect(checkIfGrundform(surface("lol"))).toEqual({
			success: true,
			value: true,
		});
		expect(checkIfGrundform(surface("lool"))).toEqual({
			success: true,
			value: false,
		});
	});
});
