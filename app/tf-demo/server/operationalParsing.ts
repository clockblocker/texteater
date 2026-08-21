import { dumling, ParsingError, parseAsReading } from "dumling";
import type { Lemma, Reading } from "dumling/types";

export function unwrapOperationalParse<Output>(
	parsed: Output | ParsingError<unknown>,
): Output {
	if (parsed instanceof ParsingError) throw parsed;
	return parsed;
}

export function parseGermanLemma(input: unknown): Lemma<"de"> {
	const parsed = dumling.de.parse.lemma(input);
	if (!parsed.success) {
		throw new Error(`Invalid German Lemma: ${parsed.error.message}`);
	}
	return parsed.data;
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
