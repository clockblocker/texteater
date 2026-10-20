/**
 * What `translate.sentence` takes (#1210): one Sentence of a text in its
 * own language, the Sentences around it as context, and the Dumrel
 * translation language to translate it into. Out comes the translation as
 * text; nothing of it is stored as Knowledge.
 */
import type * as Dumrel from "dumrel/types";
import type { NeighbourSentences } from "../resolve/types.js";

export type TranslateSentenceInput = {
	/** The Sentence's language; German (`de`) only, so far. */
	readonly language: "de";
	/** The Sentence's text, as the host shows it. */
	readonly sentence: string;
	/** The Dumrel translation language to translate it into. */
	readonly into: Dumrel.TranslationLanguage;
	/**
	 * The Sentences just before and after it in its text, as far as the
	 * host has them. Luna reads them to settle what the Sentence leaves
	 * open and never translates them.
	 */
	readonly neighbours?: NeighbourSentences;
};
