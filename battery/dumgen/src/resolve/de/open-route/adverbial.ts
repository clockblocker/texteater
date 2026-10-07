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
import { splitHeads } from "../../../segment/de/candidates.js";
import type { MemberOrthography } from "../member-spelling.js";
import { fill, question } from "../prompts.js";
import type { Answered, Questionnaire } from "../questions.js";
import type { Target } from "../target.js";
import { agreementQuestions, readAgreement } from "./agreeing.js";
import { fold, type Shape, type Values } from "./shape.js";

/**
 * Asks an ADV's or ADJ's block: a bare w-word's reading, comparability and
 * degree, and whether an ADJ is attributive, with its agreement.
 */
export function askAdverbial(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
): void {
	// A bare w-word as an ADV asks, opens a clause or stands for its irgend-
	// word (Rule de/bare-w-word-is-shorthand).
	const [lone] = target.members;
	if (
		shape.adverbial &&
		shape.lexeme &&
		target.members.length === 1 &&
		lone &&
		!lone.spelling &&
		bareWWords.has(fold(lone.text))
	)
		questionnaire.choice(
			"indefinite",
			fill(question.indefinite, { m: lone.ref }),
			{
				Asks: question.indefiniteAsks,
				Indefinite: question.indefiniteIrgend,
			},
			["orthography"],
		);
	questionnaire.choice(
		"comparable",
		question.comparable,
		{ Yes: question.comparableYes, No: question.comparableNo },
		["adjective"],
	);
	questionnaire.choice("degree", question.degree, {
		Pos: "Positive, uncompared",
		Cmp: "Comparative",
		Sup: "Superlative, am … -sten included",
	});
	if (shape.adjectival) {
		questionnaire.choice("attributive", question.attributive, {
			Yes: "It agrees with a noun",
			No: "Predicative or adverbial, agreeing with nothing",
		});
		agreementQuestions(questionnaire);
	}
}

/**
 * Reads an ADV's or ADJ's block: comparability, and the degree and an
 * attributive ADJ's agreement as its inflection.
 */
export function readAdverbial(
	shape: Shape,
	answered: Answered,
): { readonly core: Values; readonly inflection: Values | null } {
	const comparable = answered.pick("comparable") === "Yes";
	const core: Values = { comparable: comparable ? "Yes" : null };
	const degree = comparable ? answered.pick("degree") : null;
	if (shape.adverbial)
		return { core, inflection: comparable ? { degree } : null };
	const attributive = answered.pick("attributive") === "Yes";
	const agreement = attributive ? readAgreement(answered) : undefined;
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
export const ordinalStem =
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
export function adverbHeadword(
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
