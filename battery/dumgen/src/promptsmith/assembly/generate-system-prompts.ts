import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promptSource as intakePromptSource } from "../laboratory/prompt-source/intake/prompt-source";
import { promptSource as readingPromptSource } from "../laboratory/prompt-source/reading-resolution/de/prompt-source";
import { promptSource as grammarFusionPromptSource } from "../production/grammatical-resolution/de/construction/fusion/prompt-source";
import { promptSource as grammarPairedFramePromptSource } from "../production/grammatical-resolution/de/construction/paired-frame/prompt-source";
import { promptSource as grammarAdjectivePromptSource } from "../production/grammatical-resolution/de/lexeme/adjective/prompt-source";
import { promptSource as grammarAdpositionPromptSource } from "../production/grammatical-resolution/de/lexeme/adposition/prompt-source";
import { promptSource as grammarAdverbPromptSource } from "../production/grammatical-resolution/de/lexeme/adverb/prompt-source";
import { promptSource as grammarAuxiliaryPromptSource } from "../production/grammatical-resolution/de/lexeme/auxiliary/prompt-source";
import { promptSource as grammarCoordinatingConjunctionPromptSource } from "../production/grammatical-resolution/de/lexeme/coordinating-conjunction/prompt-source";
import { promptSource as grammarDeterminerPromptSource } from "../production/grammatical-resolution/de/lexeme/determiner/prompt-source";
import { promptSource as grammarInterjectionPromptSource } from "../production/grammatical-resolution/de/lexeme/interjection/prompt-source";
import { promptSource as grammarNounPromptSource } from "../production/grammatical-resolution/de/lexeme/noun/prompt-source";
import { promptSource as grammarNumeralPromptSource } from "../production/grammatical-resolution/de/lexeme/numeral/prompt-source";
import { promptSource as grammarOtherPromptSource } from "../production/grammatical-resolution/de/lexeme/other/prompt-source";
import { promptSource as grammarParticlePromptSource } from "../production/grammatical-resolution/de/lexeme/particle/prompt-source";
import { promptSource as grammarPronounPromptSource } from "../production/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { promptSource as grammarProperNounPromptSource } from "../production/grammatical-resolution/de/lexeme/proper-noun/prompt-source";
import { promptSource as grammarSubordinatingConjunctionPromptSource } from "../production/grammatical-resolution/de/lexeme/subordinating-conjunction/prompt-source";
import { promptSource as grammarSymbolPromptSource } from "../production/grammatical-resolution/de/lexeme/symbol/prompt-source";
import { promptSource as grammarVerbPromptSource } from "../production/grammatical-resolution/de/lexeme/verb/prompt-source";
import { promptSource as grammarAphorismPromptSource } from "../production/grammatical-resolution/de/phraseme/aphorism/prompt-source";
import { promptSource as grammarCollocationPromptSource } from "../production/grammatical-resolution/de/phraseme/collocation/prompt-source";
import { promptSource as grammarDiscourseFormulaPromptSource } from "../production/grammatical-resolution/de/phraseme/discourse-formula/prompt-source";
import { promptSource as grammarIdiomPromptSource } from "../production/grammatical-resolution/de/phraseme/idiom/prompt-source";
import { promptSource as grammarProverbPromptSource } from "../production/grammatical-resolution/de/phraseme/proverb/prompt-source";
import {
	productionDemonstrationSelection,
	promptSource as productionTargetPromptSource,
} from "../production/prompt-part/target-classification/de/high-level-whole-unit";
import { selectedCaseSourcePaths } from "./golden-corpus";
import type { SystemPromptRecipe } from "./system-prompt-codegen";
import { defineSystemPromptCodegen } from "./system-prompt-codegen";

const promptsmithRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const laboratoryCodegen = defineSystemPromptCodegen({
	promptSources: [intakePromptSource, readingPromptSource],
	promptSourceRoot: join(promptsmithRoot, "laboratory", "prompt-source"),
	generatedRoot: join(
		promptsmithRoot,
		"laboratory",
		"generated-system-prompt",
	),
	displayRoot: promptsmithRoot,
	artifactIdPrefix: "system-prompt",
	generatedBy: "promptsmith/assembly/generate-system-prompts.ts",
	staleLabel: "Generated system prompts are stale",
});

const productionPromptSourceRoot = join(
	promptsmithRoot,
	"production",
	"prompt-part",
);
const productionRouteRoot = join(
	productionPromptSourceRoot,
	productionTargetPromptSource.route,
);
const productionCodegen = defineSystemPromptCodegen({
	promptSources: [
		productionTargetPromptSource,
		grammarFusionPromptSource,
		grammarPairedFramePromptSource,
		grammarAdjectivePromptSource,
		grammarAdpositionPromptSource,
		grammarAdverbPromptSource,
		grammarAuxiliaryPromptSource,
		grammarCoordinatingConjunctionPromptSource,
		grammarDeterminerPromptSource,
		grammarInterjectionPromptSource,
		grammarNounPromptSource,
		grammarNumeralPromptSource,
		grammarParticlePromptSource,
		grammarPronounPromptSource,
		grammarProperNounPromptSource,
		grammarSubordinatingConjunctionPromptSource,
		grammarSymbolPromptSource,
		grammarVerbPromptSource,
		grammarOtherPromptSource,
		grammarAphorismPromptSource,
		grammarCollocationPromptSource,
		grammarDiscourseFormulaPromptSource,
		grammarIdiomPromptSource,
		grammarProverbPromptSource,
	],
	promptSourceRoot: (source) =>
		source === productionTargetPromptSource
			? productionPromptSourceRoot
			: join(promptsmithRoot, "production"),
	generatedRoot: join(
		promptsmithRoot,
		"production",
		"generated-system-prompt",
	),
	displayRoot: promptsmithRoot,
	artifactIdPrefix: "production-system-prompt",
	generatedBy: "promptsmith/assembly/generate-system-prompts.ts",
	sourceLabel: "Production Prompt Source",
	staleLabel: "Generated production system prompts are stale",
	expectedRouteEntries: (source) =>
		source === productionTargetPromptSource
			? [
					"corpus",
					"demonstrations.ts",
					"index.ts",
					"prompt-part.ts",
					"prompt-source.ts",
					"representation.ts",
					"schemas.ts",
				]
			: undefined,
	provenancePaths: (source) =>
		source === productionTargetPromptSource
			? [
					join(productionRouteRoot, "prompt-source.ts"),
					join(productionRouteRoot, "schemas.ts"),
					join(productionRouteRoot, "prompt-part.ts"),
					join(productionRouteRoot, "demonstrations.ts"),
					join(productionRouteRoot, "representation.ts"),
					join(productionRouteRoot, "corpus", "corpus.ts"),
					join(productionRouteRoot, "corpus", "schemas.ts"),
					join(productionRouteRoot, "corpus", "selections.ts"),
					...selectedCaseSourcePaths(
						productionDemonstrationSelection,
					),
				]
			: undefined,
});

export const systemPromptRecipe: SystemPromptRecipe = laboratoryCodegen.recipe;
export const productionSystemPromptRecipe: SystemPromptRecipe =
	productionCodegen.recipe;

if (import.meta.main) {
	await laboratoryCodegen.run();
	await productionCodegen.run();
}
