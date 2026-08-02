// PROTOTYPE ONLY — bounded live evaluation of the current Reading Resolution prompt.
//
// Question: does the current German Reading Resolution prompt apply the
// no-splitting-semantic-pennies policy on ten deliberately tricky cases?

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { output } from "zod";
import { PROMPT_CATALOG } from "../../../src/catalog/prompt-catalog";
import { stableJson } from "../../../src/lib/stable-json";
import { examplesForTest } from "../../../src/promptsmith/laboratory/prompt-part/reading-resolution/de/examples-for-test";
import type { inputSchema } from "../../../src/promptsmith/laboratory/prompt-part/reading-resolution/de/input-schema";
import type { outputSchema } from "../../../src/promptsmith/laboratory/prompt-part/reading-resolution/de/output-schema";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const RUNNER_VERSION = "reading-resolution-gauntlet-v1";
const RUN_MAX_OUTPUT_TOKENS = 1024;
const prompt = PROMPT_CATALOG.laboratory.readingResolution.de.prompt;
const testCases: readonly {
	readonly id: string;
	readonly input: output<typeof inputSchema>;
	readonly idealOutput: output<typeof outputSchema>;
}[] = examplesForTest;

if (testCases.length !== 10) {
	throw new Error(
		`The Reading Resolution gauntlet runs only with exactly ten agreed examples-for-test cases; found ${testCases.length}.`,
	);
}

if (!process.env.OPENAI_API_KEY) {
	throw new Error(
		"OPENAI_API_KEY is unavailable. Run through `bun run prototype:reading-resolution-gauntlet` from battery/dumgen.",
	);
}

const client = new OpenAI();
const attempts = [];

for (const [index, testCase] of testCases.entries()) {
	const input = prompt.modelInputSchema.parse(testCase.input);
	const started = performance.now();
	try {
		const response = await client.responses.create({
			model: prompt.generationParams.model,
			input: [
				{ role: "system", content: prompt.systemPrompt },
				{ role: "user", content: stableJson(input) },
			],
			max_output_tokens: RUN_MAX_OUTPUT_TOKENS,
			reasoning: { effort: "minimal" },
			store: false,
			text: {
				format: zodTextFormat(
					prompt.outputSchema,
					"reading_resolution_gauntlet",
				),
				verbosity: "low",
			},
		});
		if (!response.output_text) {
			throw new Error(
				`Provider returned no structured output text (status: ${response.status}; incomplete reason: ${response.incomplete_details?.reason ?? "none"}).`,
			);
		}
		const output = prompt.outputSchema.parse(
			JSON.parse(response.output_text),
		);
		const expectedDecisionPass =
			output.decision === testCase.idealOutput.decision;
		const newEmojiAbsentFromExisting =
			testCase.idealOutput.decision === "New"
				? !input.existingEmojiDescriptions.includes(
						output.emojiDescription,
					)
				: null;
		const reusedExpectedDescription =
			testCase.idealOutput.decision === "Reuse"
				? output.emojiDescription ===
					testCase.idealOutput.emojiDescription
				: null;
		const contractPass =
			expectedDecisionPass &&
			(testCase.idealOutput.decision === "New"
				? newEmojiAbsentFromExisting
				: reusedExpectedDescription);
		attempts.push({
			caseId: testCase.id,
			input,
			idealOutput: testCase.idealOutput,
			output,
			contractPass,
			expectedDecisionPass,
			newEmojiAbsentFromExisting,
			reusedExpectedDescription,
			latencyMs: Math.round(performance.now() - started),
			resolvedModel: response.model,
			responseId: response.id,
			usage: response.usage,
		});
		console.log(
			`${contractPass ? "PASS" : "FAIL"} ${index + 1}/${testCases.length} ${testCase.id}: expected ${stableJson(testCase.idealOutput)}, received ${stableJson(output)}`,
		);
	} catch (cause) {
		const error = describeError(cause);
		attempts.push({
			caseId: testCase.id,
			input,
			idealOutput: testCase.idealOutput,
			contractPass: false,
			expectedDecisionPass: false,
			newEmojiAbsentFromExisting:
				testCase.idealOutput.decision === "New" ? false : null,
			reusedExpectedDescription:
				testCase.idealOutput.decision === "Reuse" ? false : null,
			latencyMs: Math.round(performance.now() - started),
			error,
		});
		console.log(
			`FAIL ${index + 1}/${testCases.length} ${testCase.id}: ${error.name}: ${error.message}`,
		);
	}
}

const contractScore = attempts.filter(
	({ contractPass }) => contractPass,
).length;
const startedAt = new Date().toISOString();
const runId = startedAt.replaceAll(/[:.]/gu, "-");
const result = {
	runnerVersion: RUNNER_VERSION,
	startedAt,
	model: prompt.generationParams.model,
	catalogMaxOutputTokens: prompt.generationParams.maxOutputTokens,
	runMaxOutputTokens: RUN_MAX_OUTPUT_TOKENS,
	promptSha256: createHash("sha256")
		.update(prompt.systemPrompt, "utf8")
		.digest("hex"),
	boundedCalls: testCases.length,
	retries: 0,
	store: false,
	contractScore,
	attempts,
};
const destination = join(RUNS, runId, "results.json");
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(`\nContract score: ${contractScore}/${testCases.length}`);
console.log(`Wrote ${relative(process.cwd(), destination)}`);

function describeError(cause: unknown): {
	readonly name: string;
	readonly message: string;
	readonly status?: number;
	readonly code?: string;
} {
	if (!(cause instanceof Error)) {
		return { name: "Error", message: String(cause) };
	}
	const providerError = cause as Error & {
		readonly status?: number;
		readonly code?: string;
	};
	return {
		name: cause.name,
		message: cause.message,
		...(providerError.status === undefined
			? undefined
			: { status: providerError.status }),
		...(providerError.code === undefined
			? undefined
			: { code: providerError.code }),
	};
}
