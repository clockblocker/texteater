import { schemasFor } from "dumling/schema";
import { z } from "zod";

import {
	asObjectSchema,
	type PromptOutputSchema,
} from "../../../../../../assembly";

const modelLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.NOUN(),
).omit({
	language: true,
	family: true,
	kind: true,
});
const modelCitationSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.NOUN(),
).omit({
	language: true,
	lemma: true,
});
const modelInflectionSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Inflection.Lexeme.NOUN(),
).omit({
	language: true,
	lemma: true,
});

export const outputSchema = z.discriminatedUnion("decision", [
	z.strictObject({
		decision: z.literal("Resolved"),
		memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
		surface: z.union([modelCitationSchema, modelInflectionSchema]),
		lemma: modelLemmaSchema,
	}),
	z.strictObject({ decision: z.literal("Unresolved") }),
]) satisfies PromptOutputSchema;
