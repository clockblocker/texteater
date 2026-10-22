import { isRecord } from "common-utils";
import {
	hasRoot,
	ParsingError,
	parseCompiledValidation,
} from "common-utils/validation";
import { validationRegistry } from "./generated/linked-validation.js";
import type { ParsedUnit, UnitKind } from "./generated/units.js";
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

function object(value: unknown): Record<string, unknown> | undefined {
	return isRecord(value) ? value : undefined;
}
function failure(
	path: readonly (string | number)[],
	message: string,
): ParseResult<never> {
	return {
		success: false,
		error: new ParsingError([{ code: "custom", path: [...path], message }]),
	};
}

/** Where each Unit Kind keeps its Lemma. */
const lemmaPaths: Readonly<Record<UnitKind, readonly string[]>> = {
	Lemma: [],
	Surface: ["lemma"],
	Reading: ["lemma"],
	Attestation: ["surface", "lemma"],
};

function isUnitKind(value: unknown): value is UnitKind {
	return typeof value === "string" && Object.hasOwn(lemmaPaths, value);
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
	if (!isUnitKind(unitKind))
		return failure(["unitKind"], "Unknown Unit Kind");
	const lemmaPath = lemmaPaths[unitKind];
	let lemma: Record<string, unknown> | undefined = unit;
	for (const key of lemmaPath) lemma = object(lemma?.[key]);
	if (!lemma) return failure(lemmaPath, "Expected the unit's Lemma");
	const { language, family, kind } = lemma;
	if (typeof language !== "string")
		return failure([...lemmaPath, "language"], "Expected language");
	if (typeof family !== "string")
		return failure([...lemmaPath, "family"], "Expected family");
	if (typeof kind !== "string")
		return failure([...lemmaPath, "kind"], "Expected kind");
	const key = `${unitKind}/${language}/${family}/${kind}`;
	if (!hasRoot(validationRegistry, key))
		return failure(lemmaPath, "Unsupported grammatical route");
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
		validationRegistry,
		key,
		input,
		validationOperations,
	);
	if (value instanceof ParsingError) return { success: false, error: value };
	return {
		success: true,
		chain: {
			unitKind,
			language,
			family,
			kind,
			value,
		},
	};
}
