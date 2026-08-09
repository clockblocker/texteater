import type { output } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import type {
	inputSchema,
	outputSchema,
} from "../../prompt-source/grammatical-resolution/de/construction/paired-frame/schemas";

export type PairedFrameGrammaticalResolutionEvaluation = {
	readonly contractPass: boolean;
	readonly decisionPass: boolean;
	readonly decisionResolutionCoherencePass: boolean;
	readonly memberCountPass: boolean;
	readonly memberOrthographiesPass: boolean;
	readonly surfaceKindPass: boolean;
	readonly normalizedSurfacePass: boolean;
	readonly spellingPass: boolean;
	readonly realizationCoveragePass: boolean;
	readonly surfaceFeaturesPass: boolean;
	readonly canonicalFormPass: boolean;
	readonly coreFeaturesPass: boolean;
};

export function evaluatePairedFrameGrammaticalResolution(args: {
	readonly caseId: string;
	readonly input: output<typeof inputSchema>;
	readonly idealOutput: output<typeof outputSchema>;
	readonly output: output<typeof outputSchema>;
}): PairedFrameGrammaticalResolutionEvaluation {
	const expected = args.idealOutput.resolution;
	const actual = args.output.resolution;
	const markerCount =
		args.input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
	const closingCount =
		args.input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
	const diagnostics = {
		decisionPass: args.output.decision === args.idealOutput.decision,
		decisionResolutionCoherencePass:
			(args.output.decision === "Resolved" && actual !== null) ||
			(args.output.decision === "Unresolved" && actual === null),
		memberCountPass:
			actual === null || expected === null
				? actual === expected
				: markerCount >= 2 &&
					closingCount === markerCount &&
					actual.memberOrthographies.length === markerCount,
		memberOrthographiesPass: equal(
			actual?.memberOrthographies ?? null,
			expected?.memberOrthographies ?? null,
		),
		surfaceKindPass:
			(actual?.surface.surfaceKind ?? null) ===
			(expected?.surface.surfaceKind ?? null),
		normalizedSurfacePass:
			(actual?.surface.normalizedSurface ?? null) ===
			(expected?.surface.normalizedSurface ?? null),
		spellingPass:
			(actual?.surface.spelling ?? null) ===
			(expected?.surface.spelling ?? null),
		realizationCoveragePass:
			(actual?.realizationCoverage ?? null) ===
			(expected?.realizationCoverage ?? null),
		surfaceFeaturesPass: equal(
			canonicalSurfaceFeatures(actual?.surface.surfaceFeatures),
			canonicalSurfaceFeatures(expected?.surface.surfaceFeatures),
		),
		canonicalFormPass:
			(actual?.lemma.canonicalForm ?? null) ===
			(expected?.lemma.canonicalForm ?? null),
		coreFeaturesPass: equal(
			actual?.lemma.coreFeatures ?? null,
			expected?.lemma.coreFeatures ?? null,
		),
	};
	return {
		contractPass: Object.values(diagnostics).every(Boolean),
		...diagnostics,
	};
}

function canonicalSurfaceFeatures(value: unknown): unknown {
	return stableJson(value) === stableJson({ historicalStatus: null })
		? null
		: value;
}

function equal(left: unknown, right: unknown): boolean {
	return stableJson(left) === stableJson(right);
}
