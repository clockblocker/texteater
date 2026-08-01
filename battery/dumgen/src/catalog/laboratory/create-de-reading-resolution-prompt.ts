import { schemasFor } from "dumling/schema";
import { z } from "zod";

import type {
	GermanHighLevelFamily,
	GermanHighLevelKind,
} from "../../schema/german-high-level-routes";
import type { ReadingResolution } from "../../types";
import type { Prompt } from "../prompt-definition";

type ObjectSchema = z.ZodObject<z.ZodRawShape>;

export function createDeReadingResolutionPrompt<
	const Family extends GermanHighLevelFamily,
	const Kind extends GermanHighLevelKind<Family>,
>(family: Family, kind: Kind) {
	const lemmaSchema = schemasFor.de.entity.Lemma[family][
		kind
	]() as unknown as ObjectSchema;
	const modelLemmaSchema = lemmaSchema.omit({
		language: true,
		family: true,
		kind: true,
	});
	const inputSchema = z.strictObject({
		markedContext: z.string().min(1),
		lemma: lemmaSchema,
		existingEmojiDescriptions: z.array(z.string().trim().min(1)),
	});
	const modelInputSchema = z.strictObject({
		markedContext: z.string().min(1),
		lemma: modelLemmaSchema,
		existingEmojiDescriptions: z.array(z.string().trim().min(1)),
	});
	const outputSchema = z.strictObject({
		decision: z.enum(["Reuse", "New"]),
		emojiDescription: z.string().trim().min(1),
	});

	return {
		systemPrompt: `You are the German ${family}/${kind} Reading Resolution route
in a hands-on linguistic laboratory.

The marked context shows the contextual use of one fixed Lemma. The supplied
Lemma fields cannot be changed. If one existingEmojiDescriptions value is close
enough for this learner-facing concept, copy it exactly and answer Reuse.
Otherwise answer New with one compact emoji plus plain-language German or
learner-friendly gloss. Exact description membership is authoritative; the
decision is advisory diagnostic evidence.

Do not reconsider grammar, return a Lemma or Surface, invent an ID, Meaning or
Sense, add confidence, candidates, notes, or explanation.`,
		inputSchema,
		modelInputSchema,
		outputSchema,
		projectInput(input) {
			const {
				language: _language,
				family: _family,
				kind: _kind,
				...lemma
			} = input.lemma;
			return {
				markedContext: input.markedContext,
				lemma: modelLemmaSchema.parse(lemma),
				existingEmojiDescriptions: input.existingEmojiDescriptions,
			};
		},
		generationParams: { model: "gpt-5-nano", maxOutputTokens: 192 },
	} satisfies Prompt<
		typeof inputSchema,
		typeof outputSchema,
		ReadingResolution,
		typeof modelInputSchema
	>;
}
