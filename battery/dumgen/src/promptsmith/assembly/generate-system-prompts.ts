import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { promptSource as grammarAdpositionPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/adposition/prompt-source";
import { promptSource as grammarAdverbPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/adverb/prompt-source";
import { promptSource as grammarAuxiliaryPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/auxiliary/prompt-source";
import { promptSource as grammarCoordinatingConjunctionPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/prompt-source";
import { promptSource as grammarDeterminerPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/determiner/prompt-source";
import { promptSource as grammarInterjectionPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/interjection/prompt-source";
import { promptSource as grammarNounPromptSource } from "../laboratory/prompt-source/grammatical-resolution/de/lexeme/noun/prompt-source";
import { promptSource as intakePromptSource } from "../laboratory/prompt-source/intake/prompt-source";
import { promptSource as readingPromptSource } from "../laboratory/prompt-source/reading-resolution/de/prompt-source";
import { promptSource as segmentationPromptSource } from "../laboratory/prompt-source/segmentation/de/prompt-source";
import { promptSource as targetPromptSource } from "../laboratory/prompt-source/target-classification/de/high-level-whole-unit/prompt-source";
import type { SystemPromptRecipe } from "./system-prompt-codegen";
import { defineSystemPromptCodegen } from "./system-prompt-codegen";

const promptsmithRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const codegen = defineSystemPromptCodegen({
	promptSources: [
		intakePromptSource,
		segmentationPromptSource,
		targetPromptSource,
		grammarAdpositionPromptSource,
		grammarAdverbPromptSource,
		grammarAuxiliaryPromptSource,
		grammarCoordinatingConjunctionPromptSource,
		grammarDeterminerPromptSource,
		grammarInterjectionPromptSource,
		grammarNounPromptSource,
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

export const systemPromptRecipe: SystemPromptRecipe = codegen.recipe;

if (import.meta.main) await codegen.run();
