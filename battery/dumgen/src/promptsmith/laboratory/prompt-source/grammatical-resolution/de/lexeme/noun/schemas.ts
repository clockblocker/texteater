import { z } from "zod";
import {
	deNounModelCitationSurfaceSchema,
	deNounModelInflectionSurfaceSchema,
	deNounModelLemmaSchema,
} from "../../../../../../../schema/de-noun-codecs";
import {
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../../assembly";

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
			surface: z.union([
				deNounModelCitationSurfaceSchema.omit({
					normalizedSurface: true,
				}),
				deNounModelInflectionSurfaceSchema.omit({
					normalizedSurface: true,
				}),
			]),
			lemma: deNounModelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
