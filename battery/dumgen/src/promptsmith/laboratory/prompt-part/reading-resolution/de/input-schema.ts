import { z } from "zod";

import type { PromptInputSchema } from "../../../../assembly";

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
	lemma: z.string().min(1),
	existingEmojiDescriptions: z.array(z.string().trim().min(1)),
}) satisfies PromptInputSchema;
