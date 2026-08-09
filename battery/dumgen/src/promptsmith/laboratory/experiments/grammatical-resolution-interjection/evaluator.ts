import type { output } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import type {
	inputSchema,
	outputSchema,
} from "../../prompt-source/grammatical-resolution/de/lexeme/interjection/schemas";

export type InterjectionGrammaticalResolutionEvaluation = {
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

export function evaluateInterjectionGrammaticalResolution(args: {
	readonly caseId: string;
	readonly input: output<typeof inputSchema>;
	readonly idealOutput: output<typeof outputSchema>;
	readonly output: output<typeof outputSchema>;
}): InterjectionGrammaticalResolutionEvaluation {
	const expectedResolution = args.idealOutput.resolution;
	const actualResolution = args.output.resolution;
	const expectedSurface = expectedResolution?.surface;
	const actualSurface = actualResolution?.surface;
	const markerCount =
		args.input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
	const closingMarkerCount =
		args.input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;

	const diagnostics = {
		decisionPass: args.output.decision === args.idealOutput.decision,
		decisionResolutionCoherencePass:
			(args.output.decision === "Resolved" &&
				actualResolution !== null) ||
			(args.output.decision === "Unresolved" &&
				actualResolution === null),
		memberCountPass:
			actualResolution === null || expectedResolution === null
				? actualResolution === expectedResolution
				: markerCount > 0 &&
					markerCount === closingMarkerCount &&
					actualResolution.memberOrthographies.length === markerCount,
		memberOrthographiesPass: equal(
			actualResolution?.memberOrthographies ?? null,
			expectedResolution?.memberOrthographies ?? null,
		),
		surfaceKindPass:
			(actualSurface?.surfaceKind ?? null) ===
			(expectedSurface?.surfaceKind ?? null),
		normalizedSurfacePass:
			(actualSurface?.normalizedSurface ?? null) ===
			(expectedSurface?.normalizedSurface ?? null),
		spellingPass:
			(actualSurface?.spelling ?? null) ===
			(expectedSurface?.spelling ?? null),
		realizationCoveragePass:
			(actualResolution?.realizationCoverage ?? null) ===
			(expectedResolution?.realizationCoverage ?? null),
		surfaceFeaturesPass: equal(
			actualSurface?.surfaceFeatures ?? null,
			expectedSurface?.surfaceFeatures ?? null,
		),
		canonicalFormPass:
			(actualResolution?.lemma.canonicalForm ?? null) ===
			(expectedResolution?.lemma.canonicalForm ?? null),
		coreFeaturesPass: equal(
			actualResolution?.lemma.coreFeatures ?? null,
			expectedResolution?.lemma.coreFeatures ?? null,
		),
	};
	return {
		contractPass: Object.values(diagnostics).every(Boolean),
		...diagnostics,
	};
}

function equal(left: unknown, right: unknown): boolean {
	return stableJson(left) === stableJson(right);
}
