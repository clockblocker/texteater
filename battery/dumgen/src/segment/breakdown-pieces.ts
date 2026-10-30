/**
 * The shapes the breakdown segmenters take and hand on, `segment.inConstituents`
 * and `segment.inMorphemes` (Dumgen ADR 0007): the Reading a segmenter breaks
 * down, the pieces it produces, and what a breakdown judge reads about the
 * Reading. Each language module builds on them; `breakdown.ts` runs the
 * segmenters through the module registry.
 */
import type { EntryType } from "@typesafe-ai/sdk";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

/** The Reading a segmenter breaks down. */
export type BreakdownInput = {
	/** Its Lemma's language picks the module; its emoji names the sense. */
	readonly reading: Dumling.Reading;
	/** The Sentence that created the Reading, when the host has it. */
	readonly sentence?: string;
	/**
	 * The Reading's definition, when the host has it. Only the question
	 * whether a run inside a wording is a Locution of its own reads it, since
	 * an emoji can't say whether that run keeps its meaning (ADR 0050).
	 */
	readonly definition?: string;
};

/**
 * One produced piece: the letters it shows of the Canonical Form and,
 * unless it is filler, the Unit Shadow of the part it links to.
 */
export type ProducedPiece = {
	readonly letters: string;
	readonly target?: Dumrel.UnitShadow;
};

/**
 * What `segment.inConstituents` gives a Reading: its Constituents, which
 * link at least two parts, or none. The host asks Knowledge for a single
 * word's Source first and runs the segmenters only on a Reading without one
 * (system ADR 0050), so none is a bottom word (`spannen`), which
 * `segment.inMorphemes` splits.
 */
export type Constituents =
	| {
			readonly kind: "Constituents";
			readonly pieces: readonly ProducedPiece[];
	  }
	| { readonly kind: "NoConstituents" };

/**
 * What a breakdown judge reads about the Reading, under `key`: the wording
 * its Breakdown spells (its Canonical Form), route, Emoji Description (its sense;
 * a Foreign Reading has none) and the Sentence that created it.
 */
export function breakdownState(
	input: BreakdownInput,
	key: string,
): Record<string, EntryType> {
	const { reading, sentence } = input;
	const { lemma } = reading;
	return {
		[key]: lemma.canonicalForm,
		route: `${lemma.family} ${lemma.kind}`,
		...("emojiDescription" in reading
			? { meaning: reading.emojiDescription }
			: {}),
		...(sentence ? { sentence } : {}),
	};
}

/**
 * Whether a Reading is a single-word Lexeme, the only kind with a Morphemic
 * Breakdown (ADR 0051). A reflexive is in no Canonical Form (ADR 0052).
 */
export const isSingleWordLexeme = (lemma: Dumling.Lemma) =>
	lemma.family === "Lexeme" && !/\s/u.test(lemma.canonicalForm);
