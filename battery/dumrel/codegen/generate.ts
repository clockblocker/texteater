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
	dumlingTypePreservingOperations,
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
	locutionTypeSchema,
	morphologicalTreeNodeSchema,
	morphologicalTreeSchema,
	nounPluralSchema,
	participleMeaningSchema,
	participleProjectionSchema,
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

/**
 * Dumrel's named output types, keyed by the compiled root each one names.
 * `src/types.ts` re-exports some and `src/` reads others. The `unexported`
 * ones are only read by name inside other types, so hovers show their Domain
 * names without the module offering them. Every other shape is inlined.
 */
const outputTypeExports = {
	KnowledgeSettings: "knowledgeSettings",
	KnowledgeRequestMask: "knowledgeRequestMask",
	KnowledgeSelectionInput: "knowledgeSelectionInput",
	DirectSemanticRelation: "directSemanticRelation",
	TranslationLanguage: "translationLanguage",
	UnitShadow: "unitShadow",
	MorphologicalTree: "morphologicalTree",
	MorphologicalTreeNode: "morphologicalTreeNode",
	PendingSemanticRelation: "pendingSemanticRelation",
	SemanticRelations: "semanticRelations",
	ReadingKnowledge: "readingKnowledge",
	KnowledgeChange: "knowledgeChange",
	SemanticRelation: "semanticRelation",
	SemanticRelationProjection: "semanticRelationProjection",
	GovernedCase: "governedCase",
	ValencySlotStatus: "valencySlotStatus",
	ValencyReferent: "valencyReferent",
	GermanValencyComplement: "germanValencyComplement",
	HebrewValencyComplement: "hebrewValencyComplement",
	EnglishValencyComplement: "englishValencyComplement",
	ValencyComplement: "valencyComplement",
	ValencySlot: "valencySlot",
	GovernmentRelation: "governmentRelation",
	GovernmentProjection: "governmentProjection",
	ParticipleMeaning: "participleMeaning",
	ParticipleSource: "participleSource",
	ParticipleProjection: "participleProjection",
	PluralPattern: "pluralPattern",
	NounPlural: "nounPlural",
	ConjugationClass: "conjugationClass",
	ConjugationClasses: "conjugationClasses",
	LocutionType: "locutionType",
	SayingType: "sayingType",
	FormulaRole: "formulaRole",
};
const unexportedOutputTypes = [
	"ValencyReferent",
	"GovernmentRelation",
	"ParticipleMeaning",
	"MorphologicalTree",
	"SayingType",
	"FormulaRole",
];

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
			exports: outputTypeExports,
			unexported: unexportedOutputTypes,
			typePreservingOperations: dumlingTypePreservingOperations,
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
