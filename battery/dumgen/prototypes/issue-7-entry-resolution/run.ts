import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";

import { CORPUS, type EntryCase } from "./corpus";
import {
	type AttemptForScoring,
	type AttemptResult,
	type CanonicalCandidate,
	scoreArm,
	validateCandidate,
} from "./logic";
import {
	AGENTIC_HYDRATED_PROMPT,
	AGENTIC_PROMPT,
	ARM_IDS,
	type ArmId,
	armBuildHash,
	CITATION_FIRST_PROMPT,
	DESCRIPTOR_AFTER_IDENTITY_PROMPT,
	DESCRIPTOR_FIRST_PROMPT,
	DIRECT_CITATION_FIRST_PROMPT,
	DIRECT_FAMILY_FIRST_PROMPT,
	fullCaseInput,
	IDENTITY_AFTER_GRAMMAR_PROMPT,
	IDENTITY_FIRST_PROMPT,
	NEW_ENTRY_DESCRIPTOR_PROMPT,
	REST_AFTER_CITATION_PROMPT,
	stageInput,
	stubCaseInput,
} from "./prompts";

const MODEL_ALIAS = process.env.MODEL ?? "gpt-5-nano";
const REPETITIONS = readPositiveInteger("REPETITIONS", 3);
const CONCURRENCY = readPositiveInteger("CONCURRENCY", 6);
const SHUFFLE_SEED = readPositiveInteger("SHUFFLE_SEED", 7007);
const RUN_ID = process.env.RUN_ID ?? "current";
const CASE_LIMIT = readPositiveInteger("CASE_LIMIT", CORPUS.length);
const SELECTED_CORPUS = CORPUS.slice(0, CASE_LIMIT);
const SELECTED_ARMS = readArmFilter();
const MAX_OUTPUT_TOKENS = 512;
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

const Family = z.enum(["Lexeme", "Phraseme", "Morpheme", "Construction"]);
const Subkind = z.enum([
	"ADJ",
	"ADV",
	"INTJ",
	"NOUN",
	"PROPN",
	"VERB",
	"ADP",
	"AUX",
	"CCONJ",
	"DET",
	"NUM",
	"PART",
	"PRON",
	"SCONJ",
	"PUNCT",
	"SYM",
	"X",
	"DiscourseFormula",
	"Aphorism",
	"Proverb",
	"Idiom",
	"Root",
	"Prefix",
	"Suffix",
	"Suffixoid",
	"Infix",
	"Circumfix",
	"Interfix",
	"Transfix",
	"Clitic",
	"ToneMarking",
	"Duplifix",
	"Fusion",
	"PairedFrame",
]);
const FeatureName = z.enum([
	"gender",
	"hyph",
	"hasGovPrep",
	"hasSepPrefix",
	"lexicallyReflexive",
	"verbType",
	"abbr",
	"foreign",
	"numType",
	"variant",
	"adpType",
	"extPos",
	"governedCase",
	"partType",
]);
const Features = z.array(
	z
		.object({
			name: FeatureName,
			value: z.string().min(1),
		})
		.strict(),
);
const FamilyFirstSchema = z
	.object({
		family: Family,
		subkind: Subkind,
		citationForm: z.string().min(1),
		inherentFeatures: Features,
		decision: z.enum(["Existing", "ProposeNew"]),
		entryId: z.string().nullable(),
	})
	.strict();
const CitationFirstSchema = z
	.object({
		citationForm: z.string().min(1),
		family: Family,
		subkind: Subkind,
		inherentFeatures: Features,
		decision: z.enum(["Existing", "ProposeNew"]),
		entryId: z.string().nullable(),
	})
	.strict();
const DescriptorSchema = z
	.object({
		family: Family,
		subkind: Subkind,
		citationForm: z.string().min(1),
		inherentFeatures: Features,
	})
	.strict();
const IdentitySchema = z
	.object({
		decision: z.enum(["Existing", "ProposeNew"]),
		entryId: z.string().nullable(),
	})
	.strict();
const CitationSchema = z
	.object({
		citationForm: z.string().min(1),
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

const prototypeDirectory = dirname(fileURLToPath(import.meta.url));
const resultsDirectory = join(prototypeDirectory, "results", RUN_ID);
const client = new OpenAI();
await mkdir(resultsDirectory, { recursive: true });

const accessProbe = await probeModelAccess();
await writeJson(join(resultsDirectory, "model-access.json"), accessProbe);

const attempts: AttemptRecord[] = [];
for (const armId of SELECTED_ARMS) {
	console.log(
		`\n${armId}: starting ${SELECTED_CORPUS.length * REPETITIONS} attempts`,
	);
	const jobs = shuffledJobs(SELECTED_CORPUS, REPETITIONS, SHUFFLE_SEED);
	const armAttempts = await runWithConcurrency(
		jobs,
		CONCURRENCY,
		async ({ entryCase, repetition }, completed, total) => {
			const attempt = await runAttempt(armId, entryCase, repetition);
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
	prototype: "issue-7-entry-resolution",
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
	corpusVersion: "entry-resolution-v1",
	caseCount: SELECTED_CORPUS.length,
	germanCases: SELECTED_CORPUS.filter(
		(entryCase) => entryCase.language === "de",
	).length,
	crossLinguisticBoundaryCases: SELECTED_CORPUS.filter(
		(entryCase) => entryCase.language !== "de",
	).length,
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

console.log(`\nDone. Results: ${resultsDirectory}`);
console.table(
	summaries.map((summary) => ({
		arm: summary.armId,
		full: percent(summary.fullContractExact),
		identity: percent(summary.identityExact),
		relations: percent(summary.relationalAssertionsExact),
		invalid: percent(summary.invalidAttemptRate),
		p95ms: Math.round(summary.latencyMs.p95),
		cost:
			summary.costUsd === null
				? "unavailable"
				: `$${summary.costUsd.toFixed(6)}`,
	})),
);

async function runAttempt(
	armId: ArmId,
	entryCase: EntryCase,
	repetition: number,
): Promise<AttemptRecord> {
	const startedAt = new Date().toISOString();
	const started = performance.now();
	let result: AttemptResult;
	let rawResponses: RawResponse[] = [];
	let usage = emptyUsage();
	try {
		const armResult = await runArm(armId, entryCase);
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
	const endedAt = new Date().toISOString();
	return {
		caseId: entryCase.id,
		armId,
		repetition,
		startedAt,
		endedAt,
		latencyMs: performance.now() - started,
		experimentBuildHash: armBuildHash(armId),
		modelAlias: MODEL_ALIAS,
		actualModels: rawResponses.flatMap((response) =>
			typeof response.model === "string" ? [response.model] : [],
		),
		responseIds: rawResponses.flatMap((response) =>
			typeof response.id === "string" ? [response.id] : [],
		),
		inputTokens: usage.inputTokens,
		cachedInputTokens: usage.cachedInputTokens,
		outputTokens: usage.outputTokens,
		reasoningTokens: usage.reasoningTokens,
		rawOutputBytes: Buffer.byteLength(
			rawResponses
				.map((response) => JSON.stringify(response.output ?? ""))
				.join(""),
			"utf8",
		),
		costUsd: usageCost(usage),
		result,
		rawResponses,
	};
}

async function runArm(
	armId: ArmId,
	entryCase: EntryCase,
): Promise<{
	readonly result: AttemptResult;
	readonly rawResponses: RawResponse[];
	readonly usage: Usage;
}> {
	switch (armId) {
		case "direct-family-first": {
			const response = await parseResponse(
				DIRECT_FAMILY_FIRST_PROMPT,
				fullCaseInput(entryCase),
				FamilyFirstSchema,
				"entry_family_first",
			);
			return responseResult(entryCase, [response]);
		}
		case "direct-citation-first": {
			const response = await parseResponse(
				DIRECT_CITATION_FIRST_PROMPT,
				fullCaseInput(entryCase),
				CitationFirstSchema,
				"entry_citation_first",
			);
			return responseResult(entryCase, [response]);
		}
		case "progressive-grammar-first": {
			const first = await parseResponse(
				DESCRIPTOR_FIRST_PROMPT,
				fullCaseInput(entryCase),
				DescriptorSchema,
				"entry_descriptor",
			);
			const second = await parseResponse(
				IDENTITY_AFTER_GRAMMAR_PROMPT,
				stageInput(entryCase, "provisionalDescriptor", first.parsed),
				FamilyFirstSchema,
				"entry_after_grammar",
			);
			return responseResult(entryCase, [first, second], second.parsed);
		}
		case "progressive-identity-first": {
			const first = await parseResponse(
				IDENTITY_FIRST_PROMPT,
				fullCaseInput(entryCase),
				IdentitySchema,
				"entry_identity",
			);
			const second = await parseResponse(
				DESCRIPTOR_AFTER_IDENTITY_PROMPT,
				stageInput(entryCase, "provisionalIdentity", first.parsed),
				FamilyFirstSchema,
				"entry_after_identity",
			);
			return responseResult(entryCase, [first, second], second.parsed);
		}
		case "progressive-citation-first": {
			const first = await parseResponse(
				CITATION_FIRST_PROMPT,
				fullCaseInput(entryCase),
				CitationSchema,
				"entry_citation",
			);
			const second = await parseResponse(
				REST_AFTER_CITATION_PROMPT,
				stageInput(entryCase, "provisionalCitation", first.parsed),
				CitationFirstSchema,
				"entry_after_citation",
			);
			return responseResult(entryCase, [first, second], second.parsed);
		}
		case "agentic-candidate-inspection":
			return runAgentic(entryCase);
		case "agentic-hydrated":
			return runAgenticHydrated(entryCase);
	}
}

async function runAgentic(entryCase: EntryCase): Promise<{
	readonly result: AttemptResult;
	readonly rawResponses: RawResponse[];
	readonly usage: Usage;
}> {
	const input = [
		{ role: "system" as const, content: AGENTIC_PROMPT },
		{ role: "user" as const, content: stubCaseInput(entryCase) },
	];
	const tool = {
		type: "function" as const,
		name: "inspect_entry_candidates",
		description:
			"Return boundary-policy details for candidate opaque Entry IDs.",
		strict: true,
		parameters: {
			type: "object",
			properties: {
				entryIds: {
					type: "array",
					items: { type: "string" },
				},
			},
			required: ["entryIds"],
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
			item.name === "inspect_entry_candidates",
	);
	if (calls.length !== 1) {
		throw new Error(
			`expected one inspection call, received ${calls.length}`,
		);
	}
	const call = calls[0];
	const args = z
		.object({ entryIds: z.array(z.string()) })
		.strict()
		.parse(JSON.parse(call.arguments));
	const requested = new Set(args.entryIds);
	const inspected = entryCase.candidates.filter((candidate) =>
		requested.has(candidate.entryId),
	);
	const second = await client.responses.parse({
		model: MODEL_ALIAS,
		input: [
			...input,
			...first.output,
			{
				type: "function_call_output" as const,
				call_id: call.call_id,
				output: JSON.stringify({
					boundaryPolicyVersion: entryCase.boundaryPolicyVersion,
					candidates: inspected,
				}),
			},
		] as unknown as ResponseInput,
		tools: [tool],
		tool_choice: "none",
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: "minimal" },
		store: false,
		text: {
			format: zodTextFormat(FamilyFirstSchema, "agentic_entry"),
			verbosity: "low",
		},
		prompt_cache_key: armBuildHash("agentic-candidate-inspection"),
	});
	if (second.output_parsed === null) {
		throw new Error("agentic final response had no parsed output");
	}
	const responses = [
		{ parsed: null, raw: toRaw(first), usage: readUsage(first) },
		{
			parsed: second.output_parsed,
			raw: toRaw(second),
			usage: readUsage(second),
		},
	];
	return responseResult(entryCase, responses, second.output_parsed);
}

async function runAgenticHydrated(entryCase: EntryCase): Promise<{
	readonly result: AttemptResult;
	readonly rawResponses: RawResponse[];
	readonly usage: Usage;
}> {
	const input = [
		{ role: "system" as const, content: AGENTIC_HYDRATED_PROMPT },
		{ role: "user" as const, content: stubCaseInput(entryCase) },
	];
	const tool = {
		type: "function" as const,
		name: "inspect_entry_catalog",
		description:
			"Return the complete boundary-policy catalog for this resolution case.",
		strict: true,
		parameters: {
			type: "object",
			properties: {
				caseId: { type: "string" },
			},
			required: ["caseId"],
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
		prompt_cache_key: armBuildHash("agentic-hydrated"),
	});
	const calls = first.output.filter(
		(
			item,
		): item is Extract<
			(typeof first.output)[number],
			{ type: "function_call" }
		> =>
			item.type === "function_call" &&
			item.name === "inspect_entry_catalog",
	);
	if (calls.length !== 1) {
		throw new Error(`expected one catalog call, received ${calls.length}`);
	}
	const call = calls[0];
	const args = z
		.object({ caseId: z.string() })
		.strict()
		.parse(JSON.parse(call.arguments));
	if (args.caseId !== entryCase.id) {
		throw new Error(
			`catalog call requested unexpected case ${args.caseId}`,
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
					boundaryPolicyVersion: entryCase.boundaryPolicyVersion,
					candidates: entryCase.candidates,
				}),
			},
		] as unknown as ResponseInput,
		tools: [tool],
		tool_choice: "none",
		max_output_tokens: MAX_OUTPUT_TOKENS,
		reasoning: { effort: "minimal" },
		store: false,
		text: {
			format: zodTextFormat(IdentitySchema, "hydrated_entry_identity"),
			verbosity: "low",
		},
		prompt_cache_key: armBuildHash("agentic-hydrated"),
	});
	if (second.output_parsed === null) {
		throw new Error("hydrated identity response had no parsed output");
	}
	const rawResponses = [toRaw(first), toRaw(second)];
	let usage = addUsage(readUsage(first), readUsage(second));
	const identity = second.output_parsed;

	if (identity.decision === "Existing") {
		const existing = entryCase.candidates.find(
			(candidate) => candidate.entryId === identity.entryId,
		);
		if (!existing) {
			return {
				result: {
					ok: false,
					category: "unknown_existing_entry",
					message: "identity stage returned an unknown candidate ID",
				},
				rawResponses,
				usage,
			};
		}
		return {
			result: validateCandidate(entryCase, {
				decision: "Existing",
				entryId: existing.entryId,
				family: existing.family,
				subkind: existing.subkind,
				citationForm: existing.citationForm,
				inherentFeatures: Object.entries(existing.inherentFeatures).map(
					([name, value]) => ({ name, value }),
				),
			}),
			rawResponses,
			usage,
		};
	}

	const descriptor = await parseResponse(
		NEW_ENTRY_DESCRIPTOR_PROMPT,
		stageInput(entryCase, "identityDecision", identity),
		DescriptorSchema,
		"new_entry_descriptor",
	);
	rawResponses.push(descriptor.raw);
	usage = addUsage(usage, descriptor.usage);
	return {
		result: validateCandidate(entryCase, {
			...descriptor.parsed,
			decision: "ProposeNew",
			entryId: null,
		}),
		rawResponses,
		usage,
	};
}

function responseResult(
	entryCase: EntryCase,
	responses: readonly {
		readonly parsed: unknown;
		readonly raw: RawResponse;
		readonly usage: Usage;
	}[],
	candidate = responses[responses.length - 1]?.parsed,
): {
	readonly result: AttemptResult;
	readonly rawResponses: RawResponse[];
	readonly usage: Usage;
} {
	return {
		result: validateCandidate(entryCase, candidate as CanonicalCandidate),
		rawResponses: responses.map((response) => response.raw),
		usage: responses.reduce(
			(total, response) => addUsage(total, response.usage),
			emptyUsage(),
		),
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
		reasoning: { effort: "minimal" },
		store: false,
		text: {
			format: zodTextFormat(schema, schemaName),
			verbosity: "low",
		},
		prompt_cache_key: createHash("sha256")
			.update(systemPrompt)
			.digest("hex"),
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
			message: errorMessage(error),
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
			"One economical model alias is used across arms; model-quality comparison is out of scope.",
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

function usageCost(usage: Usage): number | null {
	if (PRICE_SNAPSHOT === null) return null;
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

function shuffledJobs(
	corpus: readonly EntryCase[],
	repetitions: number,
	seed: number,
): readonly { readonly entryCase: EntryCase; readonly repetition: number }[] {
	const jobs = Array.from({ length: repetitions }, (_, repetitionIndex) =>
		corpus.map((entryCase) => ({
			entryCase,
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
				results[index] = await task(
					input,
					completed + 1,
					inputs.length,
				);
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
		.map((summary) => {
			const cost =
				summary.costUsd === null
					? "unavailable"
					: `$${summary.costUsd.toFixed(6)}`;
			return `| \`${summary.armId}\` | ${percent(summary.fullContractExact)} | ${percent(summary.identityExact)} | ${percent(summary.citationFormExact)} | ${percent(summary.familyExact)} | ${percent(summary.subkindExact)} | ${percent(summary.inherentFeaturesExact)} | ${percent(summary.relationalAssertionsExact)} | ${percent(summary.invalidAttemptRate)} | ${Math.round(summary.latencyMs.p95)} | ${cost} |`;
		})
		.join("\n");
	return `# Issue #7 measured summary

Generated: ${String(manifest.generatedAt)}

Model alias: \`${String(manifest.modelAlias)}\`  
Actual model(s): \`${(manifest.actualModels as string[]).join(", ")}\`  
Repetitions: ${String(manifest.repetitions)} per ${String(manifest.caseCount)} cases  
Concurrency: ${String(manifest.concurrency)}

| arm | full exact | identity exact | Citation Form | family | subkind | inherent features | relational | invalid | p95 ms | cost |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows}

Prices use the captured ${PRICE_SNAPSHOT?.effectiveDate ?? "unavailable"} schedule:
${PRICE_SNAPSHOT?.source ?? "unavailable for overridden model"}.
`;
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

function readPositiveInteger(name: string, fallback: number): number {
	const raw = process.env[name];
	if (raw === undefined) return fallback;
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < 1) {
		throw new Error(`${name} must be a positive safe integer`);
	}
	return value;
}

function readArmFilter(): readonly ArmId[] {
	const raw = process.env.ARM_FILTER;
	if (raw === undefined) return ARM_IDS;
	const requested = raw.split(",").map((value) => value.trim());
	const invalid = requested.filter(
		(value) => !ARM_IDS.includes(value as ArmId),
	);
	if (requested.length === 0 || invalid.length > 0) {
		throw new Error(
			`ARM_FILTER contains invalid arms: ${invalid.join(", ")}`,
		);
	}
	return requested as ArmId[];
}
