import { coreGenders } from "./grammatical-gender";

/**
 * Which Cards of a click's Deck say something about how the clicked text led
 * to its Reading (#1164). A Card whose step says nothing is not dealt; the
 * Reading always is. The Deck and each Card's caption read the same rules,
 * so a caption names the Card that is actually dealt in front of it.
 */

/**
 * The Attestation says something when its unit is more than the clicked
 * word, or a word not in its standard spelling: a Typo, a Shorthand or a
 * piece of a fused word. A split unit has more than one member.
 */
export function attestationSaysSomething(
	members: readonly { readonly orthography: string }[],
): boolean {
	return (
		members.length > 1 ||
		members.some(({ orthography }) => orthography !== "Standard")
	);
}

/**
 * What a click knows before Grammar has read it: a stored unit of more than
 * one Segment makes the Attestation say something.
 */
export function unitSaysSomething(
	unitSegments: readonly number[] | undefined,
): boolean {
	return (unitSegments?.length ?? 0) > 1;
}

/**
 * The Surface says something when it is spelled as a Variant, or when it is
 * not its Lemma's Grundform and has something to show for it: a feature the
 * caption names (`formFeatures`), or words other than its Lemma's. Grundform
 * is the stored assessment, never a comparison of strings: dative `Wald` is
 * spelled like `Wald` and still says `dative`. A Surface the assessment could
 * not judge (null) or that differs only where nothing is stored to name it,
 * such as `je desto` against `je … desto`, says nothing when it is spelled
 * like its Lemma. Without its inflection (a running Session's), a Surface
 * that is not Grundform says something.
 */
export function surfaceSaysSomething(surface: {
	readonly grundform: boolean | null;
	readonly spelling: { readonly kind: string };
	readonly normalizedSurface: string;
	readonly inflectionalFeatures?: FormFeatureBag;
	readonly lemma: FormLemma & { readonly canonicalForm: string };
}): boolean {
	if (surface.spelling.kind === "Variant") return true;
	if (surface.grundform === true) return false;
	const { inflectionalFeatures } = surface;
	if (inflectionalFeatures === undefined)
		return (
			surface.grundform === false ||
			spelledOtherwise(surface.normalizedSurface, surface.lemma)
		);
	return (
		namesForm(formFeatures({ ...surface, inflectionalFeatures })) ||
		spelledOtherwise(surface.normalizedSurface, surface.lemma)
	);
}

/**
 * Whether a Surface's letters differ from its Lemma's, case-folded and
 * read without spaces, punctuation or `…` gaps: `wo mit` spells `womit`,
 * and `je desto` spells `je … desto`.
 */
function spelledOtherwise(
	normalizedSurface: string,
	lemma: { readonly canonicalForm: string },
): boolean {
	return (
		wordsOf(normalizedSurface).join("") !==
		wordsOf(lemma.canonicalForm).join("")
	);
}

/**
 * Whether a Surface quotes only some of its Lemma's words, in order: `Wer im
 * Glashaus sitzt` of a Saying, `zum` of `zum Teufel`.
 */
function quotesPart(
	normalizedSurface: string,
	lemma: { readonly canonicalForm: string },
): boolean {
	const quoted = wordsOf(normalizedSurface);
	const cited = wordsOf(lemma.canonicalForm);
	if (quoted.length === 0 || quoted.length >= cited.length) return false;
	let next = 0;
	for (const word of cited) if (word === quoted[next]) next++;
	return next === quoted.length;
}

// A word is letters, marks and digits, joined inside by an apostrophe or a
// hyphen, as dumcorpus's Grundform check reads them.
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;

/** A form's words, case-folded, without punctuation or `…` gaps. */
function wordsOf(form: string): string[] {
	return form.toLocaleLowerCase("de").match(WORD) ?? [];
}

type FormFeatureBag = Readonly<Record<string, unknown>>;
type FormLemma = {
	readonly family: string;
	readonly kind: string;
	readonly coreFeatures: unknown;
};

/** A verb form's tense, mood or non-finite form, as a caption names it. */
export type VerbFormKey =
	| "present"
	| "past"
	| "perfect"
	| "pastPerfect"
	| "future"
	| "futurePerfect"
	| "subjunctive"
	| "perfectSubjunctive"
	| "futureSubjunctive"
	| "imperative"
	| "infinitive"
	| "perfectInfinitive"
	| "participle"
	| "presentParticiple";

type Case = "Nom" | "Acc" | "Dat" | "Gen";
type Gender = "Masc" | "Fem" | "Neut";

/**
 * What a Surface's inflection tells a learner, by its Lemma's Kind. Each
 * field is a feature value a caption names; a feature that adds nothing is
 * left out.
 *
 * - A verb: its tense, mood or non-finite form, whether it is passive, and
 *   its person and number.
 * - A noun: its case unless nominative, its number when plural, and, for a
 *   noun whose Lemma has no gender (`Verletzte`), the singular form's.
 * - An adjective: its degree when comparative or superlative, and its
 *   declension: the case, the nominative too, since its citation form is
 *   undeclined; the gender when singular; the number when plural.
 * - An adverb: its degree.
 * - A determiner, pronoun or numeral: its degree (`weniger`), its case
 *   unless nominative, its gender when singular and not masculine (its
 *   citation form's), its number when plural.
 * - Any Surface not its Grundform that quotes only some of its Lemma's
 *   words, in order: that it is a part.
 */
export type FormFeatures = {
	/** The Surface quotes only some of its Lemma's words. */
	readonly part?: true;
	readonly verb?: { readonly form: VerbFormKey; readonly passive: boolean };
	readonly person?:
		| { readonly kind: "Expletive" }
		| {
				readonly kind: "Cell";
				readonly person: "1" | "2" | "3";
				readonly number: "Sing" | "Plur";
				readonly imperative: boolean;
		  };
	readonly degree?: "Cmp" | "Sup";
	readonly case?: readonly Case[];
	readonly gender?: readonly Gender[];
	readonly plural?: true;
};

export function formFeatures(surface: {
	readonly grundform: boolean | null;
	readonly normalizedSurface: string;
	readonly inflectionalFeatures: FormFeatureBag;
	readonly lemma: FormLemma & { readonly canonicalForm: string };
}): FormFeatures {
	const part =
		surface.grundform !== true &&
		quotesPart(surface.normalizedSurface, surface.lemma)
			? { part: true as const }
			: {};
	return {
		...part,
		...inflectionOf(
			surface.lemma,
			surface.inflectionalFeatures,
			holdsEs(surface.normalizedSurface),
		),
	};
}

/**
 * Whether a stored Surface holds the word `es`. An expletive subject is a
 * member of its unit, so its Surface holds it (`es regnet`); a referential
 * `es` is a free unit of its own and never does (ADR 0003, #1293).
 */
function holdsEs(normalizedSurface: string): boolean {
	return wordsOf(normalizedSurface).includes("es");
}

function inflectionOf(
	lemma: FormLemma,
	features: FormFeatureBag,
	expletiveHeld: boolean,
): FormFeatures {
	const plural = features.number === "Plur";
	const cases = valuesOf(features.case, ["Nom", "Acc", "Dat", "Gen"]);
	const genders = plural
		? []
		: valuesOf(features.gender, ["Masc", "Fem", "Neut"]);
	const declension = ({
		nominative,
		masculine,
	}: {
		readonly nominative: boolean;
		readonly masculine: boolean;
	}): FormFeatures => {
		const named = cases.filter((value) => nominative || value !== "Nom");
		const gendered = genders.filter(
			(value) => masculine || value !== "Masc",
		);
		return {
			...(named.length > 0 ? { case: named } : {}),
			...(gendered.length > 0 ? { gender: gendered } : {}),
			...(plural ? { plural: true as const } : {}),
		};
	};
	const named = features.degree;
	const degree: FormFeatures =
		named === "Cmp" || named === "Sup" ? { degree: named } : {};
	switch (lemma.kind) {
		case "VERB":
		case "AUX": {
			const form = verbFormKey(features);
			const person = personOf(features, expletiveHeld);
			return {
				...(form
					? { verb: { form, passive: features.voice === "Pass" } }
					: {}),
				...(person ? { person } : {}),
			};
		}
		case "NOUN":
		case "PROPN": {
			const form = declension({ nominative: false, masculine: true });
			if (coreGenders(lemma).length === 0) return form;
			return {
				...(form.case ? { case: form.case } : {}),
				...(form.plural ? { plural: form.plural } : {}),
			};
		}
		case "ADJ":
			return {
				...degree,
				...declension({ nominative: true, masculine: true }),
			};
		case "ADV":
			return degree;
		case "DET":
		case "PRON":
		case "NUM":
			return {
				...degree,
				...declension({ nominative: false, masculine: false }),
			};
		default:
			return {};
	}
}

/** Whether a Surface's inflection names anything. */
function namesForm(features: FormFeatures): boolean {
	return Object.keys(features).length > 0;
}

function valuesOf<Value extends string>(
	value: unknown,
	known: readonly Value[],
): Value[] {
	return (Array.isArray(value) ? value : [value]).filter(
		(member): member is Value => known.includes(member as Value),
	);
}

function verbFormKey(features: FormFeatureBag): VerbFormKey | null {
	const perfect = features.perfect === "Yes";
	const future = features.future === "Yes";
	if (features.verbForm === "Part")
		return features.participleForm === "Present"
			? "presentParticiple"
			: "participle";
	if (features.verbForm === "Inf")
		return perfect ? "perfectInfinitive" : "infinitive";
	if (features.mood === "Imp") return "imperative";
	if (features.mood === "Sub")
		return future
			? "futureSubjunctive"
			: perfect
				? "perfectSubjunctive"
				: "subjunctive";
	if (future) return perfect ? "futurePerfect" : "future";
	if (perfect) return features.tense === "Past" ? "pastPerfect" : "perfect";
	if (features.tense === "Past") return "past";
	if (features.tense === "Pres") return "present";
	return null;
}

/**
 * A finite form's person. An expletive subject names `es` only when the
 * Surface holds it; one judged expletive without it is read by its cell.
 */
function personOf(
	features: FormFeatureBag,
	expletiveHeld: boolean,
): FormFeatures["person"] | null {
	if (features.expletive === "Subject" && expletiveHeld)
		return { kind: "Expletive" };
	const { person, number } = features;
	if (
		(person !== "1" && person !== "2" && person !== "3") ||
		(number !== "Sing" && number !== "Plur")
	)
		return null;
	return {
		kind: "Cell",
		person,
		number,
		imperative: features.mood === "Imp",
	};
}

/** The Lemma says something when it holds more than one stored Reading. */
export function lemmaSaysSomething(readingCount: number): boolean {
	return readingCount > 1;
}
