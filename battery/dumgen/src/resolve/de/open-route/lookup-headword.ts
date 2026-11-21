/**
 * The headword a stored Lemma gives an open-route click (#1337), the third
 * writer beside code (`code-headword.ts`) and Luna. The host finds stored
 * Lemmas under the Sentence's words: by Canonical Form, and a single word
 * by a stored Surface. Where exactly one of them, on the unit's route, was
 * found under the unit's headword words, spelled as they are (letter case
 * and spaces aside), its Canonical Form is the headword, and a common
 * NOUN's article names its stored gender.
 *
 * It writes only the headword's letters: jev still judges the Core
 * Features, so two Lemmas that share a Canonical Form (der and das Band,
 * umfahren with and without its separable prefix) stay apart, and a stored
 * gender the click's own article contradicts gives way to jev's, as Luna's
 * article does (`nominal-cells.ts`). The Reading step still decides the
 * sense. It stands only once jev judges every member written as the word
 * it is, neither a Typo nor a Shorthand, and leaves out of the headword the
 * members it was looked up without.
 *
 * Measured on dev run 45eb267b in set order, each click looked up among
 * the Lemmas gold gave earlier clicks: 632 clicks found exactly one, and
 * its Canonical Form was gold's on 624. On every route below the lookup was
 * at least as right as Luna's headword in that run (Luna 1,880 of 1,896
 * repetitions in all; INTJ 16 of 16 against 39 of 48). Lexeme ADV is left
 * to code and Luna: a bare w-word or *mehr* spelled as a stored adverb is
 * often another Lemma (*irgendwo*, *viel*), 65 of 69 against 207 of 207.
 */

import { foldCase } from "dumling";
import { InvalidModelOutput } from "../../../errors.js";
import type { LemmaCandidate } from "../../types.js";
import { checkWritten, type Judged, type Written } from "../canonical-form.js";
import type { Target } from "../target.js";
import { asWritten } from "./code-headword.js";
import type { FirstRead, Plan } from "./first-request.js";
import { guessedGoverned } from "./luna-guess.js";

/** The routes where the lookup was at least as right as Luna on dev. */
const lookedUpRoutes = new Set([
	"Lexeme/ADJ",
	"Lexeme/ADP",
	"Lexeme/CCONJ",
	"Lexeme/INTJ",
	"Lexeme/NOUN",
	"Lexeme/NUM",
	"Lexeme/PART",
	"Lexeme/PROPN",
	"Lexeme/SCONJ",
	"Lexeme/SYM",
	"Lexeme/VERB",
	"Locution/ADP",
	"Locution/ADV",
	"Locution/CCONJ",
	"Locution/DET",
	"Locution/INTJ",
	"Locution/SCONJ",
	"Locution/VERB",
	"Saying/Saying",
	"Foreign/Foreign",
]);

/** A headword a stored Lemma may give, and whether jev's answers let it stand. */
export type LookedUpHeadword = {
	/**
	 * Whether a stored Lemma is found under the members jev is likely to
	 * leave in the headword: all but the article, a VERB's satellites, and a
	 * Lexeme's guessed governed prepositions. Luna is then not asked before
	 * jev answers.
	 */
	readonly likely: boolean;
	/** The headword once jev has judged, or undefined where Luna writes it. */
	readonly settled: (first: FirstRead, judged: Judged) => Written | undefined;
};

/** A text compared without letter case or spaces: `zu r Sicherheit` is `zur Sicherheit`. */
const squashed = (text: string) => foldCase(text, "de").replace(/\s+/gu, "");

/** A NOUN's citation article for its stored gender; none for a Lemma with no gender. */
const articleOf = (gender: unknown): Written["article"] =>
	gender === "Masc"
		? "der"
		: gender === "Fem"
			? "die"
			: gender === "Neut"
				? "das"
				: gender === null
					? "none"
					: undefined;

/**
 * A member's word in the Lemma's lexical casing: the Canonical Form's word
 * when it is the same word, otherwise its own letters, opening in lowercase
 * where the Canonical Form does (`Elektrische` of `elektrisch`).
 */
function casedAs(text: string, canonicalForm: string): string {
	const same = canonicalForm
		.split(/\s+/u)
		.find((word) => foldCase(word, "de") === foldCase(text, "de"));
	if (same !== undefined) return same;
	const opening = canonicalForm.charAt(0);
	return opening !== opening.toLocaleUpperCase("de")
		? text.charAt(0).toLocaleLowerCase("de") + text.slice(1)
		: text;
}

/**
 * The stored Lemma the hints name under the members at `positions`, when
 * exactly one does.
 */
function storedUnder(
	target: Target,
	hints: readonly LemmaCandidate[],
	positions: readonly number[],
): LemmaCandidate["lemma"] | undefined {
	if (positions.length === 0) return undefined;
	const spelled = squashed(
		positions.map((position) => target.members[position]?.text).join(""),
	);
	const found = hints.filter(({ foundUnder }) =>
		foundUnder.some((text) => squashed(text) === spelled),
	);
	const [only, ...others] = found;
	return only && others.length === 0 ? only.lemma : undefined;
}

/**
 * The lookup's headword for a click on a route where it was measured, and
 * when it stands; undefined where no stored Lemma may give one.
 */
export function lookupHeadword(
	target: Target,
	planned: Plan,
	hints: readonly LemmaCandidate[],
): LookedUpHeadword | undefined {
	const key = `${target.route.family}/${target.route.kind}`;
	if (!lookedUpRoutes.has(key) || hints.length === 0) return undefined;
	// A VERB's es is never its headword's (es gibt is geben).
	const expletives = (planned.verbal?.expletives ?? []).map(
		({ position }) => position,
	);
	const satellites = new Set([
		...expletives,
		...[
			...(planned.article ? [planned.article.member] : []),
			...(planned.verbal?.reflexive ? [planned.verbal.reflexive] : []),
			...(planned.verbal?.auxiliaries.map(({ member }) => member) ?? []),
			...guessedGoverned(planned).map(({ member }) => member),
		].map(({ position }) => position),
	]);
	const positions = (outside: ReadonlySet<number>) =>
		target.members
			.map(({ position }) => position)
			.filter((position) => !outside.has(position));
	return {
		likely: storedUnder(target, hints, positions(satellites)) !== undefined,
		settled: (first, judged) => {
			if (!asWritten(first)) return undefined;
			const lemma = storedUnder(
				target,
				hints,
				positions(
					new Set([
						...expletives,
						...judged.outsideHeadword,
						...(judged.auxiliaries ?? []),
					]),
				),
			);
			if (!lemma) return undefined;
			const written = checkWritten(target, judged, {
				canonicalForm: lemma.canonicalForm,
				members: target.members.map(({ text }) =>
					casedAs(text, lemma.canonicalForm),
				),
				...("gender" in lemma.coreFeatures
					? { article: articleOf(lemma.coreFeatures.gender) }
					: {}),
			});
			return written instanceof InvalidModelOutput ? undefined : written;
		},
	};
}
