import { expect, test } from "bun:test";
import {
	germanCitationEndings,
	germanHyphenPrefixes,
	germanPrefixes,
	germanSuffixes,
} from "../src/inventories.js";

/** The Suffix Lemma a shown spelling links to, if the inventory lists it. */
const suffixLemma = (spelled: string) =>
	germanSuffixes.find((affix) => affix.spelled === spelled)?.canonicalForm;

/**
 * A verb cut as school morphemic analysis cuts it (ADR 0051): the citation
 * ending from `germanCitationEndings`, then a listed suffix, and the rest
 * as the Root.
 */
function cutVerb(verb: string, suffix: string) {
	const ending = (germanCitationEndings.VERB ?? []).find(({ spelled }) =>
		verb.endsWith(`${suffix}${spelled}`),
	);
	if (ending === undefined) return undefined;
	const body = verb.slice(0, verb.length - ending.spelled.length);
	return [
		body.slice(0, body.length - suffix.length),
		`${suffix} → ${suffixLemma(suffix)}`,
		`${ending.spelled} → ${ending.canonicalForm}`,
	];
}

test("every affix is spelled by its Kind: a prefix ends in a hyphen, a suffix starts with one", () => {
	for (const { spelled, canonicalForm } of [
		...germanPrefixes,
		...germanHyphenPrefixes,
	])
		expect(canonicalForm).toBe(`${spelled}-`);
	for (const { canonicalForm } of germanSuffixes)
		expect(canonicalForm).toMatch(/^-\p{Ll}+$/u);
});

test("each suffix spelling is listed once, so it links to one Lemma", () => {
	const spellings = germanSuffixes.map(({ spelled }) => spelled);
	expect(spellings.length).toBe(new Set(spellings).size);
});

test("the verb-forming suffixes are listed without the citation ending (ADR 0051)", () => {
	for (const spelled of ["ier", "isier", "ifizier", "el", "er", "ig"])
		expect(suffixLemma(spelled)).toBeDefined();
	for (const { spelled } of germanSuffixes)
		expect(spelled.endsWith("ieren") || /(?:el|er)n$/u.test(spelled)).toBe(
			false,
		);
});

test("-isier and -ifizier are Lemmas of their own, while igkeit, which its base predicts, is a Surface of -heit", () => {
	expect(suffixLemma("isier")).toBe("-isier");
	expect(suffixLemma("ifizier")).toBe("-ifizier");
	expect(suffixLemma("igkeit")).toBe("-heit");
});

test("a derived verb splits into Root, suffix and its citation Ending", () => {
	expect(cutVerb("studieren", "ier")).toEqual([
		"stud",
		"ier → -ier",
		"en → -en",
	]);
	expect(cutVerb("modernisieren", "isier")).toEqual([
		"modern",
		"isier → -isier",
		"en → -en",
	]);
	expect(cutVerb("elektrifizieren", "ifizier")).toEqual([
		"elektr",
		"ifizier → -ifizier",
		"en → -en",
	]);
	expect(cutVerb("lächeln", "el")).toEqual(["läch", "el → -el", "n → -en"]);
	expect(cutVerb("steigern", "er")).toEqual(["steig", "er → -er", "n → -en"]);
	expect(cutVerb("reinigen", "ig")).toEqual(["rein", "ig → -ig", "en → -en"]);
});

test("a verb's n after -el or -er is a Surface of the Ending -en, not a Lemma of its own (ADR 0051)", () => {
	expect(
		(germanCitationEndings.VERB ?? []).map(
			({ spelled, canonicalForm }) => `${spelled} → ${canonicalForm}`,
		),
	).toEqual(["en → -en", "n → -en"]);
});

test("a hyphen-only prefix is no ordinary prefix, so no word opening with its letters is cut there", () => {
	expect(
		germanHyphenPrefixes.map(({ canonicalForm }) => canonicalForm),
	).toEqual(["e-"]);
	const ordinary = new Set(germanPrefixes.map(({ spelled }) => spelled));
	for (const { spelled } of germanHyphenPrefixes)
		expect(ordinary.has(spelled)).toBe(false);
});
