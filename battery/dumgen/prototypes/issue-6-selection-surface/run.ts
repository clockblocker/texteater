import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { CORPUS, type GoldCase } from "./corpus";
import {
	type AdaptResult,
	type AttemptForScoring,
	adaptDirectIndices,
	adaptGuardedNormalization,
	adaptQuotedTexts,
	constructAttestedSurface,
	scoreArm,
} from "./logic";
import {
	AGENTIC_INSPECTION_PROMPT,
	ARM_IDS,
	type ArmId,
	armBuildHash,
	caseInput,
	FREE_NORMALIZATION_PROMPT,
	GUARDED_NORMALIZATION_PROMPT,
	MEMBERSHIP_PROMPT,
	MONOLITH_INDICES_PROMPT,
	MONOLITH_TEXT_PROMPT,
	normalizationInput,
} from "./prompts";

const MODEL_ALIAS = process.env.MODEL ?? "gpt-5-nano";
const REPETITIONS = readPositiveInteger("REPETITIONS", 3);
const CONCURRENCY = readPositiveInteger("CONCURRENCY", 4);
const SHUFFLE_SEED = readPositiveInteger("SHUFFLE_SEED", 6006);
const MAX_OUTPUT_TOKENS = readPositiveInteger("MAX_OUTPUT_TOKENS", 2048);
const REASONING_EFFORT = readReasoningEffort();
const PRICE_SNAPSHOT = {
	currency: "USD",
	effectiveDate: "2026-07-31",
	source: "https://developers.openai.com/api/docs/models/gpt-5-nano",
	inputPerMillion: 0.05,
	cachedInputPerMillion: 0.005,
	outputPerMillion: 0.4,
} as const;

const CanonicalSchema = z
	.object({
		surfaceSegmentIndices: z.array(z.number().int()),
		selectedOrthography: z.enum(["Standard", "Typo"]),
		normalizedSurface: z.string().min(1),
		spelling: z.enum(["Canonical", "Variant"]),
		realizationCoverage: z.enum(["Full", "Partial"]),
	})
	.strict();

const QuotedTextSchema = z
	.object({
		memberTexts: z.array(z.string().min(1)),
		selectedOrthography: z.enum(["Standard", "Typo"]),
		normalizedSurface: z.string().min(1),
		spelling: z.enum(["Canonical", "Variant"]),
		realizationCoverage: z.enum(["Full", "Partial"]),
	})
	.strict();

const MembershipSchema = z
	.object({
		surfaceSegmentIndices: z.array(z.number().int()),
		selectedOrthography: z.enum(["Standard", "Typo"]),
	})
	.strict();

const NormalizationSchema = z
	.object({
		normalizedSurface: z.string().min(1),
		spelling: z.enum(["Canonical", "Variant"]),
		realizationCoverage: z.enum(["Full", "Partial"]),
	})
	.strict();

const GuardedNormalizationSchema = z
	.object({
		members: z.array(
			z
				.object({
					index: z.number().int(),
					normalizedText: z.string().min(1),
				})
				.strict(),
		),
		spelling: z.enum(["Canonical", "Variant"]),
		realizationCoverage: z.enum(["Full", "Partial"]),
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
	readonly rawResponses: readonly RawResponse[];
};

const prototypeDirectory = dirname(fileURLToPath(import.meta.url));
const resultsDirectory = join(prototypeDirectory, "results");
const client = new OpenAI();

await mkdir(resultsDirectory, { recursive: true });

const accessProbe = await probeModelAccess();
await writeJson(join(resultsDirectory, "model-access.json"), accessProbe);

const attempts: AttemptRecord[] = [];
for (const armId of ARM_IDS) {
	console.log(`\n${armId}: starting ${CORPUS.length * REPETITIONS} attempts`);
	const jobs = shuffledJobs(CORPUS, REPETITIONS, SHUFFLE_SEED);
	const armAttempts = await runWithConcurrency(
		jobs,
		CONCURRENCY,
		async ({ goldCase, repetition }, completed, total) => {
			const attempt = await runAttempt(armId, goldCase, repetition);
			if (completed % 8 === 0 || completed === total) {
				console.log(
					`${armId}: ${completed}/${total} attempts, $${sumCost([
						...attempts,
						attempt,
					]).toFixed(6)}`,
				);
			}
			return attempt;
		},
	);
	attempts.push(...armAttempts);
	await writeJsonLines(join(resultsDirectory, `${armId}.jsonl`), armAttempts);
}

const summaries = ARM_IDS.map((armId) =>
	scoreArm(
		armId,
		attempts.filter((attempt) => attempt.armId === armId),
		CORPUS,
	),
);
const manifest = {
	prototype: "issue-6-selection-surface",
	generatedAt: new Date().toISOString(),
	modelAlias: MODEL_ALIAS,
	actualModels: [
		...new Set(attempts.flatMap((attempt) => attempt.actualModels)),
	],
	repetitions: REPETITIONS,
	concurrency: CONCURRENCY,
	shuffleSeed: SHUFFLE_SEED,
	maxOutputTokens: MAX_OUTPUT_TOKENS,
	reasoningEffort: REASONING_EFFORT,
	textVerbosity: "low",
	temperature: "provider default",
	seed: "unavailable",
	store: false,
	corpus: "click-resolution-chain-v1 Selection/Surface subset",
	caseCount: CORPUS.length,
	armBuildHashes: Object.fromEntries(
		ARM_IDS.map((armId) => [armId, armBuildHash(armId)]),
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

console.log(`\nDone. Results: ${resultsDirectory}`);
console.table(
	summaries.map((summary) => ({
		arm: summary.armId,
		full: percent(summary.fullContractExact),
		membership: percent(summary.membershipExact),
		normalization: percent(summary.normalizedSurfaceExact),
		invalid: percent(summary.invalidAttemptRate),
		p95ms: Math.round(summary.latencyMs.p95),
		cost: `$${summary.costUsd.toFixed(6)}`,
	})),
);

async function runAttempt(
	armId: ArmId,
	goldCase: GoldCase,
	repetition: number,
): Promise<AttemptRecord> {
	const startedAt = new Date().toISOString();
	const started = performance.now();
	let result: AdaptResult;
	let rawResponses: RawResponse[] = [];
	let usage: Usage = emptyUsage();
	try {
		const armResult = await runArm(armId, goldCase);
		result = armResult.result;
		rawResponses = armResult.rawResponses;
		usage = armResult.usage;
	} catch (error) {
		result = {
			ok: false,
			category: "provider_or_parser_error",
			message: errorMessage(error),
		};
	}
	const latencyMs = performance.now() - started;
	const endedAt = new Date().toISOString();
	return {
		caseId: goldCase.id,
		armId,
		repetition,
		startedAt,
		endedAt,
		latencyMs,
		experimentBuildHash: armBuildHash(armId),
		modelAlias: MODEL_ALIAS,
		actualModels: rawResponses.flatMap((response) =>
			typeof response.model === "string" ? [response.model] : [],
		),
		inputTokens: usage.inputTokens,
		cachedInputTokens: usage.cachedInputTokens,
		outputTokens: usage.outputTokens,
		reasoningTokens: usage.reasoningTokens,
		rawOutputBytes: rawOutputBytes(rawResponses),
		parsedJsonBytes: parsedJsonBytes(rawResponses),
		retryCount: 0,
		costUsd: usageCost(usage),
		result,
		rawResponses,
	};
}

async function runArm(
	armId: ArmId,
	goldCase: GoldCase,
): Promise<{
	readonly result: AdaptResult;
	readonly rawResponses: RawResponse[];
	readonly usage: Usage;
}> {
	switch (armId) {
		case "monolith-indices": {
			const response = await parseResponse(
				MONOLITH_INDICES_PROMPT,
				caseInput(goldCase),
				CanonicalSchema,
				"canonical_selection_surface",
			);
			return {
				result: adaptDirectIndices(goldCase, response.parsed),
				rawResponses: [response.raw],
				usage: response.usage,
			};
		}
		case "monolith-text": {
			const response = await parseResponse(
				MONOLITH_TEXT_PROMPT,
				caseInput(goldCase),
				QuotedTextSchema,
				"quoted_selection_surface",
			);
			return {
				result: adaptQuotedTexts(goldCase, response.parsed),
				rawResponses: [response.raw],
				usage: response.usage,
			};
		}
		case "chain-free-normalization":
			return runChain(goldCase, false);
		case "chain-guarded-normalization":
			return runChain(goldCase, true);
		case "agentic-inspection":
			return runAgentic(goldCase);
	}
}

async function runChain(
	goldCase: GoldCase,
	guarded: boolean,
): Promise<{
	readonly result: AdaptResult;
	readonly rawResponses: RawResponse[];
	readonly usage: Usage;
}> {
	const membership = await parseResponse(
		MEMBERSHIP_PROMPT,
		caseInput(goldCase),
		MembershipSchema,
		"selection_membership",
	);
	const membershipValidity = adaptDirectIndices(goldCase, {
		...membership.parsed,
		normalizedSurface: "pending",
		spelling: "Canonical",
		realizationCoverage: "Full",
	});
	if (!membershipValidity.ok) {
		return {
			result: membershipValidity,
			rawResponses: [membership.raw],
			usage: membership.usage,
		};
	}
	const indices = membership.parsed.surfaceSegmentIndices;
	const attestedSurface = constructAttestedSurface(
		goldCase.sentence.segments,
		indices,
	);
	const input = normalizationInput(goldCase, indices, attestedSurface);

	if (!guarded) {
		const normalization = await parseResponse(
			FREE_NORMALIZATION_PROMPT,
			input,
			NormalizationSchema,
			"contextual_surface",
		);
		return {
			result: adaptDirectIndices(goldCase, {
				...membership.parsed,
				...normalization.parsed,
			}),
			rawResponses: [membership.raw, normalization.raw],
			usage: addUsage(membership.usage, normalization.usage),
		};
	}

	const normalization = await parseResponse(
		GUARDED_NORMALIZATION_PROMPT,
		input,
		GuardedNormalizationSchema,
		"guarded_contextual_surface",
	);
	return {
		result: adaptGuardedNormalization(
			goldCase,
			membership.parsed,
			normalization.parsed,
		),
		rawResponses: [membership.raw, normalization.raw],
		usage: addUsage(membership.usage, normalization.usage),
	};
}

async function runAgentic(goldCase: GoldCase): Promise<{
	readonly result: AdaptResult;
	readonly rawResponses: RawResponse[];
	readonly usage: Usage;
}> {
	const initialInput = [
		{ role: "system" as const, content: AGENTIC_INSPECTION_PROMPT },
		{ role: "user" as const, content: caseInput(goldCase) },
	];
	const tool = {
		type: "function" as const,
		name: "inspect_membership",
		description:
			"Validate candidate Surface member indices and derive attestedSurface.",
		strict: true,
		parameters: {
			type: "object",
			properties: {
				surfaceSegmentIndices: {
					type: "array",
					items: { type: "integer" },
				},
			},
			required: ["surfaceSegmentIndices"],
			additionalProperties: false,
		},
	};
	const first = await client.responses.create({
		model: MODEL_ALIAS,
		input: initialInput,
		tools: [tool],
		tool_choice: "required",
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: REASONING_EFFORT },
		store: false,
		text: { verbosity: "low" },
		prompt_cache_key: armBuildHash("agentic-inspection"),
	});
	const rawFirst = toRaw(first);
	const calls = first.output.filter(
		(
			item,
		): item is Extract<
			(typeof first.output)[number],
			{ type: "function_call" }
		> =>
			item.type === "function_call" && item.name === "inspect_membership",
	);
	if (calls.length !== 1) {
		throw new Error(
			`agent must call inspect_membership exactly once; received ${calls.length}`,
		);
	}
	const call = calls[0];
	const parsedArguments = z
		.object({ surfaceSegmentIndices: z.array(z.number().int()) })
		.strict()
		.parse(JSON.parse(call.arguments));
	const validity = adaptDirectIndices(goldCase, {
		surfaceSegmentIndices: parsedArguments.surfaceSegmentIndices,
		selectedOrthography: "Standard",
		normalizedSurface: "pending",
		spelling: "Canonical",
		realizationCoverage: "Full",
	});
	const toolOutput = validity.ok
		? {
				ok: true,
				surfaceSegmentIndices: parsedArguments.surfaceSegmentIndices,
				attestedSurface: constructAttestedSurface(
					goldCase.sentence.segments,
					parsedArguments.surfaceSegmentIndices,
				),
				members: parsedArguments.surfaceSegmentIndices.map((index) => ({
					index,
					text: goldCase.sentence.segments[index]?.text,
				})),
			}
		: { ok: false, error: validity.message };

	const second = await client.responses.parse({
		model: MODEL_ALIAS,
		input: [
			...initialInput,
			...first.output,
			{
				type: "function_call_output" as const,
				call_id: call.call_id,
				output: JSON.stringify(toolOutput),
			},
		],
		tools: [tool],
		tool_choice: "none",
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: REASONING_EFFORT },
		store: false,
		text: {
			format: zodTextFormat(CanonicalSchema, "agentic_selection_surface"),
			verbosity: "low",
		},
		prompt_cache_key: armBuildHash("agentic-inspection"),
	});
	if (second.output_parsed === null) {
		throw new Error("agentic final response had no parsed output");
	}
	return {
		result: adaptDirectIndices(goldCase, second.output_parsed),
		rawResponses: [rawFirst, toRaw(second)],
		usage: addUsage(readUsage(first), readUsage(second)),
	};
}

async function parseResponse<Schema extends z.ZodType>(
	systemPrompt: string,
	input: string,
	schema: Schema,
	schemaName: string,
): Promise<{
	readonly parsed: z.output<Schema>;
	readonly raw: RawResponse;
	readonly usage: Usage;
}> {
	const response = await client.responses.parse({
		model: MODEL_ALIAS,
		input: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: input },
		],
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: REASONING_EFFORT },
		store: false,
		text: {
			format: zodTextFormat(schema, schemaName),
			verbosity: "low",
		},
		prompt_cache_key: hash(systemPrompt),
	});
	if (response.output_parsed === null) {
		throw new Error(
			`response had no parsed output (${response.incomplete_details?.reason ?? response.status})`,
		);
	}
	return {
		parsed: response.output_parsed as z.output<Schema>,
		raw: toRaw(response),
		usage: readUsage(response),
	};
}

async function probeModelAccess() {
	const listed = await client.models.list();
	const visible = listed.data
		.map((model) => model.id)
		.filter((id) => id.startsWith("gpt-5"))
		.sort();
	let higherModelProbe: Record<string, unknown>;
	try {
		const response = await client.responses.create({
			model: "gpt-5-mini",
			input: "Return OK.",
			max_output_tokens: 16,
			reasoning: { effort: REASONING_EFFORT },
			store: false,
		});
		higherModelProbe = {
			model: "gpt-5-mini",
			available: true,
			responseModel: response.model,
		};
	} catch (error) {
		higherModelProbe = {
			model: "gpt-5-mini",
			available: false,
			status: errorStatus(error),
			code: errorCode(error),
			message: errorMessage(error),
		};
	}
	return {
		checkedAt: new Date().toISOString(),
		visibleGpt5Models: visible,
		higherModelProbe,
	};
}

function readUsage(response: {
	readonly usage?: {
		readonly input_tokens?: number;
		readonly input_tokens_details?: { readonly cached_tokens?: number };
		readonly output_tokens?: number;
		readonly output_tokens_details?: { readonly reasoning_tokens?: number };
	} | null;
}): Usage {
	return {
		inputTokens: response.usage?.input_tokens ?? 0,
		cachedInputTokens:
			response.usage?.input_tokens_details?.cached_tokens ?? 0,
		outputTokens: response.usage?.output_tokens ?? 0,
		reasoningTokens:
			response.usage?.output_tokens_details?.reasoning_tokens ?? 0,
	};
}

function emptyUsage(): Usage {
	return {
		inputTokens: 0,
		cachedInputTokens: 0,
		outputTokens: 0,
		reasoningTokens: 0,
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

function usageCost(usage: Usage): number {
	const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
	return (
		(uncached * PRICE_SNAPSHOT.inputPerMillion) / 1_000_000 +
		(usage.cachedInputTokens * PRICE_SNAPSHOT.cachedInputPerMillion) /
			1_000_000 +
		(usage.outputTokens * PRICE_SNAPSHOT.outputPerMillion) / 1_000_000
	);
}

function toRaw(response: unknown): RawResponse {
	return JSON.parse(JSON.stringify(response)) as RawResponse;
}

function parsedJsonBytes(responses: readonly RawResponse[]): number {
	return responses.reduce((total, response) => {
		let bytes = 0;
		if (response.output_parsed !== undefined) {
			bytes += Buffer.byteLength(
				JSON.stringify(response.output_parsed),
				"utf8",
			);
		}
		if (Array.isArray(response.output)) {
			for (const item of response.output) {
				if (
					typeof item === "object" &&
					item !== null &&
					"type" in item &&
					item.type === "function_call" &&
					"arguments" in item &&
					typeof item.arguments === "string"
				) {
					bytes += Buffer.byteLength(item.arguments, "utf8");
				}
			}
		}
		return total + bytes;
	}, 0);
}

function rawOutputBytes(responses: readonly RawResponse[]): number {
	return responses.reduce((total, response) => {
		let bytes = 0;
		if (
			typeof response.output_text === "string" &&
			response.output_text.length > 0
		) {
			bytes += Buffer.byteLength(response.output_text, "utf8");
		}
		if (Array.isArray(response.output)) {
			for (const item of response.output) {
				if (
					typeof item === "object" &&
					item !== null &&
					"type" in item &&
					item.type === "function_call" &&
					"arguments" in item &&
					typeof item.arguments === "string"
				) {
					bytes += Buffer.byteLength(item.arguments, "utf8");
				}
			}
		}
		return total + bytes;
	}, 0);
}

function shuffledJobs(
	corpus: readonly GoldCase[],
	repetitions: number,
	seed: number,
): readonly { readonly goldCase: GoldCase; readonly repetition: number }[] {
	const jobs = Array.from({ length: repetitions }, (_, repetitionIndex) =>
		corpus.map((goldCase) => ({
			goldCase,
			repetition: repetitionIndex + 1,
		})),
	).flat();
	let state = seed >>> 0;
	const random = () => {
		state = (1664525 * state + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
	return [...jobs].sort(() => random() - 0.5);
}

async function runWithConcurrency<Input, Output>(
	inputs: readonly Input[],
	concurrency: number,
	task: (input: Input, completed: number, total: number) => Promise<Output>,
): Promise<Output[]> {
	const results = new Array<Output>(inputs.length);
	let nextIndex = 0;
	let completed = 0;
	const workers = Array.from(
		{ length: Math.min(concurrency, inputs.length) },
		async () => {
			while (true) {
				const index = nextIndex;
				nextIndex += 1;
				if (index >= inputs.length) return;
				const input = inputs[index];
				if (input === undefined) return;
				const result = await task(input, completed + 1, inputs.length);
				results[index] = result;
				completed += 1;
			}
		},
	);
	await Promise.all(workers);
	return results;
}

async function writeJson(path: string, value: unknown): Promise<void> {
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

function renderSummary(
	summaries: readonly ReturnType<typeof scoreArm>[],
	manifest: Record<string, unknown>,
): string {
	const rows = summaries
		.map(
			(summary) =>
				`| \`${summary.armId}\` | ${percent(summary.fullContractExact)} | ${percent(summary.membershipExact)} | ${percent(summary.normalizedSurfaceExactGivenMembership)} | ${percent(summary.invalidAttemptRate)} | ${summary.ambiguousTextMappingFailures} | ${summary.falseTypoPropagation} | ${summary.falseVariantErasure} | ${Math.round(summary.latencyMs.p95)} | $${summary.costUsd.toFixed(6)} |`,
		)
		.join("\n");
	return `# Issue #6 measured summary

Generated: ${String(manifest.generatedAt)}

Model alias: \`${String(manifest.modelAlias)}\`  
Actual model(s): \`${(manifest.actualModels as string[]).join(", ")}\`  
Repetitions: ${String(manifest.repetitions)} per 24 click cases  
Concurrency: ${String(manifest.concurrency)}

| arm | full exact | membership exact | normalization exact given membership | invalid | ambiguous mappings | false typo propagation | false variant erasure | p95 ms | cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows}

Prices use the captured ${PRICE_SNAPSHOT.effectiveDate} OpenAI schedule:
${PRICE_SNAPSHOT.source}.
`;
}

function percent(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}

function sumCost(values: readonly { readonly costUsd: number }[]): number {
	return values.reduce((total, value) => total + value.costUsd, 0);
}

function hash(value: string): string {
	return Bun.CryptoHasher.hash("sha256", value, "hex");
}

function errorMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return message.replace(/Project `[^`]+`/gu, "Project `<redacted>`");
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

function readPositiveInteger(name: string, fallback: number): number {
	const raw = process.env[name];
	if (raw === undefined) return fallback;
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < 1) {
		throw new Error(`${name} must be a positive safe integer`);
	}
	return value;
}

function readReasoningEffort(): "minimal" | "low" | "medium" | "high" {
	const value = process.env.REASONING_EFFORT ?? "low";
	if (
		value !== "minimal" &&
		value !== "low" &&
		value !== "medium" &&
		value !== "high"
	) {
		throw new Error(
			"REASONING_EFFORT must be minimal, low, medium, or high",
		);
	}
	return value;
}
