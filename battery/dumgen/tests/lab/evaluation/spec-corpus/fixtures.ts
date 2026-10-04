import type * as Dumcorpus from "dumcorpus/types";
import type * as Dumling from "dumling/types";
import type { Sidecar } from "../../../../lab/evaluation/spec-corpus/gold.js";

type TargetSpec = readonly [
	segments: readonly number[],
	family: string,
	kind: string,
];

/** Word, space and punctuation Segments, the way dumcorpus records split them. */
export function segmentsOf(sentence: string): Dumcorpus.Segment[] {
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
	readonly coverage?: Dumcorpus.Coverage;
	readonly reviewDepth?: Dumcorpus.AnnotationLayer;
	readonly language?: Dumling.Language;
}): Dumcorpus.SpecSegmentation {
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
			route: { language, family, kind } as Dumcorpus.SpecRoute,
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
