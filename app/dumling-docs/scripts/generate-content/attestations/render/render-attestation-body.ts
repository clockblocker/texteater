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
	identityCsv?: string,
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
		identityCsv === undefined
			? ""
			: `\nexport const ${entityVariable}IdentityCsv =\n\t${JSON.stringify(identityCsv)} as const;\n`;
	const importType = typeExpressionForEntity(entity).split("<", 1)[0];
	const title = source.title ?? displayName;
	const sentenceBlock =
		source.sentenceMarkdown === undefined
			? ""
			: `\nAttested Sentence:\n${source.sentenceMarkdown}\n`;

	return `# ${languageLabelFor(lemma.language)} attestation: ${title}
${sentenceBlock}
\`\`\`ts
import type { ${importType} } from "dumling/types";

export const ${entityVariable} = ${renderTsValue(entity)} satisfies ${typeExpressionForEntity(entity)};

${identityBlock}
\`\`\`
`;
}
