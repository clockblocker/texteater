import { z } from "zod";
import {
	deNounModelCitationSurfaceSchema,
	deNounModelInflectionSurfaceSchema,
	deNounModelLemmaSchema,
} from "../../../../../../../schema/de-noun-codecs";
import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../../assembly";

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
			surface: z.union([
				deNounModelCitationSurfaceSchema,
				deNounModelInflectionSurfaceSchema,
			]),
			lemma: deNounModelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
