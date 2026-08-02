import { z } from "zod";

import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../assembly";

export const inputSchema = z.strictObject({
	text: z.string().min(1),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
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
}) satisfies PromptOutputSchema;
