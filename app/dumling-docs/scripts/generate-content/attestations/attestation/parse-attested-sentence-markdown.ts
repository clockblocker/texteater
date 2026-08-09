import type { AttestedSentenceParts } from "../../shared/types";

export function parseAttestedSentenceMarkdown(
	sentenceMarkdown: string,
	sourcePath: string,
): AttestedSentenceParts {
	const spans = [...sentenceMarkdown.matchAll(/\[(.+?)\]/gu)];
	if (spans.length !== 1) {
		throw new Error(
			`${sourcePath} sentenceMarkdown must contain exactly one bracketed review span.`,
		);
	}

	const match = spans[0];
	const selectedText = match?.[1];
	if (selectedText === undefined) {
		throw new Error(
			`${sourcePath} sentenceMarkdown has an invalid review span.`,
		);
	}

	const sentenceText = sentenceMarkdown.replace(/\[(.+?)\]/gu, "$1");

	return { selectedText, sentenceText };
}
