import { z } from "zod";

import type { PromptOutputSchema } from "../../../../assembly";

export const outputSchema = z.strictObject({
	segments: z.array(
		z.strictObject({
			kind: z.enum([
				"ResolvableText",
				"OpaqueText",
				"Whitespace",
				"Punctuation",
			]),
			text: z.string().min(1),
		}),
	),
}) satisfies PromptOutputSchema;
