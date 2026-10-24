/**
 * The two segmenters that break a resolved Reading down for its Note
 * (Dumgen ADR 0007): `segment.inConstituents`, a Reading's immediate parts
 * one level down (system ADR 0050), and `segment.inMorphemes`, a bottom
 * word's Morphemic Breakdown (ADR 0051). Each runs once per Reading, on its
 * Canonical Form and, when the host has it, the Sentence that created it,
 * and reaches jev alone: code proposes the cuts and the Canonical Forms,
 * jev picks. The Reading's language module does the work.
 *
 * The host runs them in order: a Reading with a Source (Knowledge's
 * `source`) runs neither, and one whose `source` failed or is Unresolved
 * waits for it; any other runs `segment.inConstituents`, and
 * `segment.inMorphemes` only when that finds none.
 *
 * Their pieces are Dumrel Breakdown pieces whose targets are Unit Shadows;
 * the host stores them as the Reading's `breakdown.constituents` or
 * `breakdown.morphemes`, and they resolve as Pending Semantic Relations do.
 */
import type { EntryType } from "@typesafe-ai/sdk";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type { CallLog } from "../call.js";
import type { Jev } from "../jev-call.js";
import { stageAsk } from "../jev-call.js";
import { languageModuleOf } from "../language-module.js";
import { Languages } from "../languages.js";
import type { AskFailure } from "./ask.js";

/** The Reading a segmenter breaks down. */
export type BreakdownInput = {
	/** Its Lemma's language picks the module; its emoji names the sense. */
	readonly reading: Dumling.Reading;
	/** The Sentence that created the Reading, when the host has it. */
	readonly sentence?: string;
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
 * What a breakdown judge reads about the Reading, under `key`: its
 * Canonical Form, route, Emoji Description (its sense; a Foreign Reading
 * has none) and the Sentence that created it.
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

/** The Reading's module; another language is a Defect, raised before anything is asked. */
const moduleOf = Effect.fnUntraced(function* (
	operation: string,
	reading: Dumling.Reading,
) {
	const module =
		reading.lemma.language === "de"
			? languageModuleOf(yield* Languages, "de")
			: undefined;
	if (
		module === undefined ||
		!module.segment.constituents ||
		!module.segment.morphemes
	)
		return yield* Effect.die(
			Error(
				`${operation} breaks German ("de") Readings down only, not ${JSON.stringify(reading.lemma.language)}`,
			),
		);
	return {
		...module,
		segment: {
			...module.segment,
			constituents: module.segment.constituents,
			morphemes: module.segment.morphemes,
		},
	};
});

/** The body of `segment.inConstituents`. */
export const constituentsOf = Effect.fnUntraced(function* (
	input: BreakdownInput,
): Effect.fn.Return<Constituents, AskFailure, Jev | CallLog> {
	const module = yield* moduleOf("segment.inConstituents", input.reading);
	return yield* module.segment.constituents(input, yield* stageAsk);
});

/**
 * The body of `segment.inMorphemes`. A Reading that isn't a single-word
 * Lexeme is a Defect: phrasemes and Morphemes have no Morphemic Breakdown.
 */
export const morphemesOf = Effect.fnUntraced(function* (
	input: BreakdownInput,
): Effect.fn.Return<readonly ProducedPiece[], AskFailure, Jev | CallLog> {
	const { lemma } = input.reading;
	if (lemma.family !== "Lexeme" || /\s/u.test(lemma.canonicalForm))
		return yield* Effect.die(
			Error(
				`segment.inMorphemes splits a single-word Lexeme, not ${lemma.family} ${JSON.stringify(lemma.canonicalForm)}`,
			),
		);
	const module = yield* moduleOf("segment.inMorphemes", input.reading);
	return yield* module.segment.morphemes(input, yield* stageAsk);
});
