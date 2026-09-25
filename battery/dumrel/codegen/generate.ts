import { mkdir, readFile, writeFile } from "node:fs/promises";
import { encodedValidation as dumlingValidation } from "dumling/validation-artifact";
import {
	compileZodValidationArtifacts,
	emitLinkedValidationRegistry,
	emitValidationOutputTypes,
} from "dumval/compiler";
import { registrations as dumlingOperations } from "../../dumling/codegen/operations.js";
import { dumlingOutputTypes } from "../../dumling/codegen/output-types.js";
import {
	directSemanticRelationSchema,
	governedCaseSchema,
	governmentProjectionSchema,
	governmentRelationSchema,
	knowledgeChangeSchema,
	lexemeUnitShadowSchema,
	lexicalBreakdownSchema,
	morphologicalTreeNodeSchema,
	morphologicalTreeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
	semanticProjectionInputSchema,
	semanticRelationProjectionSchema,
	semanticRelationSchema,
	semanticRelationsSchema,
	translationLanguageSchema,
	unitShadowSchema,
	valencyComplementSchema,
	valencyReferentSchema,
	valencySlotSchema,
	valencySlotStatusSchema,
} from "../src/schemas.js";
import {
	knowledgeRequestMaskSchema,
	knowledgeSelectionInputSchema,
	knowledgeSettingsSchema,
} from "../src/selection-schemas.js";
import { normalizeText } from "../src/semantics.js";
import { formatTypeScript } from "./format-typescript.js";
import {
	dumrelOutputTypeExports,
	dumrelTypePreservingOperations,
} from "./output-types.js";

const operations = [
	...dumlingOperations,
	{
		construct: "overwrite",
		implementation: normalizeText,
		name: "dumrel.normalize-text",
		version: 1,
	},
] as const;
const compiled = compileZodValidationArtifacts({
	schemas: {
		knowledgeSettings: knowledgeSettingsSchema,
		knowledgeRequestMask: knowledgeRequestMaskSchema,
		knowledgeSelectionInput: knowledgeSelectionInputSchema,
		knowledgeChange: knowledgeChangeSchema,
		readingKnowledge: readingKnowledgeSchema,
		directSemanticRelation: directSemanticRelationSchema,
		lexicalBreakdown: lexicalBreakdownSchema,
		morphologicalTree: morphologicalTreeSchema,
		morphologicalTreeNode: morphologicalTreeNodeSchema,
		pendingSemanticRelation: pendingSemanticRelationSchema,
		semanticRelations: semanticRelationsSchema,
		translationLanguage: translationLanguageSchema,
		unitShadow: unitShadowSchema,
		lexemeUnitShadow: lexemeUnitShadowSchema,
		semanticProjectionInput: semanticProjectionInputSchema,
		semanticRelation: semanticRelationSchema,
		semanticRelationProjection: semanticRelationProjectionSchema,
		governedCase: governedCaseSchema,
		valencySlotStatus: valencySlotStatusSchema,
		valencyReferent: valencyReferentSchema,
		valencyComplement: valencyComplementSchema,
		valencySlot: valencySlotSchema,
		governmentRelation: governmentRelationSchema,
		governmentProjection: governmentProjectionSchema,
	},
	operations,
});
const outputs = {
	"linked-validation.ts": emitLinkedValidationRegistry([
		{ owner: "dumling", registry: JSON.parse(dumlingValidation) },
		{ owner: "dumrel", registry: compiled },
	]),
	"types.ts": `// Generated from canonical Dumrel Zod schemas. Run bun run generate.\n${emitValidationOutputTypes(
		{
			artifact: compiled,
			exports: dumrelOutputTypeExports,
			typePreservingOperations: dumrelTypePreservingOperations,
			external: [dumlingOutputTypes()],
		},
	)}\n`,
	"validation.ts": `// Generated from canonical Dumrel Zod schemas. Run bun run generate.\nexport const encodedValidation: string = ${JSON.stringify(JSON.stringify(compiled))};\n`,
};
const check = process.argv.includes("--check");
for (const [name, source] of Object.entries(outputs)) {
	const path = new URL(`../src/generated/${name}`, import.meta.url);
	const output = await formatTypeScript(source, path);
	if (check) {
		if ((await readFile(path, "utf8").catch(() => "")) !== output)
			throw Error(
				`Stale generated Dumrel artifact: ${name}; run bun run generate`,
			);
	} else {
		await mkdir(new URL(".", path), { recursive: true });
		await writeFile(path, output);
	}
}
console.log(
	`${check ? "Verified" : "Generated"} Dumrel validation and structural types`,
);
