import { expect, test } from "bun:test";
import {
	germanCitationEndings,
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
	const ending = (germanCitationEndings.VERB ?? [])
		.map((form) => form.slice(1))
		.find((letters) => verb.endsWith(`${suffix}${letters}`));
	if (ending === undefined) return undefined;
	const body = verb.slice(0, verb.length - ending.length);
	return [
		body.slice(0, body.length - suffix.length),
		`${suffix} → ${suffixLemma(suffix)}`,
		`-${ending}`,
	];
}

test("every affix is spelled by its Kind: a prefix ends in a hyphen, a suffix starts with one", () => {
	for (const { spelled, canonicalForm } of germanPrefixes)
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

test("-isier and -ifizier are Surfaces of the one Lemma -ier, as igkeit is of -heit", () => {
	expect(suffixLemma("isier")).toBe("-ier");
	expect(suffixLemma("ifizier")).toBe("-ier");
	expect(suffixLemma("igkeit")).toBe("-heit");
});

test("a derived verb splits into Root, suffix and its citation Ending", () => {
	expect(cutVerb("studieren", "ier")).toEqual(["stud", "ier → -ier", "-en"]);
	expect(cutVerb("modernisieren", "isier")).toEqual([
		"modern",
		"isier → -ier",
		"-en",
	]);
	expect(cutVerb("elektrifizieren", "ifizier")).toEqual([
		"elektr",
		"ifizier → -ier",
		"-en",
	]);
	expect(cutVerb("lächeln", "el")).toEqual(["läch", "el → -el", "-n"]);
	expect(cutVerb("steigern", "er")).toEqual(["steig", "er → -er", "-n"]);
	expect(cutVerb("reinigen", "ig")).toEqual(["rein", "ig → -ig", "-en"]);
});
