import type { output } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import type {
	inputSchema,
	outputSchema,
} from "../../prompt-source/grammatical-resolution/de/construction/fusion/schemas";

export type FusionGrammaticalResolutionEvaluation = {
	readonly contractPass: boolean;
	readonly memberCountPass: boolean;
	readonly memberOrthographiesPass: boolean;
	readonly normalizedSurfacePass: boolean;
	readonly spellingPass: boolean;
	readonly surfaceFeaturesPass: boolean;
	readonly canonicalFormPass: boolean;
};

export function evaluateFusionGrammaticalResolution(args: {
	readonly caseId: string;
	readonly input: output<typeof inputSchema>;
	readonly idealOutput: output<typeof outputSchema>;
	readonly output: output<typeof outputSchema>;
}): FusionGrammaticalResolutionEvaluation {
	const markerCount =
		args.input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
	const closingMarkerCount =
		args.input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
	const diagnostics = {
		memberCountPass:
			markerCount === 1 &&
			closingMarkerCount === markerCount &&
			args.input.members.length === 1 &&
			args.output.memberOrthographies.length === 1 &&
			args.output.normalizedMembers.length === 1,
		memberOrthographiesPass: equal(
			args.output.memberOrthographies,
			args.idealOutput.memberOrthographies,
		),
		normalizedSurfacePass:
			args.output.normalizedMembers[0] ===
			args.idealOutput.normalizedMembers[0],
		spellingPass:
			args.output.surface.spelling === args.idealOutput.surface.spelling,
		surfaceFeaturesPass: equal(
			canonicalSurfaceFeatures(args.output.surface.surfaceFeatures),
			canonicalSurfaceFeatures(args.idealOutput.surface.surfaceFeatures),
		),
		canonicalFormPass:
			args.output.lemma.canonicalForm ===
			args.idealOutput.lemma.canonicalForm,
	};
	return {
		contractPass: Object.values(diagnostics).every(Boolean),
		...diagnostics,
	};
}

function canonicalSurfaceFeatures(features: unknown): unknown {
	return features !== null &&
		typeof features === "object" &&
		"historicalStatus" in features &&
		features.historicalStatus === null
		? null
		: features;
}

function equal(left: unknown, right: unknown): boolean {
	return stableJson(left) === stableJson(right);
}
