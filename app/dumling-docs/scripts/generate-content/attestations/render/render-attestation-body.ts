import type { AttestationSource } from "../../shared/types";
import { camelCaseIdentifier, languageLabelFor } from "../entity/helpers";
import { renderTsValue } from "../entity/render-ts-value";
import { typeExpressionForEntity } from "./type-expression";

export function renderAttestationBody(source: AttestationSource): string {
	const attestation = source.entity;
	const displayName = attestation.surface.normalizedSurface;
	const entityVariable = `${camelCaseIdentifier(displayName, "attested")}Attestation`;

	return `# ${languageLabelFor(attestation.surface.language)} attestation: ${displayName}

Attested Sentence:
${source.sentenceMarkdown}

\`\`\`ts
import type * as Dumling from "dumling/types";

export const ${entityVariable} = ${renderTsValue(attestation)} satisfies ${typeExpressionForEntity(attestation)};


\`\`\`
`;
}
