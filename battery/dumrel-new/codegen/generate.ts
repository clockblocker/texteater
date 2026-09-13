import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
	compileZodValidationArtifacts,
	emitValidationOutputTypes,
} from "codegen";
import { registrations as dumlingOperations } from "../../dumling-new/codegen/operations.js";
import {
	directSemanticRelationSchema,
	knowledgeChangeSchema,
	lexicalBreakdownSchema,
	morphologicalTreeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
	semanticRelationsSchema,
	translationLanguageSchema,
	unitShadowSchema,
} from "../src/schemas.js";
import {
	knowledgeRequestMaskSchema,
	knowledgeSelectionInputSchema,
	knowledgeSettingsSchema,
} from "../src/selection-schemas.js";
import { normalizeText } from "../src/semantics.js";
import { formatTypeScript } from "./format-typescript.js";

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
		pendingSemanticRelation: pendingSemanticRelationSchema,
		semanticRelations: semanticRelationsSchema,
		translationLanguage: translationLanguageSchema,
		unitShadow: unitShadowSchema,
	},
	operations,
});
const outputs = {
	"types.ts": `// Generated from canonical Dumrel Zod schemas. Run bun run generate.\n${emitValidationOutputTypes(
		{
			artifact: compiled,
			exports: {
				KnowledgeSettings: "knowledgeSettings",
				KnowledgeRequestMask: "knowledgeRequestMask",
				KnowledgeSelectionInput: "knowledgeSelectionInput",
				DirectSemanticRelation: "directSemanticRelation",
				TranslationLanguage: "translationLanguage",
				UnitShadow: "unitShadow",
				LexicalBreakdown: "lexicalBreakdown",
				MorphologicalTree: "morphologicalTree",
				PendingSemanticRelation: "pendingSemanticRelation",
				SemanticRelations: "semanticRelations",
				ReadingKnowledge: "readingKnowledge",
				KnowledgeChange: "knowledgeChange",
			},
			typePreservingOperations: [
				"dumling.feature-bag.marked",
				"dumling.de-pronoun.core",
				"dumling.emoji-description",
				"dumling.normalize-form",
				"dumrel.normalize-text",
			],
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
