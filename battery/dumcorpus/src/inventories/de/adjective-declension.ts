/**
 * German attributive adjective forms, as far as a Breakdown's shown letters
 * need them (system ADR 0050): a word that grew out of a phrase keeps its
 * adjective's frozen attributive ending, so `Langeweile` = `[[lang|Lange]] +
 * [[Weile|weile]]` and `Hohepriester` = `[[hoch|Hohe]] +
 * [[Priester|priester]]`. dumcorpus has no adjective paradigms yet; once it
 * does, a piece may show any inflected Surface of its target, and these
 * lists give way to that rule.
 */

/** The endings an attributive adjective adds (`guten`, `kleines`). */
export const germanAttributiveEndings: readonly string[] = [
	"e",
	"en",
	"em",
	"er",
	"es",
];

/**
 * How an adjective's declension stem differs from its Canonical Form:
 * `hoch` becomes `hoh`; an unstressed -el drops its e after a consonant
 * (`dunkel` → `dunkl`, `edel` → `edl`), and so does -er after au or eu
 * (`teuer` → `teur`, `sauer` → `saur`); a final -e drops before the ending
 * (`leise` → `leis`). `before` is what the letters ahead of the change end
 * in.
 */
const stemChanges: readonly {
	readonly citation: string;
	readonly stem: string;
	readonly before?: RegExp;
}[] = [
	{ citation: "hoch", stem: "hoh" },
	{ citation: "el", stem: "l", before: /[^aeiouäöühl]$/u },
	{ citation: "er", stem: "r", before: /[ae]u$/u },
	{ citation: "e", stem: "" },
];

const lower = (word: string) => word.toLocaleLowerCase("de");

/** `word` with its ending `from` swapped for `to`, when it ends so. */
function swapped(
	word: string,
	from: string,
	to: string,
	before: RegExp | undefined,
): string | undefined {
	if (!word.endsWith(from)) return undefined;
	const head = word.slice(0, word.length - from.length);
	return before === undefined || before.test(head)
		? `${head}${to}`
		: undefined;
}

const defined = (words: readonly (string | undefined)[]): string[] =>
	words.filter((word): word is string => word !== undefined);

/** An adjective's declension stems, lowercase, the Canonical Form first. */
const declensionStems = (canonicalForm: string): string[] => {
	const form = lower(canonicalForm);
	return [
		form,
		...defined(
			stemChanges.map(({ citation, stem, before }) =>
				swapped(form, citation, stem, before),
			),
		),
	];
};

/**
 * Whether `letters` show an attributive form of the adjective
 * `canonicalForm`, case aside: a declension stem and an attributive ending
 * (`Lange` of lang, `Hohe` and `Hohen` of hoch).
 */
export function isGermanAttributiveForm(
	letters: string,
	canonicalForm: string,
): boolean {
	const shown = lower(letters);
	return declensionStems(canonicalForm).some((stem) =>
		germanAttributiveEndings.some((ending) => shown === `${stem}${ending}`),
	);
}

/**
 * The Canonical Forms a declension stem may come from, the stem itself
 * first: `hoh` → hoh, hoch; `dunkl` → dunkl, dunkel. A dropped final -e is
 * not undone here, since the shown letters with their -e already offer it.
 */
export const germanStemCitations = (stem: string): string[] => [
	stem,
	...defined(
		stemChanges
			.filter(({ stem: changed }) => changed !== "")
			.map(({ citation, stem: changed, before }) =>
				swapped(stem, changed, citation, before),
			),
	),
];
