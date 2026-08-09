import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import {
	asObjectSchema,
	grammaticalResolutionMarkedContextSchema,
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Phraseme.DiscourseFormula(),
);
const lemmaCodec = codecBuilder4.buildFixedFieldsCodec(canonicalLemmaSchema, {
	language: "de",
	family: "Phraseme",
	kind: "DiscourseFormula",
});

export const modelLemmaSchema = lemmaCodec.in;

const schemaProjectionLemma = lemmaCodec.decode({
	canonicalForm: "guten morgen",
	coreFeatures: { discourseFormulaRole: "Greeting" },
});
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Phraseme.DiscourseFormula(),
);
const citationSurfaceCodec = codecBuilder4.buildFixedFieldsCodec(
	canonicalCitationSurfaceSchema,
	{ language: "de", lemma: schemaProjectionLemma },
);

// German DiscourseFormula exposes Citation Surfaces only. The derived schema
// intentionally has no Inflection branch or inflectional feature payload.
export const modelCitationSurfaceSchema = citationSurfaceCodec.in.omit({
	normalizedSurface: true,
});

export const inputSchema = z.strictObject({
	markedContext: grammaticalResolutionMarkedContextSchema,
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(2),
			normalizedMembers: normalizedMembersSchema,
			realizationCoverage: z.enum(["Full", "Partial"]),
			surface: modelCitationSurfaceSchema,
			lemma: modelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
