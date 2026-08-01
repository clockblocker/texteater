import { z } from "zod";

import type { PromptInputSchema } from "../../../../../assembly";

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
