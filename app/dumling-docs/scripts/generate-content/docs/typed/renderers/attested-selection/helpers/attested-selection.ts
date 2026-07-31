import { getLanguageApi } from "dumling";
import type { AttestedSelection } from "dumling/types";

export function asSingleLineSentence(sentenceMarkdown: string): string {
	return sentenceMarkdown
		.trim()
		.split("\n")
		.map((line) => line.trim())
		.join(" ");
}

export function hrefForAttestedSelection(
	attestedSelection: AttestedSelection,
): string {
	const selection = attestedSelection.selection;
	const language = selection.surface.lemma.language;
	const languageApi = getLanguageApi(language);
	const base64UrlId = String(languageApi.id.encode.asBase64Url(selection));

	return `/${language}/selection/${base64UrlId}/`;
}

export function withLinkedSelectionSpan(
	attestedSelection: AttestedSelection,
): string {
	const sentenceMarkdown = asSingleLineSentence(
		attestedSelection.sentenceMarkdown,
	);
	const href = hrefForAttestedSelection(attestedSelection);

	return sentenceMarkdown.replace(
		/\[(.+?)\]/u,
		(_, selectedText: string) => `[${selectedText}](${href})`,
	);
}
