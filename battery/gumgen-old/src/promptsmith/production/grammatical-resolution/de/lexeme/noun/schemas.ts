import { z } from "zod";
import {
	deNounModelCitationSurfaceSchema,
	deNounModelInflectionSurfaceSchema,
	deNounModelLemmaSchema,
} from "../../../../../../schema/de-noun-codecs";
import { extractMarkedContextMembers } from "../../../../../../schema/normalized-surface-projection";
import {
	normalizedMembersSchema,
	type PromptInputSchema,
	type PromptOutputSchema,
} from "../../../../../assembly";

export const inputSchema = z
	.strictObject({
		markedContext: z.string().min(1),
		members: z.array(z.string().min(1)).min(1),
	})
	.superRefine((value, context) => {
		let markedMembers: readonly string[];
		try {
			markedMembers = extractMarkedContextMembers(value.markedContext);
		} catch (cause) {
			context.addIssue({
				code: "custom",
				path: ["markedContext"],
				message:
					cause instanceof Error
						? cause.message
						: "markedContext is invalid.",
			});
			return;
		}
		if (
			markedMembers.length !== value.members.length ||
			markedMembers.some(
				(member, position) => member !== value.members[position],
			)
		) {
			context.addIssue({
				code: "custom",
				path: ["members"],
				message:
					"members must exactly match TARGET contents in source order.",
			});
		}
	}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
	normalizedMembers: normalizedMembersSchema,
	surface: z.union([
		deNounModelCitationSurfaceSchema.omit({ normalizedSurface: true }),
		deNounModelInflectionSurfaceSchema.omit({ normalizedSurface: true }),
	]),
	lemma: deNounModelLemmaSchema,
}) satisfies PromptOutputSchema;
