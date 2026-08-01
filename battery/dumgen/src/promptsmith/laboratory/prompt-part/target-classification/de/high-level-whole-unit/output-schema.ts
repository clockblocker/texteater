import { z } from "zod";

import type { PromptOutputSchema } from "../../../../../assembly";
import { GERMAN_HIGH_LEVEL_ROUTES } from "../../../../de-routes";

export const outputSchema = z.discriminatedUnion("decision", [
	z.strictObject({
		decision: z.literal("Resolved"),
		memberSegmentIndices: z.array(z.number().int().nonnegative()).min(1),
		family: z.enum(
			Object.keys(GERMAN_HIGH_LEVEL_ROUTES) as [
				keyof typeof GERMAN_HIGH_LEVEL_ROUTES,
				...(keyof typeof GERMAN_HIGH_LEVEL_ROUTES)[],
			],
		),
		kind: z.string().min(1),
	}),
	z.strictObject({ decision: z.literal("Unresolved") }),
]) satisfies PromptOutputSchema;
