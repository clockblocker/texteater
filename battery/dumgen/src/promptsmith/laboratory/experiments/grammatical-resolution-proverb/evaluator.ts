import type { output } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import type {
	inputSchema,
	outputSchema,
} from "../../prompt-source/grammatical-resolution/de/phraseme/proverb/schemas";

export type ProverbGrammaticalResolutionEvaluation = {
	readonly contractPass: boolean;
	readonly memberCountPass: boolean;
	readonly memberOrthographiesPass: boolean;
	readonly normalizedSurfacePass: boolean;
	readonly spellingPass: boolean;
	readonly realizationCoveragePass: boolean;
	readonly surfaceFeaturesPass: boolean;
	readonly canonicalFormPass: boolean;
};

export function evaluateProverbGrammaticalResolution(args: {
	readonly caseId: string;
	readonly input: output<typeof inputSchema>;
	readonly idealOutput: output<typeof outputSchema>;
	readonly output: output<typeof outputSchema>;
}): ProverbGrammaticalResolutionEvaluation {
	const markerCount =
		args.input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
	const closingMarkerCount =
		args.input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
	const diagnostics = {
		memberCountPass:
			markerCount === closingMarkerCount &&
			markerCount === args.input.members.length &&
			args.output.memberOrthographies.length ===
				args.input.members.length &&
			args.output.normalizedMembers.length === args.input.members.length,
		memberOrthographiesPass: equal(
			args.output.memberOrthographies,
			args.idealOutput.memberOrthographies,
		),
		normalizedSurfacePass:
			args.output.normalizedMembers.join(" ") ===
			args.idealOutput.normalizedMembers.join(" "),
		spellingPass:
			args.output.surface.spelling === args.idealOutput.surface.spelling,
		realizationCoveragePass:
			args.output.realizationCoverage ===
			args.idealOutput.realizationCoverage,
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
