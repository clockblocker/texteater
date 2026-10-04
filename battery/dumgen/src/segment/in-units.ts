/**
 * `segment.inUnits` as a host calls it at intake (Dumgen ADR 0007): a Text
 * already split into paragraphs and Sentences goes in, and each Sentence
 * comes back as its Segments and its biggest units, each with its route or
 * `Unresolved`. The Sentences' language module runs its Segment stage,
 * then its unit stage.
 *
 * Every jev request goes through the operation's calls, split into chunks
 * of `questionsPerRequest` questions, each naming the pinned model. The
 * Sentences run side by side and each fails alone: a chunk that brought no
 * answer, or one a different model gave, or one missing or mistyping an
 * answer, fails its Sentence at once, interrupts that Sentence's other
 * chunks, and marks it `failed`. A Defect or an interruption fails the
 * Text.
 *
 * A Sentence whose Segment stage kept some runs unresolved (their spelling
 * kept, no plan for them) records an `UnresolvedSegments` event with their
 * indices; the raw-mode evaluation reads it.
 */
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { callFailureOf, type OperationScope } from "../call.js";
import { askThrough, type JevSettings } from "../jev-call.js";
import {
	type LanguageModule,
	type LanguageModules,
	languageModuleOf,
	type SentenceSegmentation,
} from "../language-module.js";
import type { AskFailure } from "./ask.js";
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
	segmentation: SentenceSegmentation,
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
	module: LanguageModule,
	text: string,
	sentence: number,
) {
	const ask = askThrough(scope, jev, sentence);
	const cut = yield* Effect.result(module.segment.segments(text, ask));
	if (Result.isFailure(cut))
		return failedSentence(
			scope,
			sentence,
			cut.failure,
			module.segment.writtenSegments(text),
		);
	if (cut.success.unresolved.length > 0)
		scope.event({
			name: "UnresolvedSegments",
			data: { sentence, segments: [...cut.success.unresolved] },
		});
	const units = yield* Effect.result(module.segment.units(cut.success, ask));
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
 * The body of `segment.inUnits`. A language with no module, or a blank
 * Sentence, is a Defect raised before anything is asked.
 */
export const segmentText = Effect.fnUntraced(function* (
	scope: OperationScope,
	jev: InUnitsJev,
	modules: LanguageModules,
	input: InUnitsInput,
): Effect.fn.Return<SegmentedText> {
	const module = languageModuleOf(modules, input.language);
	if (module === undefined)
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
			segmentSentence(scope, jev, module, text, sentence),
		{ concurrency: "unbounded" },
	);
	return {
		language: input.language,
		paragraphs: placed.map((sentences) => ({
			sentences: segmented.splice(0, sentences.length),
		})),
	};
});
