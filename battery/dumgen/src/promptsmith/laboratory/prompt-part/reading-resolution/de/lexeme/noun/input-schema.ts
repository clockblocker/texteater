import { z } from "zod";

import { deNounModelLemmaSchema } from "../../../../../../../schema/de-noun-codecs";
import type { PromptInputSchema } from "../../../../../../assembly";

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
	lemma: deNounModelLemmaSchema,
	existingEmojiDescriptions: z.array(z.string().trim().min(1)),
}) satisfies PromptInputSchema;
