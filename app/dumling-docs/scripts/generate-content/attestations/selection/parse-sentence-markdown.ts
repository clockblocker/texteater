import type { SelectionSentenceParts } from "../../shared/types";

export function parseSelectionSentenceMarkdown(
	sentenceMarkdown: string,
	sourcePath: string,
): SelectionSentenceParts {
	const spans = [...sentenceMarkdown.matchAll(/\[(.+?)\]/gu)];
	if (spans.length !== 1) {
		throw new Error(
			`${sourcePath} sentenceMarkdown must contain exactly one bracketed selection span.`,
		);
	}

	const match = spans[0];
	const selectedText = match?.[1];
	if (selectedText === undefined) {
		throw new Error(
			`${sourcePath} sentenceMarkdown has an invalid selection span.`,
		);
	}

	const sentenceText = sentenceMarkdown.replace(/\[(.+?)\]/gu, "$1");

	return { selectedText, sentenceText };
}
