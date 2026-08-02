import { z } from "zod";

import type { PromptOutputSchema } from "../../../../assembly";

const emojiDescriptionPattern =
	/^(?:(?:\p{Regional_Indicator}{2})|(?:[0-9#*]\uFE0F?\u20E3)|(?:\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0E|\uFE0F)?(?:\p{Emoji_Modifier})?)*))+$/u;

export const outputSchema = z.strictObject({
	decision: z.enum(["Reuse", "New"]),
	emojiDescription: z.string().trim().min(1).regex(emojiDescriptionPattern),
}) satisfies PromptOutputSchema;
