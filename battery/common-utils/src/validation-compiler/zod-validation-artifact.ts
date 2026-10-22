import type { z } from "zod";

import type {
	ArrayConstraintCheck,
	ArtifactPrimitive,
	Constraint,
	NumberConstraintCheck,
	StringConstraintCheck,
	ValidationEffect,
} from "../validation/validation-artifact.js";
import {
	assertNoErrorCustomization,
	unsupported,
	type ZodDefinition,
	ZodValidationCompilationError,
	zodInternals,
} from "./zod-internals.js";
import { compileChecks } from "./zod-validation-checks.js";
import {
	type OperationContext,
	registeredDiscriminatorOperation,
	registeredOperation,
	registeredSchemaOperation,
	validateOperationRegistrations,
	type ZodValidationOperationRegistration,
	type ZodValidationOperationSignature,
} from "./zod-validation-operations.js";

// The compiler's public names, from the modules that own them.
export type { ZodValidationOperationRegistration } from "./zod-validation-operations.js";
export { ZodValidationCompilationError };

export type ZodValidationArtifactRegistry<
	Schemas extends Readonly<Record<string, z.ZodType>> = Readonly<
		Record<string, z.ZodType>
	>,
> = Readonly<{
	definitions: Readonly<Record<string, Constraint>>;
	operationSignatures: Readonly<
		Record<string, ZodValidationOperationSignature>
	>;
	requiredOperations: readonly string[];
	roots: Readonly<{ [Key in keyof Schemas]: Constraint }>;
	version: 1;
}>;

type CompileZodValidationArtifactsOptions<
	Schemas extends Readonly<Record<string, z.ZodType>>,
> = Readonly<{
	operations: readonly ZodValidationOperationRegistration[];
	schemas: Schemas;
}>;

type CompilationContext = OperationContext & {
	readonly definitions: Record<string, Constraint>;
	readonly nodeIds: WeakMap<object, string>;
	nextNodeId: number;
};

export function compileZodValidationArtifacts<
	const Schemas extends Readonly<Record<string, z.ZodType>>,
>(
	options: CompileZodValidationArtifactsOptions<Schemas>,
): ZodValidationArtifactRegistry<Schemas> {
	validateOperationRegistrations(options.operations);
	const context: CompilationContext = {
		definitions: {},
		nextNodeId: 0,
		nodeIds: new WeakMap(),
		operations: options.operations,
		operationSignatures: {},
		requiredOperations: new Set(),
	};
	const roots: Record<string, Constraint> = {};
	for (const name of Object.keys(options.schemas).toSorted()) {
		const schema = options.schemas[name];
		if (schema === undefined) continue;
		roots[name] = compileReference(schema, name, "$", context);
	}
	if (Object.keys(roots).length === 0) {
		throw new ZodValidationCompilationError(
			"Cannot compile an empty Zod schema registry.",
		);
	}
	return Object.freeze({
		definitions: Object.freeze(context.definitions),
		operationSignatures: Object.freeze(context.operationSignatures),
		requiredOperations: Object.freeze(
			[...context.requiredOperations].toSorted(),
		),
		// The roots are keyed by the schemas' names, read back as strings.
		roots: Object.freeze(roots) as Readonly<{
			[Key in keyof Schemas]: Constraint;
		}>,
		version: 1 as const,
	}) satisfies ZodValidationArtifactRegistry<Schemas>;
}

function compileReference(
	schema: unknown,
	schemaName: string,
	path: string,
	context: CompilationContext,
): Constraint {
	const internals = zodInternals(schema, schemaName, path);
	// The schema itself, checked by `zodInternals`, is the node's identity.
	const identity: object = internals;
	const existing = context.nodeIds.get(identity);
	if (existing !== undefined) return ["ref", existing];

	const id = `n${context.nextNodeId++}`;
	context.nodeIds.set(identity, id);
	context.definitions[id] = compileDefinition(
		internals._zod.def,
		identity,
		schemaName,
		path,
		context,
	);
	return ["ref", id];
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
function compileDefinition(
	definition: ZodDefinition,
	schemaIdentity: object,
	schemaName: string,
	path: string,
	context: CompilationContext,
): Constraint {
	assertNoErrorCustomization(definition, schemaName, path, "Zod node");
	switch (definition.type) {
		case "array": {
			const element = compileReference(
				definition.element,
				schemaName,
				`${path}[]`,
				context,
			);
			const effects = compileChecks(
				definition.checks,
				schemaName,
				path,
				context,
				"array",
			);
			const checks: ArrayConstraintCheck[] = [];
			for (const effect of effects) {
				if (effect[0] !== "array") break;
				checks.push(effect[1]);
			}
			return withEffects(
				["array", element, checks],
				effects.slice(checks.length),
			);
		}
		case "boolean":
			assertNoChecks(definition, schemaName, path);
			return ["boolean"];
		case "enum":
			assertNoChecks(definition, schemaName, path);
			return [
				"enum",
				primitiveValues(definition.entries, schemaName, path),
			];
		case "lazy":
			if (definition.getter === undefined) {
				throw unsupported(
					schemaName,
					path,
					"lazy node without a getter",
				);
			}
			return withEffects(
				compileReference(
					definition.getter(),
					schemaName,
					path,
					context,
				),
				compileChecks(definition.checks, schemaName, path, context),
			);
		case "literal": {
			assertNoChecks(definition, schemaName, path);
			const values = definition.values ?? [];
			if (values.length !== 1) {
				throw unsupported(
					schemaName,
					path,
					`literal node with ${values.length} values`,
				);
			}
			return ["literal", primitiveValue(values[0], schemaName, path)];
		}
		case "null":
			assertNoChecks(definition, schemaName, path);
			return ["null"];
		case "number": {
			const effects = compileChecks(
				definition.checks,
				schemaName,
				path,
				context,
				"number",
			);
			const checks: NumberConstraintCheck[] = [];
			for (const effect of effects) {
				if (effect[0] !== "number") break;
				checks.push(effect[1]);
			}
			return withEffects(
				checks.length === 0 ? ["number"] : ["number", checks],
				effects.slice(checks.length),
			);
		}
		case "nullable":
			assertNoChecks(definition, schemaName, path);
			return [
				"nullable",
				compileReference(
					definition.innerType,
					schemaName,
					path,
					context,
				),
			];
		case "optional":
			assertNoChecks(definition, schemaName, path);
			return [
				"optional",
				compileReference(
					definition.innerType,
					schemaName,
					path,
					context,
				),
			];
		case "object": {
			const shape =
				typeof definition.shape === "function"
					? definition.shape()
					: definition.shape;
			if (shape === undefined) {
				throw unsupported(
					schemaName,
					path,
					"object node without a shape",
				);
			}
			const compiledShape: Record<string, Constraint> = {};
			for (const [key, child] of Object.entries(shape)) {
				compiledShape[key] = compileReference(
					child,
					schemaName,
					propertyPath(path, key),
					context,
				);
			}
			return withEffects(
				[
					"object",
					compiledShape,
					objectPolicy(definition, schemaName, path),
				],
				compileChecks(definition.checks, schemaName, path, context),
			);
		}
		case "pipe": {
			const input = zodInternals(definition.in, schemaName, path)._zod
				.def;
			if (definition.out === undefined) {
				throw unsupported(schemaName, path, "pipe without an output");
			}
			const output = zodInternals(definition.out, schemaName, path)._zod
				.def;
			if (input.type === "transform" && input.transform !== undefined) {
				return withEffects(
					[
						"preprocess",
						registeredOperation(
							"transform",
							input.transform,
							input.error,
							schemaName,
							path,
							context,
						),
						compileReference(
							definition.out,
							schemaName,
							path,
							context,
						),
					],
					compileChecks(definition.checks, schemaName, path, context),
				);
			}
			if (output.type === "transform" && output.transform !== undefined) {
				if (output.transform.length > 1) {
					throw unsupported(
						schemaName,
						path,
						"contextual post-transform",
					);
				}
				return withEffects(
					withEffects(
						compileReference(
							definition.in,
							schemaName,
							path,
							context,
						),
						[
							[
								"operation",
								registeredOperation(
									"transform",
									output.transform,
									output.error,
									schemaName,
									path,
									context,
								),
							],
						],
					),
					compileChecks(definition.checks, schemaName, path, context),
				);
			}
			throw unsupported(
				schemaName,
				path,
				"pipe other than a registered preprocess or post-transform",
			);
		}
		case "record": {
			const key = compileReference(
				definition.keyType,
				schemaName,
				`${path}<key>`,
				context,
			);
			const value = compileReference(
				definition.valueType,
				schemaName,
				`${path}<value>`,
				context,
			);
			return withEffects(
				isPartialRecordKey(definition.keyType)
					? ["partial-record", key, value]
					: ["record", key, value],
				compileChecks(definition.checks, schemaName, path, context),
			);
		}
		case "readonly":
			assertNoChecks(definition, schemaName, path);
			return withEffects(
				compileReference(
					definition.innerType,
					schemaName,
					path,
					context,
				),
				[
					[
						"operation",
						registeredSchemaOperation(
							"readonly",
							schemaIdentity,
							schemaName,
							path,
							context,
						),
					],
				],
			);
		case "string": {
			const effects = compileChecks(
				definition.checks,
				schemaName,
				path,
				context,
				"string",
				schemaIdentity,
			);
			const checks: StringConstraintCheck[] = [];
			for (const effect of effects) {
				if (effect[0] !== "string") break;
				checks.push(effect[1]);
			}
			return withEffects(
				checks.length === 0 ? ["string"] : ["string", checks],
				effects.slice(checks.length),
			);
		}
		case "tuple": {
			const items = definition.items ?? [];
			const [first] = items;
			if (
				first === undefined ||
				items.some((item) => item !== first) ||
				(definition.rest !== undefined && definition.rest !== first) ||
				zodInternals(first, schemaName, `${path}[0]`)._zod.def.type ===
					"optional"
			) {
				throw unsupported(
					schemaName,
					path,
					"homogeneous tuple shape other than required fixed items with an optional identical rest",
				);
			}
			const compiledItems = items.map((item, index) =>
				compileReference(
					item,
					schemaName,
					`${path}[${String(index)}]`,
					context,
				),
			);
			return withEffects(
				definition.rest === undefined
					? ["tuple", compiledItems]
					: [
							"tuple",
							compiledItems,
							compileReference(
								definition.rest,
								schemaName,
								`${path}<rest>`,
								context,
							),
						],
				compileChecks(definition.checks, schemaName, path, context),
			);
		}
		case "union": {
			const options = definition.options ?? [];
			if (options.length === 0) {
				throw unsupported(schemaName, path, "empty union node");
			}
			if (definition.discriminator !== undefined) {
				return withEffects(
					compileDiscriminatedUnion(
						schemaIdentity,
						definition.discriminator,
						options,
						schemaName,
						path,
						context,
					),
					compileChecks(definition.checks, schemaName, path, context),
				);
			}
			return withEffects(
				[
					"union",
					options.map((option, index) =>
						compileReference(
							option,
							schemaName,
							`${path}<option:${index}>`,
							context,
						),
					),
				],
				compileChecks(definition.checks, schemaName, path, context),
			);
		}
		default:
			throw unsupported(
				schemaName,
				path,
				`Zod node ${JSON.stringify(definition.type)}`,
			);
	}
}

function compileDiscriminatedUnion(
	schemaIdentity: object,
	discriminator: string,
	options: readonly unknown[],
	schemaName: string,
	path: string,
	context: CompilationContext,
): Constraint {
	const compiledOptions: Constraint[] = [];
	const optionValues: string[] = [];
	const values = new Set<string>();
	for (const [index, option] of options.entries()) {
		const optionDefinition = zodInternals(
			option,
			schemaName,
			`${path}<option:${index}>`,
		)._zod.def;
		if (optionDefinition.type !== "object")
			throw unsupported(
				schemaName,
				path,
				"discriminated union option that is not an object",
			);
		const shape =
			typeof optionDefinition.shape === "function"
				? optionDefinition.shape()
				: optionDefinition.shape;
		const discriminatorSchema = shape?.[discriminator];
		if (discriminatorSchema === undefined)
			throw unsupported(
				schemaName,
				path,
				`discriminated union option without ${JSON.stringify(discriminator)}`,
			);
		const discriminatorDefinition = zodInternals(
			discriminatorSchema,
			schemaName,
			`${path}<option:${index}>.${discriminator}`,
		)._zod.def;
		if (
			discriminatorDefinition.type !== "literal" ||
			discriminatorDefinition.values?.length !== 1 ||
			typeof discriminatorDefinition.values[0] !== "string"
		)
			throw unsupported(
				schemaName,
				path,
				"discriminated union option without one string literal value",
			);
		const value = discriminatorDefinition.values[0];
		if (values.has(value))
			throw unsupported(
				schemaName,
				path,
				`duplicate discriminated union value ${JSON.stringify(value)}`,
			);
		values.add(value);
		optionValues.push(value);
		compiledOptions.push(
			compileReference(
				option,
				schemaName,
				`${path}<option:${index}>`,
				context,
			),
		);
	}
	const operation = registeredDiscriminatorOperation(
		schemaIdentity,
		discriminator,
		optionValues,
		compiledOptions,
		schemaName,
		path,
		context,
	);
	return ["preprocess", operation, ["unknown"]];
}

function isPartialRecordKey(keyType: unknown): boolean {
	return (
		zodInternals(keyType, "partial record", "$<key>")._zod.parent !==
		undefined
	);
}

function withEffects(
	constraint: Constraint,
	effects: readonly ValidationEffect[],
): Constraint {
	return effects.length === 0 ? constraint : ["pipe", constraint, effects];
}

function objectPolicy(
	definition: ZodDefinition,
	schemaName: string,
	path: string,
): "passthrough" | "strict" | "strip" {
	if (definition.catchall === undefined) return "strip";
	const catchall = zodInternals(
		definition.catchall,
		schemaName,
		`${path}<catchall>`,
	)._zod.def;
	if (catchall.type === "never") return "strict";
	if (catchall.type === "unknown") return "passthrough";
	throw unsupported(
		schemaName,
		path,
		`object catchall ${JSON.stringify(catchall.type)}`,
	);
}

function primitiveValues(
	entries: Readonly<Record<string, unknown>> | undefined,
	schemaName: string,
	path: string,
): readonly ArtifactPrimitive[] {
	if (entries === undefined) {
		throw unsupported(schemaName, path, "enum node without entries");
	}
	return Object.values(entries).map((value) =>
		primitiveValue(value, schemaName, path),
	);
}

function primitiveValue(
	value: unknown,
	schemaName: string,
	path: string,
): ArtifactPrimitive {
	if (
		value === null ||
		typeof value === "boolean" ||
		typeof value === "number" ||
		typeof value === "string"
	) {
		return value;
	}
	throw unsupported(
		schemaName,
		path,
		`non-serializable primitive ${describeUnsupported(value)}`,
	);
}

/** An unsupported literal by kind: a bigint or a symbol as written, anything else by its type. */
function describeUnsupported(value: unknown): string {
	if (typeof value === "bigint") return `${value}n`;
	if (typeof value === "symbol") return value.toString();
	return typeof value;
}

function assertNoChecks(
	definition: ZodDefinition,
	schemaName: string,
	path: string,
): void {
	if ((definition.checks?.length ?? 0) > 0) {
		throw unsupported(
			schemaName,
			path,
			`checks on ${JSON.stringify(definition.type)}`,
		);
	}
}

function propertyPath(path: string, key: string): string {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
		? `${path}.${key}`
		: `${path}[${JSON.stringify(key)}]`;
}
