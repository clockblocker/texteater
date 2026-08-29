import { encodedDumgenValidationArtifacts } from "../generated/validation-artifacts.js";
import {
	type DeGrammaticalResolutionModelOutput,
	projectDeGrammaticalResolution,
} from "../grammatical-resolution/de/projection.js";
import { assertIntakeBatch, freezeIntakeBatch } from "../intake/contracts.js";
import type { GermanGrammaticalRoute } from "../schema/de-grammatical-resolution-inventory.js";
import {
	createGermanHighLevelTargetClassificationProjection,
	type GermanHighLevelTargetClassificationInput,
	type GermanHighLevelTargetClassificationModelOutput,
} from "../target-classification/de/high-level-target-classification-projection.js";
import type { GrammaticalResolutionInput } from "../types.js";

type Dispatch =
	| ((input: unknown) => unknown)
	| ((input: unknown, output: unknown) => unknown)
	| Readonly<{ assert(input: unknown, output: unknown): void }>;

export function runtimePromptDispatch(
	id: string,
	path: string,
	_outputJsonSchema: () => unknown,
): Dispatch {
	if (id === "laboratory.intake:output-postcondition")
		return Object.freeze({ assert: assertIntakeBatch as never });
	if (id === "laboratory.intake:project-output")
		return (_input, output) => freezeIntakeBatch(output as never);
	if (
		id ===
		"laboratory.targetClassification.de.highLevelWholeUnit:project-input"
	)
		return (input: unknown) =>
			createGermanHighLevelTargetClassificationProjection(
				input as GermanHighLevelTargetClassificationInput,
			).modelInput;
	if (
		id ===
		"laboratory.targetClassification.de.highLevelWholeUnit:output-postcondition"
	)
		return Object.freeze({
			assert(input: unknown, output: unknown): void {
				createGermanHighLevelTargetClassificationProjection(
					input as GermanHighLevelTargetClassificationInput,
				).canonicalize(
					output as GermanHighLevelTargetClassificationModelOutput,
				);
			},
		});
	if (
		id ===
		"laboratory.targetClassification.de.highLevelWholeUnit:project-output"
	)
		return (input, output) =>
			createGermanHighLevelTargetClassificationProjection(
				input as GermanHighLevelTargetClassificationInput,
			).canonicalize(
				output as GermanHighLevelTargetClassificationModelOutput,
			);
	if (id === "laboratory.unitShadowClassification:output-postcondition")
		return Object.freeze({ assert: assertSupportedClassification });
	if (
		id.startsWith("laboratory.grammaticalResolution.de.") &&
		id.endsWith(":project-input")
	)
		return (input: unknown) => input;
	if (
		id.startsWith("laboratory.grammaticalResolution.de.") &&
		id.endsWith(":project-output")
	)
		return (input, output) =>
			projectGrammaticalResolution(path, input, output);
	throw new ReferenceError(`Unknown runtime prompt dispatch: ${id}.`);
}

function projectGrammaticalResolution(
	path: string,
	rawInput: unknown,
	rawOutput: unknown,
): unknown {
	const route = path.split(".grammaticalResolution.de.")[1]?.split(".");
	const family = route?.[0];
	const kind = route?.[1];
	if (family === undefined || kind === undefined)
		throw new ReferenceError(`Invalid grammatical prompt path: ${path}.`);
	const projection = projectDeGrammaticalResolution({
		input: rawInput as GrammaticalResolutionInput,
		output: rawOutput as DeGrammaticalResolutionModelOutput,
		route: { family, kind } as GermanGrammaticalRoute,
	});
	const lemma = {
		...projection.lemma,
		...projection.route,
	};
	const surface = {
		...projection.surface,
		language: projection.route.language,
		lemma,
	};
	return {
		memberOrthographies: projection.memberOrthographies,
		normalizedMembers: projection.normalizedMembers,
		realizationCoverage: projection.realizationCoverage,
		surface,
	};
}

function assertSupportedClassification(
	rawInput: unknown,
	rawOutput: unknown,
): void {
	const input = rawInput as { language: string };
	const output = rawOutput as {
		decision: string;
		target: { family: string; kind: string } | null;
	};
	if (output.decision === "Unresolved") return;
	if (output.target === null)
		throw new Error("Resolved Unit Shadow classification has no target.");
	const route = `${input.language}/${output.target.family}/${output.target.kind}`;
	if (
		!encodedDumgenValidationArtifacts.supportedUnitShadowRoutes
			.split("\n")
			.includes(route)
	)
		throw new Error(`${route} is not a supported Dumling Lemma route.`);
}
