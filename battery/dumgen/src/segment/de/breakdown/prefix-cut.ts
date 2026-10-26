/**
 * The affix test on a fossil-prone prefix (system ADR 0051, #1243), which
 * German `segment.inConstituents` and `segment.inMorphemes` ask before a
 * cut of `ge-` stays, in the stage `breakdown-words`.
 *
 * A dictionary's word-formation analysis (the DWDS Wortzerlegung, else the
 * Wiktionary etymology) must cut the prefix off this word. Asked yes or no,
 * jev answered near chance on the words it decides (#1241 round 6), so it
 * is one comparative question (round 7): the cut, with the word it leaves
 * named by its headwords (`ge- + Schicht`), against no cut. The headwords
 * are the letters after the prefix as they stand, a noun's with its final
 * -e dropped or restored, and each with an umlaut undone, so a cut whose
 * base shows a changed vowel is named by the word it was made from. The cut stays when its options together
 * weigh at least half.
 *
 * Its examples are no Breakdown case (#693).
 */
import * as Effect from "effect/Effect";
import { type Ask, type AskFailure, choice, choiceOf } from "../../ask.js";
import { withoutUmlaut } from "./forms.js";
import type { Whole } from "./targets.js";
import type { WordAnalysis } from "./word-analyses.js";
import { contendersOf, type Weighed } from "./word-senses.js";

/** The cut's options together must weigh this for the cut to stay. */
const cutFloor = 0.5;

/**
 * The prefixes that fossilized inside many simple words, so a cut there
 * must pass the affix test: `ge-`, which Gefahr keeps, its base having
 * died out (#1241 round 6).
 */
const affixTestedPrefixes: ReadonlySet<string> = new Set(["ge-"]);

/** Whether a prefix's cut must pass the affix test before it stays. */
export const isAffixTested = (prefix: string) =>
	affixTestedPrefixes.has(prefix);

const capitalized = (word: string) =>
	word.charAt(0).toLocaleUpperCase("de") + word.slice(1);

/**
 * The headwords the letters after a prefix may stand for, as they stand
 * first, then with an umlaut undone. A noun's are capitalized, and since a
 * noun drops or keeps its final -e inside a word, each also comes with it
 * restored or, when at least three letters stay, without it (`müt` gives
 * Müt, Müte, Mut and Mute; `schichte` Schichte and Schicht).
 */
export function baseHeadwords(
	letters: string,
	noun: boolean,
): readonly string[] {
	if (!noun) {
		const shown = letters.toLocaleLowerCase("de");
		return [...new Set([shown, withoutUmlaut(shown)])];
	}
	const shown = capitalized(letters);
	const forms = [
		shown,
		/e$/u.test(shown)
			? shown.length >= 4
				? shown.slice(0, -1)
				: shown
			: `${shown}e`,
	];
	return [...new Set([...forms, ...forms.map(withoutUmlaut)])];
}

/** The comparative question's instructions. */
export const prefixCutInstructions = (key: string, prefix: string) =>
	`How does a dictionary's word-formation analysis, the DWDS Wortzerlegung, else the Wiktionary etymology, take \`${key}\` apart: does it cut the prefix ${prefix} off a word it names, or not at all?`;

/** The option that cuts the prefix off `headword`. */
export const prefixCutOption = (
	key: string,
	prefix: string,
	headword: string,
) =>
	`${prefix} + ${headword}: \`${key}\` was made from ${headword}, a word a dictionary lists on its own, with the prefix ${prefix}`;

/** The option that keeps the prefix inside the word. */
export const keptPrefixOption = (key: string, prefix: string) =>
	`No cut: ${prefix} stays inside \`${key}\`, since the word it would leave died out, never stood on its own, or means nothing \`${key}\` was made from (Geselle)`;

/**
 * Whether jev weighs the cut of `prefix` off the word, leaving `base`,
 * confirmed by the affix test, in one request; `noun` names the base's
 * headwords as nouns.
 */
export const prefixCutConfirmed = Effect.fnUntraced(function* (
	prefix: string,
	base: { readonly letters: string; readonly noun: boolean },
	whole: Whole,
	ask: Ask,
): Effect.fn.Return<boolean, AskFailure> {
	const headwords = baseHeadwords(base.letters, base.noun);
	const answers = yield* ask({
		stage: "breakdown-words",
		state: whole.state,
		questions: {
			p_0: choice(prefixCutInstructions(whole.key, prefix), {
				...Object.fromEntries(
					headwords.map((headword, index) => [
						`c${index}`,
						prefixCutOption(whole.key, prefix, headword),
					]),
				),
				none: keptPrefixOption(whole.key, prefix),
			}),
		},
	});
	const { probabilities } = choiceOf(answers, "p_0");
	const cut = headwords.reduce(
		(sum, _, index) => sum + (probabilities[`c${index}`] ?? 0),
		0,
	);
	return cut >= cutFloor;
});

/** The affix-tested prefix an analysis cuts off first, with the letters it leaves, if any. */
function testedPrefix(analysis: WordAnalysis | undefined) {
	const [first, ...rest] = analysis?.pieces ?? [];
	return first?.role === "Prefix" && isAffixTested(first.canonicalForm)
		? {
				prefix: first.canonicalForm,
				base: rest.map(({ letters }) => letters).join(""),
			}
		: undefined;
}

/**
 * The analysis question's options and pick once every analysis that cuts
 * an affix-tested prefix off the word passes the affix test: asked, one
 * request per prefix and base, only when such an analysis is the pick or
 * one of its contenders (`word-senses.ts`). One that fails leaves the
 * options, and when it was the pick, the heaviest option left is.
 */
export const withTestedPrefixes = Effect.fnUntraced(function* (
	options: readonly Weighed[],
	picked: WordAnalysis | undefined,
	word: { readonly whole: Whole; readonly kind: string },
	ask: Ask,
): Effect.fn.Return<
	{
		readonly options: readonly Weighed[];
		readonly picked: WordAnalysis | undefined;
	},
	AskFailure
> {
	const inPlay =
		contendersOf(options) ??
		options.filter(({ analysis }) => analysis === picked);
	const cuts = new Map<string, { prefix: string; base: string }>();
	for (const { analysis } of inPlay) {
		const cut = testedPrefix(analysis);
		if (cut !== undefined) cuts.set(`${cut.prefix} ${cut.base}`, cut);
	}
	const failed = new Set<string>();
	for (const [id, { prefix, base }] of cuts)
		if (
			!(yield* prefixCutConfirmed(
				prefix,
				{ letters: base, noun: word.kind === "NOUN" },
				word.whole,
				ask,
			))
		)
			failed.add(id);
	if (failed.size === 0) return { options, picked };
	const fails = (analysis: WordAnalysis | undefined) => {
		const cut = testedPrefix(analysis);
		return cut !== undefined && failed.has(`${cut.prefix} ${cut.base}`);
	};
	const kept = options.filter(({ analysis }) => !fails(analysis));
	const [heaviest] = [...kept].sort(
		(left, right) => right.weight - left.weight,
	);
	return {
		options: kept,
		picked: fails(picked) ? heaviest?.analysis : picked,
	};
});
