import type { AttestationSource } from "../../shared/types";
import { isSelection, isSurface } from "../entity/guards";
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
	csvId: string,
): string {
	const entity = source.entity;
	const kind = entityKindFor(entity);
	const lemma = lemmaForEntity(entity);
	const surface =
		isSelection(entity) || isSurface(entity)
			? surfaceForEntity(entity)
			: undefined;
	const displayName = surface?.normalizedFullSurface ?? lemma.canonicalLemma;
	const variableBase = camelCaseIdentifier(displayName, "attested");
	const entityVariable = `${variableBase}${kind}`;
	const idVariable = `${entityVariable}Id`;
	const importType = typeExpressionForEntity(entity).split("<", 1)[0];
	const title = source.title ?? displayName;
	const sentenceBlock =
		source.sentenceMarkdown === undefined
			? ""
			: `\nAttested Sentence:\n${source.sentenceMarkdown}\n`;

	return `# ${languageLabelFor(entity.language)} attestation: ${title}
${sentenceBlock}
\`\`\`ts
import type { ${importType} } from "dumling/types";

export const ${entityVariable} = ${renderTsValue(entity)} satisfies ${typeExpressionForEntity(entity)};

export const ${idVariable} =
\t${JSON.stringify(csvId)} as const;
\`\`\`
`;
}
