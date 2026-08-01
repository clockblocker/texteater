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
				memberSegmentIndices: z
					.array(z.number().int().nonnegative())
					.min(1),
			}),
			z.strictObject({
				family: z.literal("Phraseme"),
				kind: z.enum(GERMAN_HIGH_LEVEL_ROUTES.Phraseme),
				memberSegmentIndices: z
					.array(z.number().int().nonnegative())
					.min(1),
			}),
			z.strictObject({
				family: z.literal("Construction"),
				kind: z.enum(GERMAN_HIGH_LEVEL_ROUTES.Construction),
				memberSegmentIndices: z
					.array(z.number().int().nonnegative())
					.min(1),
			}),
		])
		.nullable(),
}) satisfies PromptOutputSchema;
