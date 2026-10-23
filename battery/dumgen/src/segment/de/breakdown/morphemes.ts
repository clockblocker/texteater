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
 * one split in one request, `breakdown-morphemes`. Which test confirms an
 * affix split is not decided (#1243), so the question names none.
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
		...germanSuffixes.filter(({ spelled }) => folded.endsWith(spelled)),
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

/** The split question; its example is no Breakdown case (#693). */
export const morphemesInstructions =
	"Which split of `word` into morphemes does school morphemic analysis (Wortbausteine, разбор по составу) give? A prefix or suffix is cut off only where it is one in this word; otherwise it stays inside the root (Geselle: gesell · e).";

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
	const answers = yield* ask({
		stage: "breakdown-morphemes",
		state: breakdownState(input, "word"),

		questions: {
			split: choice(
				morphemesInstructions,
				Object.fromEntries(
					splits.map((split, index) => [`s${index}`, label(split)]),
				),
			),
		},
	});
	const picked = Number(choiceOf(answers, "split").choice.slice(1));
	return splits[picked] ?? bare;
});
