/**
 * The two modes a segment.inUnits experiment runs in (`experiments.ts`):
 * gold mode feeds gold Segments to the unit stage, and raw mode cuts the
 * record's Sentence first. Each reads the lab's cached jev at one
 * repetition, through production's unit stage or the #762 reference.
 */
import * as Effect from "effect/Effect";
import type { OperationEvaluationRun } from "promptsmith/evaluation";
import type { z } from "zod";
import { segmentGermanSentence } from "../../src/segment/de/segments.js";
import type { Segment } from "../../src/segment/segmented-sentence.js";
import { askOf } from "../segmentation/de/arm.js";
import { referenceArm } from "../segmentation/de/arms/reference.js";
import type { LabCase } from "../segmentation/harness/corpus.js";
import type {
	CallRecord,
	JevCache,
} from "../segmentation/harness/jev-cache.js";
import type { UnitConfig } from "./experiment-types.js";
import type { LabEffect } from "./lab-runtime.js";
import {
	groupSegments,
	type ProductionJev,
	segmentSentence,
} from "./production-segmenter.js";
import {
	evaluateRawSegmentInUnits,
	type RawOutput,
	rawCaseOf,
	rawInputSchema,
	rawOutputSchema,
	rawSegmentInUnitsMetrics,
} from "./segment-in-units-raw.js";
import {
	type SegmentInUnitsInput,
	type SegmentInUnitsOutput,
	segmentInUnitsInputSchema,
	segmentInUnitsOutputSchema,
	type Unit,
} from "./spec-corpus/segment-in-units.js";
import { evaluateSegmentInUnits } from "./spec-corpus/segment-in-units-evaluation.js";
import { segmentInUnitsMetrics } from "./spec-corpus/segment-in-units-metrics.js";

/** What one run of an operation reads: the lab's cached jev at one repetition. */
export type Context = {
	readonly jev: JevCache;
	readonly repetition: number;
	readonly calls: CallRecord[];
};

/** The cached jev at the context's repetition, as `DumgenCore`'s transport. */
const productionJev = ({ jev, repetition, calls }: Context): ProductionJev => ({
	ask: jev.ask(repetition, calls),
	model: jev.model,
});

const unitStages: Readonly<
	Record<
		UnitConfig,
		(
			segments: SegmentInUnitsInput["segments"],
			context: Context,
		) => LabEffect<Unit[]>
	>
> = {
	production: (segments, context) =>
		groupSegments(productionJev(context), segments),
	// The reference arm is the segmentation lab's, a Promise over its port.
	reference: (segments, context) =>
		Effect.promise(async () => {
			const result = await referenceArm.run(
				{ language: "de", segments },
				{ ...context, options: {} },
			);
			const output = result.outputs[result.primary];
			if (!output)
				throw Error(`The reference returned no ${result.primary}`);
			return output.units;
		}),
};

/** One mode of a segment.inUnits experiment: its cases, operation and scoring. */
export type Mode<I extends z.ZodType, O extends z.ZodType> = {
	readonly suffix: string;
	readonly inputSchema: I;
	readonly outputSchema: O;
	readonly caseOf: (labCase: LabCase) => {
		readonly input: z.input<I>;
		readonly idealOutput: z.input<O>;
	};
	readonly run: (
		units: UnitConfig,
	) => (input: z.output<I>, context: Context) => LabEffect<z.output<O>>;
	readonly evaluator: (
		facts: Readonly<Record<string, LabCase["facts"]>>,
	) => (args: {
		readonly caseId: string;
		readonly input: z.output<I>;
		readonly idealOutput: z.output<O>;
		readonly output: z.output<O>;
	}) => unknown;
	readonly metrics: (run: OperationEvaluationRun) => unknown;
};

export const goldMode: Mode<
	typeof segmentInUnitsInputSchema,
	typeof segmentInUnitsOutputSchema
> = {
	suffix: "",
	inputSchema: segmentInUnitsInputSchema,
	outputSchema: segmentInUnitsOutputSchema,
	caseOf: ({ input, idealOutput }) => ({ input, idealOutput }),
	run: (units) => (input, context) =>
		Effect.map(
			unitStages[units](input.segments, context),
			(produced): SegmentInUnitsOutput => ({ units: produced }),
		),
	evaluator: evaluateSegmentInUnits,
	metrics: segmentInUnitsMetrics,
};

/** Segments as the raw-mode output keeps them: no absent `surface`. */
const plainSegments = (segments: readonly Segment[]) =>
	segments.map(({ kind, text, surface }) => ({
		kind,
		text,
		...(surface === undefined ? {} : { surface }),
	}));

export const rawMode: Mode<typeof rawInputSchema, typeof rawOutputSchema> = {
	suffix: ":raw",
	inputSchema: rawInputSchema,
	outputSchema: rawOutputSchema,
	caseOf: rawCaseOf,
	run: (units) => (input, context) =>
		Effect.gen(function* () {
			if (units === "production") {
				const segmented = yield* segmentSentence(
					productionJev(context),
					input.sentence,
				);
				return {
					segments: plainSegments(segmented.segments),
					units: [...segmented.units],
					unresolved: [...segmented.unresolved],
				} satisfies RawOutput;
			}
			// The reference takes the Segment stage's cut through the lab's port.
			const segmentation = yield* segmentGermanSentence(
				input.sentence,
				askOf(context),
			);
			const segments = plainSegments(segmentation.segments);
			return {
				segments,
				units: yield* unitStages[units](segments, context),
				unresolved: [...segmentation.unresolved],
			} satisfies RawOutput;
		}),
	evaluator: evaluateRawSegmentInUnits,
	metrics: rawSegmentInUnitsMetrics,
};
