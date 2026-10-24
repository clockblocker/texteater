/**
 * Two yes-or-no checks German `segment.inConstituents` asks about a word's
 * letters before it offers a shape that needs them (#1241 round 3), each
 * in the stage `breakdown-words`:
 *
 * - **A prefix's base is a verb.** A verb cut into a prefix and a base
 *   verb (`ver- + brennen`) is offered only when the base is a verb a
 *   dictionary lists; else only the prefix, the noun or adjective inside
 *   and the citation ending stay (`ver- + gold + -en`: there is no verb
 *   golden). Both stay when it is, and the analysis question picks.
 * - **A cranberry piece is no word.** A noun's first part is offered as a
 *   cranberry Root only when it is no word of its own and no word's stem
 *   (`Kau` is kauen's), so a verb stem keeps its route question's share.
 *
 * Their examples are no Breakdown case (#693).
 */
import type { Questions } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { type Ask, type AskFailure, askAny, noul, noulOf } from "../../ask.js";
import type { Whole } from "./targets.js";
import type { WordAnalysis } from "./word-analyses.js";

/** A yes must reach this for the shape it gates to be offered or kept. */
const gateFloor = 0.5;

/**
 * Whether the letters after a verb's prefix are a verb of their own,
 * tested by its first person, which code writes from the base: `arzten`
 * gives `ich arzte`, which no one says.
 */
export const verbBaseQuestion = (key: string, base: string) =>
	`In \`${key}\`, does German have a verb "${base}" of its own, used with no prefix at all? Test it: "ich ${firstPerson(base)}" must be an ordinary sentence start, as "ich brenne" is for brennen. Answer no when the verb occurs only with a prefix, as there is no "ich golde" beside vergolden.`;

/** A base's first person singular: its citation ending off, `-e` on (`brennen` → brenne, `wandern` → wandere). */
const firstPerson = (base: string) => {
	const lower = base.toLocaleLowerCase("de");
	const stem = /(?:el|er)n$/u.test(lower)
		? lower.slice(0, -1)
		: lower.replace(/en$/u, "");
	return `${stem}e`;
};

/** Whether a noun's first part is a word, or a word's stem, of its own. */
export const wordQuestion = (key: string, letters: string) =>
	`In \`${key}\`, is "${letters}" a word of its own, or a word's stem without its ending (Kau for kauen), that a dictionary lists as a headword? Answer no for a piece that lives on only inside words like this one.`;

/**
 * The base a prefix + verb analysis offers (`brennen` of `ver + brennen`)
 * when the same word also has a prefix + base + citation ending analysis
 * with that prefix (`ver + brenn + -en`); undefined otherwise.
 */
function rivalledBase(
	analysis: WordAnalysis,
	analyses: readonly WordAnalysis[],
): string | undefined {
	const [prefix, base, ...rest] = analysis.pieces;
	if (prefix?.role !== "Prefix" || base?.role !== "Word" || rest.length > 0)
		return undefined;
	const rivalled = analyses.some(({ pieces }) => {
		const [first, , ending] = pieces;
		return (
			first?.role === "Prefix" &&
			first.letters === prefix.letters &&
			ending?.role === "Ending"
		);
	});
	return rivalled ? base.letters : undefined;
}

/**
 * The analyses with every prefix + verb analysis whose base jev weighs no
 * verb of its own taken out, in one request; unchanged, unasked, when no
 * such analysis has a prefix + base + citation ending rival.
 */
export const withVerbBases = Effect.fnUntraced(function* (
	analyses: readonly WordAnalysis[],
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<readonly WordAnalysis[], AskFailure> {
	const bases = [
		...new Set(
			analyses.flatMap((analysis) => {
				const base = rivalledBase(analysis, analyses);
				return base === undefined ? [] : [base];
			}),
		),
	];
	if (bases.length === 0) return analyses;
	const questions: Questions = Object.fromEntries(
		bases.map((base, index) => [
			`b_${index}`,
			noul(verbBaseQuestion(whole.key, base)),
		]),
	);
	const answers = yield* askAny(ask, {
		stage: "breakdown-words",
		state: whole.state,
		questions,
	});
	const noVerb = new Set(
		bases.filter((_, index) => noulOf(answers, `b_${index}`) < gateFloor),
	);
	return analyses.filter((analysis) => {
		const base = rivalledBase(analysis, analyses);
		return base === undefined || !noVerb.has(base);
	});
});

/** Whether jev weighs `letters` no word and no word's stem, so a cranberry Root may be offered. */
export const mayBeCranberry = Effect.fnUntraced(function* (
	letters: string,
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<boolean, AskFailure> {
	const answers = yield* ask({
		stage: "breakdown-words",
		state: whole.state,
		questions: { w_0: noul(wordQuestion(whole.key, letters)) },
	});
	return noulOf(answers, "w_0") < gateFloor;
});
