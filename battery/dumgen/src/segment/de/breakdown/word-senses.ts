/**
 * The sense check of German `segment.inConstituents` (#1241 round 4,
 * proposal 1): on a contested word only, jev answers one yes-or-no
 * question per contending analysis, in one request, `breakdown-senses`:
 * does this analysis give the sense the Reading's emoji names? Each
 * question carries a concrete test written by code from the analysis's
 * shape: a compound names a kind of its head, a derivation what its
 * suffix makes of its base (dumcorpus's affix inventory glosses the
 * common suffixes), and `none` a simple word that only shares letters with
 * every contender.
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
 * - **Combining.** Each contender scores its sense answer times its
 *   analysis weight raised to `weightExponent`, and the best score wins.
 *   The sense answer leads, so a gold analysis the analysis question
 *   weighed 0.03 can still win when it alone gives the sense, while the
 *   weight still settles contenders that give the sense alike (a prefix
 *   verb with or without its citation ending).
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
		sense ??
		`a word made from "{base}" with -${suffix.letters}, its sense coming from what "{base}" names`
	).replaceAll("{base}", base);
}

/** The concrete test an analysis's sense must pass, by its shape. */
function testOf(analysis: WordAnalysis, key: string, kind: string): string {
	const [first, second, third] = analysis.pieces;
	if (first?.role === "Word" && second?.role === "Word" && !third) {
		if (kind === "NOUN")
			return `\`${key}\` must name a kind of ${capitalized(second.letters)}, one that has to do with "${first.letters}"`;
		return `\`${key}\` must mean ${second.letters} in a way "${first.letters}" names`;
	}
	if (first?.role === "Word" && second?.role === "Suffix" && !third)
		return `\`${key}\` must be ${suffixSense(second, first.letters)}`;
	if (first?.role === "Prefix" && second?.role === "Word" && !third)
		return `\`${key}\` must still be what "${second.letters}" names, changed by the prefix ${first.letters}-`;
	if (first?.role === "Prefix" && second?.role === "Word")
		return `\`${key}\` must mean to make, give, become or treat with what "${second.letters}" names`;
	return `\`${key}\` must take its sense from what these parts name`;
}

/** Whether an analysis gives the sense `meaning` names. */
export const senseQuestion = (
	analysis: WordAnalysis,
	key: string,
	kind: string,
) =>
	`In the sense \`meaning\` names, was \`${key}\` formed as ${analysis.label}? Test it: in this sense, ${testOf(analysis, key, kind)}. Answer no when, in this sense, \`${key}\` only shares these letters with them.`;

/** Whether the word is simple in this sense, formed from none of the contenders. */
export const noneQuestion = (key: string, labels: readonly string[]) =>
	`In the sense \`meaning\` names, is \`${key}\` a simple word, formed from none of these: ${labels.join("; ")}? Test it: in this sense, its meaning must have nothing to do with what any of their parts names, only sharing their letters.`;

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
 * best contender, in one request.
 */
export const senseChecked = Effect.fnUntraced(function* (
	options: readonly Weighed[],
	picked: WordAnalysis | undefined,
	whole: Whole,
	kind: string,
	ask: Ask,
): Effect.fn.Return<WordAnalysis | undefined, AskFailure> {
	const contenders = contendersOf(options);
	// A Reading with no emoji (a Foreign one) names no sense to check.
	if (contenders === undefined || !("meaning" in whole.state)) return picked;
	const labels = contenders.flatMap(({ analysis }) =>
		analysis === undefined ? [] : [analysis.label],
	);
	const ids = contenders.map(({ analysis }, index) =>
		analysis === undefined ? "s_none" : `s_${index}`,
	);
	const questions: Questions = Object.fromEntries(
		contenders.map(({ analysis }, index) => [
			ids[index],
			noul(
				analysis === undefined
					? noneQuestion(whole.key, labels)
					: senseQuestion(analysis, whole.key, kind),
			),
		]),
	);
	const answers = yield* ask({
		stage: "breakdown-senses",
		state: whole.state,
		questions,
	});
	const best = bestContender(
		contenders.map((weighed, index) => ({
			weighed,
			fit: noulOf(answers, ids[index] ?? "s_none"),
		})),
	);
	return best === undefined ? picked : best.analysis;
});
