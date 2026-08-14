import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promptSource as grammarFusionPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/construction/fusion/prompt-source";
import { promptSource as grammarPairedFramePromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/construction/paired-frame/prompt-source";

import { promptSource as grammarAdjectivePromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/adjective/prompt-source";
import { promptSource as grammarAdpositionPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/adposition/prompt-source";
import { promptSource as grammarAdverbPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/adverb/prompt-source";
import { promptSource as grammarAuxiliaryPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/auxiliary/prompt-source";
import { promptSource as grammarCoordinatingConjunctionPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/prompt-source";
import { promptSource as grammarDeterminerPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/determiner/prompt-source";
import { promptSource as grammarInterjectionPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/interjection/prompt-source";
import { promptSource as grammarNounPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/noun/prompt-source";
import { promptSource as grammarNumeralPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/numeral/prompt-source";
import { promptSource as grammarOtherPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/other/prompt-source";
import { promptSource as grammarParticlePromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/particle/prompt-source";
import { promptSource as grammarPronounPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { promptSource as grammarProperNounPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/proper-noun/prompt-source";
import { promptSource as grammarSubordinatingConjunctionPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/prompt-source";
import { promptSource as grammarSymbolPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/symbol/prompt-source";
import { promptSource as grammarVerbPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/prompt-source";
import { promptSource as grammarAphorismPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/phraseme/aphorism/prompt-source";
import { promptSource as grammarCollocationPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/prompt-source";
import { promptSource as grammarDiscourseFormulaPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/phraseme/discourse-formula/prompt-source";
import { promptSource as grammarIdiomPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/prompt-source";
import { promptSource as grammarProverbPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/phraseme/proverb/prompt-source";
import { promptSource as intakePromptSource } from "../laboratory/prompt-source/intake/prompt-source";
import { promptSource as readingPromptSource } from "../laboratory/prompt-source/reading-resolution/de/prompt-source";
import {
	productionDemonstrationSelection,
	promptSource as productionTargetPromptSource,
} from "../production/prompt-part/target-classification/de/high-level-whole-unit";
import { selectedCaseSourcePaths } from "./golden-corpus";
import type { SystemPromptRecipe } from "./system-prompt-codegen";
import { defineSystemPromptCodegen } from "./system-prompt-codegen";

const promptsmithRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const codegen = defineSystemPromptCodegen({
	promptSources: [
		intakePromptSource,
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
		readingPromptSource,
	],
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
	promptSources: [productionTargetPromptSource],
	promptSourceRoot: productionPromptSourceRoot,
	generatedRoot: join(
		promptsmithRoot,
		"production",
		"generated-system-prompt",
	),
	displayRoot: promptsmithRoot,
	artifactIdPrefix: "production-system-prompt",
	generatedBy: "promptsmith/assembly/generate-system-prompts.ts",
	sourceLabel: "Production Prompt Part",
	staleLabel: "Generated production system prompts are stale",
	expectedRouteEntries: () => [
		"corpus",
		"demonstrations.ts",
		"index.ts",
		"prompt-part.ts",
		"prompt-source.ts",
		"representation.ts",
		"schemas.ts",
	],
	provenancePaths: () => [
		join(productionRouteRoot, "prompt-source.ts"),
		join(productionRouteRoot, "schemas.ts"),
		join(productionRouteRoot, "prompt-part.ts"),
		join(productionRouteRoot, "demonstrations.ts"),
		join(productionRouteRoot, "representation.ts"),
		join(productionRouteRoot, "corpus", "corpus.ts"),
		join(productionRouteRoot, "corpus", "schemas.ts"),
		join(productionRouteRoot, "corpus", "selections.ts"),
		...selectedCaseSourcePaths(productionDemonstrationSelection),
	],
});

export const systemPromptRecipe: SystemPromptRecipe = codegen.recipe;
export const productionSystemPromptRecipe: SystemPromptRecipe =
	productionCodegen.recipe;

if (import.meta.main) {
	await codegen.run();
	await productionCodegen.run();
}
