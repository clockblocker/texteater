import { isRecord } from "../is-record.js";
import {
	ParsingError,
	type ParsingIssue,
	type ParsingPath,
} from "./parsing-error.js";
import {
	type ArrayConstraintCheck,
	applyPipeEffects,
	lengthCheckIssues,
	type NumberConstraintCheck,
	parseNumber,
	parseString,
	requiredOperation,
	type StringConstraintCheck,
	type ValidationEffect,
	type ValidationOperation,
	type ValidationOperations,
} from "./validation-effects.js";
import {
	type ArtifactPrimitive,
	failure,
	invalidType,
	invalidValue,
	issuesOf,
	type ParseFailure,
	type ParseResult,
	partialFailure,
	prefixIssues,
	success,
	unrecognizedKeysIssue,
} from "./validation-issues.js";

export type {
	ArtifactPrimitive,
	ValidationEffect,
	ValidationOperation,
	ValidationOperations,
};

type ObjectUnknownKeyPolicy = "passthrough" | "strict" | "strip";

export type Constraint =
	| readonly ["array", Constraint, readonly ArrayConstraintCheck[]]
	| readonly ["boolean"]
	| readonly ["enum", readonly ArtifactPrimitive[]]
	| readonly ["literal", ArtifactPrimitive]
	| readonly ["null"]
	| readonly ["nullable", Constraint]
	| readonly ["number"]
	| readonly ["number", readonly NumberConstraintCheck[]]
	| readonly ["object", ObjectConstraintShape, ObjectUnknownKeyPolicy]
	| readonly ["optional", Constraint]
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

type ObjectConstraintShape = Readonly<Record<string, Constraint>>;

export interface ValidationArtifact<Output = unknown> {
	readonly version: 1;
	readonly root: Constraint;
	readonly definitions?: Readonly<Record<string, Constraint>>;
	readonly "~output"?: Output;
}

export function parseValidationArtifact<Output>(
	artifact: ValidationArtifact<Output>,
	input: unknown,
	operations: ValidationOperations = {},
): Output | ParsingError<Output> {
	if (artifact.version !== 1) {
		throw new RangeError(
			`Unsupported validation artifact version: ${String(artifact.version)}`,
		);
	}
	const result = parseConstraint(
		artifact.root,
		input,
		[],
		artifact.definitions ?? {},
		operations,
	);
	// A successful parse returns the artifact's output, which `Output` names.
	return result.ok
		? (result.value as Output)
		: new ParsingError<Output>(result.issues);
}

function parseConstraint(
	constraint: Constraint,
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	switch (constraint[0]) {
		case "array":
			return parseArray(constraint, input, path, definitions, operations);
		case "boolean":
			return typeof input === "boolean"
				? success(input)
				: invalidType("boolean", input, path);
		case "enum":
			return parseEnum(constraint[1], input, path);
		case "literal":
			return Object.is(input, constraint[1])
				? success(input)
				: invalidValue([constraint[1]], input, path);
		case "null":
			return input === null
				? success(null)
				: invalidType("null", input, path);
		case "nullable":
			return input === null
				? success(null)
				: parseConstraint(
						constraint[1],
						input,
						path,
						definitions,
						operations,
					);
		case "number":
			return parseNumber(constraint[1] ?? [], input, path);
		case "object":
			return parseObject(
				constraint,
				input,
				path,
				definitions,
				operations,
			);
		case "optional":
			return input === undefined
				? success(undefined)
				: parseConstraint(
						constraint[1],
						input,
						path,
						definitions,
						operations,
					);
		case "pipe":
			return parsePipe(constraint, input, path, definitions, operations);
		case "preprocess": {
			const result = requiredOperation(constraint[1], operations)(input);
			if ((result.issues?.length ?? 0) > 0) {
				return failure(prefixIssues(result.issues ?? [], path));
			}
			return parseConstraint(
				constraint[2],
				result.value,
				path,
				definitions,
				operations,
			);
		}
		case "partial-record":
		case "record":
			return parseRecord(
				constraint,
				input,
				path,
				definitions,
				operations,
			);
		case "ref": {
			return parseConstraint(
				resolveRequiredDefinition(constraint[1], definitions),
				input,
				path,
				definitions,
				operations,
			);
		}
		case "string":
			return parseString(constraint[1] ?? [], input, path);
		case "tuple":
			return parseTuple(constraint, input, path, definitions, operations);
		case "union":
			return parseUnion(
				constraint[1],
				input,
				path,
				definitions,
				operations,
			);
		case "unknown":
			return success(input);
	}
}

function parseRecord(
	constraint: Extract<
		Constraint,
		readonly ["partial-record" | "record", unknown, unknown]
	>,
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	if (!isRecord(input)) {
		return invalidType("record", input, path);
	}
	const output: Record<string, unknown> = {};
	const issues: ParsingIssue[] = [];
	let aborted = false;
	let halted = false;
	const fixedKeys =
		constraint[0] === "record"
			? fixedRecordKeys(constraint[1], definitions)
			: undefined;
	if (fixedKeys !== undefined) {
		for (const key of fixedKeys.keys) {
			path.push(key);
			const parsedValue = parseConstraint(
				constraint[2],
				Reflect.get(input, key),
				path,
				definitions,
				operations,
			);
			path.pop();
			if (!parsedValue.ok) {
				aborted ||= parsedValue.aborted;
				halted ||= parsedValue.halted;
				issues.push(...parsedValue.issues);
				continue;
			}
			output[key] = parsedValue.value;
		}
		const unknownKeys = Object.keys(input).filter(
			(key) => !fixedKeys.keySet.has(key),
		);
		if (unknownKeys.length > 0) {
			issues.push(unrecognizedKeysIssue(unknownKeys, path));
		}
		return issues.length === 0
			? success(output)
			: failure(issues, aborted, halted);
	}
	for (const [key, value] of Object.entries(input)) {
		const parsedKey = parseConstraint(
			constraint[1],
			key,
			[],
			definitions,
			operations,
		);
		if (!parsedKey.ok) {
			aborted ||= parsedKey.aborted;
			issues.push({
				code: "invalid_key",
				origin: "record",
				issues: parsedKey.issues,
				path: [...path, key],
				message: "Invalid key in record",
			});
			continue;
		}
		path.push(key);
		const parsedValue = parseConstraint(
			constraint[2],
			value,
			path,
			definitions,
			operations,
		);
		path.pop();
		if (!parsedValue.ok) {
			aborted ||= parsedValue.aborted;
			halted ||= parsedValue.halted;
			issues.push(...parsedValue.issues);
			continue;
		}
		output[String(parsedKey.value)] = parsedValue.value;
	}
	return issues.length === 0
		? success(output)
		: failure(issues, aborted, halted);
}

type FixedRecordKeySet = Readonly<{
	keys: readonly string[];
	keySet: ReadonlySet<string>;
}>;

const fixedRecordKeysCache = new WeakMap<
	Readonly<Record<string, Constraint>>,
	WeakMap<Constraint, FixedRecordKeySet | null>
>();

function fixedRecordKeys(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
): FixedRecordKeySet | undefined {
	let cache = fixedRecordKeysCache.get(definitions);
	if (cache === undefined) {
		cache = new WeakMap();
		fixedRecordKeysCache.set(definitions, cache);
	}
	const cached = cache.get(constraint);
	if (cached !== undefined) return cached ?? undefined;
	const resolved = resolveRequiredReference(constraint, definitions);
	let result: FixedRecordKeySet | null = null;
	if (
		resolved[0] === "enum" &&
		resolved[1].every((value) => typeof value === "string")
	) {
		const keys = [...resolved[1]];
		result = { keys, keySet: new Set(keys) };
	} else if (resolved[0] === "literal" && typeof resolved[1] === "string") {
		const keys = [resolved[1]];
		result = { keys, keySet: new Set(keys) };
	}
	cache.set(constraint, result);
	return result ?? undefined;
}

function parseArray(
	constraint: Extract<Constraint, readonly ["array", unknown, unknown]>,
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	if (!Array.isArray(input)) {
		const invalid = invalidType("array", input, path);
		return failure(
			[
				...invalid.issues,
				...constraint[2].flatMap((check) =>
					lengthCheckIssues(input, check, path),
				),
			],
			true,
		);
	}
	const output: unknown[] = [];
	const issues: ParsingIssue[] = [];
	let aborted = false;
	let halted = false;
	let partial = true;
	for (const [index, value] of input.entries()) {
		path.push(index);
		const child = parseConstraint(
			constraint[1],
			value,
			path,
			definitions,
			operations,
		);
		path.pop();
		if (child.ok) output.push(child.value);
		else {
			aborted ||= child.aborted;
			halted ||= child.halted;
			issues.push(...child.issues);
			if (child.partial === undefined) partial = false;
			output.push(child.partial?.value);
		}
	}
	if (!halted)
		for (const check of constraint[2])
			issues.push(...lengthCheckIssues(input, check, path));
	if (issues.length === 0) return success(output);
	return aborted || !partial
		? failure(issues, aborted, halted)
		: partialFailure(issues, output);
}

function parseTuple(
	constraint: Extract<Constraint, readonly ["tuple", ...unknown[]]>,
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	if (!Array.isArray(input)) return invalidType("tuple", input, path);
	const items = constraint[1];
	const rest = constraint[2];
	if (rest === undefined && input.length < items.length) {
		return failure([
			{
				origin: "array",
				code: "too_small",
				minimum: items.length,
				inclusive: true,
				path: [...path],
				message: `Too small: expected array to have >=${items.length} items`,
			},
		]);
	}
	const output: unknown[] = [];
	const issues: ParsingIssue[] = [];
	let aborted = false;
	let halted = false;
	if (rest === undefined && input.length > items.length) {
		issues.push({
			origin: "array",
			code: "too_big",
			maximum: items.length,
			inclusive: true,
			path: [...path],
			message: `Too big: expected array to have <=${items.length} items`,
		});
	}
	if (rest !== undefined) {
		for (let index = items.length; index < input.length; index += 1) {
			path.push(index);
			const child = parseConstraint(
				rest,
				input[index],
				path,
				definitions,
				operations,
			);
			path.pop();
			if (child.ok) output[index] = child.value;
			else {
				aborted ||= child.aborted;
				halted ||= child.halted;
				issues.push(...child.issues);
			}
		}
	}
	for (const [index, item] of items.entries()) {
		path.push(index);
		const child = parseConstraint(
			item,
			input[index],
			path,
			definitions,
			operations,
		);
		path.pop();
		if (child.ok) output[index] = child.value;
		else {
			aborted ||= child.aborted;
			halted ||= child.halted;
			issues.push(...child.issues);
		}
	}
	return issues.length === 0
		? success(output)
		: failure(issues, aborted, halted);
}

function parseEnum(
	values: readonly ArtifactPrimitive[],
	input: unknown,
	path: ParsingPath,
): ParseResult {
	return values.some((value) => Object.is(value, input))
		? success(input)
		: invalidValue(values, input, path);
}

// An option that `rulesOut` rejects can only fail with an aborted result, so
// it can't be the union's match and never counts among the non-aborted
// failures. It is skipped, and parsed in full only when its issues go into an
// `invalid_union`.
function parseUnion(
	options: readonly Constraint[],
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	const nonAborted: ParseFailure[] = [];
	const errors: (ParsingIssue[] | undefined)[] = [];
	const parseOption = (option: Constraint) =>
		parseConstraint(option, input, [], definitions, operations);
	for (const option of options) {
		if (rulesOut(option, input, definitions)) {
			errors.push(undefined);
			continue;
		}
		const result = parseOption(option);
		if (result.ok) return result;
		if (!result.aborted) nonAborted.push(result);
		errors.push(result.issues);
	}
	const selected = nonAborted[0];
	if (nonAborted.length === 1 && selected !== undefined) {
		return failure(prefixIssues(selected.issues, path));
	}
	return failure(
		[
			{
				code: "invalid_union",
				errors: options.map(
					(option, index) =>
						errors[index] ?? issuesOf(parseOption(option)),
				),
				path: [...path],
				message: "Invalid input",
			},
		],
		true,
	);
}

/** A field an object option fixes to a literal or an enum of primitives. */
type Discriminant = readonly [
	key: string,
	values: readonly ArtifactPrimitive[],
];

const discriminantCache = new WeakMap<
	Readonly<Record<string, Constraint>>,
	WeakMap<Constraint, readonly Discriminant[]>
>();

/**
 * Whether parsing `option` must fail with an aborted result: the option is an
 * object, through references, and the input isn't a record or misses one of
 * its literal or enum fields. `parseObject` aborts on either.
 */
function rulesOut(
	option: Constraint,
	input: unknown,
	definitions: Readonly<Record<string, Constraint>>,
): boolean {
	const discriminants = discriminantsOf(option, definitions);
	if (discriminants === undefined) return false;
	if (!isRecord(input)) return true;
	return discriminants.some(
		([key, values]) =>
			!values.some((value) => Object.is(value, input[key])),
	);
}

function discriminantsOf(
	option: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
): readonly Discriminant[] | undefined {
	const object = resolveReference(option, definitions);
	if (object?.[0] !== "object") return undefined;
	let cache = discriminantCache.get(definitions);
	if (cache === undefined) {
		cache = new WeakMap();
		discriminantCache.set(definitions, cache);
	}
	const cached = cache.get(object);
	if (cached !== undefined) return cached;
	const discriminants: Discriminant[] = [];
	for (const [key, field] of Object.entries(object[1])) {
		const resolved = resolveReference(field, definitions);
		// Parsing an unknown reference throws, so the option is parsed to throw.
		if (resolved === undefined) return undefined;
		if (resolved[0] === "literal") discriminants.push([key, [resolved[1]]]);
		else if (resolved[0] === "enum") discriminants.push([key, resolved[1]]);
	}
	cache.set(object, discriminants);
	return discriminants;
}

/** The constraint a chain of references names, or undefined if one is unknown. */
function resolveReference(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
): Constraint | undefined {
	let resolved: Constraint | undefined = constraint;
	while (resolved?.[0] === "ref") resolved = definitions[resolved[1]];
	return resolved;
}

function resolveRequiredDefinition(
	name: string,
	definitions: Readonly<Record<string, Constraint>>,
): Constraint {
	const referenced = definitions[name];
	if (referenced === undefined) {
		throw new ReferenceError(
			`Unknown validation artifact reference: ${name}`,
		);
	}
	return referenced;
}

function resolveRequiredReference(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
): Constraint {
	let resolved = constraint;
	while (resolved[0] === "ref") {
		resolved = resolveRequiredDefinition(resolved[1], definitions);
	}
	return resolved;
}

function parsePipe(
	constraint: Extract<Constraint, readonly ["pipe", unknown, unknown]>,
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	const [, base, effects] = constraint;
	const parsed = parseConstraint(base, input, path, definitions, operations);
	const inlineBase =
		base[0] === "string" || base[0] === "number" || base[0] === "array";
	return applyPipeEffects(
		inlineBase,
		parsed,
		input,
		effects,
		path,
		operations,
	);
}

function parseObject(
	constraint: Extract<Constraint, readonly ["object", unknown, unknown]>,
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	if (!isRecord(input)) return invalidType("object", input, path);
	const source = input;
	const [, shape, unknownKeyPolicy] = constraint;
	const output: Record<string, unknown> =
		unknownKeyPolicy === "passthrough" ? { ...source } : {};
	const issues: ParsingIssue[] = [];
	let aborted = false;
	let halted = false;
	for (const [key, childConstraint] of Object.entries(shape)) {
		path.push(key);
		const child = parseConstraint(
			childConstraint,
			source[key],
			path,
			definitions,
			operations,
		);
		path.pop();
		if (child.ok) {
			if (key in source) output[key] = child.value;
		} else {
			aborted ||= child.aborted;
			halted ||= child.halted;
			issues.push(...child.issues);
		}
	}
	if (unknownKeyPolicy === "strict") {
		const keys = Object.keys(source).filter((key) => !(key in shape));
		if (keys.length > 0) {
			aborted = true;
			issues.push(unrecognizedKeysIssue(keys, path));
		}
	}
	return issues.length === 0
		? success(output)
		: failure(issues, aborted, halted);
}
