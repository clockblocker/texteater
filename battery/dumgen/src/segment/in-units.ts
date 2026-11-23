/**
 * `segment.inUnits` as a host calls it at intake (Dumgen ADR 0007): a Text
 * already split into paragraphs and Sentences goes in, and each Sentence
 * comes back as its Segments and its biggest units, each with its route or
 * `Unresolved`. The Sentences' language module runs its Segment stage,
 * then its unit stage.
 *
 * Every jev request goes through `Jev`, split into chunks of at most
 * `tokensPerRequest` estimated tokens, each naming the pinned model, and each
 * Sentence's calls are placed under it as the `CurrentSentence`. The
 * Sentences run side by side and each fails alone: a chunk that brought no
 * answer, or one a different model gave, or one missing or mistyping an
 * answer, fails its Sentence at once, interrupts that Sentence's other
 * chunks, and marks it `failed`. A Defect or an interruption fails the
 * Text.
 *
 * Within its unit stage, a Sentence's stages run by what each reads
 * (`stage-graph.ts`), and a late request that fails degrades the stages it
 * asked for instead of failing the Sentence: a failed route request leaves
 * the routes it decides `Unresolved`, a failed Choice the membership
 * before it. Only a request whose answers the grouping cannot do without
 * fails the Sentence. A Sentence that degraded is `Segmented` and records a
 * `DegradedStages` event naming each stage and its failure.
 *
 * A Sentence whose Segment stage kept some runs unresolved (their spelling
 * kept, no plan for them) records an `UnresolvedSegments` event with their
 * indices; the raw-mode evaluation reads it.
 *
 * A Sentence the Text holds more than once, character for character, is
 * segmented once: each occurrence gets its Segmented Sentence, and the
 * trace records its outcome and events under each index and its calls
 * under the first.
 */
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { CallLog, CurrentSentence, callFailureOf } from "../call.js";
import { type Jev, stageAsk } from "../jev-call.js";
import {
	type LanguageModule,
	languageModuleOf,
	type SentenceSegmentation,
} from "../language-module.js";
import { Languages } from "../languages.js";
import type { AskFailure } from "./ask.js";
import type {
	SegmentedSentence,
	SegmentedText,
	SegmentLanguage,
} from "./segmented-sentence.js";
import { stitchedText } from "./stitched-text.js";

export type InUnitsInput<L extends SegmentLanguage = SegmentLanguage> = {
	readonly language: L;
	/** As `splitText` gives them: non-blank Sentences, paragraph by paragraph. */
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
};

/**
 * One Sentence's segmentation, and what the trace records of it under the
 * index of each Sentence of the Text that reads it.
 */
type Outcome<L extends SegmentLanguage = SegmentLanguage> = {
	readonly segmented: SegmentedSentence<L>;
	readonly report: (log: CallLog["Service"], sentence: number) => void;
};

/** A Sentence whose segmentation failed, marked so, with its reason in the trace. */
const failedSentence = <L extends SegmentLanguage>(
	failure: AskFailure,
	segmentation: SentenceSegmentation,
	unresolved: readonly number[] = [],
): Outcome<L> => ({
	segmented: {
		text: segmentation.text,
		segments: segmentation.segments,
		units: [],
		failed: true,
	},
	report: (log, sentence) => {
		reportUnresolved(log, sentence, unresolved);
		log.sentence({
			sentence,
			outcome: "Failed",
			failure: callFailureOf(failure),
		});
	},
});

function reportUnresolved(
	log: CallLog["Service"],
	sentence: number,
	segments: readonly number[],
) {
	if (segments.length > 0)
		log.event({
			name: "UnresolvedSegments",
			data: { sentence, segments: [...segments] },
		});
}

/** One Sentence's body, its calls placed under its first index as the `CurrentSentence`. */
const segmentSentence = Effect.fnUntraced(function* <L extends SegmentLanguage>(
	module: LanguageModule<L>,
	text: string,
): Effect.fn.Return<Outcome<L>, never, Jev | CallLog> {
	const ask = yield* stageAsk;
	const cut = yield* Effect.result(module.segment.segments(text, ask));
	if (Result.isFailure(cut))
		return failedSentence<L>(
			cut.failure,
			module.segment.writtenSegments(text),
		);
	const { unresolved } = cut.success;
	const units = yield* Effect.result(module.segment.units(cut.success, ask));
	if (Result.isFailure(units))
		return failedSentence<L>(units.failure, cut.success, unresolved);
	const { degraded } = units.success;
	return {
		segmented: {
			text: cut.success.text,
			segments: cut.success.segments,
			units: units.success.units,
		},
		report: (log, sentence) => {
			reportUnresolved(log, sentence, unresolved);
			if (degraded.length > 0)
				log.event({
					name: "DegradedStages",
					data: {
						sentence,
						stages: degraded.map(({ stage, failure }) => ({
							stage,
							failure: callFailureOf(failure),
						})),
					},
				});
			log.sentence({ sentence, outcome: "Segmented" });
		},
	};
});

/**
 * The body of `segment.inUnits`. A language with no module, or a blank
 * Sentence, is a Defect raised before anything is asked.
 */
export const segmentText = Effect.fnUntraced(function* <
	L extends SegmentLanguage,
>(
	input: InUnitsInput<L>,
): Effect.fn.Return<SegmentedText<L>, never, Jev | CallLog> {
	const module = languageModuleOf(yield* Languages, input.language);
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
	// Each distinct Sentence once, under the index it first has, reported
	// as it finishes; a repeat is reported once all have.
	const log = yield* CallLog;
	const first = new Map<string, number>();
	for (const { text, sentence } of placed.flat())
		if (!first.has(text)) first.set(text, sentence);
	const outcomes = new Map(
		yield* Effect.forEach(
			first,
			([text, sentence]) =>
				segmentSentence(module, text).pipe(
					Effect.tap((outcome) =>
						Effect.sync(() => outcome.report(log, sentence)),
					),
					Effect.map((outcome) => [text, outcome] as const),
					Effect.provideService(CurrentSentence, sentence),
				),
			{ concurrency: "unbounded" },
		),
	);
	const segmentedOf = ({
		text,
		sentence,
	}: (typeof placed)[number][number]) => {
		const outcome = outcomes.get(text);
		if (!outcome) throw Error(`Sentence ${sentence} was not segmented`);
		if (first.get(text) !== sentence) outcome.report(log, sentence);
		return outcome.segmented;
	};
	return {
		language: input.language,
		paragraphs: placed.map((sentences) => ({
			sentences: sentences.map(segmentedOf),
		})),
	};
});
