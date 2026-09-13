import {
	inputSchema as comparisonInput,
	outputSchema as comparisonOutput,
} from "../../reading-resolution/de/schemas";
export const inputSchema = comparisonInput.omit({
	existingEmojiDescriptions: true,
});
export const outputSchema = comparisonOutput.pick({ emojiDescription: true });
