import type { output } from "zod";

import { stableJson } from "../../../../lib/stable-json";
import type {
	inputSchema,
	outputSchema,
} from "../../prompt-source/grammatical-resolution/de/lexeme/symbol/schemas";

export type SymbolGrammaticalResolutionEvaluation = {
	readonly contractPass: boolean;
	readonly memberCountPass: boolean;
	readonly memberOrthographiesPass: boolean;
	readonly surfaceKindPass: boolean;
	readonly normalizedSurfacePass: boolean;
	readonly spellingPass: boolean;
	readonly surfaceFeaturesPass: boolean;
	readonly inflectionalFeaturesPass: boolean;
	readonly canonicalFormPass: boolean;
	readonly coreFeaturesPass: boolean;
};

type SymbolSurface = output<typeof outputSchema>["surface"];

export function evaluateSymbolGrammaticalResolution(args: {
	readonly caseId: string;
	readonly input: output<typeof inputSchema>;
	readonly idealOutput: output<typeof outputSchema>;
	readonly output: output<typeof outputSchema>;
}): SymbolGrammaticalResolutionEvaluation {
	const actualSurface = args.output.surface;
	const expectedSurface = args.idealOutput.surface;
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
			surfaceKind(actualSurface) === surfaceKind(expectedSurface),
		normalizedSurfacePass: equal(
			args.output.normalizedMembers,
			args.idealOutput.normalizedMembers,
		),
		spellingPass: actualSurface.spelling === expectedSurface.spelling,
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

function surfaceKind(surface: SymbolSurface): "Citation" | "Inflection" {
	return "surfaceKind" in surface ? "Inflection" : "Citation";
}

function inflectionalFeatures(surface: SymbolSurface): unknown {
	return "inflectionalFeatures" in surface
		? surface.inflectionalFeatures
		: null;
}

function canonicalSurfaceFeatures(surface: SymbolSurface): unknown {
	const features = surface.surfaceFeatures ?? null;
	return features !== null && features.historicalStatus === null
		? null
		: features;
}

function equal(left: unknown, right: unknown): boolean {
	return stableJson(left) === stableJson(right);
}
