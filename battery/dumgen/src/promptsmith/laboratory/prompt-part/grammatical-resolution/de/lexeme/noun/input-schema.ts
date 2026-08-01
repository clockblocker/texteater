import { z } from "zod";

import type { PromptInputSchema } from "../../../../../../assembly";

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
}) satisfies PromptInputSchema;
