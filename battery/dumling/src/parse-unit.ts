import { isRecord } from "common-utils";
import {
	type CompiledValidationRegistry,
	ParsingError,
	parseCompiledValidation,
} from "common-utils/validation";
import { validationRegistry } from "./generated/linked-validation.js";
import type { ParsedUnit } from "./generated/units.js";
import type { Unit, UnitRoute } from "./types.js";
import { validationOperations } from "./validation/operations.js";

type ParseResult<T> =
	| { success: true; chain: T }
	| { success: false; error: ParsingError };

type RouteFields = { language: string; family: string; kind: string };
type LemmaOf<U> = U extends { lemma: infer L extends RouteFields }
	? L
	: U extends { surface: { lemma: infer L extends RouteFields } }
		? L
		: U extends RouteFields
			? U
			: never;
// Distributes over U, so the chain's discriminants still narrow value.
type TypedChain<U extends Unit> = U extends unknown
	? {
			unitKind: U["unitKind"];
			language: LemmaOf<U>["language"];
			family: LemmaOf<U>["family"];
			kind: LemmaOf<U>["kind"];
			value: U;
		}
	: never;

const registry: CompiledValidationRegistry = validationRegistry;
function object(value: unknown): Record<string, unknown> | undefined {
	return isRecord(value) ? value : undefined;
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
 * Validates and normalizes a complete unit. A typed input keeps its type in
 * chain.value. Literal expected coordinates narrow chain.value and reject
 * mismatches. Discriminants in chain narrow its value. Ordinary invalid input
 * returns a shared ParsingError without throwing.
 */
// No const on U: normalization can change a string field, so a literal such
// as canonicalForm "haus " must widen to string.
export function parseUnit<U extends Unit>(input: U): ParseResult<TypedChain<U>>;
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
	const value = parseCompiledValidation(
		registry,
		key,
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
