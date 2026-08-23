import { dumling, ParsingError, parseAsReading } from "dumling";
import type { Lemma, Reading } from "dumling/types";

export function unwrapOperationalParse<Output>(
	parsed: Output | ParsingError<unknown>,
): Output {
	if (parsed instanceof ParsingError) throw parsed;
	return parsed;
}

export function parseGermanLemma(input: unknown): Lemma<"de"> {
	const parsed = dumling.de.parse.lemma(
		withLegacyPronounReferenceNulls(input),
	);
	if (!parsed.success) {
		throw new Error(`Invalid German Lemma: ${parsed.error.message}`);
	}
	return parsed.data;
}

/**
 * Transitional read adapter for PRON rows written before reference identity
 * became explicit. Canonical writes always include both keys.
 */
export function withLegacyPronounReferenceNulls(input: unknown): unknown {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		return input;
	}
	const lemma = input as Readonly<Record<string, unknown>>;
	if (
		lemma.language !== "de" ||
		lemma.family !== "Lexeme" ||
		lemma.kind !== "PRON" ||
		lemma.coreFeatures === null ||
		typeof lemma.coreFeatures !== "object" ||
		Array.isArray(lemma.coreFeatures)
	) {
		return input;
	}
	const core = lemma.coreFeatures as Readonly<Record<string, unknown>>;
	if (
		Object.hasOwn(core, "referenceGender") &&
		Object.hasOwn(core, "referenceNumber")
	) {
		return input;
	}
	return {
		...lemma,
		coreFeatures: {
			...core,
			referenceGender: core.referenceGender ?? null,
			referenceNumber: core.referenceNumber ?? null,
		},
	};
}

export function parseGermanReading(input: unknown): Reading<"de"> {
	const lemmaInput =
		input !== null && typeof input === "object"
			? Reflect.get(input, "lemma")
			: undefined;
	const lemma = parseGermanLemma(lemmaInput);
	return unwrapOperationalParse(
		parseAsReading(input, "de", lemma.family, lemma.kind),
	);
}
