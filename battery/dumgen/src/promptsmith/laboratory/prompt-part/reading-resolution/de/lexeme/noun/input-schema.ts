import { schemasFor } from "dumling/schema";
import { z } from "zod";

import {
	asObjectSchema,
	type PromptInputSchema,
} from "../../../../../../assembly";

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
	lemma: asObjectSchema(schemasFor.de.entity.Lemma.Lexeme.NOUN()).omit({
		language: true,
		family: true,
		kind: true,
	}),
	existingEmojiDescriptions: z.array(z.string().trim().min(1)),
}) satisfies PromptInputSchema;
