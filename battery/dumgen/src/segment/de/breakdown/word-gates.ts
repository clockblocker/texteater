/**
 * The yes-or-no checks German `segment.inConstituents` and
 * `segment.inMorphemes` ask about a word's letters before they offer a
 * shape or a route that needs them (#1241 rounds 3 and 4), each in the
 * stage `breakdown-words`:
 *
 * - **A prefix's base is a verb.** A verb cut into a prefix and a base
 *   verb (`ver- + brennen`) is offered only when the base is a verb a
 *   dictionary lists; else only the prefix, the noun or adjective inside
 *   and the citation ending stay (`ver- + gold + -en`: there is no verb
 *   golden). Both stay when it is, and the analysis question picks.
 * - **A cranberry piece is no word.** A noun's first part is offered as a
 *   cranberry Root only when it is no word of its own and no word's stem
 *   (`Kau` is kauen's), so a verb stem keeps its route question's share.
 * - **A suffix's base is a verb or a noun.** Before a suffix with no one
 *   base Kind (`-er`), a base jev weighs a verb and no noun is a VERB
 *   (`Lehr` is lehren), and one it weighs a noun and no verb a NOUN,
 *   unasked; a base that is both or neither keeps its route question.
 * - **A bottom word's Root is no word** (`morphemes.ts`). A bottom word has
 *   no word inside it (ADR 0051), so a split that cuts a suffix off a word
 *   or a verb's stem is no split of it.
 *
 * Their examples are no Breakdown case (#693).
 */
import type { EntryType, Questions } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { type Ask, type AskFailure, askAny, noul, noulOf } from "../../ask.js";
import type { RouteKey } from "../routes.js";
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

/** The infinitive a stem's letters would have: `-n` after -el and -er, else `-en` (`Lehr` → lehren). */
const infinitiveOf = (letters: string) => {
	const lower = letters.toLocaleLowerCase("de");
	return /(?:el|er)$/u.test(lower) ? `${lower}n` : `${lower}en`;
};

/** Whether letters, as they stand, are a noun. */
export const nounQuestion = (key: string, letters: string) =>
	`In \`${key}\`, is "${letters.charAt(0).toLocaleUpperCase("de")}${letters.slice(1)}", spelled exactly so, a noun a dictionary lists as a headword? Answer no when only a longer noun has these letters, as there is no noun "Lehr", only Lehre.`;

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

/**
 * The route a suffix's base takes unasked, by its letters: VERB when jev
 * weighs them a verb's stem and no noun, NOUN when a noun and no verb's
 * stem, in one request; undefined, unasked, after a suffix with one base
 * Kind, which already routes it.
 */
export const suffixBaseRoute = Effect.fnUntraced(function* (
	base: string,
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<RouteKey | undefined, AskFailure> {
	const answers = yield* ask({
		stage: "breakdown-words",
		state: whole.state,
		questions: {
			b_0: noul(verbBaseQuestion(whole.key, infinitiveOf(base))),
			n_0: noul(nounQuestion(whole.key, base)),
		},
	});
	const verb = noulOf(answers, "b_0") >= gateFloor;
	const noun = noulOf(answers, "n_0") >= gateFloor;
	if (verb === noun) return undefined;
	return verb ? "Lexeme/VERB" : "Lexeme/NOUN";
});

/**
 * Of a bottom word's would-be Roots, the ones jev weighs a word or a
 * verb's stem of its own, in one request: neither the verb test nor the
 * word test may pass for a Root a suffix is cut off.
 */
export const wordRoots = Effect.fnUntraced(function* (
	roots: readonly string[],
	state: Readonly<Record<string, EntryType>>,
	ask: Ask,
): Effect.fn.Return<ReadonlySet<string>, AskFailure> {
	const questions: Questions = {};
	for (const [index, root] of roots.entries()) {
		questions[`b_${index}`] = noul(
			verbBaseQuestion("word", infinitiveOf(root)),
		);
		questions[`w_${index}`] = noul(wordQuestion("word", root));
	}
	const answers = yield* askAny(ask, {
		stage: "breakdown-words",
		state,
		questions,
	});
	return new Set(
		roots.filter(
			(_, index) =>
				noulOf(answers, `b_${index}`) >= gateFloor ||
				noulOf(answers, `w_${index}`) >= gateFloor,
		),
	);
});
