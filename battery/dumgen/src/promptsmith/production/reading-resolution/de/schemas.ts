import emojiRegex from "emoji-regex";
import { z } from "zod";

import type { PromptInputSchema, PromptOutputSchema } from "../../../assembly";

const MAX_EMOJI_GRAPHEMES = 4;
const emojiPatternSource = emojiRegex().source;
const compactEmojiSequencePattern = new RegExp(
	`^(?:${emojiPatternSource}){1,${MAX_EMOJI_GRAPHEMES}}$`,
);
const singleEmojiPattern = new RegExp(`^(?:${emojiPatternSource})$`);
const standaloneEmojiModifierPattern = /^\p{Emoji_Modifier}$/u;
const graphemeSegmenter = new Intl.Segmenter(undefined, {
	granularity: "grapheme",
});

function isCompactEmojiSequence(value: string): boolean {
	const graphemes = [...graphemeSegmenter.segment(value)];
	return (
		graphemes.length <= MAX_EMOJI_GRAPHEMES &&
		graphemes.every(
			({ segment }) =>
				singleEmojiPattern.test(segment) &&
				!standaloneEmojiModifierPattern.test(segment),
		)
	);
}

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
	lemma: z.string().min(1),
	existingEmojiDescriptions: z.array(z.string().trim().min(1)),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Reuse", "New"]),
	emojiDescription: z
		.string()
		.min(1)
		.regex(compactEmojiSequencePattern)
		.refine(isCompactEmojiSequence),
}) satisfies PromptOutputSchema;
