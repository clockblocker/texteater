/**
 * Raw mode of the `segment.inUnits` evaluation (#701, #845), the
 * production headline: a record's Sentence goes in as written, and the
 * Segment stage's Segments and the unit stage's units come out.
 *
 * Predicted Segments align to gold ones by exact span, text and render kind
 * (`source-evaluation.ts`); surfaces are scored apart. The units are then
 * read in gold coordinates by the gold-mode evaluator: an aligned Segment
 * becomes its gold Segment, and a ResolvableText Segment no gold Segment
 * matches becomes an extra Segment no gold unit asserts, so joining it to
 * a gold unit costs that unit its membership and its hovers precision. A
 * gold Segment no prediction matches sits in no returned unit and so hovers
 * only itself.
 */
import { canonicalJson } from "common-utils";
import { z } from "zod";
import {
	evaluateSourceAndUnits,
	type SourceSpan,
	sourceSpans,
} from "./source-evaluation.js";
import {
	type SegmentInUnitsFacts,
	type SegmentInUnitsInput,
	type SegmentInUnitsOutput,
	segmentInUnitsInputSchema,
	segmentInUnitsOutputSchema,
	type Unit,
} from "./spec-corpus/segment-in-units.js";
import {
	evaluateSegmentInUnits,
	type SegmentInUnitsEvaluation,
} from "./spec-corpus/segment-in-units-evaluation.js";
import {
	evaluationsOf,
	segmentInUnitsMetrics,
	totalsOf,
} from "./spec-corpus/segment-in-units-metrics.js";

/** A raw case's input: the record's Sentence as written. */
export const rawInputSchema = z.strictObject({
	language: z.literal("de"),
	sentence: z.string().min(1),
});

/**
 * A raw answer: the Segments and the units over them. The ideal output is
 * the record's Segments and gold units; a prediction also lists the
 * Segments whose written run the Segment stage left undecided.
 */
export const rawOutputSchema = segmentInUnitsOutputSchema.extend({
	segments: segmentInUnitsInputSchema.shape.segments,
	unresolved: z.array(z.int().nonnegative()).optional(),
});

export type RawInput = z.infer<typeof rawInputSchema>;
export type RawOutput = z.infer<typeof rawOutputSchema>;

/** A gold-mode case read raw: its Sentence in, its Segments and units out. */
export function rawCaseOf(golden: {
	readonly input: SegmentInUnitsInput;
	readonly idealOutput: SegmentInUnitsOutput;
}): { readonly input: RawInput; readonly idealOutput: RawOutput } {
	return {
		input: {
			language: "de",
			sentence: golden.input.segments.map(({ text }) => text).join(""),
		},
		idealOutput: {
			segments: golden.input.segments,
			units: golden.idealOutput.units,
		},
	};
}

/** How the Segment stage cut one Sentence against its gold Segments. */
export type PieceCheck = {
	/** The predicted Segments spell the gold Sentence. */
	readonly textPreserved: boolean;
	/** Cuts between two Segments, by offset; a Sentence's ends are not cuts. */
	readonly goldBoundaries: number;
	readonly predictedBoundaries: number;
	readonly matchedBoundaries: number;
	/** ResolvableText Segments, gold and predicted. */
	readonly goldPieces: number;
	readonly predictedPieces: number;
	/** Predicted pieces with a gold Segment's span, text and kind. */
	readonly exactPieces: number;
	/** Of those, the pieces whose surface (its text when it has none) is gold's. */
	readonly exactSurfaces: number;
	/** 1 when every Segment matches gold by span and kind. */
	readonly exactSentence: number;
	/**
	 * 1 when the Segments equal gold's, surfaces included: the unit stage
	 * then sends gold mode's requests and replays gold mode's answers.
	 */
	readonly goldSegments: number;
	/** Segments whose written run the Segment stage left undecided. */
	readonly unresolved: number;
	/** Predicted pieces no gold Segment matches, read as Segments no gold unit asserts. */
	readonly unaligned: number;
};

export type RawEvaluation = SegmentInUnitsEvaluation & {
	readonly pieces: PieceCheck;
};

const cutsOf = (spans: readonly SourceSpan[]) =>
	new Set(spans.slice(0, -1).map(({ end }) => end));

const effectiveSurface = (segment: {
	readonly text: string;
	readonly surface?: string;
}) => segment.surface ?? segment.text;

/** The raw-mode evaluator, reading each case's Coverage and unit sources from `facts`. */
export function evaluateRawSegmentInUnits(
	facts: Readonly<Record<string, SegmentInUnitsFacts>>,
) {
	const evaluateUnits = evaluateSegmentInUnits(facts);
	return (args: {
		readonly caseId: string;
		readonly input: RawInput;
		readonly idealOutput: RawOutput;
		readonly output: RawOutput;
	}): RawEvaluation => {
		const gold: SegmentInUnitsInput = {
			language: "de",
			segments: args.idealOutput.segments,
		};
		const predicted = args.output.segments;
		const { source, segmentMapping } = evaluateSourceAndUnits(
			gold,
			{ units: args.idealOutput.units },
			{
				input: { language: "de", segments: predicted },
				spans: sourceSpans(predicted),
				unresolved: args.output.unresolved ?? [],
			},
			{ units: args.output.units },
		);
		const extra: SegmentInUnitsInput["segments"][number][] = [];
		const inGold = predicted.map((segment, index) => {
			const aligned = segmentMapping[index];
			if (aligned !== null && aligned !== undefined) return aligned;
			if (segment.kind !== "ResolvableText") return null;
			extra.push({ kind: "ResolvableText", text: segment.text });
			return gold.segments.length + extra.length - 1;
		});
		const units = args.output.units.flatMap((unit): Unit[] => {
			const segments = [
				...new Set(
					unit.segments.flatMap((index) => {
						const mapped = inGold[index];
						return mapped === null || mapped === undefined
							? []
							: [mapped];
					}),
				),
			].sort((a, b) => a - b);
			return segments.length > 0 ? [{ ...unit, segments }] : [];
		});
		const evaluation = evaluateUnits({
			caseId: args.caseId,
			input: { language: "de", segments: [...gold.segments, ...extra] },
			idealOutput: { units: args.idealOutput.units },
			output: { units },
		});
		const goldCuts = cutsOf(sourceSpans(gold.segments));
		const predictedCuts = cutsOf(sourceSpans(predicted));
		const exact = predicted.flatMap((segment, index) => {
			const aligned = segmentMapping[index];
			const goldSegment =
				aligned === null || aligned === undefined
					? undefined
					: gold.segments[aligned];
			return segment.kind === "ResolvableText" && goldSegment
				? [{ segment, goldSegment }]
				: [];
		});
		return {
			...evaluation,
			pieces: {
				textPreserved: source.textPreserved,
				goldBoundaries: goldCuts.size,
				predictedBoundaries: predictedCuts.size,
				matchedBoundaries: [...predictedCuts].filter((cut) =>
					goldCuts.has(cut),
				).length,
				goldPieces: gold.segments.filter(
					({ kind }) => kind === "ResolvableText",
				).length,
				predictedPieces: predicted.filter(
					({ kind }) => kind === "ResolvableText",
				).length,
				exactPieces: exact.length,
				exactSurfaces: exact.filter(
					({ segment, goldSegment }) =>
						effectiveSurface(segment) ===
						effectiveSurface(goldSegment),
				).length,
				exactSentence: source.kindExact ? 1 : 0,
				goldSegments:
					canonicalJson(predicted) === canonicalJson(gold.segments)
						? 1
						: 0,
				unresolved: source.unresolvedSegments,
				unaligned: extra.length,
			},
		};
	};
}

const ratio = (part: number, whole: number) =>
	whole === 0 ? Number.NaN : part / whole;

const f1 = (precision: number, recall: number) =>
	precision + recall === 0
		? Number.NaN
		: (2 * precision * recall) / (precision + recall);

const precisionRecall = (matched: number, predicted: number, gold: number) => {
	const precision = ratio(matched, predicted);
	const recall = ratio(matched, gold);
	return { precision, recall, f1: f1(precision, recall) };
};

/**
 * Raw mode's rates: gold mode's over the units read in gold coordinates,
 * and the Segment stage's beside them. `boundaries` scores the cuts between
 * Segments; `pieces` the ResolvableText Segments cut exactly, whose recall
 * is the exact-piece accuracy; `surfaces` the exact pieces whose surface is
 * gold's; `exactSentences` the Sentences cut exactly, and `goldSegments`
 * those whose unit-stage requests are gold mode's.
 */
export function rawSegmentInUnitsMetrics(
	run: Parameters<typeof segmentInUnitsMetrics>[0],
) {
	const metrics = segmentInUnitsMetrics(run);
	const evaluated = evaluationsOf(run).length;
	const pieces = totalsOf(evaluationsOf(run)).pieces;
	const count = (key: keyof PieceCheck) => {
		const value = typeof pieces === "object" ? pieces[key] : undefined;
		return typeof value === "number" ? value : 0;
	};
	return {
		...metrics,
		pieces: {
			boundaries: {
				...precisionRecall(
					count("matchedBoundaries"),
					count("predictedBoundaries"),
					count("goldBoundaries"),
				),
				gold: count("goldBoundaries"),
			},
			pieces: {
				...precisionRecall(
					count("exactPieces"),
					count("predictedPieces"),
					count("goldPieces"),
				),
				gold: count("goldPieces"),
			},
			surfaces: ratio(count("exactSurfaces"), count("exactPieces")),
			exactSentences: ratio(count("exactSentence"), evaluated),
			goldSegments: ratio(count("goldSegments"), evaluated),
			unresolved: count("unresolved"),
			unaligned: count("unaligned"),
		},
	};
}
