/**
 * The Canonical Forms a Breakdown part could link to, written by code so
 * that jev only picks among them (Dumgen ADR 0007; segmentation reaches no
 * writer). A part shows letters that may be inflected (`liegt`, `guten`,
 * `Hause`), truncated (`Wach` of wachen, `Schul` of Schule) or umlauted
 * (`Gäst` of Gast); each Kind undoes those in its own way. The first
 * candidate is the letters as they stand.
 */
import { authoredRealizations, closedVerbForms } from "dumcorpus/inventories";

const capitalized = (word: string) =>
	word.charAt(0).toLocaleUpperCase("de") + word.slice(1);

const lower = (word: string) => word.toLocaleLowerCase("de");

/** The word with its umlauts undone: `Gäst` → `Gast`, `Häus` → `Haus`. */
const withoutUmlaut = (word: string) =>
	word.replace(/[äöüÄÖÜ]/gu, (letter) =>
		letter.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC"),
	);

/** `word` without `ending`, when what stays is at least two letters long. */
function stripped(word: string, ending: string): string | undefined {
	return word.length - ending.length >= 2 && lower(word).endsWith(ending)
		? word.slice(0, -ending.length)
		: undefined;
}

const defined = <T>(values: readonly (T | undefined)[]): T[] =>
	values.filter((value): value is T => value !== undefined);

/** The noun case and plural endings a shown noun may carry (`Hause`, `Herzen`, `Kinder`). */
const nounEndings = ["e", "en", "n", "s", "es", "er", "ern", "ens"];

function nounForms(word: string): string[] {
	const base = capitalized(word);
	const bases = [
		base,
		...defined(nounEndings.map((ending) => stripped(base, ending))),
		// A dropped final -e: Schul, Morgenstund.
		`${base}e`,
	];
	return [...bases, ...bases.map(withoutUmlaut)];
}

/** Verb endings a finite or stem form shows before its stem (`liegt`, `kommst`). */
const verbEndings = ["est", "et", "st", "t", "e"];

/** A stem's alternating vowel undone, as the infinitive shows it (`triff`, `lies`, `fäng`). */
function stemVowels(stem: string): string[] {
	return [
		stem.replace(/ie(?=[^aeiouäöü]*$)/u, "e"),
		stem.replace(/i(?=[^aeiouäöü]*$)/u, "e"),
		withoutUmlaut(stem),
	].filter((variant) => variant !== stem);
}

/** An infinitive of a stem: `-n` after -el and -er (`wander`), else `-en`. */
const infinitive = (stem: string) =>
	/(?:el|er)$/u.test(stem) ? `${stem}n` : `${stem}en`;

function verbForms(word: string): string[] {
	const shown = lower(word);
	const closed = Object.entries(closedVerbForms)
		.filter(([, forms]) => forms.includes(shown))
		.map(([lemma]) => lemma);
	const stems = [
		shown,
		...defined(verbEndings.map((ending) => stripped(shown, ending))),
	];
	const participle = /^ge(.{2,})t$/u.exec(shown)?.[1];
	if (participle) stems.push(participle);
	const infinitives = [...stems, ...stems.flatMap(stemVowels)].map(
		infinitive,
	);
	return [
		// An infinitive as it stands, `tun` included, German's one of three letters.
		...(/(?:en|[elr]n)$|^tun$/u.test(shown) ? [shown] : []),
		...closed,
		...infinitives,
	];
}

/** The endings an attributive adjective adds (`guten`, `kleines`). */
const adjectiveEndings = ["e", "en", "em", "er", "es"];

function adjectiveForms(word: string): string[] {
	const shown = lower(word);
	return [
		shown,
		...defined(adjectiveEndings.map((ending) => stripped(shown, ending))),
	];
}

/** The Canonical Forms of authored members of `kind` a spelling realizes (`den` → der). */
function authoredForms(word: string, kind: string): string[] {
	return authoredRealizations
		.filter(
			({ spelled, member }) =>
				lower(spelled) === lower(word) && member.lemma.kind === kind,
		)
		.map(({ member }) => member.lemma.canonicalForm);
}

/**
 * The candidate Canonical Forms of a part that reads `reads` and takes the
 * route `family`/`kind`, distinct, the letters as they stand first. A
 * Locution part keeps its wording; a word part judges its last word, the
 * noun of an article group (`der Hase`) or the verb a `sich` joins
 * (`sich schämen`).
 */
export function formCandidates(
	reads: string,
	family: string,
	kind: string,
): readonly string[] {
	if (family !== "Lexeme") return [reads];
	const word = reads.split(/\s+/u).at(-1) ?? reads;
	// A lexically reflexive verb is cited with its `sich` (`sich schämen`).
	if (kind === "VERB" && /^sich\s/u.test(reads))
		return [...new Set(verbForms(word).map((form) => `sich ${form}`))];
	const forms = (() => {
		switch (kind) {
			case "NOUN":
				return nounForms(word);
			case "PROPN":
				return [capitalized(word), ...defined([stripped(word, "s")])];
			case "VERB":
				return verbForms(word);
			case "ADJ":
				return adjectiveForms(word);
			default:
				return [lower(word), ...authoredForms(word, kind)];
		}
	})();
	return [...new Set(forms)];
}
