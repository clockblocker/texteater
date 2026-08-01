import { z } from "zod";

import type { PromptOutputSchema } from "../../../../../../assembly";

export const outputSchema = z.strictObject({
	decision: z.enum(["Reuse", "New"]),
	emojiDescription: z.string().trim().min(1),
}) satisfies PromptOutputSchema;
