import { fileURLToPath } from "node:url";
import { defineCodegen, formatTypeScript, runCodegenCommand } from "codegen";
import {
	compileZodValidationArtifacts,
	emitLinkedValidationRegistry,
	emitValidationOutputTypes,
} from "common-utils/validation-compiler";
import {
	registrations as dumlingOperations,
	dumlingOutputTypes,
} from "dumling/codegen";
import { encodedValidation as dumlingValidation } from "dumling/validation-artifact";
import {
	conjugationClassesSchema,
	conjugationClassSchema,
	directSemanticRelationSchema,
	englishValencyComplementSchema,
	formulaRoleSchema,
	germanValencyComplementSchema,
	governedCaseSchema,
	governmentProjectionSchema,
	governmentRelationSchema,
	hebrewValencyComplementSchema,
	knowledgeChangeSchema,
	knowledgeRequestMaskSchema,
	knowledgeSelectionInputSchema,
	knowledgeSettingsSchema,
	lexemeUnitShadowSchema,
	locutionTypeSchema,
	morphologicalTreeNodeSchema,
	morphologicalTreeSchema,
	nounPluralSchema,
	participleMeaningSchema,
	participleProjectionSchema,
	participleRelationSchema,
	participleSourceSchema,
	pendingSemanticRelationSchema,
	pluralPatternSchema,
	readingKnowledgeSchema,
	sayingTypeSchema,
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
	dumrelOutputTypeExports,
	dumrelTypePreservingOperations,
} from "./output-types.js";

const operations = dumlingOperations;
const compiled = compileZodValidationArtifacts({
	schemas: {
		knowledgeSettings: knowledgeSettingsSchema,
		knowledgeRequestMask: knowledgeRequestMaskSchema,
		knowledgeSelectionInput: knowledgeSelectionInputSchema,
		knowledgeChange: knowledgeChangeSchema,
		readingKnowledge: readingKnowledgeSchema,
		directSemanticRelation: directSemanticRelationSchema,
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
		germanValencyComplement: germanValencyComplementSchema,
		hebrewValencyComplement: hebrewValencyComplementSchema,
		englishValencyComplement: englishValencyComplementSchema,
		valencyComplement: valencyComplementSchema,
		valencySlot: valencySlotSchema,
		governmentRelation: governmentRelationSchema,
		governmentProjection: governmentProjectionSchema,
		participleMeaning: participleMeaningSchema,
		participleSource: participleSourceSchema,
		participleRelation: participleRelationSchema,
		participleProjection: participleProjectionSchema,
		pluralPattern: pluralPatternSchema,
		nounPlural: nounPluralSchema,
		conjugationClass: conjugationClassSchema,
		conjugationClasses: conjugationClassesSchema,
		locutionType: locutionTypeSchema,
		sayingType: sayingTypeSchema,
		formulaRole: formulaRoleSchema,
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
const generated = new URL("../src/generated/", import.meta.url);
const recipe = defineCodegen({
	inputs: {},
	outputs: { generated: { root: fileURLToPath(generated) } },
	build: () =>
		Promise.all(
			Object.entries(outputs).map(async ([name, source]) => ({
				id: name,
				to: { target: "generated" as const, path: name },
				content: await formatTypeScript(
					source,
					new URL(name, generated),
				),
				provenance: [],
				meta: null,
			})),
		),
});
await runCodegenCommand(recipe, {
	label: "Dumrel validation and structural types",
});
