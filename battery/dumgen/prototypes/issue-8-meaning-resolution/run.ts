import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";

import { assertCorpusScope, CORPUS, type MeaningCase } from "./corpus";
import {
	type AttemptForScoring,
	type MeaningCandidateOutput,
	scoreArm,
	validateOutput,
} from "./logic";
import {
	AGENTIC_PROMPT,
	ARM_IDS,
	type ArmId,
	armBuildHash,
	caseInput,
	DECISION_ONLY_PROMPT,
	DIRECT_PROMPT,
	DRAFT_ONLY_PROMPT,
	FEW_SHOT_PROMPT,
	stubInput,
} from "./prompts";

const MODEL_ALIAS = process.env.MODEL ?? "gpt-5-nano";
const REPETITIONS = positiveInteger("REPETITIONS", 3);
const CONCURRENCY = positiveInteger("CONCURRENCY", 6);
const SHUFFLE_SEED = positiveInteger("SHUFFLE_SEED", 8008);
const RUN_ID = process.env.RUN_ID ?? "current";
const CASE_LIMIT = positiveInteger("CASE_LIMIT", CORPUS.length);
const SELECTED_CORPUS = CORPUS.slice(0, CASE_LIMIT);
const SELECTED_ARMS = armFilter();
const MAX_OUTPUT_TOKENS = 256;
const PRICE_SNAPSHOT =
	MODEL_ALIAS === "gpt-5-nano"
		? {
				currency: "USD",
				effectiveDate: "2026-07-31",
				source: "https://developers.openai.com/api/docs/models/gpt-5-nano",
				inputPerMillion: 0.05,
				cachedInputPerMillion: 0.005,
				outputPerMillion: 0.4,
			}
		: null;

const DraftSchema = z
	.object({
		meaningInEmojis: z.string().min(1),
		descriptionBlocks: z.array(z.string().min(1)).min(1),
	})
	.strict();
const MeaningOutputSchema = z
	.object({
		decision: z.enum(["ReuseExisting", "DraftNew"]),
		existingMeaningId: z.string().nullable(),
		draft: DraftSchema.nullable(),
	})
	.strict();
const DecisionSchema = z
	.object({
		decision: z.enum(["ReuseExisting", "DraftNew"]),
		existingMeaningId: z.string().nullable(),
	})
	.strict();

type Usage = {
	readonly inputTokens: number;
	readonly cachedInputTokens: number;
	readonly outputTokens: number;
	readonly reasoningTokens: number;
};
type RawResponse = Record<string, unknown>;
type AttemptRecord = AttemptForScoring & {
	readonly startedAt: string;
	readonly endedAt: string;
	readonly experimentBuildHash: string;
	readonly modelAlias: string;
	readonly actualModels: readonly string[];
	readonly responseIds: readonly string[];
	readonly rawResponses: readonly RawResponse[];
};
type ModelCallResult = {
	readonly output: MeaningCandidateOutput;
	readonly rawResponses: readonly RawResponse[];
	readonly usage: Usage;
	readonly actualModels: readonly string[];
	readonly responseIds: readonly string[];
};

assertCorpusScope(SELECTED_CORPUS);
const prototypeDirectory = dirname(fileURLToPath(import.meta.url));
const resultsDirectory = join(prototypeDirectory, "results", RUN_ID);
const client = new OpenAI();
await mkdir(resultsDirectory, { recursive: true });

const accessProbe = await probeModelAccess();
await writeJson(join(resultsDirectory, "model-access.json"), accessProbe);

const attempts: AttemptRecord[] = [];
for (const armId of SELECTED_ARMS) {
	console.log(`\n${armId}: starting ${SELECTED_CORPUS.length * REPETITIONS}`);
	const jobs = shuffledJobs(SELECTED_CORPUS, REPETITIONS, SHUFFLE_SEED);
	const armAttempts = await concurrentMap(
		jobs,
		CONCURRENCY,
		async ({ meaningCase, repetition }, completed, total) => {
			const attempt = await runAttempt(armId, meaningCase, repetition);
			if (completed % 10 === 0 || completed === total) {
				console.log(`${armId}: ${completed}/${total}`);
			}
			return attempt;
		},
	);
	attempts.push(...armAttempts);
	await writeJsonLines(join(resultsDirectory, `${armId}.jsonl`), armAttempts);
}

const summaries = SELECTED_ARMS.map((armId) =>
	scoreArm(
		armId,
		attempts.filter((attempt) => attempt.armId === armId),
		SELECTED_CORPUS,
	),
);
const manifest = {
	prototype: "issue-8-meaning-resolution",
	generatedAt: new Date().toISOString(),
	modelAlias: MODEL_ALIAS,
	actualModels: [
		...new Set(attempts.flatMap((attempt) => attempt.actualModels)),
	],
	repetitions: REPETITIONS,
	concurrency: CONCURRENCY,
	shuffleSeed: SHUFFLE_SEED,
	runId: RUN_ID,
	maxOutputTokens: MAX_OUTPUT_TOKENS,
	reasoningEffort: "minimal",
	textVerbosity: "low",
	store: false,
	corpusVersion: "meaning-resolution-v1",
	caseCount: SELECTED_CORPUS.length,
	groupCounts: Object.fromEntries(
		[
			"baseline-reuse",
			"penny-control",
			"false-merge-trap",
			"multi-candidate",
			"empty-inventory",
		].map((group) => [
			group,
			SELECTED_CORPUS.filter((meaningCase) => meaningCase.group === group)
				.length,
		]),
	),
	scopeInvariant:
		"Every supplied candidate belongs to learner-eval-001 and the case's resolved opaque Entry.",
	armBuildHashes: Object.fromEntries(
		SELECTED_ARMS.map((armId) => [armId, armBuildHash(armId)]),
	),
	priceSnapshot: PRICE_SNAPSHOT,
	modelAccessProbe: accessProbe,
};
await writeJson(join(resultsDirectory, "manifest.json"), manifest);
await writeJson(join(resultsDirectory, "summary.json"), summaries);
await writeFile(
	join(resultsDirectory, "summary.md"),
	renderSummary(summaries, manifest),
	"utf8",
);

console.log(`\nDone: ${resultsDirectory}`);
console.table(
	summaries.map((summary) => ({
		arm: summary.armId,
		full: percent(summary.fullExact),
		decision: percent(summary.decisionExact),
		reuse: percent(summary.reuseIdExact),
		draft: percent(summary.draftExact),
		falseSplit: percent(summary.falseSplitRate),
		falseMerge: percent(summary.falseMergeRate),
		invalid: percent(summary.invalidAttemptRate),
		p95ms: Math.round(summary.latencyMs.p95),
		cost: `$${summary.costUsd.toFixed(6)}`,
	})),
);

async function runAttempt(
	armId: ArmId,
	meaningCase: MeaningCase,
	repetition: number,
): Promise<AttemptRecord> {
	const startedAt = new Date().toISOString();
	const started = performance.now();
	try {
		const call =
			armId === "agentic-candidate-inspection"
				? await runAgentic(meaningCase)
				: armId === "progressive-decision-then-draft"
					? await runProgressive(meaningCase)
					: await runDirect(armId, meaningCase);
		return {
			armId,
			caseId: meaningCase.id,
			repetition,
			startedAt,
			endedAt: new Date().toISOString(),
			latencyMs: performance.now() - started,
			experimentBuildHash: armBuildHash(armId),
			modelAlias: MODEL_ALIAS,
			actualModels: call.actualModels,
			responseIds: call.responseIds,
			rawResponses: call.rawResponses,
			rawOutputBytes: byteLength(call.rawResponses),
			usage: call.usage,
			result: validateOutput(meaningCase, call.output),
		};
	} catch (error) {
		return {
			armId,
			caseId: meaningCase.id,
			repetition,
			startedAt,
			endedAt: new Date().toISOString(),
			latencyMs: performance.now() - started,
			experimentBuildHash: armBuildHash(armId),
			modelAlias: MODEL_ALIAS,
			actualModels: [],
			responseIds: [],
			rawResponses: [],
			rawOutputBytes: 0,
			usage: zeroUsage(),
			result: {
				ok: false,
				category: "provider_or_parse_error",
				message: errorMessage(error),
			},
		};
	}
}

async function runDirect(
	armId: Exclude<
		ArmId,
		"agentic-candidate-inspection" | "progressive-decision-then-draft"
	>,
	meaningCase: MeaningCase,
): Promise<ModelCallResult> {
	const presentation =
		armId === "direct-descriptions-forward" ||
		armId === "direct-descriptions-reverse"
			? "descriptions"
			: armId === "direct-description-emoji"
				? "description-emoji"
				: "full";
	const reverse = armId === "direct-descriptions-reverse";
	const systemPrompt =
		armId === "direct-full-few-shot" ? FEW_SHOT_PROMPT : DIRECT_PROMPT;
	const response = await client.responses.parse({
		model: MODEL_ALIAS,
		input: [
			{ role: "system", content: systemPrompt },
			{
				role: "user",
				content: caseInput(meaningCase, presentation, reverse),
			},
		],
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: "minimal" },
		store: false,
		text: {
			format: zodTextFormat(MeaningOutputSchema, "meaning_resolution"),
			verbosity: "low",
		},
		prompt_cache_key: armBuildHash(armId),
	});
	if (response.output_parsed === null) {
		throw new Error("direct response had no parsed output");
	}
	return oneResponse(response, response.output_parsed);
}

async function runProgressive(
	meaningCase: MeaningCase,
): Promise<ModelCallResult> {
	const first = await client.responses.parse({
		model: MODEL_ALIAS,
		input: [
			{ role: "system", content: DECISION_ONLY_PROMPT },
			{ role: "user", content: caseInput(meaningCase, "full", false) },
		],
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: "minimal" },
		store: false,
		text: {
			format: zodTextFormat(DecisionSchema, "meaning_decision"),
			verbosity: "low",
		},
		prompt_cache_key: armBuildHash("progressive-decision-then-draft"),
	});
	if (first.output_parsed === null) {
		throw new Error("progressive decision response had no parsed output");
	}
	if (first.output_parsed.decision === "ReuseExisting") {
		return {
			output: {
				decision: "ReuseExisting",
				existingMeaningId: first.output_parsed.existingMeaningId,
				draft: null,
			},
			rawResponses: [toRaw(first)],
			usage: readUsage(first),
			actualModels: [first.model],
			responseIds: [first.id],
		};
	}
	const second = await client.responses.parse({
		model: MODEL_ALIAS,
		input: [
			{ role: "system", content: DRAFT_ONLY_PROMPT },
			{
				role: "user",
				content: JSON.stringify(
					{
						language: meaningCase.language,
						resolvedEntryId: meaningCase.entryId,
						citationForm: meaningCase.citationForm,
						context: meaningCase.context,
						normalizedSurface: meaningCase.normalizedSurface,
					},
					null,
					2,
				),
			},
		],
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: "minimal" },
		store: false,
		text: {
			format: zodTextFormat(DraftSchema, "meaning_draft"),
			verbosity: "low",
		},
		prompt_cache_key: armBuildHash("progressive-decision-then-draft"),
	});
	if (second.output_parsed === null) {
		throw new Error("progressive draft response had no parsed output");
	}
	return {
		output: {
			decision: "DraftNew",
			existingMeaningId: null,
			draft: second.output_parsed,
		},
		rawResponses: [toRaw(first), toRaw(second)],
		usage: addUsage(readUsage(first), readUsage(second)),
		actualModels: [first.model, second.model],
		responseIds: [first.id, second.id],
	};
}

async function runAgentic(meaningCase: MeaningCase): Promise<ModelCallResult> {
	const input = [
		{ role: "system" as const, content: AGENTIC_PROMPT },
		{ role: "user" as const, content: stubInput(meaningCase) },
	];
	const tool = {
		type: "function" as const,
		name: "inspect_meaning_candidates",
		description:
			"Return this learner's full Meaning records for the already-resolved Entry.",
		strict: true,
		parameters: {
			type: "object",
			properties: {
				meaningIds: { type: "array", items: { type: "string" } },
			},
			required: ["meaningIds"],
			additionalProperties: false,
		},
	};
	const first = await client.responses.create({
		model: MODEL_ALIAS,
		input,
		tools: [tool],
		tool_choice: "required",
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: "minimal" },
		store: false,
		text: { verbosity: "low" },
		prompt_cache_key: armBuildHash("agentic-candidate-inspection"),
	});
	const calls = first.output.filter(
		(
			item,
		): item is Extract<
			(typeof first.output)[number],
			{ type: "function_call" }
		> =>
			item.type === "function_call" &&
			item.name === "inspect_meaning_candidates",
	);
	if (calls.length !== 1) {
		throw new Error(
			`expected one inspection call, received ${calls.length}`,
		);
	}
	const call = calls[0];
	const args = z
		.object({ meaningIds: z.array(z.string()) })
		.strict()
		.parse(JSON.parse(call.arguments));
	const suppliedIds = meaningCase.candidates.map(
		(candidate) => candidate.meaningId,
	);
	if (
		JSON.stringify([...args.meaningIds].sort()) !==
		JSON.stringify([...suppliedIds].sort())
	) {
		throw new Error(
			"inspection call did not request the complete candidate inventory",
		);
	}
	const second = await client.responses.parse({
		model: MODEL_ALIAS,
		input: [
			...input,
			...first.output,
			{
				type: "function_call_output" as const,
				call_id: call.call_id,
				output: JSON.stringify({
					candidateMeanings: meaningCase.candidates,
				}),
			},
		] as unknown as ResponseInput,
		tools: [tool],
		tool_choice: "none",
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: "minimal" },
		store: false,
		text: {
			format: zodTextFormat(MeaningOutputSchema, "meaning_resolution"),
			verbosity: "low",
		},
		prompt_cache_key: armBuildHash("agentic-candidate-inspection"),
	});
	if (second.output_parsed === null) {
		throw new Error("agentic response had no parsed output");
	}
	return {
		output: second.output_parsed,
		rawResponses: [toRaw(first), toRaw(second)],
		usage: addUsage(readUsage(first), readUsage(second)),
		actualModels: [first.model, second.model],
		responseIds: [first.id, second.id],
	};
}

function oneResponse(
	response: {
		readonly id: string;
		readonly model: string;
		readonly usage?: unknown;
		readonly output?: unknown;
		readonly status?: unknown;
		readonly error?: unknown;
		readonly incomplete_details?: unknown;
	},
	output: MeaningCandidateOutput,
): ModelCallResult {
	return {
		output,
		rawResponses: [toRaw(response)],
		usage: readUsage(response),
		actualModels: [response.model],
		responseIds: [response.id],
	};
}

async function probeModelAccess() {
	let visibleGpt5Models: string[] = [];
	let listError: Record<string, unknown> | null = null;
	try {
		const listed = await client.models.list();
		visibleGpt5Models = listed.data
			.map((model) => model.id)
			.filter((id) => id.startsWith("gpt-5"))
			.sort();
	} catch (error) {
		listError = {
			status: errorStatus(error),
			code: errorCode(error),
			message: accessProbeMessage(error),
		};
	}
	const probes = [];
	for (const model of ["gpt-5-nano", "gpt-5-mini"]) {
		try {
			const response = await client.responses.create({
				model,
				input: "Return OK.",
				max_output_tokens: 16,
				reasoning: { effort: "minimal" },
				store: false,
			});
			probes.push({
				model,
				available: true,
				responseModel: response.model,
			});
		} catch (error) {
			probes.push({
				model,
				available: false,
				status: errorStatus(error),
				code: errorCode(error),
				message: accessProbeMessage(error),
			});
		}
	}
	return {
		checkedAt: new Date().toISOString(),
		visibleGpt5Models,
		listError,
		probes,
		experimentLimit:
			"Only available model aliases can be measured; inaccessible model strength is recorded, not inferred.",
	};
}

function readUsage(response: { readonly usage?: unknown }): Usage {
	const usage = response.usage as
		| {
				input_tokens?: number;
				input_tokens_details?: { cached_tokens?: number };
				output_tokens?: number;
				output_tokens_details?: { reasoning_tokens?: number };
		  }
		| undefined;
	return {
		inputTokens: usage?.input_tokens ?? 0,
		cachedInputTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
		outputTokens: usage?.output_tokens ?? 0,
		reasoningTokens: usage?.output_tokens_details?.reasoning_tokens ?? 0,
	};
}

function addUsage(left: Usage, right: Usage): Usage {
	return {
		inputTokens: left.inputTokens + right.inputTokens,
		cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
		outputTokens: left.outputTokens + right.outputTokens,
		reasoningTokens: left.reasoningTokens + right.reasoningTokens,
	};
}

function zeroUsage(): Usage {
	return {
		inputTokens: 0,
		cachedInputTokens: 0,
		outputTokens: 0,
		reasoningTokens: 0,
	};
}

function toRaw(response: {
	readonly id?: unknown;
	readonly model?: unknown;
	readonly status?: unknown;
	readonly output?: unknown;
	readonly usage?: unknown;
	readonly error?: unknown;
	readonly incomplete_details?: unknown;
}): RawResponse {
	return {
		id: response.id,
		model: response.model,
		status: response.status,
		output: response.output,
		usage: response.usage,
		error: response.error,
		incompleteDetails: response.incomplete_details,
	};
}

async function concurrentMap<Input, Output>(
	inputs: readonly Input[],
	concurrency: number,
	mapper: (input: Input, completed: number, total: number) => Promise<Output>,
): Promise<Output[]> {
	const results = new Array<Output>(inputs.length);
	let next = 0;
	let completed = 0;
	await Promise.all(
		Array.from(
			{ length: Math.min(concurrency, inputs.length) },
			async () => {
				while (true) {
					const index = next;
					next += 1;
					if (index >= inputs.length) return;
					results[index] = await mapper(
						inputs[index] as Input,
						completed + 1,
						inputs.length,
					);
					completed += 1;
				}
			},
		),
	);
	return results;
}

function shuffledJobs(
	corpus: readonly MeaningCase[],
	repetitions: number,
	seed: number,
) {
	const jobs = Array.from({ length: repetitions }, (_, repetition) =>
		corpus.map((meaningCase) => ({
			meaningCase,
			repetition: repetition + 1,
		})),
	).flat();
	const random = mulberry32(seed);
	for (let index = jobs.length - 1; index > 0; index -= 1) {
		const other = Math.floor(random() * (index + 1));
		[jobs[index], jobs[other]] = [
			jobs[other] as (typeof jobs)[number],
			jobs[index] as (typeof jobs)[number],
		];
	}
	return jobs;
}

function mulberry32(seed: number): () => number {
	let value = seed;
	return () => {
		value |= 0;
		value = (value + 0x6d2b79f5) | 0;
		let result = Math.imul(value ^ (value >>> 15), 1 | value);
		result =
			(result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
		return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
	};
}

function armFilter(): readonly ArmId[] {
	const raw = process.env.ARM_FILTER;
	if (raw === undefined) return ARM_IDS;
	const requested = raw.split(",").map((value) => value.trim());
	const invalid = requested.filter(
		(value) => !ARM_IDS.includes(value as ArmId),
	);
	if (requested.length === 0 || invalid.length > 0) {
		throw new Error(`invalid ARM_FILTER: ${invalid.join(", ")}`);
	}
	return requested as ArmId[];
}

function positiveInteger(name: string, fallback: number): number {
	const raw = process.env[name];
	if (raw === undefined) return fallback;
	const value = Number(raw);
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}
	return value;
}

function renderSummary(
	summaries: readonly ReturnType<typeof scoreArm>[],
	manifest: {
		readonly generatedAt: string;
		readonly modelAlias: string;
		readonly actualModels: readonly string[];
		readonly repetitions: number;
		readonly caseCount: number;
		readonly concurrency: number;
	},
): string {
	const rows = summaries
		.map(
			(summary) =>
				`| \`${summary.armId}\` | ${percent(summary.fullExact)} | ${percent(summary.decisionExact)} | ${percent(summary.reuseIdExact)} | ${percent(summary.draftExact)} | ${percent(summary.falseSplitRate)} | ${percent(summary.falseMergeRate)} | ${percent(summary.invalidAttemptRate)} | ${Math.round(summary.latencyMs.p95)} | $${summary.costUsd.toFixed(6)} |`,
		)
		.join("\n");
	return `# Issue #8 measured summary

Generated: ${manifest.generatedAt}

Model alias: \`${manifest.modelAlias}\`  
Actual model(s): ${manifest.actualModels.map((model) => `\`${model}\``).join(", ")}  
Repetitions: ${manifest.repetitions} per ${manifest.caseCount} cases  
Concurrency: ${manifest.concurrency}

| arm | full exact | decision | reuse ID | draft exact | false split | false merge | invalid | p95 ms | cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows}

Prices use the captured ${PRICE_SNAPSHOT?.effectiveDate ?? "unavailable"} schedule:
${PRICE_SNAPSHOT?.source ?? "unavailable for overridden model"}.
`;
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await writeFile(path, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
}

async function writeJsonLines(
	path: string,
	values: readonly unknown[],
): Promise<void> {
	await writeFile(
		path,
		`${values.map((value) => JSON.stringify(value)).join("\n")}\n`,
		"utf8",
	);
}

function byteLength(value: unknown): number {
	return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function percent(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function accessProbeMessage(error: unknown): string {
	if (errorStatus(error) === 403) {
		return "403 model_not_found; project lacks access";
	}
	return errorMessage(error);
}

function errorStatus(error: unknown): number | undefined {
	return typeof error === "object" &&
		error !== null &&
		"status" in error &&
		typeof error.status === "number"
		? error.status
		: undefined;
}

function errorCode(error: unknown): string | undefined {
	return typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof error.code === "string"
		? error.code
		: undefined;
}
