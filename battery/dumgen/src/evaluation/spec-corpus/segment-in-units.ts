/**
 * The German `segment.inUnits` projection (Dumgen ADR 0007): a Spec Record's
 * Sentence becomes one case whose ideal output is the units its targets and
 * No Target entries assert.
 */
import type * as Dumspec from "dumspec/types";
import { z } from "zod";
import type { Projection } from "./projection.js";

const segmentSchema = z.strictObject({
	kind: z.enum(["ResolvableText", "OpaqueText", "Whitespace", "Punctuation"]),
	text: z.string().min(1),
	/** The word a fused-word piece stands for: `m` in `im` stands for `dem`. */
	surface: z.string().min(1).optional(),
});

/**
 * What the sentence judge reads: one Sentence as its Segments.
 * `segment.inUnits` receives a text already split into paragraphs and
 * Sentences; splitting is not its concern (#701). Its jev-based sentence
 * segmenters see one Sentence each, so the case is the Sentence.
 */
export const segmentInUnitsInputSchema = z.strictObject({
	language: z.literal("de"),
	segments: z.array(segmentSchema).min(1),
});

/** Language, Family and Kind: where a click on the unit routes. */
const routeSchema = z.strictObject({
	language: z.string().min(1),
	family: z.string().min(1),
	kind: z.string().min(1),
});
export type Route = z.infer<typeof routeSchema>;

/**
 * One biggest unit: the indices of the input Segments that route to it, in
 * ascending order, discontinuous ones included, and its route or
 * `Unresolved`.
 */
const unitSchema = z.strictObject({
	segments: z.array(z.int().nonnegative()).min(1),
	route: z.union([routeSchema, z.literal("Unresolved")]),
});
export type Unit = z.infer<typeof unitSchema>;

/**
 * What `segment.inUnits` returns: its units. An ideal output lists only the units
 * its record asserts, so a Partial record's leaves Segments out.
 */
export const segmentInUnitsOutputSchema = z.strictObject({
	units: z.array(unitSchema),
});

export type SegmentInUnitsInput = z.infer<typeof segmentInUnitsInputSchema>;
export type SegmentInUnitsOutput = z.infer<typeof segmentInUnitsOutputSchema>;

/** Where an ideal unit comes from in its record. */
export type GoldUnitSource =
	| { readonly target: number }
	| { readonly noTarget: number };

/**
 * What the evaluator reads beside a case: the record's Coverage, and the
 * source of each ideal unit, in the ideal output's order.
 */
export type SegmentInUnitsFacts = {
	readonly coverage: Dumspec.Coverage;
	readonly sources: readonly GoldUnitSource[];
};

export const segmentInUnitsRoute = "segment-in-units/de";

function segmentInUnitsInput(
	record: Dumspec.SpecSegmentation,
): SegmentInUnitsInput {
	return {
		language: "de",
		segments: record.segments.map(({ kind, text, surface }) => ({
			kind,
			text,
			...(surface === undefined ? {} : { surface }),
		})),
	};
}

/**
 * One case per German record whose Segmentation passes: each target is a
 * unit with its members' Segments and its route, and each No Target entry an
 * `Unresolved` unit of its one Segment, ordered by first Segment. A case is
 * Reviewed when its record is reviewed through Segmentation.
 */
export const segmentInUnits: Projection<
	typeof segmentInUnitsInputSchema,
	typeof segmentInUnitsOutputSchema,
	SegmentInUnitsFacts
> = {
	route: segmentInUnitsRoute,
	language: "de",
	layer: "Segmentation",
	inputSchema: segmentInUnitsInputSchema,
	outputSchema: segmentInUnitsOutputSchema,
	project(record) {
		if (record.targets.length === 0 && record.noTarget.length === 0)
			return { skip: "Annotates no Segment" };
		const units = [
			...record.targets.map((target, index) => {
				const { language, family, kind } = target.route;
				return {
					source: { target: index },
					unit: {
						segments: [...target.memberSegmentIndices],
						route: { language, family, kind },
					},
				};
			}),
			...record.noTarget.map(({ segment }, index) => ({
				source: { noTarget: index },
				unit: { segments: [segment], route: "Unresolved" as const },
			})),
		].sort(
			(left, right) =>
				Math.min(...left.unit.segments) -
				Math.min(...right.unit.segments),
		);
		return [
			{
				input: segmentInUnitsInput(record),
				idealOutput: { units: units.map(({ unit }) => unit) },
				facts: {
					coverage: record.coverage,
					sources: units.map(({ source }) => source),
				},
			},
		];
	},
};
