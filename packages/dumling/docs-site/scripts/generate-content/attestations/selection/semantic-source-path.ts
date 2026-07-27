import { join } from "node:path";
import type { SupportedLanguage } from "../../../../../src/types/public-types.ts";
import { sourceAttestationsDir } from "../../shared/paths";

type SelectionSemanticSourceInput = {
	entity: {
		language: SupportedLanguage;
	};
	sentenceMarkdown: string;
};

export function semanticSelectionBasename(sentenceMarkdown: string): string {
	return sentenceMarkdown
		.normalize("NFC")
		.replace(/[^\p{L}\p{M}\p{N}\p{Pc}\p{Zs}\[\]]+/gu, "")
		.replace(/\p{Zs}+/gu, "_")
		.replace(/_+/gu, "_")
		.replace(/^_+|_+$/gu, "");
}

export function semanticSelectionDirectoryBasename(
	sentenceMarkdown: string,
): string {
	return semanticSelectionBasename(sentenceMarkdown).replace(/[\[\]]/gu, "");
}

export function selectionSemanticSourcePath(
	source: SelectionSemanticSourceInput,
): string {
	const semanticBasename = semanticSelectionBasename(source.sentenceMarkdown);
	return join(
		sourceAttestationsDir,
		source.entity.language,
		"selection",
		semanticSelectionDirectoryBasename(source.sentenceMarkdown),
		`${semanticBasename}.ts`,
	);
}
