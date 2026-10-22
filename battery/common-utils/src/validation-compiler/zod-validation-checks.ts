/** The validation effects a Zod node's checks compile to. */
import type { ValidationEffect } from "../validation/validation-artifact.js";
import {
	assertNoErrorCustomization,
	unsupported,
	zodInternals,
} from "./zod-internals.js";
import {
	type OperationContext,
	registeredOperation,
	registeredRegexOperation,
} from "./zod-validation-operations.js";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function compileChecks(
	checks: readonly unknown[] | undefined,
	schemaName: string,
	path: string,
	context: OperationContext,
	constraintKind?: "array" | "number" | "string",
	schemaIdentity?: object,
): ValidationEffect[] {
	const effects: ValidationEffect[] = [];
	for (const check of checks ?? []) {
		const internals = zodInternals(check, schemaName, path);
		const definition = internals._zod.def;
		switch (definition.check) {
			case "greater_than":
			case "less_than":
				assertNoErrorCustomization(
					definition,
					schemaName,
					path,
					"Zod check",
				);
				if (
					constraintKind !== "number" ||
					definition.value === undefined
				) {
					throw unsupported(
						schemaName,
						path,
						`${String(definition.check)} without a numeric bound`,
					);
				}
				effects.push([
					"number",
					[
						definition.check === "greater_than" ? "min" : "max",
						definition.value,
						definition.inclusive === true,
					],
				]);
				break;
			case "number_format":
				assertNoErrorCustomization(
					definition,
					schemaName,
					path,
					"Zod check",
				);
				if (
					constraintKind !== "number" ||
					definition.format !== "safeint"
				) {
					throw unsupported(
						schemaName,
						path,
						`number format ${JSON.stringify(definition.format)}`,
					);
				}
				effects.push(["number", ["int"]]);
				break;
			case "multiple_of":
				assertNoErrorCustomization(
					definition,
					schemaName,
					path,
					"Zod check",
				);
				if (
					constraintKind !== "number" ||
					definition.value === undefined
				) {
					throw unsupported(
						schemaName,
						path,
						"multiple_of without a bound",
					);
				}
				effects.push(["number", ["multiple", definition.value]]);
				break;
			case "min_length":
				assertNoErrorCustomization(
					definition,
					schemaName,
					path,
					"Zod check",
				);
				if (definition.minimum === undefined) {
					throw unsupported(
						schemaName,
						path,
						"min_length without a bound",
					);
				}
				if (constraintKind !== "array" && constraintKind !== "string") {
					throw unsupported(
						schemaName,
						path,
						"min_length on a non-string/non-array node",
					);
				}
				effects.push([constraintKind, ["min", definition.minimum]]);
				break;
			case "max_length":
				assertNoErrorCustomization(
					definition,
					schemaName,
					path,
					"Zod check",
				);
				if (definition.maximum === undefined) {
					throw unsupported(
						schemaName,
						path,
						"max_length without a bound",
					);
				}
				if (constraintKind !== "array" && constraintKind !== "string") {
					throw unsupported(
						schemaName,
						path,
						"max_length on a non-string/non-array node",
					);
				}
				effects.push([constraintKind, ["max", definition.maximum]]);
				break;
			case "length_equals":
				assertNoErrorCustomization(
					definition,
					schemaName,
					path,
					"Zod check",
				);
				if (definition.length === undefined) {
					throw unsupported(
						schemaName,
						path,
						"length_equals without a bound",
					);
				}
				if (constraintKind !== "array" && constraintKind !== "string") {
					throw unsupported(
						schemaName,
						path,
						"length_equals on a non-string/non-array node",
					);
				}
				effects.push([constraintKind, ["length", definition.length]]);
				break;
			case "overwrite":
				effects.push([
					"operation",
					registeredOperation(
						"overwrite",
						definition.tx,
						definition.error,
						schemaName,
						path,
						context,
					),
				]);
				break;
			case "string_format": {
				if (definition.format !== "regex") {
					throw unsupported(
						schemaName,
						path,
						`string_format ${JSON.stringify(definition.format)}`,
					);
				}
				const regexPattern = definition.pattern;
				if (!(regexPattern instanceof RegExp)) {
					throw unsupported(
						schemaName,
						path,
						"regex without a pattern",
					);
				}
				if (definition.error !== undefined) {
					if (schemaIdentity === undefined) {
						throw unsupported(
							schemaName,
							path,
							"customized regex without a schema identity",
						);
					}
					effects.push([
						"operation",
						registeredRegexOperation(
							schemaIdentity,
							internals,
							definition,
							regexPattern,
							schemaName,
							path,
							context,
						),
					]);
					break;
				}
				effects.push([
					"regex",
					regexPattern.source,
					regexPattern.flags,
				]);
				break;
			}
			case "custom":
				if (definition.fn === undefined) {
					effects.push([
						"operation",
						registeredOperation(
							"contextual",
							internals._zod.check,
							definition.error,
							schemaName,
							path,
							context,
						),
					]);
					break;
				}
				effects.push([
					"operation",
					registeredOperation(
						"custom",
						definition.fn,
						definition.error,
						schemaName,
						path,
						context,
					),
				]);
				break;
			default:
				throw unsupported(
					schemaName,
					path,
					`Zod check ${JSON.stringify(definition.check)}`,
				);
		}
	}
	return effects;
}
