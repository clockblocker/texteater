import { join } from "node:path";
import type { SupportedLanguage } from "dumling/types";
import { sourceAttestationsDir } from "../../shared/paths";

type AttestationSemanticSourceInput = {
	entity: {
		surface: {
			lemma: {
				language: SupportedLanguage;
			};
		};
	};
	sentenceMarkdown: string;
};

export function semanticAttestationBasename(sentenceMarkdown: string): string {
	return sentenceMarkdown
		.normalize("NFC")
		.replace(/[^\p{L}\p{M}\p{N}\p{Pc}\p{Zs}[\]]+/gu, "")
		.replace(/\p{Zs}+/gu, "_")
		.replace(/_+/gu, "_")
		.replace(/^_+|_+$/gu, "");
}

export function semanticAttestationDirectoryBasename(
	sentenceMarkdown: string,
): string {
	return semanticAttestationBasename(sentenceMarkdown).replace(/[[\]]/gu, "");
}

export function attestationSemanticSourcePath(
	source: AttestationSemanticSourceInput,
): string {
	const semanticBasename = semanticAttestationBasename(
		source.sentenceMarkdown,
	);
	return join(
		sourceAttestationsDir,
		source.entity.surface.lemma.language,
		"attestation",
		semanticAttestationDirectoryBasename(source.sentenceMarkdown),
		`${semanticBasename}.ts`,
	);
}
