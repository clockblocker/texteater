import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defineSystemPromptCodegen } from "../../../assembly";
import { promptSource as grammarPromptSource } from "./prompt-source/grammatical-resolution/de/lexeme/noun/prompt-source";
import { promptSource as readingPromptSource } from "./prompt-source/reading-resolution/de/lexeme/noun/prompt-source";

const experimentRoot = dirname(fileURLToPath(import.meta.url));
const codegen = defineSystemPromptCodegen({
	promptSources: [grammarPromptSource, readingPromptSource],
	promptSourceRoot: join(experimentRoot, "prompt-source"),
	generatedRoot: join(experimentRoot, "generated-system-prompt"),
	displayRoot: experimentRoot,
	artifactIdPrefix: "issue-22-compact-system-prompt",
	generatedBy: "issue-22-compact-noun-dtos/generate-system-prompts.ts",
	sourceLabel: "Issue #22 Prompt Source",
	staleLabel: "Issue #22 generated system prompts are stale",
});

export const compactSystemPromptRecipe = codegen.recipe;

if (import.meta.main) await codegen.run();
