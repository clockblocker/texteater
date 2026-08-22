import {
	ParsingError,
	type ParsingIssue,
	type ParsingPath,
} from "./parsing-error.js";

export type StringConstraintCheck =
	| readonly ["length", number]
	| readonly ["max", number]
	| readonly ["min", number];

export type NumberConstraintCheck =
	| readonly ["int"]
	| readonly ["max", number, boolean]
	| readonly ["min", number, boolean]
	| readonly ["multiple", number];

export type ArrayConstraintCheck =
	| readonly ["length", number]
	| readonly ["max", number]
	| readonly ["min", number];

export type ArtifactPrimitive = boolean | null | number | string;

export type ObjectUnknownKeyPolicy = "passthrough" | "strict" | "strip";

export type ValidationEffect =
	| readonly ["array", ArrayConstraintCheck]
	| readonly ["number", NumberConstraintCheck]
	| readonly ["operation", string]
	| readonly ["regex", string, string]
	| readonly ["string", StringConstraintCheck];

export type ValidationOperationResult = Readonly<{
	issues?: readonly ParsingIssue[];
	value: unknown;
}>;

export type ValidationOperation = (value: unknown) => ValidationOperationResult;

export type ValidationOperations = Readonly<
	Record<string, ValidationOperation>
>;

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

export type ObjectConstraintShape = Readonly<Record<string, Constraint>>;

export interface ValidationArtifact<Output = unknown> {
	readonly version: 1;
	readonly root: Constraint;
	readonly definitions?: Readonly<Record<string, Constraint>>;
	readonly "~output"?: Output;
}

interface ParseSuccess {
	readonly ok: true;
	readonly value: unknown;
}

interface ParseFailure {
	readonly aborted: boolean;
	readonly ok: false;
	readonly issues: ParsingIssue[];
}

type ParseResult = ParseFailure | ParseSuccess;

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
			return parseNumber(constraint, input, path);
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
			const referenced = definitions[constraint[1]];
			if (referenced === undefined) {
				throw new ReferenceError(
					`Unknown validation artifact reference: ${constraint[1]}`,
				);
			}
			return parseConstraint(
				referenced,
				input,
				path,
				definitions,
				operations,
			);
		}
		case "string":
			return parseString(constraint, input, path);
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
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		return invalidType("record", input, path);
	}
	const output: Record<string, unknown> = {};
	const issues: ParsingIssue[] = [];
	let aborted = false;
	const fixedKeys =
		constraint[0] === "record"
			? fixedRecordKeys(constraint[1], definitions)
			: undefined;
	if (fixedKeys !== undefined) {
		for (const key of fixedKeys) {
			const parsedValue = parseConstraint(
				constraint[2],
				Reflect.get(input, key),
				[...path, key],
				definitions,
				operations,
			);
			if (!parsedValue.ok) {
				aborted ||= parsedValue.aborted;
				issues.push(...parsedValue.issues);
				continue;
			}
			output[key] = parsedValue.value;
		}
		const unknownKeys = Object.keys(input).filter(
			(key) => !fixedKeys.includes(key),
		);
		if (unknownKeys.length > 0) {
			issues.push({
				code: "unrecognized_keys",
				keys: unknownKeys,
				path,
				message:
					unknownKeys.length === 1
						? `Unrecognized key: ${JSON.stringify(unknownKeys[0])}`
						: `Unrecognized keys: ${unknownKeys.map((key) => JSON.stringify(key)).join(", ")}`,
			});
		}
		return issues.length === 0 ? success(output) : failure(issues, aborted);
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
		const parsedValue = parseConstraint(
			constraint[2],
			value,
			[...path, key],
			definitions,
			operations,
		);
		if (!parsedValue.ok) {
			aborted ||= parsedValue.aborted;
			issues.push(...parsedValue.issues);
			continue;
		}
		output[String(parsedKey.value)] = parsedValue.value;
	}
	return issues.length === 0 ? success(output) : failure(issues, aborted);
}

function fixedRecordKeys(
	constraint: Constraint,
	definitions: Readonly<Record<string, Constraint>>,
): string[] | undefined {
	if (constraint[0] === "ref") {
		const referenced = definitions[constraint[1]];
		if (referenced === undefined) {
			throw new ReferenceError(
				`Unknown validation artifact reference: ${constraint[1]}`,
			);
		}
		return fixedRecordKeys(referenced, definitions);
	}
	if (constraint[0] === "enum") {
		return constraint[1].every((value) => typeof value === "string")
			? [...constraint[1]]
			: undefined;
	}
	if (constraint[0] === "literal" && typeof constraint[1] === "string") {
		return [constraint[1]];
	}
	return undefined;
}

function parseArray(
	constraint: Extract<Constraint, readonly ["array", unknown, unknown]>,
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	if (!Array.isArray(input)) return invalidType("array", input, path);
	const output: unknown[] = [];
	const issues: ParsingIssue[] = [];
	let aborted = false;
	for (const [index, value] of input.entries()) {
		const child = parseConstraint(
			constraint[1],
			value,
			[...path, index],
			definitions,
			operations,
		);
		if (child.ok) output.push(child.value);
		else {
			aborted ||= child.aborted;
			issues.push(...child.issues);
		}
	}
	for (const check of constraint[2]) {
		issues.push(...arrayCheckIssues(input, check, path));
	}
	return issues.length === 0 ? success(output) : failure(issues, aborted);
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
				path,
				message: `Too small: expected array to have >=${items.length} items`,
			},
		]);
	}
	const output: unknown[] = [];
	const issues: ParsingIssue[] = [];
	let aborted = false;
	if (rest === undefined && input.length > items.length) {
		issues.push({
			origin: "array",
			code: "too_big",
			maximum: items.length,
			inclusive: true,
			path,
			message: `Too big: expected array to have <=${items.length} items`,
		});
	}
	if (rest !== undefined) {
		for (let index = items.length; index < input.length; index += 1) {
			const child = parseConstraint(
				rest,
				input[index],
				[...path, index],
				definitions,
				operations,
			);
			if (child.ok) output[index] = child.value;
			else {
				aborted ||= child.aborted;
				issues.push(...child.issues);
			}
		}
	}
	for (const [index, item] of items.entries()) {
		const child = parseConstraint(
			item,
			input[index],
			[...path, index],
			definitions,
			operations,
		);
		if (child.ok) output[index] = child.value;
		else {
			aborted ||= child.aborted;
			issues.push(...child.issues);
		}
	}
	return issues.length === 0 ? success(output) : failure(issues, aborted);
}

function arrayCheckIssues(
	input: readonly unknown[],
	check: ArrayConstraintCheck,
	path: ParsingPath,
): ParsingIssue[] {
	const [kind, size] = check;
	const issues: ParsingIssue[] = [];
	if ((kind === "min" || kind === "length") && input.length < size) {
		issues.push({
			origin: "array",
			code: "too_small",
			minimum: size,
			inclusive: true,
			...(kind === "length" ? { exact: true } : {}),
			path,
			message: `Too small: expected array to have >=${size} items`,
		});
	}
	if ((kind === "max" || kind === "length") && input.length > size) {
		issues.push({
			origin: "array",
			code: "too_big",
			maximum: size,
			inclusive: true,
			...(kind === "length" ? { exact: true } : {}),
			path,
			message: `Too big: expected array to have <=${size} items`,
		});
	}
	return issues;
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

function parseNumber(
	constraint: Extract<Constraint, readonly ["number", ...unknown[]]>,
	input: unknown,
	path: ParsingPath,
): ParseResult {
	if (typeof input !== "number") return invalidType("number", input, path);
	if (!Number.isFinite(input)) {
		return failure(
			[
				{
					expected: "number",
					code: "invalid_type",
					received: Number.isNaN(input) ? "NaN" : "Infinity",
					path,
					message: `Invalid input: expected number, received ${Number.isNaN(input) ? "NaN" : "number"}`,
				},
			],
			true,
		);
	}
	const issues: ParsingIssue[] = [];
	for (const check of constraint[1] ?? []) {
		issues.push(...numberCheckIssues(input, check, path));
	}
	return issues.length === 0 ? success(input) : failure(issues);
}

function numberCheckIssues(
	input: number,
	check: NumberConstraintCheck,
	path: ParsingPath,
): ParsingIssue[] {
	const issues: ParsingIssue[] = [];
	if (check[0] === "int" && !Number.isSafeInteger(input)) {
		if (Number.isInteger(input) && input < Number.MIN_SAFE_INTEGER) {
			issues.push({
				origin: "int",
				code: "too_small",
				minimum: Number.MIN_SAFE_INTEGER,
				inclusive: true,
				path,
				message: `Too small: expected int to be >=${Number.MIN_SAFE_INTEGER}`,
				note: "Integers must be within the safe integer range.",
			});
		} else if (Number.isInteger(input)) {
			issues.push({
				origin: "int",
				code: "too_big",
				maximum: Number.MAX_SAFE_INTEGER,
				inclusive: true,
				path,
				message: `Too big: expected int to be <=${Number.MAX_SAFE_INTEGER}`,
				note: "Integers must be within the safe integer range.",
			});
		} else {
			issues.push({
				expected: "int",
				format: "safeint",
				code: "invalid_type",
				path,
				message: "Invalid input: expected int, received number",
			});
		}
	}
	if (
		check[0] === "min" &&
		(check[2] ? input < check[1] : input <= check[1])
	) {
		issues.push({
			origin: "number",
			code: "too_small",
			minimum: check[1],
			inclusive: check[2],
			path,
			message: `Too small: expected number to be ${check[2] ? ">=" : ">"}${check[1]}`,
		});
	}
	if (
		check[0] === "max" &&
		(check[2] ? input > check[1] : input >= check[1])
	) {
		issues.push({
			origin: "number",
			code: "too_big",
			maximum: check[1],
			inclusive: check[2],
			path,
			message: `Too big: expected number to be ${check[2] ? "<=" : "<"}${check[1]}`,
		});
	}
	if (check[0] === "multiple" && input % check[1] !== 0) {
		issues.push({
			code: "not_multiple_of",
			divisor: check[1],
			path,
			message: `Invalid number: must be a multiple of ${check[1]}`,
		});
	}
	return issues;
}

function parseUnion(
	options: readonly Constraint[],
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	const nonAborted: ParseFailure[] = [];
	const errors: ParsingIssue[][] = [];
	for (const option of options) {
		const result = parseConstraint(
			option,
			input,
			[],
			definitions,
			operations,
		);
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
				errors,
				path,
				message: "Invalid input",
			},
		],
		true,
	);
}

function parsePipe(
	constraint: Extract<Constraint, readonly ["pipe", unknown, unknown]>,
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	const parsed = parseConstraint(
		constraint[1],
		input,
		path,
		definitions,
		operations,
	);
	if (!parsed.ok) return parsed;

	let value = parsed.value;
	const issues: ParsingIssue[] = [];
	for (const effect of constraint[2]) {
		if (effect[0] === "operation") {
			const result = requiredOperation(effect[1], operations)(value);
			value = result.value;
			if (result.issues !== undefined)
				issues.push(...prefixIssues(result.issues, path));
			continue;
		}
		if (effect[0] === "string") {
			if (typeof value !== "string") {
				throw new TypeError(
					"Validation artifact string effect received a non-string value.",
				);
			}
			issues.push(...stringCheckIssues(value, effect[1], path));
			continue;
		}
		if (effect[0] === "array") {
			if (!Array.isArray(value)) {
				throw new TypeError(
					"Validation artifact array effect received a non-array value.",
				);
			}
			issues.push(...arrayCheckIssues(value, effect[1], path));
			continue;
		}
		if (effect[0] === "number") {
			if (typeof value !== "number") {
				throw new TypeError(
					"Validation artifact number effect received a non-number value.",
				);
			}
			issues.push(...numberCheckIssues(value, effect[1], path));
			continue;
		}
		if (typeof value !== "string") {
			throw new TypeError(
				"Validation artifact regex effect received a non-string value.",
			);
		}
		const expression = new RegExp(effect[1], effect[2]);
		if (!expression.test(value)) {
			issues.push({
				origin: "string",
				code: "invalid_format",
				format: "regex",
				pattern: expression.toString(),
				path,
				message: `Invalid string: must match pattern ${expression.toString()}`,
			});
		}
	}
	return issues.length === 0 ? success(value) : failure(issues);
}

function requiredOperation(
	name: string,
	operations: ValidationOperations,
): ValidationOperation {
	const operation = operations[name];
	if (operation === undefined)
		throw new ReferenceError(
			`Unknown validation artifact operation: ${name}`,
		);
	return operation;
}

function prefixIssues(
	issues: readonly ParsingIssue[],
	path: ParsingPath,
): ParsingIssue[] {
	return issues.map(
		(issue) =>
			({ ...issue, path: [...path, ...issue.path] }) as ParsingIssue,
	);
}

function parseString(
	constraint: Extract<Constraint, readonly ["string", ...unknown[]]>,
	input: unknown,
	path: ParsingPath,
): ParseResult {
	if (typeof input !== "string") {
		const invalid = invalidType("string", input, path);
		const lengthIssues = (constraint[1] ?? []).flatMap((check) =>
			crossTypeStringCheckIssues(input, check, path),
		);
		return failure([...invalid.issues, ...lengthIssues], true);
	}
	const issues: ParsingIssue[] = [];
	for (const check of constraint[1] ?? []) {
		issues.push(...stringCheckIssues(input, check, path));
	}
	return issues.length === 0 ? success(input) : failure(issues);
}

function crossTypeStringCheckIssues(
	input: unknown,
	check: StringConstraintCheck,
	path: ParsingPath,
): ParsingIssue[] {
	if (Array.isArray(input)) return arrayCheckIssues(input, check, path);
	if (
		input === null ||
		(typeof input !== "object" && typeof input !== "function")
	)
		return [];
	let length: unknown;
	try {
		length = Reflect.get(input, "length");
	} catch {
		return [];
	}
	if (length === undefined) return [];
	const [kind, size] = check;
	if ((kind === "min" || kind === "length") && (length as number) < size) {
		return [
			{
				origin: "unknown",
				code: "too_small",
				minimum: size,
				inclusive: true,
				...(kind === "length" ? { exact: true } : {}),
				path,
				message: `Too small: expected unknown to be >=${size}`,
			},
		];
	}
	if ((kind === "max" || kind === "length") && (length as number) > size) {
		return [
			{
				origin: "unknown",
				code: "too_big",
				maximum: size,
				inclusive: true,
				...(kind === "length" ? { exact: true } : {}),
				path,
				message: `Too big: expected unknown to be <=${size}`,
			},
		];
	}
	if (kind === "length" && length !== size) {
		return [
			{
				origin: "unknown",
				code: "too_big",
				maximum: size,
				inclusive: true,
				exact: true,
				path,
				message: `Too big: expected unknown to be <=${size}`,
			},
		];
	}
	return [];
}

function stringCheckIssues(
	input: string,
	check: StringConstraintCheck,
	path: ParsingPath,
): ParsingIssue[] {
	const [kind, size] = check;
	const issues: ParsingIssue[] = [];
	if (kind === "min" && input.length < size) {
		issues.push({
			origin: "string",
			code: "too_small",
			minimum: size,
			inclusive: true,
			path,
			message: `Too small: expected string to have >=${size} characters`,
		});
	}
	if (kind === "max" && input.length > size) {
		issues.push({
			origin: "string",
			code: "too_big",
			maximum: size,
			inclusive: true,
			path,
			message: `Too big: expected string to have <=${size} characters`,
		});
	}
	if (kind === "length" && input.length !== size) {
		issues.push(
			input.length < size
				? {
						origin: "string",
						code: "too_small",
						minimum: size,
						inclusive: true,
						exact: true,
						path,
						message: `Too small: expected string to have >=${size} characters`,
					}
				: {
						origin: "string",
						code: "too_big",
						maximum: size,
						inclusive: true,
						exact: true,
						path,
						message: `Too big: expected string to have <=${size} characters`,
					},
		);
	}
	return issues;
}

function parseObject(
	constraint: Extract<Constraint, readonly ["object", unknown, unknown]>,
	input: unknown,
	path: ParsingPath,
	definitions: Readonly<Record<string, Constraint>>,
	operations: ValidationOperations,
): ParseResult {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		return invalidType("object", input, path);
	}
	const source = input as Record<string, unknown>;
	const [, shape, unknownKeyPolicy] = constraint;
	const output: Record<string, unknown> =
		unknownKeyPolicy === "passthrough" ? { ...source } : {};
	const issues: ParsingIssue[] = [];
	let aborted = false;
	for (const [key, childConstraint] of Object.entries(shape)) {
		const child = parseConstraint(
			childConstraint,
			source[key],
			[...path, key],
			definitions,
			operations,
		);
		if (child.ok) {
			if (key in source) output[key] = child.value;
		} else {
			aborted ||= child.aborted;
			issues.push(...child.issues);
		}
	}
	if (unknownKeyPolicy === "strict") {
		const keys = Object.keys(source).filter((key) => !(key in shape));
		if (keys.length > 0) {
			aborted = true;
			issues.push({
				code: "unrecognized_keys",
				keys,
				path,
				message:
					keys.length === 1
						? `Unrecognized key: ${JSON.stringify(keys[0])}`
						: `Unrecognized keys: ${keys.map((key) => JSON.stringify(key)).join(", ")}`,
			});
		}
	}
	return issues.length === 0 ? success(output) : failure(issues, aborted);
}

function invalidType(
	expected:
		| "array"
		| "boolean"
		| "null"
		| "number"
		| "object"
		| "record"
		| "string"
		| "tuple",
	input: unknown,
	path: ParsingPath,
): ParseFailure {
	return failure(
		[
			{
				expected,
				code: "invalid_type",
				path,
				message: `Invalid input: expected ${expected}, received ${inputType(input)}`,
			},
		],
		true,
	);
}

function invalidValue(
	values: readonly ArtifactPrimitive[],
	_input: unknown,
	path: ParsingPath,
): ParseFailure {
	const copiedValues = [...values];
	return failure(
		[
			{
				code: "invalid_value",
				values: copiedValues,
				path,
				message:
					copiedValues.length === 1
						? `Invalid input: expected ${formatPrimitive(copiedValues[0])}`
						: `Invalid option: expected one of ${copiedValues.map(formatPrimitive).join("|")}`,
			},
		],
		true,
	);
}

function formatPrimitive(value: ArtifactPrimitive | undefined): string {
	return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function inputType(input: unknown): string {
	if (input === null) return "null";
	if (Array.isArray(input)) return "array";
	if (typeof input === "number" && Number.isNaN(input)) return "NaN";
	return typeof input;
}

function failure(issues: ParsingIssue[], aborted = false): ParseFailure {
	return { aborted, ok: false, issues };
}

function success(value: unknown): ParseSuccess {
	return { ok: true, value };
}
