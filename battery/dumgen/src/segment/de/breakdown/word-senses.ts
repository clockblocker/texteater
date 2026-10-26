/**
 * The sense check of German `segment.inConstituents` (#1241 round 4,
 * proposal 1; relative since round 7): on a contested word only, jev
 * answers, in the stage `breakdown-senses`, whether each contending
 * analysis gives the sense the Reading's emoji names, one yes or no each in
 * one request, and, when two or more analyses contend, which of these
 * splits gives it, one choice over them in a second request. The
 * questions name the word with its article and the emoji, and carry a
 * concrete test or claim written by code from each analysis's shape
 * (`sense-prompts.ts`).
 *
 * - **Contested.** The analysis question's runner-up, `none` included,
 *   weighs at least `contestFloor`, or the pick is a base and a suffix:
 *   a derivation's last base letter and suffix also spell a compound's head
 *   (`Grün + dung` beside `Gründ + -ung`), and a derivation competes with a
 *   simple homograph, so its rivals are contenders however light. A
 *   hyphenated word is never contested: its analyses differ in the prefix,
 *   not the sense.
 * - **Contenders.** The pick, every option at or above the floor, the
 *   two-part analyses cutting one letter off a derivation's cut, and
 *   `none`.
 * - **Combining.** The best yes says how far a split gives the sense at
 *   all, and `none` gives it as far as no split does, one minus that (a
 *   question for `none` weighed Leiter 🪜 and 👔 alike, 0.21 and 0.22; as
 *   an option of the choice it lost to any split, round 7's live check).
 *   The splits share the best yes by the choice's weights over them, so a
 *   pick that gives the sense loses to a contender that gives it better
 *   (round 6 kept a pick whose own yes stood over a better one). Each
 *   contender scores its fit times its analysis weight raised to
 *   `weightExponent`, and the best score wins: the answer leads, so a gold
 *   analysis the analysis question weighed 0.03 can still win when it alone
 *   gives the sense, while the weight still counts.
 *
 * Its wording names no Breakdown case (#693).
 */
import type { Questions } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import {
	type Ask,
	type AskFailure,
	choice,
	choiceOf,
	noul,
	noulOf,
} from "../../ask.js";
import {
	noSenseOption,
	senseInstructions,
	senseOption,
	senseQuestion,
} from "./sense-prompts.js";
import type { Whole } from "./targets.js";
import type { WordAnalysis } from "./word-analyses.js";

/** An option of the analysis question with jev's weight: an analysis, or `none`. */
export type Weighed = {
	readonly analysis: WordAnalysis | undefined;
	readonly weight: number;
};

/** A runner-up at or above this weight contests the pick. */
const contestFloor = 0.15;

/**
 * How much the analysis weight counts beside the sense answer: a contender
 * scores fit × weight^weightExponent. Tuned on the tuning homographs only.
 */
const weightExponent = 0.3;

/** The analysis question's options with their weights, `a<i>` and `none`. */
export function weighedOptions(
	analyses: readonly WordAnalysis[],
	probabilities: Readonly<Record<string, number>>,
): Weighed[] {
	return [
		...analyses.map((analysis, index) => ({
			analysis,
			weight: probabilities[`a${index}`] ?? 0,
		})),
		{ analysis: undefined, weight: probabilities.none ?? 0 },
	];
}

/** Where a two-part analysis cuts the word: its first piece's length. */
function cutOf({ pieces }: WordAnalysis): number | undefined {
	const [first, second, ...rest] = pieces;
	return first !== undefined && second !== undefined && rest.length === 0
		? first.letters.length
		: undefined;
}

const isDerivation = ({ pieces }: WordAnalysis) =>
	pieces.length === 2 &&
	pieces[0]?.role === "Word" &&
	pieces[1]?.role === "Suffix";

/** The contenders of a contested word, the pick first; undefined when it isn't contested. */
export function contendersOf(
	options: readonly Weighed[],
): readonly Weighed[] | undefined {
	const sorted = [...options].sort(
		(left, right) => right.weight - left.weight,
	);
	const [top, ...rest] = sorted;
	if (
		top === undefined ||
		options.some(({ analysis }) =>
			analysis?.pieces.some(({ role }) => role === "Hyphen"),
		)
	)
		return undefined;
	const heavy = rest.filter(({ weight }) => weight >= contestFloor);
	const cut =
		top.analysis !== undefined && isDerivation(top.analysis)
			? cutOf(top.analysis)
			: undefined;
	const rivals =
		cut === undefined
			? []
			: rest.filter(({ analysis }) => {
					const other = analysis && cutOf(analysis);
					return other !== undefined && Math.abs(other - cut) === 1;
				});
	if (heavy.length === 0 && rivals.length === 0) return undefined;
	const none = rest.filter(({ analysis }) => analysis === undefined);
	return [...new Set([top, ...heavy, ...rivals, ...none])];
}

/** The contender with the best score: its sense answer times its weight to `weightExponent`. */
export function bestContender(
	scored: readonly { readonly weighed: Weighed; readonly fit: number }[],
): Weighed | undefined {
	let best: { readonly weighed: Weighed; readonly score: number } | undefined;
	for (const { weighed, fit } of scored) {
		const score = fit * weighed.weight ** weightExponent;
		if (best === undefined || score > best.score) best = { weighed, score };
	}
	return best?.weighed;
}

/**
 * The analysis a word breaks down by once its sense is checked: `picked`,
 * the analysis question's pick, unless the word is contested, then the
 * contender with the best score; in one request, and a second when two or
 * more analyses contend.
 */
export const senseChecked = Effect.fnUntraced(function* (
	options: readonly Weighed[],
	picked: WordAnalysis | undefined,
	word: {
		readonly whole: Whole;
		readonly cited: string;
		readonly kind: string;
	},
	ask: Ask,
): Effect.fn.Return<WordAnalysis | undefined, AskFailure> {
	const contenders = contendersOf(options);
	const emoji = word.whole.state.meaning;
	// A Reading with no emoji (a Foreign one) names no sense to check.
	if (contenders === undefined || typeof emoji !== "string") return picked;
	const analyses = contenders.flatMap(({ analysis }) =>
		analysis === undefined ? [] : [analysis],
	);
	const questions: Questions = Object.fromEntries(
		analyses.map((analysis, index) => [
			`s_${index}`,
			noul(senseQuestion(analysis, word.cited, emoji, word.kind)),
		]),
	);
	const answers = yield* ask({
		stage: "breakdown-senses",
		state: word.whole.state,
		questions,
	});
	const gives = Math.max(
		0,
		...analyses.map((_, index) => noulOf(answers, `s_${index}`)),
	);
	const shares = yield* splitShares(analyses, { ...word, emoji }, ask);
	const fitOf = (analysis: WordAnalysis | undefined) =>
		analysis === undefined
			? 1 - gives
			: gives * (shares.get(analysis) ?? 0);
	const best = bestContender(
		contenders.map((weighed) => ({
			weighed,
			fit: fitOf(weighed.analysis),
		})),
	);
	return best === undefined ? picked : best.analysis;
});

/**
 * Each split's share of the sense, by the choice's weights over the splits
 * alone: asked only when two or more contend, else the one split's whole.
 */
const splitShares = Effect.fnUntraced(function* (
	analyses: readonly WordAnalysis[],
	word: {
		readonly whole: Whole;
		readonly cited: string;
		readonly kind: string;
		readonly emoji: string;
	},
	ask: Ask,
): Effect.fn.Return<ReadonlyMap<WordAnalysis, number>, AskFailure> {
	if (analyses.length < 2)
		return new Map(analyses.map((analysis) => [analysis, 1]));
	const answers = yield* ask({
		stage: "breakdown-senses",
		state: word.whole.state,
		questions: {
			s: choice(senseInstructions(word.cited, word.emoji), {
				...Object.fromEntries(
					analyses.map((analysis, index) => [
						`a${index}`,
						senseOption(analysis, word.kind),
					]),
				),
				none: noSenseOption,
			}),
		},
	});
	const { probabilities } = choiceOf(answers, "s");
	const weights = analyses.map((_, index) => probabilities[`a${index}`] ?? 0);
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	return new Map(
		analyses.map((analysis, index) => [
			analysis,
			total > 0 ? (weights[index] ?? 0) / total : 1 / analyses.length,
		]),
	);
});
