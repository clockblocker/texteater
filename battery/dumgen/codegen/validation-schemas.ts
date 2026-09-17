import { z } from "zod";
import * as universal from "../src/universal/schemas.js";

const generated = await import("../src/generated/schemas.js");
export const canonicalDumgenValidationSchemas = {
	...Object.fromEntries(
		Object.entries(universal).filter(
			([, value]) => value instanceof z.ZodType,
		),
	),
	encounterSchema: generated.encounterSchema,
	lemmaSchema: generated.lemmaSchema,
	readingSchema: generated.readingSchema,
	attestationSchema: generated.attestationSchema,
	emojiDescriptionSchema: generated.emojiDescriptionSchema,
	generationInput: generated.generationInputSchema,
	comparisonInput: generated.comparisonInputSchema,
	knowledgeInput: generated.knowledgeInputSchema,
	emojiOutput: z.strictObject({
		emojiDescription: generated.emojiDescriptionSchema,
	}),

	...Object.fromEntries(
		Object.entries(generated.grammarSchemas).map(([key, value]) => [
			`grammar/${key}`,
			z.union([
				value,
				z.strictObject({ decision: z.literal("Unresolved") }),
			]),
		]),
	),
};
