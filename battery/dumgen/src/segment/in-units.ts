/**
 * `segment.inUnits` as a host calls it at intake (Dumgen ADR 0007): a Text
 * already split into paragraphs and Sentences goes in, and each Sentence
 * comes back as its Segments and its biggest units, each with its route or
 * `Unresolved`. German runs the Segment stage, then the unit stage with
 * production's setting (`productionUnitSettings`).
 *
 * Every jev request goes through the operation's calls, split into chunks
 * of `questionsPerRequest` questions, each naming the pinned model. The
 * Sentences run side by side and each fails alone: a chunk that brought no
 * answer, or one a different model gave, or one missing or mistyping an
 * answer, fails its Sentence at once, interrupts that Sentence's other
 * chunks, and marks it `failed`. A Defect or an interruption fails the
 * Text.
 */
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { callFailureOf, type OperationScope } from "../call.js";
import { askThrough, type JevSettings } from "../jev-call.js";
import type { AskFailure } from "./ask.js";
import {
	type GermanSegmentation,
	segmentGermanSentence,
	writtenGermanSegments,
} from "./de/segments.js";
import { segmentGermanUnits, type UnitSettings } from "./de/units.js";
import type {
	SegmentedSentence,
	SegmentedText,
	SegmentLanguage,
} from "./segmented-sentence.js";
import { stitchedText } from "./stitched-text.js";

export type InUnitsInput = {
	readonly language: SegmentLanguage;
	/** As `splitText` gives them: non-blank Sentences, paragraph by paragraph. */
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
};

/** What `segment.inUnits` reaches jev with: the host's transport and the pinned version. */
export type InUnitsJev = JevSettings;

/** A Sentence whose segmentation failed, marked so, with its reason in the trace. */
function failedSentence(
	scope: OperationScope,
	sentence: number,
	failure: AskFailure,
	segmentation: GermanSegmentation,
): SegmentedSentence {
	scope.sentence({
		sentence,
		outcome: "Failed",
		failure: callFailureOf(failure),
	});
	return {
		text: segmentation.text,
		segments: segmentation.segments,
		units: [],
		failed: true,
	};
}

const segmentSentence = Effect.fnUntraced(function* (
	scope: OperationScope,
	jev: InUnitsJev,
	settings: UnitSettings,
	text: string,
	sentence: number,
) {
	const ask = askThrough(scope, jev, sentence);
	const cut = yield* Effect.result(segmentGermanSentence(text, ask));
	if (Result.isFailure(cut))
		return failedSentence(
			scope,
			sentence,
			cut.failure,
			writtenGermanSegments(text),
		);
	const units = yield* Effect.result(
		segmentGermanUnits(cut.success, ask, settings),
	);
	if (Result.isFailure(units))
		return failedSentence(scope, sentence, units.failure, cut.success);
	scope.sentence({ sentence, outcome: "Segmented" });
	return {
		text: cut.success.text,
		segments: cut.success.segments,
		units: units.success,
	} satisfies SegmentedSentence;
});

/**
 * The body of `segment.inUnits`. Another language than German, or a blank
 * Sentence, is a Defect raised before anything is asked.
 */
export const segmentText = Effect.fnUntraced(function* (
	scope: OperationScope,
	jev: InUnitsJev,
	settings: UnitSettings,
	input: InUnitsInput,
): Effect.fn.Return<SegmentedText> {
	if (input.language !== "de")
		return yield* Effect.die(
			Error(
				`segment.inUnits segments German ("de") only, not ${JSON.stringify(input.language)}`,
			),
		);
	for (const [paragraph, { sentences }] of input.paragraphs.entries())
		for (const [index, sentence] of sentences.entries())
			if (stitchedText(sentence).length === 0)
				return yield* Effect.die(
					Error(
						`Sentence ${index} of paragraph ${paragraph} is blank`,
					),
				);
	let position = 0;
	const placed = input.paragraphs.map(({ sentences }) =>
		sentences.map((text) => ({ text, sentence: position++ })),
	);
	const segmented = yield* Effect.forEach(
		placed.flat(),
		({ text, sentence }) =>
			segmentSentence(scope, jev, settings, text, sentence),
		{ concurrency: "unbounded" },
	);
	return {
		language: input.language,
		paragraphs: placed.map((sentences) => ({
			sentences: segmented.splice(0, sentences.length),
		})),
	};
});
