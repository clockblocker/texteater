import { z } from "zod";
import { GERMAN_REACHABLE_HIGH_LEVEL_ROUTES } from "../../../../../../schema/german-high-level-routes";
import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../assembly";

export const inputSchema = z
	.strictObject({
		clickedSegmentIndex: z.number().int().nonnegative(),
		segments: z
			.array(
				z.strictObject({
					kind: z.enum([
						"ResolvableText",
						"OpaqueText",
						"Whitespace",
						"Punctuation",
					]),
					text: z.string().min(1),
				}),
			)
			.min(1),
	})
	.superRefine((input, context) => {
		if (
			input.segments[input.clickedSegmentIndex]?.kind !== "ResolvableText"
		) {
			context.addIssue({
				code: "custom",
				path: ["clickedSegmentIndex"],
				message: "The clicked index must reference ResolvableText.",
			});
		}
	}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	target: z
		.discriminatedUnion("family", [
			z.strictObject({
				family: z.literal("Lexeme"),
				kind: z.enum(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Lexeme),
				additionalMemberSegmentIndices: z.array(
					z.number().int().nonnegative(),
				),
			}),
			z.strictObject({
				family: z.literal("Phraseme"),
				kind: z.enum(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Phraseme),
				additionalMemberSegmentIndices: z.array(
					z.number().int().nonnegative(),
				),
			}),
			z.strictObject({
				family: z.literal("Construction"),
				kind: z.enum(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Construction),
				additionalMemberSegmentIndices: z.array(
					z.number().int().nonnegative(),
				),
			}),
		])
		.nullable(),
}) satisfies PromptOutputSchema;
