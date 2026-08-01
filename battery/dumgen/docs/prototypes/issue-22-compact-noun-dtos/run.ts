// PROTOTYPE ONLY — bounded side-by-side experiment for GitHub issue #22.

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";
import { PROMPT_CATALOG } from "../../../src/catalog/prompt-catalog";
import { COMPACT_NOUN_EXPERIMENT_CATALOG } from "../../../src/experiments/issue-22-compact-noun-dtos/compact-prompts";
import { buildDeterministicComparison } from "../../../src/experiments/issue-22-compact-noun-dtos/comparison";
import {
	GRAMMATICAL_COMPARISON_CASES,
	READING_COMPARISON_CASES,
} from "../../../src/experiments/issue-22-compact-noun-dtos/comparison-cases";
import { stableJson } from "../../../src/lib/stable-json";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const MODEL = "gpt-5-nano";
const RUNNER_VERSION = "issue-22-compact-noun-dtos-v2";

type LoosePrompt = {
	readonly systemPrompt: string;
	readonly inputSchema: ZodType;
	readonly modelInputSchema?: ZodType;
	readonly outputSchema: ZodType;
	readonly outputPostcondition?: {
		assert(input: unknown, generated: unknown): void;
	};
	projectInput?(input: never): unknown;
	projectOutput?(input: never, generated: never): unknown;
	readonly generationParams: {
		readonly model: string;
		readonly maxOutputTokens: number;
	};
};

type LiveAttempt = {
	readonly arm: "verbose" | "compact";
	readonly stage: "grammaticalResolution" | "readingResolution";
	readonly caseId: string;
	readonly systemPromptBytes: number;
	readonly systemPromptSha256: string;
	readonly serializedInputBytes: number;
	readonly rawOutputBytes?: number;
	readonly usage?: unknown;
	readonly resolvedModel?: string;
	readonly responseId?: string;
	readonly latencyMs: number;
	readonly rawModelOutput?: unknown;
	readonly canonicalResult?: unknown;
	readonly canonicalMatchesReference: boolean;
	readonly codecSuccess: boolean;
	readonly error?: {
		readonly name: string;
		readonly message: string;
		readonly status?: number;
		readonly code?: string;
	};
};

const mode = process.argv[2] ?? "measure";
if (mode === "measure") {
	const payload = {
		runnerVersion: RUNNER_VERSION,
		model: MODEL,
		cases: [
			...GRAMMATICAL_COMPARISON_CASES.map(({ id }) => id),
			...READING_COMPARISON_CASES.map(({ id }) => id),
		],
		deterministic: buildDeterministicComparison(),
	};
	await writeJson(join(RUNS, "deterministic.json"), payload);
} else if (mode === "live") {
	if (!process.env.OPENAI_API_KEY) {
		throw new Error(
			"OPENAI_API_KEY is unavailable. Run with `bun --env-file ../../.env.local` from battery/dumgen.",
		);
	}
	const client = new OpenAI();
	const attempts: LiveAttempt[] = [];
	for (const comparisonCase of GRAMMATICAL_COMPARISON_CASES) {
		attempts.push(
			await runAttempt(client, {
				arm: "verbose",
				stage: "grammaticalResolution",
				caseId: comparisonCase.id,
				prompt: PROMPT_CATALOG.laboratory.grammaticalResolution.de
					.Lexeme.NOUN.prompt as LoosePrompt,
				input: comparisonCase.input,
				expectedCanonical: comparisonCase.expectedCanonical,
			}),
		);
		attempts.push(
			await runAttempt(client, {
				arm: "compact",
				stage: "grammaticalResolution",
				caseId: comparisonCase.id,
				prompt: COMPACT_NOUN_EXPERIMENT_CATALOG.grammaticalResolution
					.prompt as LoosePrompt,
				input: comparisonCase.input,
				expectedCanonical: comparisonCase.expectedCanonical,
			}),
		);
	}
	for (const comparisonCase of READING_COMPARISON_CASES) {
		attempts.push(
			await runAttempt(client, {
				arm: "verbose",
				stage: "readingResolution",
				caseId: comparisonCase.id,
				prompt: PROMPT_CATALOG.laboratory.readingResolution.de.Lexeme
					.NOUN.prompt as LoosePrompt,
				input: comparisonCase.input,
				expectedCanonical: comparisonCase.expectedCanonical,
			}),
		);
		attempts.push(
			await runAttempt(client, {
				arm: "compact",
				stage: "readingResolution",
				caseId: comparisonCase.id,
				prompt: COMPACT_NOUN_EXPERIMENT_CATALOG.readingResolution
					.prompt as LoosePrompt,
				input: comparisonCase.input,
				expectedCanonical: comparisonCase.expectedCanonical,
			}),
		);
	}

	const startedAt = new Date().toISOString();
	const runId = startedAt.replaceAll(/[:.]/gu, "-");
	await writeJson(join(RUNS, runId, "comparison.json"), {
		runnerVersion: RUNNER_VERSION,
		startedAt,
		model: MODEL,
		boundedCalls: attempts.length,
		retries: 0,
		store: false,
		deterministic: buildDeterministicComparison(),
		attempts,
	});
} else {
	throw new Error(
		`Unknown mode ${JSON.stringify(mode)}; use measure or live.`,
	);
}

async function runAttempt(
	client: OpenAI,
	args: {
		readonly arm: "verbose" | "compact";
		readonly stage: "grammaticalResolution" | "readingResolution";
		readonly caseId: string;
		readonly prompt: LoosePrompt;
		readonly input: unknown;
		readonly expectedCanonical: unknown;
	},
): Promise<LiveAttempt> {
	const parsedInput = args.prompt.inputSchema.parse(args.input);
	const projectedInput = args.prompt.projectInput
		? args.prompt.projectInput(parsedInput as never)
		: parsedInput;
	const modelInput = (
		args.prompt.modelInputSchema ?? args.prompt.inputSchema
	).parse(projectedInput);
	const serializedInput = stableJson(modelInput);
	const common = {
		arm: args.arm,
		stage: args.stage,
		caseId: args.caseId,
		systemPromptBytes: bytes(args.prompt.systemPrompt),
		systemPromptSha256: sha256(args.prompt.systemPrompt),
		serializedInputBytes: bytes(serializedInput),
	};
	const started = performance.now();
	let responseMetadata:
		| {
				readonly usage?: unknown;
				readonly resolvedModel?: string;
				readonly responseId?: string;
		  }
		| undefined;
	let rawModelOutput: unknown;
	try {
		const response = await client.responses.create({
			model: args.prompt.generationParams.model,
			input: [
				{ role: "system", content: args.prompt.systemPrompt },
				{ role: "user", content: serializedInput },
			],
			max_output_tokens: args.prompt.generationParams.maxOutputTokens,
			reasoning: { effort: "minimal" },
			store: false,
			text: {
				format: zodTextFormat(
					args.prompt.outputSchema,
					`issue_22_${args.stage}_${args.arm}`,
				),
				verbosity: "low",
			},
		});
		responseMetadata = {
			usage: response.usage,
			resolvedModel: response.model,
			responseId: response.id,
		};
		if (!response.output_text) {
			throw new Error(
				"Provider returned no structured model output text.",
			);
		}
		rawModelOutput = JSON.parse(response.output_text);
		const parsedOutput = args.prompt.outputSchema.parse(rawModelOutput);
		args.prompt.outputPostcondition?.assert(parsedInput, parsedOutput);
		const canonicalResult = args.prompt.projectOutput
			? args.prompt.projectOutput(
					parsedInput as never,
					parsedOutput as never,
				)
			: parsedOutput;
		return {
			...common,
			rawOutputBytes: bytes(stableJson(rawModelOutput)),
			...responseMetadata,
			latencyMs: Math.round(performance.now() - started),
			rawModelOutput,
			canonicalResult,
			canonicalMatchesReference:
				stableJson(canonicalResult) ===
				stableJson(args.expectedCanonical),
			codecSuccess: true,
		};
	} catch (cause) {
		return {
			...common,
			...(rawModelOutput === undefined
				? undefined
				: {
						rawOutputBytes: bytes(stableJson(rawModelOutput)),
						rawModelOutput,
					}),
			...responseMetadata,
			latencyMs: Math.round(performance.now() - started),
			canonicalMatchesReference: false,
			codecSuccess: false,
			error: describeError(cause),
		};
	}
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
	console.log(`Wrote ${relative(process.cwd(), path)}`);
}

function bytes(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

function describeError(cause: unknown): LiveAttempt["error"] {
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
