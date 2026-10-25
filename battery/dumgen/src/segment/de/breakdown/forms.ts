/**
 * The Canonical Forms a Breakdown part could link to, written by code so
 * that jev only picks among them (Dumgen ADR 0007; segmentation reaches no
 * writer). A part shows letters that may be inflected (`liegt`, `guten`,
 * `Hause`), truncated (`Wach` of wachen, `Schul` of Schule) or umlauted
 * (`Gäst` of Gast); each Kind undoes those in its own way. An open
 * Kind's first candidate is the letters as they stand; a pronoun's or
 * determiner's come from dumcorpus's Authored Inventory (#1241 round 3).
 */
import {
	authoredRealizations,
	closedVerbForms,
	germanAttributiveEndings,
	germanIrregularPresents,
	germanReflexiveForms,
	germanStemCitations,
} from "dumcorpus/inventories";

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

/**
 * A stem's alternating vowel undone, as the infinitive shows it (`triff`,
 * `lies`, `fäng`). The `i` of a diphthong stays (`weiß` gives no weeßen).
 */
function stemVowels(stem: string): string[] {
	return [
		stem.replace(/ie(?=[^aeiouäöü]*$)/u, "e"),
		stem.replace(/(?<![aeu])i(?=[^aeiouäöü]*$)/u, "e"),
		withoutUmlaut(stem),
	].filter((variant) => variant !== stem);
}

/**
 * The verbs dumcorpus lists with `shown` among their forms: the closed
 * paradigms (sein, the modals) and the open verbs whose Präsens no vowel
 * rule undoes (`weiß` is wissen, `tut` tun).
 */
const listedVerbs = (shown: string) =>
	[
		...Object.entries(closedVerbForms),
		...Object.entries(germanIrregularPresents),
	]
		.filter(([, forms]) => forms.includes(shown))
		.map(([lemma]) => lemma);

/** An infinitive of a stem: `-n` after -el and -er (`wander`), else `-en`. */
const infinitive = (stem: string) =>
	/(?:el|er)$/u.test(stem) ? `${stem}n` : `${stem}en`;

function verbForms(word: string): string[] {
	const shown = lower(word);
	const listed = listedVerbs(shown);
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
		...listed,
		...infinitives,
	];
}

/**
 * An adjective's letters as they stand, then without an attributive ending
 * (`guten`, `kleines`), its declension stem undone (`Hohe` → hoch, `dunkle`
 * → dunkel).
 */
function adjectiveForms(word: string): string[] {
	const shown = lower(word);
	return [
		shown,
		...defined(
			germanAttributiveEndings.map((ending) => stripped(shown, ending)),
		).flatMap(germanStemCitations),
	];
}

/** The authored members a spelling realizes (`den` → der), any Kind. */
const realizedBy = (word: string) =>
	authoredRealizations.filter(
		({ spelled }) => lower(spelled) === lower(word),
	);

/**
 * The Canonical Forms of the authored members of `kind` a spelling
 * realizes, and for a reflexive form of a pronoun the reflexivity unit
 * (`dich` → dich, sich), as dumcorpus's inventory has them; empty for a
 * spelling it doesn't author (an adverb, a preposition).
 */
function authoredForms(word: string, kind: string): string[] {
	const forms = realizedBy(word)
		.filter(({ member }) => member.lemma.kind === kind)
		.map(({ member }) => member.lemma.canonicalForm);
	return kind === "PRON" && germanReflexiveForms.forms.has(lower(word))
		? [...forms, germanReflexiveForms.canonicalForm]
		: forms;
}

/**
 * Closes a pronoun's headword question when its candidates hold the
 * reflexivity unit (`dich`: dich or sich). Its examples are no Breakdown
 * case (#693).
 */
export const reflexiveFormGuide =
	"sich is the headword of the reflexive pronoun. Test it: name who acts, which for an order is du (beeil dich: du beeilst dich). When the pronoun is that same one (du … dich, wir … uns), its headword is sich, even in an order; when it names someone else (hilf mir: du hilfst mir), it is the personal pronoun.";

/**
 * Closes a word part's headword question when it is a noun (#1241 round
 * 4): the part may drop the noun's final -e, and letters no dictionary
 * lists as a noun are never its headword. Its example is no Breakdown case
 * (#693).
 */
export const nounPartFormGuide =
	"A noun inside a compound or before a suffix often drops its final -e (Kirch in Kirchturm is Kirche). Pick the noun a dictionary lists as a headword, never letters no dictionary lists as a noun.";

/** Whether `forms` offer the reflexivity unit beside another form, so its guide closes the question. */
export const offersReflexive = (forms: readonly string[]) =>
	forms.length > 1 && forms.includes(germanReflexiveForms.canonicalForm);

/**
 * Whether every authored member a spelling realizes is a pronoun, so its
 * part is a PRON unasked (#1241 round 3: `was`, `dich`); a spelling also
 * realizing a determiner (`das`) or none at all is asked.
 */
export function onlyPronoun(word: string): boolean {
	const members = realizedBy(word);
	return (
		(members.length > 0 || germanReflexiveForms.forms.has(lower(word))) &&
		members.every(({ member }) => member.lemma.kind === "PRON")
	);
}

/**
 * Whether a spelling is only an inflected form of authored determiners and
 * pronouns, so Rule de/pron-or-det-by-use settles a phraseme part's route
 * from what follows it (#1241 round 4: `allem`, `dieses`). It must realize
 * a DET and a PRON member and nothing else, be no member's Canonical Form,
 * since a bare one may be another word's too (adverbial `mehr`, `weniger`),
 * and end in -em, -es or -er, as no verb form does (`meine` and `meinen`
 * are also meinen's).
 */
export function inflectedDeterminerOrPronoun(word: string): boolean {
	const members = realizedBy(word);
	const kinds = new Set(members.map(({ member }) => member.lemma.kind));
	return (
		kinds.size === 2 &&
		kinds.has("DET") &&
		kinds.has("PRON") &&
		members.every(
			({ member }) => lower(member.lemma.canonicalForm) !== lower(word),
		) &&
		/(?:em|es|er)$/u.test(lower(word))
	);
}

/**
 * The candidate Canonical Forms of a part that reads `reads` and takes the
 * route `family`/`kind`, distinct, the letters as they stand first. A
 * Locution part keeps its wording; a word part judges its last word, the
 * noun of an article group (`der Hase`).
 */
export function formCandidates(
	reads: string,
	family: string,
	kind: string,
): readonly string[] {
	if (family !== "Lexeme") return [reads];
	const word = reads.split(/\s+/u).at(-1) ?? reads;
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
			default: {
				// The inventory names a closed Kind's Lemma: `dies` is dieser.
				const authored = authoredForms(word, kind);
				return authored.length > 0 ? authored : [lower(word)];
			}
		}
	})();
	return [...new Set(forms)];
}
