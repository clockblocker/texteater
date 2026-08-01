import { z } from "zod";

import type { PromptInputSchema } from "../../../../assembly";

export const inputSchema = z.strictObject({
	text: z.string().min(1),
}) satisfies PromptInputSchema;
