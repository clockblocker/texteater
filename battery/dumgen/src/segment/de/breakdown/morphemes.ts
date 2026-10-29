/**
 * German `segment.inMorphemes` (Dumgen ADR 0007, system ADR 0051): a bottom
 * word's Morphemic Breakdown, as school morphemic analysis (Wortbausteine)
 * gives it, `spann · en`, `ver · gess · en`, `haus · ∅`.
 *
 * Code cuts the citation ending first, by the word's Kind: a verb's `-en`
 * or `-n`, a noun's or adjective's final `-e`, else the zero ending where
 * the Kind has one (dumcorpus's German Morphemic Breakdown policy), and
 * none for an indeclinable word. Then it lists the splits of what is left
 * into at most one prefix and one suffix from dumcorpus's closed affix
 * inventory around a Root of at least two letters; the Root is whatever
 * remains, bound or free. When there is more than the bare Root, jev picks
 * one split in one request, `breakdown-morphemes`. The question names the
 * test that confirms an affix split (system ADR 0051, #1243): the affix is
 * on the closed list, which code already ensures, and the DWDS
 * Wortzerlegung cuts it, else the en.wiktionary etymology.
 *
 * A bottom word has no word inside it, so first jev weighs, in
 * `breakdown-words`, each Root a suffix would be cut off (#1241 round 4):
 * one that is a word or a verb's stem of its own (`Bau`, `leit`) leaves
 * its split out, since a word built on it would have had Constituents.
 * A split cutting off a fossilized prefix (`ge-`) stays only when jev
 * weighs the affix test passed, as `segment.inConstituents` asks it
 * (`prefix-cut.ts`, #1241 rounds 6 and 7).
 */

import {
	germanCitationEndings,
	germanMorphemePolicy,
	germanPrefixes,
	germanSuffixes,
} from "dumcorpus/inventories";
import { zeroEndingCanonicalForm } from "dumling";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { type Ask, type AskFailure, choice, choiceOf } from "../../ask.js";
import {
	type BreakdownInput,
	breakdownState,
	type ProducedPiece,
} from "../../breakdown.js";
import { isAffixTested, prefixCutConfirmed } from "./prefix-cut.js";
import { wordRoots } from "./word-gates.js";

const lower = (text: string) => text.toLocaleLowerCase("de");

const morpheme = (kind: string, canonicalForm: string) =>
	// Sound: German's Morpheme routes have a Shadow for every Kind used here.
	({
		language: "de",
		family: "Morpheme",
		kind,
		canonicalForm,
	}) as Dumrel.UnitShadow;

/** The minimum letters a Root keeps. */
const minRoot = 2;

/**
 * The citation ending a word of `kind` shows, as a piece linked to its
 * Ending Lemma (`n` of `wandern` to `-en`), or none.
 */
function endingOf(word: string, kind: string): ProducedPiece | undefined {
	const folded = lower(word);
	const overt = (germanCitationEndings[kind] ?? []).find(({ spelled }) =>
		// A verb's -n follows -el or -er (wander · n); its -en, any stem.
		spelled === "n"
			? /(?:el|er)n$/u.test(folded) || !folded.endsWith("en")
			: folded.endsWith(spelled),
	);
	if (
		overt !== undefined &&
		folded.endsWith(overt.spelled) &&
		word.length - overt.spelled.length >= minRoot
	)
		return {
			letters: word.slice(-overt.spelled.length),
			target: morpheme("Ending", overt.canonicalForm),
		};
	return germanMorphemePolicy.zeroEndingKinds.has(kind)
		? { letters: "", target: morpheme("Ending", zeroEndingCanonicalForm) }
		: undefined;
}

/** One split of the word before its ending: an optional prefix, the Root, an optional suffix. */
type Split = readonly ProducedPiece[];

function splitsOf(body: string): Split[] {
	const folded = lower(body);
	const prefixes = [
		undefined,
		...germanPrefixes.filter(({ spelled }) => folded.startsWith(spelled)),
	];
	const suffixes = [
		undefined,
		// A suffix that makes one Kind from a word (the adverbial -s) never
		// ends a bottom word.
		...germanSuffixes.filter(
			({ spelled, makes }) =>
				makes === undefined && folded.endsWith(spelled),
		),
	];
	const result: Split[] = [];
	for (const prefix of prefixes)
		for (const suffix of suffixes) {
			const start = prefix?.spelled.length ?? 0;
			const end = body.length - (suffix?.spelled.length ?? 0);
			if (end - start < minRoot) continue;
			const root = body.slice(start, end);
			result.push([
				...(prefix
					? [
							{
								letters: body.slice(0, start),
								target: morpheme(
									"Prefix",
									prefix.canonicalForm,
								),
							},
						]
					: []),
				{ letters: root, target: morpheme("Root", lower(root)) },
				...(suffix
					? [
							{
								letters: body.slice(end),
								target: morpheme(
									"Suffix",
									suffix.canonicalForm,
								),
							},
						]
					: []),
			]);
		}
	return result;
}

const label = (pieces: readonly ProducedPiece[]) =>
	pieces
		.map(({ letters, target }) =>
			letters === "" ? "∅" : `${letters} (${target?.kind ?? "filler"})`,
		)
		.join(" · ");

/** The affix-tested prefix a split cuts off with its letters, if any (`ge-`). */
const testedPrefixOf = (split: Split) => {
	const [first] = split;
	return first?.target?.kind === "Prefix" &&
		isAffixTested(first.target.canonicalForm)
		? { prefix: first.target.canonicalForm, letters: first.letters }
		: undefined;
};

/**
 * The splits without those whose fossil-prone prefix jev weighs
 * unconfirmed, one request per prefix, which names the word it leaves.
 */
const withoutUnconfirmedPrefixes = Effect.fnUntraced(function* (
	splits: readonly Split[],
	word: { readonly form: string; readonly kind: string },
	state: ReturnType<typeof breakdownState>,
	ask: Ask,
): Effect.fn.Return<readonly Split[], AskFailure> {
	if (splits.length < 2) return splits;
	const prefixes = new Map(
		splits.flatMap((split) => {
			const cut = testedPrefixOf(split);
			return cut === undefined ? [] : [[cut.prefix, cut.letters]];
		}),
	);
	const failed = new Set<string>();
	for (const [prefix, letters] of prefixes)
		if (
			!(yield* prefixCutConfirmed(
				prefix,
				{
					letters: word.form.slice(letters.length),
					noun: word.kind === "NOUN",
				},
				{ key: "word", state },
				ask,
			))
		)
			failed.add(prefix);
	return splits.filter((split) => {
		const cut = testedPrefixOf(split);
		return cut === undefined || !failed.has(cut.prefix);
	});
});

/** The split question; its example is no Breakdown case (#693). */
export const morphemesInstructions =
	"Which split of `word` into morphemes does school morphemic analysis (Wortbausteine, разбор по составу) give? A prefix or suffix is cut off only where the dictionary's word-formation analysis cuts it in this word: the DWDS Wortzerlegung, else the Wiktionary etymology. Otherwise it stays inside the root (Geselle: gesell · e).";

/** German `segment.inMorphemes` on a single-word Lexeme. */
export const germanMorphemes = Effect.fnUntraced(function* (
	input: BreakdownInput,
	ask: Ask,
): Effect.fn.Return<readonly ProducedPiece[], AskFailure> {
	const { lemma } = input.reading;
	const word = lemma.canonicalForm;
	const ending = endingOf(word, lemma.kind);
	const body = ending
		? word.slice(0, word.length - ending.letters.length)
		: word;
	const splits = splitsOf(body).map((split) =>
		ending ? [...split, ending] : [...split],
	);
	const [bare] = splits;
	if (bare === undefined)
		return [{ letters: word, target: morpheme("Root", lower(word)) }];
	if (splits.length === 1) return bare;
	const state = breakdownState(input, "word");
	const rootOf = (split: Split) =>
		split.some(({ target }) => target?.kind === "Suffix")
			? split.find(({ target }) => target?.kind === "Root")?.letters
			: undefined;
	const roots = [
		...new Set(
			splits.flatMap((split) => {
				const root = rootOf(split);
				return root === undefined ? [] : [root];
			}),
		),
	];
	const words = yield* wordRoots(roots, state, ask);
	const unrooted = splits.filter((split) => {
		const root = rootOf(split);
		return root === undefined || !words.has(root);
	});
	const kept = yield* withoutUnconfirmedPrefixes(
		unrooted,
		{ form: word, kind: lemma.kind },
		state,
		ask,
	);
	if (kept.length === 1) return bare;
	const answers = yield* ask({
		stage: "breakdown-morphemes",
		state,
		questions: {
			split: choice(
				morphemesInstructions,
				Object.fromEntries(
					kept.map((split, index) => [`s${index}`, label(split)]),
				),
			),
		},
	});
	const picked = Number(choiceOf(answers, "split").choice.slice(1));
	return kept[picked] ?? bare;
});
