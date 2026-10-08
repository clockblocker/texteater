import { isRecord } from "common-utils";
import {
	type CompiledValidationRegistry,
	parseCompiledValidation,
	type ValidationOperations,
} from "common-utils/validation";
import { validationRegistry as units } from "dumling/compiled-validation";
import { validationOperations } from "dumling/validation";
import { validationRegistry as knowledge } from "dumrel/compiled-validation";
import * as relSchemas from "dumrel/schema";
import { z } from "zod";
import { canonicalDumdictValidationSchemas } from "../../battery/dumdict/codegen/validation-artifacts";
import { validationRegistry as dictionary } from "../../battery/dumdict/src/generated/linked-validation";
import { dumdictValidationOperations } from "../../battery/dumdict/src/parsing/validation-operations";
import { successfulInputs } from "../../battery/dumdict/tests/internal/differential-fixtures";
import { loadRoutes } from "../../battery/dumling/codegen/routes";
import { unitFixtures } from "../../battery/dumling/tests/unit-fixtures";
import { samples as knowledgeSamples } from "../../battery/dumrel/tests/compiled-schema-fixtures";
import type { DifferentialTarget } from "./differential";

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
	if (isRecord(value))
		for (const key of Object.keys(value))
			for (const replacement of [undefined, null, "INVALID"])
				invalid.push({ ...value, [key]: replacement });
	return invalid;
}
function targets(
	packageName: string,
	registry: CompiledValidationRegistry,
	schemas: Record<string, z.ZodType>,
	examples: Record<string, unknown[]>,
	runtimeOperations: ValidationOperations = validationOperations,
): DifferentialTarget<unknown>[] {
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
				parseCompiledValidation(
					registry,
					name,
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
const relSchemaExports: Readonly<Record<string, unknown>> = { ...relSchemas };
const knowledgeSchemas = Object.fromEntries(
	Object.keys(knowledge.roots).map((root) => {
		const schema = relSchemaExports[`${root}Schema`];
		if (!(schema instanceof z.ZodType))
			throw Error(`Missing dumrel schema export ${root}Schema`);
		return [root, schema];
	}),
);
const dictionarySamples = Object.fromEntries(
	Object.entries(successfulInputs()).map(([key, value]) => [key, [value]]),
);
export const DUM_DIFFERENTIAL_TARGETS = [
	...targets("dumling", units, unitSchemas, unitSamples),
	...targets("dumrel", knowledge, knowledgeSchemas, knowledgeSamples),
	...targets(
		"dumdict",
		dictionary,
		canonicalDumdictValidationSchemas,
		dictionarySamples,
		dumdictValidationOperations,
	),
];
