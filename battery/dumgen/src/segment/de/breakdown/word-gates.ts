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
 *   golden). When it is, the prefix and the base verb stay alone, and the
 *   prefix, the noun or adjective and the citation ending go (#1241 round
 *   8): a verb made from a verb is not remade from that verb's noun, so
 *   the sense check no longer settles the bracketing.
 * - **A cranberry piece is no word.** A noun's first part is offered as a
 *   cranberry Root only when it is no word of its own and no word's stem
 *   (`Kau` is kauen's), so a verb stem keeps its route question's share.
 *   A compound the sense check chose over the analysis question's pick is
 *   not asked: it won as two words (`constituents.ts`).
 * - **A suffix's base is a verb or a noun.** Before a suffix with no one
 *   base Kind (`-er`), a base jev weighs a verb and no noun is a VERB
 *   (`Lehr` is lehren), and one it weighs a noun and no verb a NOUN,
 *   unasked; a base that is both or neither keeps its route question.
 *   Before -ig and -lich, the noun is tested with its umlaut undone and its
 *   dropped -e restored (`gnäd` is Gnade), and a base that is also an
 *   adjective keeps its route question (#1241 round 6); one that is no
 *   adjective but both a verb's stem and a noun is asked between those two
 *   alone, the likelier first (#1241 round 8).
 * - **A fossilized prefix stays inside the word** (`prefix-cut.ts`). An
 *   analysis or a split that cuts `ge-` off stays only when jev weighs the
 *   affix test passed (system ADR 0051, #1243).
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
import { restoredNouns, withoutUmlaut } from "./forms.js";
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

/** Whether letters, as they stand, are an adjective. */
export const adjectiveQuestion = (key: string, letters: string) =>
	`In \`${key}\`, is "${letters}", spelled exactly so, an adjective a dictionary lists as a headword?`;

/** Whether a noun's first part is a word, or a word's stem, of its own. */
export const wordQuestion = (key: string, letters: string) =>
	`In \`${key}\`, is "${letters}" a word of its own, or a word's stem without its ending (Kau for kauen), that a dictionary lists as a headword? Answer no for a piece that lives on only inside words like this one.`;

/** Whether `analysis` is a prefix + base + citation ending one with the prefix `letters`. */
const endingRival = ({ pieces }: WordAnalysis, letters: string) => {
	const [first, , ending] = pieces;
	return (
		first?.role === "Prefix" &&
		first.letters === letters &&
		ending?.role === "Ending"
	);
};

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
	const rivalled = analyses.some((other) =>
		endingRival(other, prefix.letters),
	);
	return rivalled ? base.letters : undefined;
}

/**
 * The analyses with every prefix + verb analysis whose base jev weighs no
 * verb of its own taken out, and for one whose base jev weighs a verb, its
 * prefix + base + citation ending rivals, in one request; unchanged,
 * unasked, when no such analysis has a prefix + base + citation ending
 * rival.
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
	const verbPrefixes = new Set(
		analyses.flatMap((analysis) => {
			const base = rivalledBase(analysis, analyses);
			const [prefix] = analysis.pieces;
			return base === undefined ||
				noVerb.has(base) ||
				prefix === undefined
				? []
				: [prefix.letters];
		}),
	);
	return analyses.filter((analysis) => {
		const base = rivalledBase(analysis, analyses);
		if (base !== undefined) return !noVerb.has(base);
		return ![...verbPrefixes].some((letters) =>
			endingRival(analysis, letters),
		);
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

/** The suffixes before which a base noun may show an umlaut and drop its -e (`gnäd` + -ig is Gnade). */
const nounRestoringSuffixes: ReadonlySet<string> = new Set(["ig", "lich"]);

/**
 * The routes a suffix's base may take, the likelier first, and the nouns it
 * may be when code tested them: one route settles it unasked.
 */
export type BaseRoute = {
	readonly routes: readonly RouteKey[];
	readonly nouns?: readonly string[];
};

/**
 * The routes a suffix's base may take, by its letters: VERB when jev
 * weighs them a verb's stem and no noun, NOUN when a noun and no verb's
 * stem, in one request; undefined, so every word route stays, after a
 * suffix with one base Kind, which already routes it. Before -ig and -lich
 * the noun test runs on the nouns the letters may stand for
 * (`restoredNouns`), the ones that pass are the base's forms, a base that
 * is also an adjective is left to its route question, and one that is no
 * adjective but both a verb's stem and a noun takes VERB or NOUN, the
 * likelier first: the adjective test said no to the ADJ route.
 */
export const suffixBaseRoute = Effect.fnUntraced(function* (
	base: string,
	suffix: string,
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<BaseRoute | undefined, AskFailure> {
	const restoring = nounRestoringSuffixes.has(suffix.toLocaleLowerCase("de"));
	const nouns = restoring ? restoredNouns(base) : [base];
	const questions: Questions = {
		b_0: noul(verbBaseQuestion(whole.key, infinitiveOf(base))),
	};
	for (const [index, noun] of nouns.entries())
		questions[`n_${index}`] = noul(nounQuestion(whole.key, noun));
	if (restoring)
		questions.a_0 = noul(
			adjectiveQuestion(
				whole.key,
				withoutUmlaut(base).toLocaleLowerCase("de"),
			),
		);
	const answers = yield* askAny(ask, {
		stage: "breakdown-words",
		state: whole.state,
		questions,
	});
	const verbWeight = noulOf(answers, "b_0");
	const verb = verbWeight >= gateFloor;
	const weighed = nouns
		.map((noun, index) => ({ noun, weight: noulOf(answers, `n_${index}`) }))
		.filter(({ weight }) => weight >= gateFloor)
		.sort((left, right) => right.weight - left.weight);
	const listed = weighed.map(({ noun }) => noun);
	const noun = listed.length > 0;
	const adjective = restoring && noulOf(answers, "a_0") >= gateFloor;
	const nounForms = restoring ? { nouns: listed } : {};
	if (adjective || (!verb && !noun)) return undefined;
	if (verb && noun) {
		if (!restoring) return undefined;
		const nounFirst = (weighed[0]?.weight ?? 0) > verbWeight;
		return {
			routes: nounFirst
				? ["Lexeme/NOUN", "Lexeme/VERB"]
				: ["Lexeme/VERB", "Lexeme/NOUN"],
			...nounForms,
		};
	}
	if (verb) return { routes: ["Lexeme/VERB"] };
	return { routes: ["Lexeme/NOUN"], ...nounForms };
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
