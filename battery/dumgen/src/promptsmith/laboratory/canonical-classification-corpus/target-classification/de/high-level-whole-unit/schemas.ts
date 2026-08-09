import { z } from "zod";

import { GERMAN_REACHABLE_HIGH_LEVEL_ROUTES } from "../../../../../../schema/german-high-level-routes";
import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../assembly";

export const canonicalInputSchema = z
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

const memberSegmentIndices = z.array(z.number().int().nonnegative()).min(1);

export const canonicalOutputSchema = z.discriminatedUnion("decision", [
	z.strictObject({
		decision: z.literal("Resolved"),
		target: z.discriminatedUnion("family", [
			z.strictObject({
				family: z.literal("Lexeme"),
				kind: z.enum(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Lexeme),
				memberSegmentIndices,
			}),
			z.strictObject({
				family: z.literal("Phraseme"),
				kind: z.enum(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Phraseme),
				memberSegmentIndices,
			}),
			z.strictObject({
				family: z.literal("Construction"),
				kind: z.enum(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Construction),
				memberSegmentIndices,
			}),
		]),
	}),
	z.strictObject({ decision: z.literal("Unresolved") }),
]) satisfies PromptOutputSchema;
