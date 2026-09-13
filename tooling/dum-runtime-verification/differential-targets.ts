import {
	type Constraint,
	parseValidationArtifact,
	type ValidationOperations,
} from "common-utils";
import { validationOperations } from "dumling/validation";
import * as relSchemas from "dumrel/schema";
import { z } from "zod";
import { canonicalDumdictValidationSchemas } from "../../battery/dumdict/codegen/validation-artifacts";
import { encodedDumdictValidationArtifacts } from "../../battery/dumdict/src/generated/validation-artifacts";
import { dumdictValidationOperations } from "../../battery/dumdict/src/parsing/validation-operations";
import { successfulInputs } from "../../battery/dumdict/tests/internal/differential-fixtures";
import { canonicalDumgenValidationSchemas } from "../../battery/dumgen/codegen/validation-schemas";
import { encodedValidation as production } from "../../battery/dumgen/src/generated/validation";
import { loadRoutes } from "../../battery/dumling/codegen/routes";
import { encodedValidation as units } from "../../battery/dumling/src/generated/validation";
import { unitFixtures } from "../../battery/dumling/tests/unit-fixtures";
import { encodedValidation as knowledge } from "../../battery/dumrel/src/generated/validation";
import { samples as knowledgeSamples } from "../../battery/dumrel/tests/compiled-schema-fixtures";
import type { DifferentialTarget } from "./differential";

const operations: ValidationOperations = {
	...validationOperations,
	"dumrel.normalize-text": (value) => ({
		value: (value as string).trim().normalize("NFC"),
	}),
};
function mutations(value: unknown): unknown[] {
	const invalid: unknown[] = [
		undefined,
		null,
		42,
		"",
		[],
		{},
		{ unexpected: true },
	];
	if (value !== null && typeof value === "object" && !Array.isArray(value))
		for (const key of Object.keys(value))
			for (const replacement of [undefined, null, "INVALID"])
				invalid.push({ ...value, [key]: replacement });
	return invalid;
}
function targets(
	packageName: string,
	encoded: string,
	schemas: Record<string, z.ZodType>,
	examples: Record<string, unknown[]>,
	runtimeOperations = operations,
): DifferentialTarget<unknown>[] {
	const registry = JSON.parse(encoded) as {
		roots: Record<string, Constraint>;
		definitions: Record<string, Constraint>;
	};
	return Object.entries(schemas).map(([name, canonical]) => {
		const root = registry.roots[name];
		if (!root) throw Error(`Missing generated root ${packageName}:${name}`);
		const representativeValues = examples[name] ?? [];
		return {
			id: `${packageName}:${name}`,
			canonical,
			representativeValues,
			propertyValues: representativeValues.length
				? representativeValues.flatMap(mutations)
				: mutations(null),
			lightweight: (input) =>
				parseValidationArtifact(
					{ version: 1, root, definitions: registry.definitions },
					input,
					runtimeOperations,
				),
		};
	});
}
const routes = await loadRoutes();
const unitSchemas: Record<string, z.ZodType> = {};
const unitSamples: Record<string, unknown[]> = {};
for (const route of routes)
	for (const [kind, value] of Object.entries(unitFixtures(route, z))) {
		const key = `${kind}/${route.key}`;
		unitSchemas[key] = route.schemas[kind as keyof typeof route.schemas];
		unitSamples[key] = [value];
	}
const relRegistry = JSON.parse(knowledge) as { roots: Record<string, unknown> };
const knowledgeSchemas = Object.fromEntries(
	Object.keys(relRegistry.roots).map((root) => [
		root,
		relSchemas[`${root}Schema` as keyof typeof relSchemas],
	]),
);
const dictionarySamples = Object.fromEntries(
	Object.entries(successfulInputs()).map(([key, value]) => [key, [value]]),
);
const noun = unitSamples["Lemma/de/Lexeme/NOUN"]![0];
const reading = { unitKind: "Reading", lemma: noun, emojiDescription: "🏠" };
const sentence = {
	id: "verification",
	language: "de",
	segments: [{ kind: "ResolvableText", text: "example" }],
};
const encounter = {
	sentence,
	target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
};
const productionSamples: Record<string, unknown[]> = {
	encounterSchema: [encounter],
	lemmaSchema: [noun],
	readingSchema: [reading],
	attestationSchema: unitSamples["Attestation/de/Lexeme/NOUN"]!,
	generationInput: [{ encounter, lemma: noun }],
	comparisonInput: [{ encounter, lemma: noun, candidates: ["🏠"] }],
	knowledgeInput: [{ encounter, reading, request: { definition: null } }],
	emojiOutput: [{ emojiDescription: "🏠" }],
	segmentSchema: sentence.segments,
	segmentedSentenceSchema: [sentence],
	segmentInputSchema: [{ sourceSentences: ["example"] }],
	classifyInputSchema: [{ sentence, clickedSegmentIndex: 0 }],
};
for (const key of Object.keys(canonicalDumgenValidationSchemas))
	if (key.startsWith("grammar/") || key.startsWith("target/"))
		productionSamples[key] = [
			{
				decision: "Unresolved",
				...(key === "target/de"
					? { target: null, additionalMemberIndices: null }
					: {}),
			},
		];
export const DUM_DIFFERENTIAL_TARGETS = [
	...targets("dumling", units, unitSchemas, unitSamples),
	...targets("dumrel", knowledge, knowledgeSchemas, knowledgeSamples),
	...targets(
		"dumdict",
		encodedDumdictValidationArtifacts,
		canonicalDumdictValidationSchemas,
		dictionarySamples,
		dumdictValidationOperations,
	),
	...targets(
		"dumgen",
		production,
		canonicalDumgenValidationSchemas,
		productionSamples,
	),
];
