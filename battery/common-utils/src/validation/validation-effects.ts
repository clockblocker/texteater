import type { ParsingIssue, ParsingPath } from "./parsing-error.js";
import {
	failure,
	invalidType,
	type ParseFailure,
	type ParseResult,
	partialFailure,
	prefixIssues,
	success,
} from "./validation-issues.js";

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

export type ValidationEffect =
	| readonly ["array", ArrayConstraintCheck]
	| readonly ["number", NumberConstraintCheck]
	| readonly ["operation", string]
	| readonly ["regex", string, string]
	| readonly ["string", StringConstraintCheck];

type ValidationOperationResult = Readonly<{
	issues?: readonly ParsingIssue[];
	value: unknown;
}>;

export type ValidationOperation = (value: unknown) => ValidationOperationResult;

export type ValidationOperations = Readonly<
	Record<string, ValidationOperation>
>;

// Zod guards its length checks with `when` instead of the abort flag, so they
// run on any non-nullish value with a `length`, even after the base type check
// failed. They compare with JavaScript's operators, so a non-numeric `length`
// can fail, and the issue's origin names the value, not the schema.
/** A value's `length`: a string's own, or an object's, own or inherited. */
function lengthOf(value: unknown): unknown {
	if (typeof value === "string") return value.length;
	if (
		(typeof value === "object" && value !== null) ||
		typeof value === "function"
	)
		return "length" in value ? value.length : undefined;
	return undefined;
}

export function lengthCheckIssues(
	value: unknown,
	check: ArrayConstraintCheck | StringConstraintCheck,
	path: ParsingPath,
): ParsingIssue[] {
	if (value === null || value === undefined) return [];
	let length: unknown;
	try {
		length = lengthOf(value);
	} catch {
		return [];
	}
	if (length === undefined) return [];
	// Zod compares a non-numeric `length` with the same operators.
	const measured = length as number;
	const [kind, size] = check;
	const exact = kind === "length";
	const tooBig = exact
		? measured > size
		: kind === "max" && !(measured <= size);
	const tooSmall = exact
		? measured !== size && !tooBig
		: kind === "min" && !(measured >= size);
	if (!tooBig && !tooSmall) return [];
	const origin = Array.isArray(value)
		? "array"
		: typeof value === "string"
			? "string"
			: "unknown";
	const unit =
		origin === "array" ? "items" : origin === "string" ? "characters" : "";
	const bound = (relation: string) =>
		unit === ""
			? `expected ${origin} to be ${relation}${size}`
			: `expected ${origin} to have ${relation}${size} ${unit}`;
	return [
		tooBig
			? {
					origin,
					code: "too_big",
					maximum: size,
					inclusive: true,
					...(exact ? { exact: true } : {}),
					path: [...path],
					message: `Too big: ${bound("<=")}`,
				}
			: {
					origin,
					code: "too_small",
					minimum: size,
					inclusive: true,
					...(exact ? { exact: true } : {}),
					path: [...path],
					message: `Too small: ${bound(">=")}`,
				},
	];
}

export function parseString(
	checks: readonly StringConstraintCheck[],
	input: unknown,
	path: ParsingPath,
): ParseResult {
	if (typeof input !== "string") {
		const invalid = invalidType("string", input, path);
		return failure(
			[
				...invalid.issues,
				...checks.flatMap((check) =>
					lengthCheckIssues(input, check, path),
				),
			],
			true,
		);
	}
	const issues = checks.flatMap((check) =>
		lengthCheckIssues(input, check, path),
	);
	return issues.length === 0 ? success(input) : partialFailure(issues, input);
}

export function parseNumber(
	checks: readonly NumberConstraintCheck[],
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
					path: [...path],
					message: `Invalid input: expected number, received ${Number.isNaN(input) ? "NaN" : "number"}`,
				},
			],
			true,
		);
	}
	const issues: ParsingIssue[] = [];
	for (const check of checks) {
		issues.push(...numberCheckIssues(input, check, path));
		if (haltsNumber(input, check)) return failure(issues, true, true);
	}
	return issues.length === 0 ? success(input) : partialFailure(issues, input);
}

// Zod's `int` reports a non-integer with `continue: false`.
function haltsNumber(value: number, check: NumberConstraintCheck): boolean {
	return check[0] === "int" && !Number.isInteger(value);
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
				path: [...path],
				message: `Too small: expected int to be >=${Number.MIN_SAFE_INTEGER}`,
				note: "Integers must be within the safe integer range.",
			});
		} else if (Number.isInteger(input)) {
			issues.push({
				origin: "int",
				code: "too_big",
				maximum: Number.MAX_SAFE_INTEGER,
				inclusive: true,
				path: [...path],
				message: `Too big: expected int to be <=${Number.MAX_SAFE_INTEGER}`,
				note: "Integers must be within the safe integer range.",
			});
		} else {
			issues.push({
				expected: "int",
				format: "safeint",
				code: "invalid_type",
				path: [...path],
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
			path: [...path],
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
			path: [...path],
			message: `Too big: expected number to be ${check[2] ? "<=" : "<"}${check[1]}`,
		});
	}
	if (check[0] === "multiple" && input % check[1] !== 0) {
		issues.push({
			code: "not_multiple_of",
			divisor: check[1],
			path: [...path],
			message: `Invalid number: must be a multiple of ${check[1]}`,
		});
	}
	return issues;
}

const regexCache = new WeakMap<ValidationEffect, RegExp>();

function cachedRegExp(
	effect: Extract<ValidationEffect, readonly ["regex", string, string]>,
): RegExp {
	let expression = regexCache.get(effect);
	if (expression === undefined) {
		expression = new RegExp(effect[1], effect[2]);
		regexCache.set(effect, expression);
	}
	expression.lastIndex = 0;
	return expression;
}

type PipeState = {
	value: unknown;
	aborted: boolean;
	halted: boolean;
	issues: ParsingIssue[];
};

function initialPipeState(
	inlineBase: boolean,
	parsed: ParseResult,
	input: unknown,
	effects: readonly ValidationEffect[],
): PipeState | ParseFailure {
	if (parsed.ok) {
		return {
			value: parsed.value,
			aborted: false,
			halted: false,
			issues: [],
		};
	}
	// Only a string, number or array node's own checks follow its base
	// inline; any other base is a reference, which a transform or readonly
	// stage also uses, and Zod skips those stages after any base issue.
	if (!inlineBase && !parsed.aborted) return parsed;
	// After an aborting failure only length checks run, and the base's
	// value has the input's length. The same holds when only length checks
	// remain and the base's value isn't known.
	let value: unknown;
	if (parsed.partial !== undefined) value = parsed.partial.value;
	else if (parsed.aborted || effects.every(isLengthEffect)) value = input;
	else return parsed;
	return {
		value,
		aborted: parsed.aborted,
		halted: parsed.halted,
		issues: [...parsed.issues],
	};
}

function applyPipeEffect(
	effect: ValidationEffect,
	state: PipeState,
	path: ParsingPath,
	operations: ValidationOperations,
): void {
	if (isLengthEffect(effect)) {
		state.issues.push(...lengthCheckIssues(state.value, effect[1], path));
		return;
	}
	if (state.aborted) return;
	if (effect[0] === "operation") {
		const result = requiredOperation(effect[1], operations)(state.value);
		state.value = result.value;
		if (result.issues !== undefined)
			state.issues.push(...prefixIssues(result.issues, path));
		return;
	}
	if (effect[0] === "number") {
		if (typeof state.value !== "number") {
			throw new TypeError(
				"Validation artifact number effect received a non-number value.",
			);
		}
		state.issues.push(...numberCheckIssues(state.value, effect[1], path));
		if (haltsNumber(state.value, effect[1])) {
			state.aborted = true;
			state.halted = true;
		}
		return;
	}
	if (typeof state.value !== "string") {
		throw new TypeError(
			"Validation artifact regex effect received a non-string value.",
		);
	}
	const expression = cachedRegExp(effect);
	if (!expression.test(state.value)) {
		state.issues.push({
			origin: "string",
			code: "invalid_format",
			format: "regex",
			pattern: expression.toString(),
			path: [...path],
			message: `Invalid string: must match pattern ${expression.toString()}`,
		});
	}
}

export function applyPipeEffects(
	inlineBase: boolean,
	parsed: ParseResult,
	input: unknown,
	effects: readonly ValidationEffect[],
	path: ParsingPath,
	operations: ValidationOperations,
): ParseResult {
	const state = initialPipeState(inlineBase, parsed, input, effects);
	if ("ok" in state) return state;

	for (const effect of effects) {
		if (state.halted) break;
		applyPipeEffect(effect, state, path, operations);
	}
	if (state.issues.length === 0) return success(state.value);
	return state.aborted
		? failure(state.issues, state.aborted, state.halted)
		: partialFailure(state.issues, state.value);
}

function isLengthEffect(
	effect: ValidationEffect,
): effect is Extract<ValidationEffect, readonly ["array" | "string", unknown]> {
	return effect[0] === "array" || effect[0] === "string";
}

export function requiredOperation(
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
