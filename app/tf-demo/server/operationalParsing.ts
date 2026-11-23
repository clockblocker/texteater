import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

/**
 * Parses a Dumling unit and checks its unit kind and, when `language` is
 * given, its language. Dumling's `parseUnit` with an `expected` route cannot
 * serve: that route also fixes the Family and Kind.
 */
export function parseUnitAs<
	U extends Dumling.UnitKind,
	L extends Dumling.Language = Dumling.Language,
>(input: unknown, unitKind: U, language?: L): Dumling.Unit<U, L> {
	const parsed = parseUnit(input);
	if (!parsed.success) throw parsed.error;
	if (
		parsed.chain.unitKind !== unitKind ||
		(language !== undefined && parsed.chain.language !== language)
	)
		throw new Error(
			`Expected a Dumling ${unitKind}${language ? ` in ${language}` : ""}.`,
		);
	// Runtime unitKind and language checks cannot narrow the generic Unit<U, L>.
	return parsed.chain.value as Dumling.Unit<U, L>;
}

export function parseLemma<L extends Dumling.Language = Dumling.Language>(
	input: unknown,
	language?: L,
): Dumling.Lemma<L> {
	return parseUnitAs(input, "Lemma", language);
}
export function parseReading<L extends Dumling.Language = Dumling.Language>(
	input: unknown,
	language?: L,
): Dumling.Reading<L> {
	return parseUnitAs(input, "Reading", language);
}
export function parseSurface<L extends Dumling.Language = Dumling.Language>(
	input: unknown,
	language?: L,
): Dumling.Surface<L> {
	return parseUnitAs(input, "Surface", language);
}
export function parseAttestation<L extends Dumling.Language = Dumling.Language>(
	input: unknown,
	language?: L,
): Dumling.Attestation<L> {
	return parseUnitAs(input, "Attestation", language);
}

export function parseGermanLemma(input: unknown): Dumling.Lemma<"de"> {
	return parseUnitAs(input, "Lemma", "de");
}
export function parseGermanReading(input: unknown): Dumling.Reading<"de"> {
	return parseUnitAs(input, "Reading", "de");
}
export function parseGermanSurface(input: unknown): Dumling.Surface<"de"> {
	return parseUnitAs(input, "Surface", "de");
}
export function parseGermanAttestation(
	input: unknown,
): Dumling.Attestation<"de"> {
	return parseUnitAs(input, "Attestation", "de");
}
