/**
 * The sense check of German `segment.inConstituents` (#1241 round 4,
 * proposal 1): on a contested word only, jev answers one yes-or-no
 * question per contending analysis, in one request, `breakdown-senses`:
 * does this analysis give the sense the Reading's emoji names? Each
 * question names the word with its article and the emoji, and carries a
 * concrete test written by code from the analysis's shape: a compound
 * must be a kind of its head ("Is it a Tier?"), a derivation what its
 * suffix makes of its base (dumcorpus's affix inventory glosses the
 * common suffixes).
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
 *   `none`. `none` gets no question of its own: it gives the sense as far
 *   as no analysis does, one minus the best analysis's answer (a question
 *   for it weighed Leiter 🪜 and 👔 alike, 0.21 and 0.22).
 * - **Combining.** The pick stands when its own answer is a yes (at least
 *   0.5), since analyses that give one sense alike (a prefix and a noun, or
 *   a verb and a suffix) are a bracketing question, not a sense question.
 *   Otherwise each contender scores its answer times its analysis weight
 *   raised to `weightExponent`, and the best score wins: the answer leads,
 *   so a gold analysis the analysis question weighed 0.03 can still win
 *   when it alone gives the sense, while the weight still counts.
 *
 * Its wording names no Breakdown case (#693).
 */
import type { Questions } from "@typesafe-ai/sdk";
import { germanSuffixes } from "dumcorpus/inventories";
import * as Effect from "effect/Effect";
import { type Ask, type AskFailure, noul, noulOf } from "../../ask.js";
import type { Whole } from "./targets.js";
import type { WordAnalysis, WordPiece } from "./word-analyses.js";

/** An option of the analysis question with jev's weight: an analysis, or `none`. */
export type Weighed = {
	readonly analysis: WordAnalysis | undefined;
	readonly weight: number;
};

/** A runner-up at or above this weight contests the pick. */
const contestFloor = 0.15;

/** A sense answer at or above this is a yes: the analysis gives the sense. */
const yes = 0.5;

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

const capitalized = (text: string) =>
	text.charAt(0).toLocaleUpperCase("de") + text.slice(1);

/** What a suffix makes of its base, from the inventory, else a plain gloss. */
function suffixSense(suffix: WordPiece, base: string): string {
	const sense = germanSuffixes.find(
		({ spelled }) => spelled === suffix.letters.toLocaleLowerCase("de"),
	)?.sense;
	return (
		sense ?? "something whose sense comes from what {base} names"
	).replaceAll("{base}", base);
}

/** The question an analysis's sense must pass, by its shape, after "Think of … in the sense …". */
function testOf(analysis: WordAnalysis, kind: string): string {
	const [first, second, third] = analysis.pieces;
	const made = (from: string, sense: string) =>
		`Was it made from ${from}, so that it is ${sense}? Answer no when its letters only happen to contain them.`;
	if (first?.role === "Word" && second?.role === "Word" && !third) {
		if (kind === "NOUN") {
			const head = capitalized(second.letters);
			return `Is it a ${head}, a kind of ${head} that ${first.letters} tells apart? Answer no when it is no ${head} at all.`;
		}
		return `Does it mean ${second.letters}, in a way ${first.letters} tells apart? Answer no when it does not mean ${second.letters} at all.`;
	}
	if (first?.role === "Word" && second?.role === "Suffix" && !third)
		return made(
			`${first.letters}- with the suffix -${second.letters}`,
			suffixSense(second, `${first.letters}-`),
		);
	if (first?.role === "Prefix" && second?.role === "Word" && !third)
		return made(
			`${second.letters} with the prefix ${first.letters}-`,
			`still a kind of ${second.letters}, changed by the prefix`,
		);
	if (first?.role === "Prefix" && second?.role === "Word")
		return made(
			`${second.letters} with the prefix ${first.letters}- and the verb ending`,
			`to make, give, become or treat with ${second.letters}`,
		);
	return made(analysis.label, "something whose sense comes from theirs");
}

/** The word as the sense question names it: a noun with its article (`das Rentier`). */
export function citedWord(word: string, gender: unknown): string {
	const articles: Readonly<Record<string, string>> = {
		Masc: "der",
		Fem: "die",
		Neut: "das",
	};
	const genders =
		typeof gender === "string"
			? [gender]
			: typeof gender === "object" &&
					gender !== null &&
					"mixed" in gender &&
					Array.isArray(gender.mixed)
				? gender.mixed
				: [];
	const named = genders.flatMap((one) =>
		typeof one === "string" && one in articles ? [articles[one]] : [],
	);
	return named.length > 0 ? `${named.join("/")} ${word}` : word;
}

/** Whether an analysis gives the sense `emoji` names of `cited` (`das Rentier`). */
export const senseQuestion = (
	analysis: WordAnalysis,
	cited: string,
	emoji: string,
	kind: string,
) => `Think of ${cited} in the sense ${emoji}. ${testOf(analysis, kind)}`;

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
 * the analysis question's pick, unless the word is contested and the pick
 * fails its sense test, then the best contender; in one request.
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
	const fits = new Map(
		analyses.map((analysis, index) => [
			analysis,
			noulOf(answers, `s_${index}`),
		]),
	);
	const none = 1 - Math.max(0, ...fits.values());
	const fitOf = (analysis: WordAnalysis | undefined) =>
		analysis === undefined ? none : (fits.get(analysis) ?? 0);
	if (fitOf(picked) >= yes) return picked;
	const best = bestContender(
		contenders.map((weighed) => ({
			weighed,
			fit: fitOf(weighed.analysis),
		})),
	);
	return best === undefined ? picked : best.analysis;
});
