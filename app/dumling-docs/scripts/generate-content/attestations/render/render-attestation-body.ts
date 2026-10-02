import type * as Dumling from "dumling/types";
import type { AttestationSource } from "../../shared/types";
import { renderTsValue } from "../entity/render-ts-value";

function languageLabelFor(language: Dumling.Language): string {
	const labels: Record<Dumling.Language, string> = {
		de: "German",
		en: "English",
		he: "Hebrew",
	};
	return labels[language];
}

function camelCaseIdentifier(text: string, fallback: string): string {
	const words = text
		.normalize("NFKD")
		.replace(/[^\dA-Za-z]+/gu, " ")
		.trim()
		.split(/\s+/u)
		.filter(Boolean);

	if (words.length === 0) {
		return fallback;
	}

	const identifier = words
		.map((word, index) => {
			const lower = word.toLowerCase();
			return index === 0
				? lower
				: `${lower[0]?.toUpperCase() ?? ""}${lower.slice(1)}`;
		})
		.join("");

	return /^\d/u.test(identifier) ? `${fallback}${identifier}` : identifier;
}

export function renderAttestationBody(source: AttestationSource): string {
	const attestation = source.entity;
	const lemma = attestation.surface.lemma;
	const displayName = attestation.surface.normalizedSurface;
	const entityVariable = `${camelCaseIdentifier(displayName, "attested")}Attestation`;

	return `# ${languageLabelFor(attestation.surface.language)} attestation: ${displayName}

Attested Sentence:
${source.sentenceMarkdown}

\`\`\`ts
import type * as Dumling from "dumling/types";

export const ${entityVariable} = ${renderTsValue(attestation)} satisfies Dumling.Attestation<"${lemma.language}", "${lemma.family}", "${lemma.kind}">;


\`\`\`
`;
}
