import type { AttestationSource } from "../../shared/types";
import { isAttestation, isSurface } from "../entity/guards";
import {
	camelCaseIdentifier,
	entityKindFor,
	languageLabelFor,
	lemmaForEntity,
	surfaceForEntity,
} from "../entity/helpers";
import { renderTsValue } from "../entity/render-ts-value";
import { typeExpressionForEntity } from "./type-expression";

export function renderAttestationBody(
	source: AttestationSource,
	identity?: string,
): string {
	const entity = source.entity;
	const kind = entityKindFor(entity);
	const lemma = lemmaForEntity(entity);
	const surface =
		isAttestation(entity) || isSurface(entity)
			? surfaceForEntity(entity)
			: undefined;
	const displayName = surface?.normalizedSurface ?? lemma.canonicalForm;
	const variableBase = camelCaseIdentifier(displayName, "attested");
	const entityVariable = `${variableBase}${kind}`;
	const identityBlock =
		identity === undefined
			? ""
			: `\nexport const ${entityVariable}Identity =\n\t${JSON.stringify(identity)} as const;\n`;
	const title = source.title ?? displayName;
	const sentenceBlock =
		source.sentenceMarkdown === undefined
			? ""
			: `\nAttested Sentence:\n${source.sentenceMarkdown}\n`;

	return `# ${languageLabelFor(lemma.language)} attestation: ${title}
${sentenceBlock}
\`\`\`ts
import type * as Dumling from "dumling/types";

export const ${entityVariable} = ${renderTsValue(entity)} satisfies ${typeExpressionForEntity(entity)};

${identityBlock}
\`\`\`
`;
}
