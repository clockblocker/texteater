import type { output } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import type {
	inputSchema,
	outputSchema,
} from "../../../production/grammatical-resolution/de/lexeme/particle/schemas";

export type ParticleGrammaticalResolutionEvaluation = {
	readonly contractPass: boolean;
	readonly memberCountPass: boolean;
	readonly memberOrthographiesPass: boolean;
	readonly normalizedSurfacePass: boolean;
	readonly spellingPass: boolean;
	readonly surfaceFeaturesPass: boolean;
	readonly canonicalFormPass: boolean;
	readonly coreFeaturesPass: boolean;
};

type ParticleSurface = output<typeof outputSchema>["surface"];

export function evaluateParticleGrammaticalResolution(args: {
	readonly caseId: string;
	readonly input: output<typeof inputSchema>;
	readonly idealOutput: output<typeof outputSchema>;
	readonly output: output<typeof outputSchema>;
}): ParticleGrammaticalResolutionEvaluation {
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
		normalizedSurfacePass: equal(
			args.output.normalizedMembers,
			args.idealOutput.normalizedMembers,
		),
		spellingPass:
			args.output.surface.spelling === args.idealOutput.surface.spelling,
		surfaceFeaturesPass: equal(
			canonicalSurfaceFeatures(args.output.surface),
			canonicalSurfaceFeatures(args.idealOutput.surface),
		),
		canonicalFormPass:
			args.output.lemma.canonicalForm ===
			args.idealOutput.lemma.canonicalForm,
		coreFeaturesPass: equal(
			args.output.lemma.coreFeatures,
			args.idealOutput.lemma.coreFeatures,
		),
	};

	return {
		contractPass: Object.values(diagnostics).every(Boolean),
		...diagnostics,
	};
}

function canonicalSurfaceFeatures(surface: ParticleSurface): unknown {
	const features = surface.surfaceFeatures ?? null;
	return features !== null && features.historicalStatus === null
		? null
		: features;
}

function equal(left: unknown, right: unknown): boolean {
	return stableJson(left) === stableJson(right);
}
