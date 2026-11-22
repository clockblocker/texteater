import type { ParsingIssue, ParsingPath } from "./parsing-error.js";

export type ArtifactPrimitive = boolean | null | number | string;

interface ParseSuccess {
	readonly ok: true;
	readonly value: unknown;
}

export interface ParseFailure {
	// Zod's abort states: an aborted payload skips its remaining checks except
	// length checks; a halted one (an issue with `continue: false`, such as a
	// non-integer for `int`) skips those too, in every enclosing node.
	readonly aborted: boolean;
	readonly halted: boolean;
	readonly ok: false;
	readonly issues: ParsingIssue[];
	// The value Zod's payload holds after a non-aborting failure of a string,
	// number or array node, which the node's remaining checks still receive.
	readonly partial?: Readonly<{ value: unknown }>;
}

export type ParseResult = ParseFailure | ParseSuccess;

export function issuesOf(result: ParseResult): ParsingIssue[] {
	return result.ok ? [] : result.issues;
}

export function prefixIssues(
	issues: readonly ParsingIssue[],
	path: ParsingPath,
): ParsingIssue[] {
	return issues.map(
		(issue): ParsingIssue => ({ ...issue, path: [...path, ...issue.path] }),
	);
}

export function unrecognizedKeysIssue(
	keys: string[],
	path: ParsingPath,
): ParsingIssue {
	return {
		code: "unrecognized_keys",
		keys,
		path: [...path],
		message:
			keys.length === 1
				? `Unrecognized key: ${JSON.stringify(keys[0])}`
				: `Unrecognized keys: ${keys.map((key) => JSON.stringify(key)).join(", ")}`,
	};
}

export function invalidType(
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
				path: [...path],
				message: `Invalid input: expected ${expected}, received ${inputType(input)}`,
			},
		],
		true,
	);
}

export function invalidValue(
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
				path: [...path],
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

export function failure(
	issues: ParsingIssue[],
	aborted = false,
	halted = false,
): ParseFailure {
	return { aborted, halted, ok: false, issues };
}

export function partialFailure(
	issues: ParsingIssue[],
	value: unknown,
): ParseFailure {
	return {
		aborted: false,
		halted: false,
		ok: false,
		issues,
		partial: { value },
	};
}

export function success(value: unknown): ParseSuccess {
	return { ok: true, value };
}
