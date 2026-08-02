import { z } from "zod";

import { GERMAN_HIGH_LEVEL_ROUTES } from "../../../../../../schema/german-high-level-routes";
import type { PromptOutputSchema } from "../../../../../assembly";

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	target: z
		.discriminatedUnion("family", [
			z.strictObject({
				family: z.literal("Lexeme"),
				kind: z.enum(GERMAN_HIGH_LEVEL_ROUTES.Lexeme),
				additionalMemberSegmentIndices: z.array(
					z.number().int().nonnegative(),
				),
			}),
			z.strictObject({
				family: z.literal("Phraseme"),
				kind: z.enum(GERMAN_HIGH_LEVEL_ROUTES.Phraseme),
				additionalMemberSegmentIndices: z.array(
					z.number().int().nonnegative(),
				),
			}),
			z.strictObject({
				family: z.literal("Construction"),
				kind: z.enum(GERMAN_HIGH_LEVEL_ROUTES.Construction),
				additionalMemberSegmentIndices: z.array(
					z.number().int().nonnegative(),
				),
			}),
		])
		.nullable(),
}) satisfies PromptOutputSchema;
