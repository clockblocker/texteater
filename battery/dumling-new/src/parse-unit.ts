import {
	type Constraint,
	ParsingError,
	parseValidationArtifact,
} from "common-utils";
import { encodedValidation } from "./generated/validation.js";
import type { ParsedUnit, UnitRoute } from "./types.js";
import { validationOperations } from "./validation/operations.js";

interface Registry {
	version: 1;
	roots: Readonly<Record<string, Constraint>>;
	definitions: Readonly<Record<string, Constraint>>;
}
const registry: Registry = JSON.parse(encodedValidation);
export type ParseResult<T> =
	| { success: true; chain: T }
	| { success: false; error: ParsingError };
function object(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}
function failure(
	path: (string | number)[],
	message: string,
): ParseResult<never> {
	return {
		success: false,
		error: new ParsingError([{ code: "custom", path, message }]),
	};
}

/**
 * Validates and normalizes a complete unit. Literal expected coordinates narrow
 * chain.value and reject mismatches. Discriminants in chain narrow its value.
 * Ordinary invalid input returns a shared ParsingError without throwing.
 */
export function parseUnit<const R extends UnitRoute>(
	input: unknown,
	expected: R,
): ParseResult<ParsedUnit<R>>;
export function parseUnit(input: unknown): ParseResult<ParsedUnit>;
export function parseUnit(
	input: unknown,
	expected?: UnitRoute,
): ParseResult<unknown> {
	const unit = object(input);
	if (!unit) return failure([], "Expected a Dumling unit object");
	const unitKind = unit.unitKind;
	const lemmaPath =
		unitKind === "Lemma"
			? []
			: unitKind === "Surface" || unitKind === "Reading"
				? ["lemma"]
				: unitKind === "Attestation"
					? ["surface", "lemma"]
					: undefined;
	if (!lemmaPath) return failure(["unitKind"], "Unknown Unit Kind");
	let lemma: Record<string, unknown> | undefined = unit;
	for (const key of lemmaPath) lemma = object(lemma?.[key]);
	if (!lemma) return failure(lemmaPath, "Expected the unit's Lemma");
	for (const key of ["language", "family", "kind"] as const) {
		if (typeof lemma[key] !== "string")
			return failure([...lemmaPath, key], `Expected ${key}`);
	}
	const key = `${unitKind}/${lemma.language}/${lemma.family}/${lemma.kind}`;
	const root = Object.hasOwn(registry.roots, key)
		? registry.roots[key]
		: undefined;
	if (!root) return failure(lemmaPath, "Unsupported grammatical route");
	if (expected) {
		if (expected.unitKind !== unitKind)
			return failure(
				["unitKind"],
				"Unit Kind does not match expected coordinates",
			);
		for (const field of ["language", "family", "kind"] as const)
			if (expected[field] !== lemma[field])
				return failure(
					[...lemmaPath, field],
					`${field} does not match expected coordinates`,
				);
	}
	const value = parseValidationArtifact(
		{ version: 1, root, definitions: registry.definitions },
		input,
		validationOperations,
	);
	if (value instanceof ParsingError) return { success: false, error: value };
	return {
		success: true,
		chain: {
			unitKind,
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			value,
		},
	};
}
