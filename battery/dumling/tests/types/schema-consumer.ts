import type { z } from "zod";
import { surfaceSchema as noun } from "../../src/generated/schemas/de/lexeme/noun.js";
import { surfaceSchema as prefix } from "../../src/generated/schemas/de/morpheme/prefix.js";
import { readingSchema as reading } from "../../src/generated/schemas/he/lexeme/adjective.js";
import type { Surface } from "../../src/types.js";

export type NounFeatures = z.output<typeof noun>["inflectionalFeatures"];
export type Prefix = z.output<typeof prefix>;
export type ReadingCore = z.output<typeof reading>["lemma"]["coreFeatures"];
const model = noun
	.omit({ unitKind: true, language: true, lemma: true })
	.extend({ lemma: reading.shape.lemma });
export type ModelKind = z.output<typeof model>["lemma"]["kind"];

export function consumerChecks(
	value: z.output<typeof noun>,
	plainPrefix: Prefix,
) {
	const _surface: Surface<"de", "Lexeme", "NOUN"> = value;
	const _back: z.output<typeof noun> = _surface;
	// @ts-expect-error Inapplicable features are absent from the exact schema.
	prefix.shape.inflectionalFeatures;
	// @ts-expect-error Inapplicable features are absent from the parsed type.
	plainPrefix.inflectionalFeatures;
	// @ts-expect-error This route requires the inflectional field.
	const _missing: z.output<typeof noun> = {
		unitKind: "Surface",
		language: "de",
		lemma: value.lemma,
		normalizedSurface: "Haus",
		spelling: "Canonical",
		surfaceFeatures: null,
	};
}

export function completionExamples() {
	void noun.shape.unitKind; // completions:noun
	void prefix.shape.unitKind; // completions:prefix
	void reading.shape.unitKind; // completions:reading
}
