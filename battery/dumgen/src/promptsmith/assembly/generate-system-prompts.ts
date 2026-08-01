import { readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { CodegenRecipe } from "codegen";
import { defineCodegen, runCodegen } from "codegen";

import { body as grammarNounBody } from "../laboratory/prompt-part/grammatical-resolution/de/lexeme/noun/body";
import { examplesToUse as grammarNounExamples } from "../laboratory/prompt-part/grammatical-resolution/de/lexeme/noun/examples-to-use";
import { inputSchema as grammarNounInputSchema } from "../laboratory/prompt-part/grammatical-resolution/de/lexeme/noun/input-schema";
import { outputSchema as grammarNounOutputSchema } from "../laboratory/prompt-part/grammatical-resolution/de/lexeme/noun/output-schema";
import { body as intakeBody } from "../laboratory/prompt-part/intake/body";
import { examplesToUse as intakeExamples } from "../laboratory/prompt-part/intake/examples-to-use";
import { inputSchema as intakeInputSchema } from "../laboratory/prompt-part/intake/input-schema";
import { outputSchema as intakeOutputSchema } from "../laboratory/prompt-part/intake/output-schema";
import { body as readingNounBody } from "../laboratory/prompt-part/reading-resolution/de/lexeme/noun/body";
import { examplesToUse as readingNounExamples } from "../laboratory/prompt-part/reading-resolution/de/lexeme/noun/examples-to-use";
import { inputSchema as readingNounInputSchema } from "../laboratory/prompt-part/reading-resolution/de/lexeme/noun/input-schema";
import { outputSchema as readingNounOutputSchema } from "../laboratory/prompt-part/reading-resolution/de/lexeme/noun/output-schema";
import { body as segmentationBody } from "../laboratory/prompt-part/segmentation/de/body";
import { examplesToUse as segmentationExamples } from "../laboratory/prompt-part/segmentation/de/examples-to-use";
import { inputSchema as segmentationInputSchema } from "../laboratory/prompt-part/segmentation/de/input-schema";
import { outputSchema as segmentationOutputSchema } from "../laboratory/prompt-part/segmentation/de/output-schema";
import { body as targetBody } from "../laboratory/prompt-part/target-classification/de/high-level-whole-unit/body";
import { examplesToUse as targetExamples } from "../laboratory/prompt-part/target-classification/de/high-level-whole-unit/examples-to-use";
import { inputSchema as targetInputSchema } from "../laboratory/prompt-part/target-classification/de/high-level-whole-unit/input-schema";
import { outputSchema as targetOutputSchema } from "../laboratory/prompt-part/target-classification/de/high-level-whole-unit/output-schema";
import { assembleSystemPrompt } from "./assemble-system-prompt";

const assemblyRoot = dirname(fileURLToPath(import.meta.url));
const promptsmithRoot = join(assemblyRoot, "..");
const promptPartRoot = join(promptsmithRoot, "laboratory", "prompt-part");
const generatedRoot = join(
	promptsmithRoot,
	"laboratory",
	"generated-system-prompt",
);
const expectedPartFiles = [
	"body.ts",
	"examples-for-test.ts",
	"examples-to-use.ts",
	"input-schema.ts",
	"output-schema.ts",
] as const;

const promptSources = [
	{
		route: "intake",
		inputSchema: intakeInputSchema,
		outputSchema: intakeOutputSchema,
		body: intakeBody,
		examplesToUse: intakeExamples,
	},
	{
		route: "segmentation/de",
		inputSchema: segmentationInputSchema,
		outputSchema: segmentationOutputSchema,
		body: segmentationBody,
		examplesToUse: segmentationExamples,
	},
	{
		route: "target-classification/de/high-level-whole-unit",
		inputSchema: targetInputSchema,
		outputSchema: targetOutputSchema,
		body: targetBody,
		examplesToUse: targetExamples,
	},
	{
		route: "grammatical-resolution/de/lexeme/noun",
		inputSchema: grammarNounInputSchema,
		outputSchema: grammarNounOutputSchema,
		body: grammarNounBody,
		examplesToUse: grammarNounExamples,
	},
	{
		route: "reading-resolution/de/lexeme/noun",
		inputSchema: readingNounInputSchema,
		outputSchema: readingNounOutputSchema,
		body: readingNounBody,
		examplesToUse: readingNounExamples,
	},
] as const;

type SystemPromptRecipe = CodegenRecipe<
	Record<never, never>,
	{ readonly generated: { readonly root: string } },
	{ readonly route: string }
>;

export const systemPromptRecipe: SystemPromptRecipe = defineCodegen<
	Record<never, never>,
	{ readonly generated: { readonly root: string } },
	{ readonly route: string }
>({
	inputs: {},
	outputs: { generated: { root: generatedRoot } },
	async build() {
		await assertPromptSourceLayout();
		return promptSources.map((source) => ({
			id: `system-prompt:${source.route}`,
			to: { target: "generated" as const, path: `${source.route}.ts` },
			content: renderModule(assembleSystemPrompt(source)),
			provenance: expectedPartFiles
				.filter((file) => file !== "examples-for-test.ts")
				.map((file) => ({
					kind: "source" as const,
					path: join(promptPartRoot, source.route, file),
				})),
			meta: { route: source.route },
		}));
	},
});

async function assertPromptSourceLayout(): Promise<void> {
	for (const source of promptSources) {
		const directory = join(promptPartRoot, source.route);
		let actualFiles: string[];
		try {
			actualFiles = (await readdir(directory, { withFileTypes: true }))
				.filter((entry) => entry.isFile())
				.map((entry) => entry.name)
				.toSorted();
		} catch (cause) {
			throw new Error(
				`Prompt Source "${source.route}" cannot be read at ${directory}.`,
				{ cause },
			);
		}
		if (actualFiles.join("\n") !== expectedPartFiles.join("\n")) {
			throw new Error(
				`Prompt Source "${source.route}" must contain exactly ${expectedPartFiles.join(", ")}; found ${actualFiles.join(", ") || "no files"}.`,
			);
		}
	}
}

function renderModule(systemPrompt: string): string {
	return `// Generated by promptsmith/assembly/generate-system-prompts.ts. Do not edit.\n\nexport const systemPrompt = ${JSON.stringify(systemPrompt)};\n`;
}

if (import.meta.main) {
	const mode = process.argv.includes("--check") ? "check" : "write";
	const result = await runCodegen(systemPromptRecipe, { mode });
	if (mode === "check" && result.status === "changed") {
		const stale = result.plan.changes
			.filter((change) => change.kind !== "unchanged")
			.map((change) => relative(promptsmithRoot, change.destination));
		console.error(
			`Generated system prompts are stale: ${stale.join(", ")}`,
		);
		process.exitCode = 1;
	}
}
