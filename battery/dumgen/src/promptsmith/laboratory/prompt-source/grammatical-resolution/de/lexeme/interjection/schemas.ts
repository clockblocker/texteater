import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import {
	asObjectSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.INTJ(),
);
const lemmaCodec = codecBuilder4.buildFixedFieldsCodec(canonicalLemmaSchema, {
	language: "de",
	family: "Lexeme",
	kind: "INTJ",
});

export const modelLemmaSchema = lemmaCodec.in;

const schemaProjectionLemma = lemmaCodec.decode({
	canonicalForm: "pfui",
	coreFeatures: { partType: null },
});
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.INTJ(),
);
const citationSurfaceCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalCitationSurfaceSchema,
	{ language: "de", lemma: schemaProjectionLemma },
);

// German INTJ exposes Citation Surfaces only. Keeping this schema derived from
// Dumling makes the absent Inflection branch an enforced model contract.
export const modelCitationSurfaceSchema = citationSurfaceCodec.in.omit({
	normalizedSurface: true,
});

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
			normalizedMembers: normalizedMembersSchema,
			realizationCoverage: z.enum(["Full", "Partial"]),
			surface: modelCitationSurfaceSchema,
			lemma: modelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
