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
 * A Spec Record with only what the projections read. Its targets hold an
 * Attestation of which only the Lemma's route is filled in.
 */
export function specRecord(args: {
	readonly id: string;
	readonly sentence: string;
	readonly targets: readonly TargetSpec[];
	readonly noTarget?: readonly number[];
	readonly coverage?: Dumspec.Coverage;
	readonly status?: Dumspec.ReviewStatus;
	readonly language?: Dumling.Language;
}): Dumspec.SpecRecord {
	const language = args.language ?? "de";
	return {
		id: args.id,
		language,
		sentence: args.sentence,
		segments: segmentsOf(args.sentence),
		targets: args.targets.map(([memberSegmentIndices, family, kind]) => ({
			memberSegmentIndices,
			attestation: {
				surface: { lemma: { language, family, kind } },
			} as unknown as Dumling.Attestation,
		})),
		noTarget: (args.noTarget ?? []).map((segment) => ({
			segment,
			reason: "Unintelligible",
		})),
		coverage: args.coverage ?? "Partial",
		status: args.status ?? "Reviewed",
		sources: { adrs: [], rules: [], references: [] },
		provenance: { kind: "Authored" },
	};
}

export const emptySidecar: Sidecar = {
	slices: {},
	explanations: {},
	exclusions: {},
};
