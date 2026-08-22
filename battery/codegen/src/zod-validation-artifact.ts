import type { z } from "zod";
import { CodegenError } from "./errors.js";

type ArtifactPrimitive = boolean | null | number | string;
type ArrayConstraintCheck =
	| readonly ["length", number]
	| readonly ["max", number]
	| readonly ["min", number];
type StringConstraintCheck =
	| readonly ["length", number]
	| readonly ["max", number]
	| readonly ["min", number];
type NumberConstraintCheck =
	| readonly ["int"]
	| readonly ["max", number, boolean]
	| readonly ["min", number, boolean]
	| readonly ["multiple", number];
type ValidationEffect =
	| readonly ["array", ArrayConstraintCheck]
	| readonly ["number", NumberConstraintCheck]
	| readonly ["operation", string]
	| readonly ["regex", string, string]
	| readonly ["string", StringConstraintCheck];
type Constraint =
	| readonly ["array", Constraint, readonly ArrayConstraintCheck[]]
	| readonly ["boolean"]
	| readonly ["enum", readonly ArtifactPrimitive[]]
	| readonly ["literal", ArtifactPrimitive]
	| readonly ["null"]
	| readonly ["nullable", Constraint]
	| readonly ["number"]
	| readonly ["number", readonly NumberConstraintCheck[]]
	| readonly ["optional", Constraint]
	| readonly [
			"object",
			Readonly<Record<string, Constraint>>,
			"passthrough" | "strict" | "strip",
	  ]
	| readonly ["pipe", Constraint, readonly ValidationEffect[]]
	| readonly ["preprocess", string, Constraint]
	| readonly ["partial-record", Constraint, Constraint]
	| readonly ["record", Constraint, Constraint]
	| readonly ["ref", string]
	| readonly ["string"]
	| readonly ["string", readonly StringConstraintCheck[]]
	| readonly ["tuple", readonly Constraint[], Constraint?]
	| readonly ["union", readonly Constraint[]]
	| readonly ["unknown"];

type ZodValidationSemanticOperationConstruct =
	| "custom"
	| "contextual"
	| "overwrite"
	| "transform";
export type ZodValidationOperationConstruct =
	ZodValidationSemanticOperationConstruct;

export type ZodValidationOperationRegistration =
	| Readonly<{
			construct: ZodValidationSemanticOperationConstruct;
			error?: (...args: never[]) => unknown;
			implementation: (...args: never[]) => unknown;
			name: string;
			version: number;
	  }>
	| Readonly<{
			construct: "discriminator";
			discriminator: string;
			name: string;
			options: readonly string[];
			schema: z.ZodType;
			version: number;
	  }>
	| Readonly<{
			construct: "readonly";
			name: string;
			schema: z.ZodType;
			version: number;
	  }>
	| Readonly<{
			check: object;
			construct: "regex";
			flags: string;
			message: string;
			name: string;
			schema: z.ZodType;
			source: string;
			version: number;
	  }>;

type ZodValidationOperationSignature = Readonly<{
	discriminator?: Readonly<{
		branches: readonly Constraint[];
		key: string;
		options: readonly string[];
	}>;
	errorMessage?: string;
	regex?: Readonly<{ flags: string; source: string }>;
	version: number;
}>;

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

export type CompileZodValidationArtifactsOptions<
	Schemas extends Readonly<Record<string, z.ZodType>>,
> = Readonly<{
	operations: readonly ZodValidationOperationRegistration[];
	schemas: Schemas;
}>;

export class ZodValidationCompilationError extends CodegenError {
	override readonly name = "ZodValidationCompilationError";
}

type ZodInternals = Readonly<{
	_zod: Readonly<{
		check?: (...args: never[]) => unknown;
		def: ZodDefinition;
		parent?: unknown;
	}>;
}>;

type ZodDefinition = Readonly<{
	catchall?: unknown;
	check?: string;
	checks?: readonly unknown[];
	discriminator?: string;
	element?: unknown;
	entries?: Readonly<Record<string, unknown>>;
	error?: (...args: never[]) => unknown;
	fn?: (...args: never[]) => unknown;
	format?: string;
	getter?: () => unknown;
	in?: unknown;
	innerType?: unknown;
	items?: readonly unknown[];
	keyType?: unknown;
	length?: number;
	inclusive?: boolean;
	maximum?: number;
	minimum?: number;
	options?: readonly unknown[];
	out?: unknown;
	pattern?: RegExp;
	rest?: unknown;
	shape?: Readonly<Record<string, unknown>> | (() => Record<string, unknown>);
	transform?: (...args: never[]) => unknown;
	tx?: (...args: never[]) => unknown;
	type?: string;
	value?: number;
	values?: readonly unknown[];
	valueType?: unknown;
}>;

type CompilationContext = {
	readonly definitions: Record<string, Constraint>;
	readonly nodeIds: WeakMap<object, string>;
	readonly operations: readonly ZodValidationOperationRegistration[];
	readonly operationSignatures: Record<
		string,
		ZodValidationOperationSignature
	>;
	readonly requiredOperations: Set<string>;
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
		roots: Object.freeze(roots) as Readonly<{
			[Key in keyof Schemas]: Constraint;
		}>,
		version: 1 as const,
	}) satisfies ZodValidationArtifactRegistry<Schemas>;
}

function validateOperationRegistrations(
	registrations: readonly ZodValidationOperationRegistration[],
): void {
	const names = new Set<string>();
	for (const registration of registrations) {
		if (registration.name.length === 0) {
			throw new ZodValidationCompilationError(
				"A Zod validation operation has an empty name.",
			);
		}
		if (
			!Number.isSafeInteger(registration.version) ||
			registration.version < 1
		) {
			throw new ZodValidationCompilationError(
				`Zod validation operation ${JSON.stringify(registration.name)} has an invalid version.`,
			);
		}
		if (names.has(registration.name)) {
			throw new ZodValidationCompilationError(
				`Duplicate Zod validation operation name: ${registration.name}.`,
			);
		}
		names.add(registration.name);
	}
}

function compileReference(
	schema: unknown,
	schemaName: string,
	path: string,
	context: CompilationContext,
): Constraint {
	const internals = zodInternals(schema, schemaName, path);
	const identity = schema as object;
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
			assertNoChecks(definition, schemaName, path);
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
			return definition.rest === undefined
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
					];
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

function registeredDiscriminatorOperation(
	schemaIdentity: object,
	discriminator: string,
	options: readonly string[],
	branches: readonly Constraint[],
	schemaName: string,
	path: string,
	context: CompilationContext,
): string {
	const registration = context.operations.find(
		(candidate) =>
			candidate.construct === "discriminator" &&
			candidate.schema === schemaIdentity,
	);
	if (registration?.construct !== "discriminator") {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported discriminated union; no exact schema-identity registration matched.`,
		);
	}
	if (
		registration.discriminator !== discriminator ||
		registration.options.length !== options.length ||
		registration.options.some((option, index) => option !== options[index])
	) {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: registered discriminator metadata does not match the canonical schema discriminator key and options.`,
		);
	}
	context.requiredOperations.add(registration.name);
	context.operationSignatures[registration.name] = {
		discriminator: {
			branches,
			key: registration.discriminator,
			options: [...registration.options],
		},
		version: registration.version,
	};
	return registration.name;
}

function isPartialRecordKey(keyType: unknown): boolean {
	return (
		zodInternals(keyType, "partial record", "$<key>")._zod.parent !==
		undefined
	);
}

function compileChecks(
	checks: readonly unknown[] | undefined,
	schemaName: string,
	path: string,
	context: CompilationContext,
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
				effects.push([
					constraintKind ??
						(() => {
							throw unsupported(
								schemaName,
								path,
								"min_length on a non-string/non-array node",
							);
						})(),
					["min", definition.minimum],
				] as ValidationEffect);
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
							check as object,
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

function registeredRegexOperation(
	schemaIdentity: object,
	checkIdentity: object,
	definition: ZodDefinition,
	pattern: RegExp,
	schemaName: string,
	path: string,
	context: CompilationContext,
): string {
	const registration = context.operations.find(
		(
			candidate,
		): candidate is Extract<
			ZodValidationOperationRegistration,
			{ construct: "regex" }
		> =>
			candidate.construct === "regex" &&
			candidate.schema === schemaIdentity &&
			candidate.check === checkIdentity,
	);
	if (registration === undefined) {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported customized regex check; no explicitly named operation registration matched.`,
		);
	}
	if (
		registration.source !== pattern.source ||
		registration.flags !== pattern.flags
	) {
		throw unsupported(
			schemaName,
			path,
			"customized regex registration pattern metadata mismatch",
		);
	}
	const message = constantErrorMessage(
		{ construct: registration.construct, error: definition.error },
		schemaName,
		path,
	);
	if (registration.message !== message) {
		throw unsupported(
			schemaName,
			path,
			"customized regex registration message mismatch",
		);
	}
	context.requiredOperations.add(registration.name);
	context.operationSignatures[registration.name] = {
		errorMessage: message,
		regex: { flags: registration.flags, source: registration.source },
		version: registration.version,
	};
	return registration.name;
}

function registeredOperation(
	construct: ZodValidationSemanticOperationConstruct,
	implementation: ((...args: never[]) => unknown) | undefined,
	errorCustomization: ((...args: never[]) => unknown) | undefined,
	schemaName: string,
	path: string,
	context: CompilationContext,
): string {
	let constructMatch:
		| Extract<
				ZodValidationOperationRegistration,
				{ implementation: (...args: never[]) => unknown }
		  >
		| undefined;
	for (const candidate of context.operations) {
		if (
			candidate.construct !== "discriminator" &&
			candidate.construct === construct &&
			candidate.implementation === implementation
		) {
			constructMatch = candidate;
			break;
		}
	}
	if (constructMatch === undefined) {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported ${construct} check; no explicitly named operation registration matched.`,
		);
	}
	if (constructMatch.error !== errorCustomization) {
		throw unsupported(
			schemaName,
			path,
			`${construct} check error customization that does not match its named operation registration`,
		);
	}
	const registration = constructMatch;
	context.requiredOperations.add(registration.name);
	context.operationSignatures[registration.name] = {
		...(registration.error === undefined
			? {}
			: {
					errorMessage: constantErrorMessage(
						registration,
						schemaName,
						path,
					),
				}),
		version: registration.version,
	};
	return registration.name;
}

function registeredSchemaOperation(
	construct: "readonly",
	schemaIdentity: object,
	schemaName: string,
	path: string,
	context: CompilationContext,
): string {
	const registration = context.operations.find(
		(
			candidate,
		): candidate is Extract<
			ZodValidationOperationRegistration,
			{ construct: "readonly" }
		> =>
			candidate.construct === construct &&
			candidate.schema === schemaIdentity,
	);
	if (registration === undefined) {
		throw new ZodValidationCompilationError(
			`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported ${construct} node; no explicitly named operation registration matched.`,
		);
	}
	context.requiredOperations.add(registration.name);
	context.operationSignatures[registration.name] = {
		version: registration.version,
	};
	return registration.name;
}

function constantErrorMessage(
	registration: Readonly<{
		construct: string;
		error?: (...args: never[]) => unknown;
	}>,
	schemaName: string,
	path: string,
): string {
	const error = registration.error;
	if (error === undefined) {
		throw new TypeError("Expected an error customization.");
	}
	let results: unknown[];
	try {
		const probe = error as (context?: unknown) => unknown;
		results = [
			probe(),
			probe({ input: "text" }),
			probe({ input: 0 }),
			probe({ input: null }),
		];
	} catch {
		throw unsupported(
			schemaName,
			path,
			`${registration.construct} check error customization that is not a constant message`,
		);
	}
	const messages = results.map(errorMessageFromResult);
	const [message] = messages;
	if (
		message === undefined ||
		messages.some((candidate) => candidate !== message)
	) {
		throw unsupported(
			schemaName,
			path,
			`${registration.construct} check error customization that is not a constant message`,
		);
	}
	return message;
}

function errorMessageFromResult(result: unknown): string | undefined {
	return typeof result === "string"
		? result
		: result !== null &&
				typeof result === "object" &&
				"message" in result &&
				typeof result.message === "string"
			? result.message
			: undefined;
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
		`non-serializable primitive ${String(value)}`,
	);
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

function assertNoErrorCustomization(
	definition: ZodDefinition,
	schemaName: string,
	path: string,
	construct: string,
): void {
	if (definition.error !== undefined) {
		throw unsupported(schemaName, path, `${construct} error customization`);
	}
}

function zodInternals(
	value: unknown,
	schemaName: string,
	path: string,
): ZodInternals {
	if (
		value === null ||
		typeof value !== "object" ||
		!("_zod" in value) ||
		value._zod === null ||
		typeof value._zod !== "object" ||
		!("def" in value._zod)
	) {
		throw unsupported(schemaName, path, "value without Zod internals");
	}
	return value as ZodInternals;
}

function propertyPath(path: string, key: string): string {
	return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
		? `${path}.${key}`
		: `${path}[${JSON.stringify(key)}]`;
}

function unsupported(
	schemaName: string,
	path: string,
	construct: string,
): ZodValidationCompilationError {
	return new ZodValidationCompilationError(
		`Cannot compile schema ${JSON.stringify(schemaName)} at ${path}: unsupported ${construct}.`,
	);
}
