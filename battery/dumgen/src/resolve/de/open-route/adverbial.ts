/**
 * The block an ADV or ADJ adds to the first request (a bare w-word's
 * reading, comparability and degree, an ADJ's agreement) and its reading,
 * and an ADV's or ADJ's headword where the Rules settle it, whatever Luna
 * wrote.
 */

import {
	authoredMembers,
	germanSuppletiveComparisons,
} from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { splitHeads } from "../../../segment/de/candidates.js";
import type { MemberOrthography } from "../member-spelling.js";
import { fill, options, question } from "../prompts.js";
import type { Answered, ChoiceOf, Questionnaire } from "../questions.js";
import type { Target } from "../target.js";
import {
	type AgreementQuestions,
	agreementQuestions,
	readAgreement,
} from "./agreeing.js";
import { fold, type Shape } from "./shape.js";

/** An ADJ's or ADV's Core Features. */
type AdverbialCore = Dumling.Lemma<
	"de",
	"Lexeme" | "Locution",
	"ADJ" | "ADV"
>["coreFeatures"];

/** An ADV's degree, or an ADJ's degree and agreement. */
export type AdverbialInflection = NonNullable<
	Dumling.Surface<
		"de",
		"Lexeme" | "Locution",
		"ADJ" | "ADV"
	>["inflectionalFeatures"]
>;

/** What an ADV's or ADJ's block asked. */
export type AdverbialPlan = {
	/** Whether a bare w-word stands for its irgend- word. */
	readonly indefinite: ChoiceOf<typeof options.indefinite> | undefined;
	readonly comparable: ChoiceOf<typeof options.comparable>;
	readonly degree: ChoiceOf<typeof options.degree>;
	/** An ADJ's: whether it is attributive, and its agreement. */
	readonly attributive:
		| (AgreementQuestions & {
				readonly attributive: ChoiceOf<typeof options.attributive>;
		  })
		| undefined;
};

/**
 * Asks an ADV's or ADJ's block: a bare w-word's reading, comparability and
 * degree, and whether an ADJ is attributive, with its agreement.
 */
export function askAdverbial(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
): AdverbialPlan {
	// A bare w-word as an ADV asks, opens a clause or stands for its irgend-
	// word (Rule de/bare-w-word-is-shorthand).
	const [lone] = target.members;
	const indefinite =
		shape.adverbial &&
		shape.lexeme &&
		target.members.length === 1 &&
		lone &&
		!lone.spelling &&
		bareWWords.has(fold(lone.text))
			? questionnaire.choice(
					"indefinite",
					fill(question.indefinite, { m: lone.ref }),
					options.indefinite,
					["orthography"],
				)
			: undefined;
	const comparable = questionnaire.choice(
		"comparable",
		question.comparable,
		options.comparable,
		["adjective"],
	);
	const degree = questionnaire.choice(
		"degree",
		question.degree,
		options.degree,
	);
	const attributive = shape.adjectival
		? {
				attributive: questionnaire.choice(
					"attributive",
					question.attributive,
					options.attributive,
				),
				...agreementQuestions(questionnaire),
			}
		: undefined;
	return { indefinite, comparable, degree, attributive };
}

/**
 * Reads an ADV's or ADJ's block: comparability, and the degree and an
 * attributive ADJ's agreement as its inflection.
 */
export function readAdverbial(
	adverbial: AdverbialPlan,
	answered: Answered,
): {
	readonly core: AdverbialCore;
	readonly inflection: AdverbialInflection | null;
} {
	const comparable = answered.pick(adverbial.comparable) === "Yes";
	const core: AdverbialCore = { comparable: comparable ? "Yes" : null };
	const degree = comparable ? answered.pick(adverbial.degree) : null;
	const adjective = adverbial.attributive;
	if (!adjective) return { core, inflection: comparable ? { degree } : null };
	const attributive = answered.pick(adjective.attributive) === "Yes";
	const agreement = attributive
		? readAgreement(adjective, answered)
		: undefined;
	return {
		core,
		inflection:
			attributive || comparable
				? {
						case: agreement?.case ?? null,
						degree,
						gender: agreement?.gender ?? null,
						number: agreement?.number ?? null,
					}
				: null,
	};
}

/**
 * The positive of each suppletive adverb's compared forms, keyed by the
 * comparative and the superlative's last word (lieber and liebsten: gern).
 */
export const suppletivePositive: ReadonlyMap<string, string> = new Map(
	germanSuppletiveComparisons.flatMap(
		({ positive, comparative, superlative }) => [
			[comparative, positive],
			[superlative.split(" ").at(-1) ?? superlative, positive],
		],
	),
);

/** An ordinal's stem without its ending, as Luna writes it bare (erst, zweit). */
const ordinalStem =
	/^(erst|zweit|dritt|viert|fünft|sechst|siebt|neunt|zehnt|elft|zwölft|(drei|vier|fünf|sech|sieb|acht|neun)zehnt|(zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert|tausend)st)$/u;

/**
 * The bare w-words that may stand for an irgend- word (Rule
 * de/bare-w-word-is-shorthand): each authored ADV whose irgend- word is an
 * authored ADV too (wo, wie, wann, woher, wohin).
 */
export const bareWWords: ReadonlySet<string> = (() => {
	const adverbs = new Set(
		authoredMembers.flatMap(({ lemma }) =>
			lemma.kind === "ADV" ? [lemma.canonicalForm] : [],
		),
	);
	return new Set([...adverbs].filter((word) => adverbs.has(`irgend${word}`)));
})();

/**
 * An ADV Lexeme's Canonical Form where the Rules settle it, whatever Luna
 * wrote: a da, wo or hier split from its hin, her or preposition is the
 * one word they form, with r before a vowel (da … auf is darauf; Rules
 * de/split-adverb-is-one-target, de/pronominal-adverb-stands-alone); a
 * bare w-word judged Shorthand is its irgend- word, member and headword
 * (de/bare-w-word-is-shorthand); a member the table spells as one word (a
 * dr- adverb, an r- adverb whose her- or hin- word was judged) is the
 * headword (de/dr-adverb-is-da-shorthand, de/r-adverb-is-her-or-hin-shorthand).
 */
function adverbHeadword(
	target: Target,
	orthographies: readonly MemberOrthography[],
	spelled: readonly string[],
):
	| {
			readonly canonicalForm: string;
			readonly members: ReadonlyMap<number, string>;
	  }
	| undefined {
	const words = target.members.map((member) => fold(member.text));
	const [first, second] = words;
	if (
		target.members.length === 2 &&
		first !== undefined &&
		second !== undefined &&
		splitHeads.has(first) &&
		/^\p{L}+$/u.test(second) &&
		orthographies.every((orthography) => orthography === "Standard")
	) {
		const joint =
			first !== "hier" && /^[aeiouäöü]/u.test(second) ? "r" : "";
		return {
			canonicalForm: `${first}${joint}${second}`,
			members: new Map(),
		};
	}
	if (target.members.length !== 1 || first === undefined) return undefined;
	const [member] = target.members;
	if (orthographies[0] === "Shorthand" && bareWWords.has(first)) {
		const word = `irgend${first}`;
		return { canonicalForm: word, members: new Map([[0, word]]) };
	}
	const fixed =
		member?.spelling?.orthography === "Shorthand" ? spelled[0] : undefined;
	return fixed !== undefined &&
		fold(fixed) !== first &&
		/^\p{L}+$/u.test(fixed)
		? { canonicalForm: fold(fixed), members: new Map() }
		: undefined;
}

/**
 * An ADV's or ADJ's Canonical Form over the one Luna wrote, and the
 * members it respells: `adverbHeadword`'s for an ADV, the positive of a
 * suppletive adverb's compared form (lieber is gern; Rules
 * de/comparability-is-lexical, de/canonical-form-is-the-headword), and an
 * ordinal's attributive headword (erste; Rule
 * de/attributive-adjective-stands-alone). A Locution keeps Luna's.
 */
export function adverbialHeadword(
	target: Target,
	shape: Shape,
	orthographies: readonly MemberOrthography[],
	degree: AdverbialInflection["degree"] | undefined,
	written: string | undefined,
	spelled: readonly string[],
): {
	readonly canonicalForm: string | undefined;
	readonly members: ReadonlyMap<number, string>;
} {
	let canonicalForm = written;
	let members: ReadonlyMap<number, string> = new Map();
	if (!shape.lexeme) return { canonicalForm, members };
	if (shape.adverbial && canonicalForm !== undefined) {
		const derived = adverbHeadword(target, orthographies, spelled);
		if (derived) ({ canonicalForm, members } = derived);
	}
	if (shape.adverbial && (degree === "Cmp" || degree === "Sup")) {
		const last = target.members[target.members.length - 1];
		const positive = last && suppletivePositive.get(fold(last.text));
		if (positive) canonicalForm = positive;
	}
	if (
		shape.adjectival &&
		canonicalForm !== undefined &&
		ordinalStem.test(canonicalForm)
	)
		canonicalForm = `${canonicalForm}e`;
	return { canonicalForm, members };
}
