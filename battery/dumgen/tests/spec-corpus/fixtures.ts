import type * as Dumling from "dumling/types";
import type * as Dumspec from "dumspec/types";
import type { Sidecar } from "../../src/evaluation/spec-corpus/gold.js";

type TargetSpec = readonly [
	segments: readonly number[],
	family: string,
	kind: string,
];

/** Word, space and punctuation Segments, the way dumspec records split them. */
export function segmentsOf(sentence: string): Dumspec.Segment[] {
	return [...sentence.matchAll(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu)].map(
		([text]) => ({
			kind: /^\s+$/u.test(text)
				? "Whitespace"
				: /^[\p{L}\p{N}]+$/u.test(text)
					? "ResolvableText"
					: "Punctuation",
			text,
		}),
	);
}

/**
 * A Spec Record's Segmentation. It is reviewed through Segmentation unless
 * `reviewDepth` says otherwise; `reviewDepth: undefined` makes a Draft.
 */
export function specRecord(args: {
	readonly id: string;
	readonly sentence: string;
	readonly targets: readonly TargetSpec[];
	/** Each No Target entry's Segments. */
	readonly noTarget?: readonly (readonly number[])[];
	readonly coverage?: Dumspec.Coverage;
	readonly reviewDepth?: Dumspec.AnnotationLayer;
	readonly language?: Dumling.Language;
}): Dumspec.SpecSegmentation {
	const language = args.language ?? "de";
	const reviewDepth =
		"reviewDepth" in args ? args.reviewDepth : "Segmentation";
	return {
		id: args.id,
		language,
		sentence: args.sentence,
		segments: segmentsOf(args.sentence),
		targets: args.targets.map(([memberSegmentIndices, family, kind]) => ({
			memberSegmentIndices,
			route: { language, family, kind } as Dumspec.SpecRoute,
		})),
		noTarget: (args.noTarget ?? []).map((memberSegmentIndices) => ({
			memberSegmentIndices,
			reason: "Unintelligible",
		})),
		coverage: args.coverage ?? "Partial",
		...(reviewDepth === undefined ? {} : { reviewDepth }),
		validThrough: "Segmentation",
		sources: { adrs: [], rules: [], references: [] },
		provenance: { kind: "Authored" },
	};
}

export const emptySidecar: Sidecar = {
	slices: {},
	explanations: {},
	exclusions: {},
};
