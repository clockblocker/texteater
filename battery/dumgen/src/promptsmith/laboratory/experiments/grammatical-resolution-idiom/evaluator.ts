import type { output } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import type {
	inputSchema,
	outputSchema,
} from "../../../production/grammatical-resolution/de/phraseme/idiom/schemas";

export type IdiomGrammaticalResolutionEvaluation = {
	readonly contractPass: boolean;
	readonly memberCountPass: boolean;
	readonly memberOrthographiesPass: boolean;
	readonly surfaceKindPass: boolean;
	readonly normalizedSurfacePass: boolean;
	readonly spellingPass: boolean;
	readonly realizationCoveragePass: boolean;
	readonly surfaceFeaturesPass: boolean;
	readonly inflectionalFeaturesPass: boolean;
	readonly canonicalFormPass: boolean;
};

type IdiomSurface = output<typeof outputSchema>["surface"];

export function evaluateIdiomGrammaticalResolution(args: {
	readonly caseId: string;
	readonly input: output<typeof inputSchema>;
	readonly idealOutput: output<typeof outputSchema>;
	readonly output: output<typeof outputSchema>;
}): IdiomGrammaticalResolutionEvaluation {
	const expectedSurface = args.idealOutput.surface;
	const actualSurface = args.output.surface;
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
		surfaceKindPass:
			actualSurface.surfaceKind === expectedSurface.surfaceKind,
		normalizedSurfacePass:
			args.output.normalizedMembers.join(" ") ===
			args.idealOutput.normalizedMembers.join(" "),
		spellingPass: actualSurface.spelling === expectedSurface.spelling,
		realizationCoveragePass:
			args.output.realizationCoverage ===
			args.idealOutput.realizationCoverage,
		surfaceFeaturesPass: equal(
			canonicalSurfaceFeatures(actualSurface),
			canonicalSurfaceFeatures(expectedSurface),
		),
		inflectionalFeaturesPass: equal(
			inflectionalFeatures(actualSurface),
			inflectionalFeatures(expectedSurface),
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

function canonicalSurfaceFeatures(surface: IdiomSurface): unknown {
	const features = surface.surfaceFeatures ?? null;
	return features !== null &&
		typeof features === "object" &&
		"historicalStatus" in features &&
		features.historicalStatus === null
		? null
		: features;
}

function inflectionalFeatures(surface: IdiomSurface): unknown {
	return surface.surfaceKind === "Inflection"
		? surface.inflectionalFeatures
		: null;
}

function equal(left: unknown, right: unknown): boolean {
	return stableJson(left) === stableJson(right);
}
