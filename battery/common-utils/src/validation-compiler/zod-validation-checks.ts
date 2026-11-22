/** The validation effects a Zod node's checks compile to. */
import type { ValidationEffect } from "../validation/validation-artifact.js";
import {
	assertNoErrorCustomization,
	unsupported,
	type ZodDefinition,
	type ZodInternals,
	zodInternals,
} from "./zod-internals.js";
import {
	type OperationContext,
	registeredOperation,
	registeredRegexOperation,
} from "./zod-validation-operations.js";

type ConstraintKind = "array" | "number" | "string" | undefined;

type CheckContext = Readonly<{
	schemaName: string;
	path: string;
	context: OperationContext;
	constraintKind: ConstraintKind;
	schemaIdentity: object | undefined;
}>;

export function compileChecks(
	checks: readonly unknown[] | undefined,
	schemaName: string,
	path: string,
	context: OperationContext,
	constraintKind?: "array" | "number" | "string",
	schemaIdentity?: object,
): ValidationEffect[] {
	const checkContext: CheckContext = {
		schemaName,
		path,
		context,
		constraintKind,
		schemaIdentity,
	};
	return (checks ?? []).map((check) => compileCheck(check, checkContext));
}

function compileCheck(check: unknown, ctx: CheckContext): ValidationEffect {
	const internals = zodInternals(check, ctx.schemaName, ctx.path);
	const definition = internals._zod.def;
	switch (definition.check) {
		case "greater_than":
		case "less_than":
		case "number_format":
		case "multiple_of":
			return compileNumericCheck(definition, ctx);
		case "min_length":
			return compileLengthCheck(
				definition,
				"min",
				definition.minimum,
				"min_length",
				ctx,
			);
		case "max_length":
			return compileLengthCheck(
				definition,
				"max",
				definition.maximum,
				"max_length",
				ctx,
			);
		case "length_equals":
			return compileLengthCheck(
				definition,
				"length",
				definition.length,
				"length_equals",
				ctx,
			);
		case "overwrite":
			return [
				"operation",
				registeredOperation(
					"overwrite",
					definition.tx,
					definition.error,
					ctx.schemaName,
					ctx.path,
					ctx.context,
				),
			];
		case "string_format":
			return compileStringFormatCheck(internals, definition, ctx);
		case "custom":
			return compileCustomCheck(internals, definition, ctx);
		default:
			throw unsupported(
				ctx.schemaName,
				ctx.path,
				`Zod check ${JSON.stringify(definition.check)}`,
			);
	}
}

function compileNumericCheck(
	definition: ZodDefinition,
	{ schemaName, path, constraintKind }: CheckContext,
): ValidationEffect {
	assertNoErrorCustomization(definition, schemaName, path, "Zod check");
	if (definition.check === "number_format") {
		if (constraintKind !== "number" || definition.format !== "safeint") {
			throw unsupported(
				schemaName,
				path,
				`number format ${JSON.stringify(definition.format)}`,
			);
		}
		return ["number", ["int"]];
	}
	if (definition.check === "multiple_of") {
		if (constraintKind !== "number" || definition.value === undefined) {
			throw unsupported(schemaName, path, "multiple_of without a bound");
		}
		return ["number", ["multiple", definition.value]];
	}
	if (constraintKind !== "number" || definition.value === undefined) {
		throw unsupported(
			schemaName,
			path,
			`${String(definition.check)} without a numeric bound`,
		);
	}
	return [
		"number",
		[
			definition.check === "greater_than" ? "min" : "max",
			definition.value,
			definition.inclusive === true,
		],
	];
}

function compileLengthCheck(
	definition: ZodDefinition,
	kind: "length" | "max" | "min",
	bound: number | undefined,
	checkName: string,
	{ schemaName, path, constraintKind }: CheckContext,
): ValidationEffect {
	assertNoErrorCustomization(definition, schemaName, path, "Zod check");
	if (bound === undefined) {
		throw unsupported(schemaName, path, `${checkName} without a bound`);
	}
	if (constraintKind !== "array" && constraintKind !== "string") {
		throw unsupported(
			schemaName,
			path,
			`${checkName} on a non-string/non-array node`,
		);
	}
	return [constraintKind, [kind, bound]];
}

function compileStringFormatCheck(
	internals: ZodInternals,
	definition: ZodDefinition,
	{ schemaName, path, context, schemaIdentity }: CheckContext,
): ValidationEffect {
	if (definition.format !== "regex") {
		throw unsupported(
			schemaName,
			path,
			`string_format ${JSON.stringify(definition.format)}`,
		);
	}
	const regexPattern = definition.pattern;
	if (!(regexPattern instanceof RegExp)) {
		throw unsupported(schemaName, path, "regex without a pattern");
	}
	if (definition.error === undefined) {
		return ["regex", regexPattern.source, regexPattern.flags];
	}
	if (schemaIdentity === undefined) {
		throw unsupported(
			schemaName,
			path,
			"customized regex without a schema identity",
		);
	}
	return [
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
	];
}

function compileCustomCheck(
	internals: ZodInternals,
	definition: ZodDefinition,
	{ schemaName, path, context }: CheckContext,
): ValidationEffect {
	const [kind, fn] =
		definition.fn === undefined
			? (["contextual", internals._zod.check] as const)
			: (["custom", definition.fn] as const);
	return [
		"operation",
		registeredOperation(
			kind,
			fn,
			definition.error,
			schemaName,
			path,
			context,
		),
	];
}
