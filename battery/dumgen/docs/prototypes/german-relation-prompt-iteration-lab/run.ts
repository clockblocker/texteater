// THROWAWAY PROTOTYPE — interactive bounded prompt-revision laboratory.

import type { Dirent } from "node:fs";
import {
	mkdir,
	open,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import OpenAI from "openai";

import type { GermanKnowledgeAnalysis } from "../../../src/knowledge-generation/de/schemas";
import { stableJson } from "../../../src/promptsmith/assembly";
import {
	analyzeCombinedGermanKnowledgeCase,
	type CombinedGermanKnowledgeCaseAnalysis,
} from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluator";
import {
	createGermanRelationEvaluationReport,
	type GermanRelationEvaluationRun,
} from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/relation-report";
import {
	actualCostNanoUsd,
	createLabPlan,
	formatNanoUsd,
	LAB_BUDGET_NANO_USD,
	type LabCallPlan,
	type LabPlan,
	PROMPT_REVISIONS,
	relationEvaluationOutput,
	usageCounters,
} from "./logic";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS_DIRECTORY = join(HERE, "runs");
const PREVIOUS_TOPOLOGY_RUNS_DIRECTORY = join(
	HERE,
	"..",
	"german-relation-topology-lab",
	"runs",
);

type Attempt = Readonly<{
	callId: string;
	revisionNumber: number;
	revisionId: string;
	repetition: number;
	caseId: string;
	promptFingerprint: string;
	maximumCostNanoUsd: number;
	actualCostNanoUsd: number;
	latencyMs: number;
	status: string | null;
	incompleteReason: string | null;
	refusal: boolean;
	usage: unknown;
	inputTokens: number;
	outputTokens: number;
	cachedInputTokens: number;
	cacheWriteInputTokens: number;
	responseId?: string;
	resolvedModel?: string;
	rawOutputText?: string;
	output?: GermanKnowledgeAnalysis;
	error?: Readonly<{ name: string; message: string }>;
}>;

type UiState = {
	status: "ready" | "preflight-passed" | "running" | "complete" | "failed";
	apiKeyAvailable: boolean;
	lastAction: string;
	plannedCalls: number;
	completedCalls: number;
	skippedCalls: number;
	maximumSpendUsd: string;
	actualSpendUsd: string;
	artifactPath: string | null;
	report: unknown;
};

export async function runPaidLab(args: {
	readonly authorizedMaximumSpendUsd: string;
	readonly onState?: (state: Readonly<UiState>) => void;
}) {
	const plan = createLabPlan();
	assertPaidAuthorization(plan, args.authorizedMaximumSpendUsd);
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey)
		throw new Error(
			"OPENAI_API_KEY is unavailable; preflight remains provider-free.",
		);
	await mkdir(RUNS_DIRECTORY, { recursive: true });
	const lockPath = join(RUNS_DIRECTORY, ".active-paid-run.lock");
	const lock = await open(lockPath, "wx").catch((cause) => {
		throw new Error(
			"Another paid German relation prompt-revision run is active.",
			{ cause },
		);
	});
	try {
		const historicalSpendNanoUsd = await retainedIssueSpendNanoUsd();
		if (
			historicalSpendNanoUsd + plan.maximumSpendNanoUsd >
			LAB_BUDGET_NANO_USD
		)
			throw new Error(
				`Retained #192 spend plus this run's ${plan.maximumSpendUsd} USD ceiling exceeds the cumulative 5 USD budget.`,
			);
		return await executePaidLab({
			args,
			plan,
			apiKey,
			historicalSpendNanoUsd,
		});
	} finally {
		await lock.close();
		await rm(lockPath, { force: true });
	}
}

async function executePaidLab(context: {
	args: {
		readonly authorizedMaximumSpendUsd: string;
		readonly onState?: (state: Readonly<UiState>) => void;
	};
	plan: LabPlan;
	apiKey: string;
	historicalSpendNanoUsd: number;
}) {
	const { args, plan, apiKey, historicalSpendNanoUsd } = context;
	const startedAt = new Date().toISOString();
	const artifactPath = join(
		RUNS_DIRECTORY,
		startedAt.replaceAll(/[:.]/gu, "-"),
		"results.json",
	);
	const client = new OpenAI({ apiKey });
	const attempts: Attempt[] = [];
	const stoppedRevisions = new Map<string, string>();
	let actualSpendNanoUsd = 0;
	let skippedCalls = 0;
	const state: UiState = {
		status: "running",
		apiKeyAvailable: true,
		lastAction: "Paid run authorized; no provider call made yet.",
		plannedCalls: plan.calls.length,
		completedCalls: 0,
		skippedCalls: 0,
		maximumSpendUsd: plan.maximumSpendUsd,
		actualSpendUsd: formatNanoUsd(0),
		artifactPath,
		report: null,
	};
	args.onState?.(state);

	for (const [index, call] of plan.calls.entries()) {
		if (stoppedRevisions.has(call.revisionId)) {
			skippedCalls += 1;
			state.skippedCalls = skippedCalls;
			continue;
		}
		assertBeforeCallBudget({
			plan,
			index,
			historicalSpendNanoUsd,
			actualSpendNanoUsd,
		});
		const attempt = await executeCall(client, call);
		attempts.push(attempt);
		actualSpendNanoUsd += attempt.actualCostNanoUsd;
		state.completedCalls = attempts.length;
		state.actualSpendUsd = formatNanoUsd(actualSpendNanoUsd);
		state.lastAction = `Completed ${call.id}`;

		if (isLastCallOfRepetition(plan, call)) {
			const harmfulCount = harmfulCountForRepetition(
				plan,
				attempts,
				call.revisionId,
				call.repetition,
			);
			if (harmfulCount >= 2) {
				stoppedRevisions.set(
					call.revisionId,
					`repeated-harmful-false-positives:${harmfulCount}`,
				);
				state.lastAction += `; stopped revision after ${harmfulCount} harmful targets.`;
			}
		}
		args.onState?.(state);
		await retainArtifact(artifactPath, {
			kind: "THROWAWAY-german-relation-prompt-iteration-lab",
			startedAt,
			completedAt: null,
			plan: serializablePlan(plan),
			state,
			attempts,
			stoppedRevisions: Object.fromEntries(stoppedRevisions),
			report: null,
		});
	}

	const report = buildFinalReport({
		plan,
		attempts,
		stoppedRevisions,
		actualSpendNanoUsd,
		historicalSpendNanoUsd,
	});
	state.status = "complete";
	state.lastAction =
		"All permitted prompt revisions completed and every miss was classified.";
	state.report = report;
	args.onState?.(state);
	const artifact = {
		kind: "THROWAWAY-german-relation-prompt-iteration-lab",
		startedAt,
		completedAt: new Date().toISOString(),
		plan: serializablePlan(plan),
		state,
		attempts,
		stoppedRevisions: Object.fromEntries(stoppedRevisions),
		report,
	};
	await retainArtifact(artifactPath, artifact);
	return Object.freeze({ artifactPath, artifact });
}

async function executeCall(
	client: OpenAI,
	call: LabCallPlan,
): Promise<Attempt> {
	const started = performance.now();
	try {
		const response = await client.responses.create(call.request);
		const latencyMs = Math.round(performance.now() - started);
		const rawOutputText = response.output_text;
		const refusal = stableJson(response.output).includes('"refusal"');
		const cost = actualCostNanoUsd(response.usage, call.maximumCostNanoUsd);
		if (cost > call.maximumCostNanoUsd)
			throw new Error(
				`Provider usage exceeded the conservative ceiling for ${call.id}.`,
			);
		let output: GermanKnowledgeAnalysis | undefined;
		let error: Readonly<{ name: string; message: string }> | undefined;
		try {
			output = rawOutputText
				? call.outputSchema.parse(JSON.parse(rawOutputText))
				: undefined;
			if (output === undefined)
				error = {
					name: "EmptyProviderOutput",
					message: "Provider returned no structured output text.",
				};
		} catch (cause) {
			error = describeError(cause);
		}
		return {
			callId: call.id,
			revisionNumber: call.revisionNumber,
			revisionId: call.revisionId,
			repetition: call.repetition,
			caseId: call.caseId,
			promptFingerprint: call.promptFingerprint,
			maximumCostNanoUsd: call.maximumCostNanoUsd,
			actualCostNanoUsd: cost,
			latencyMs,
			status: response.status ?? null,
			incompleteReason: response.incomplete_details?.reason ?? null,
			refusal,
			usage: response.usage ?? null,
			...usageCounters(response.usage),
			responseId: response.id,
			resolvedModel: response.model,
			rawOutputText,
			...(output === undefined ? {} : { output }),
			...(error === undefined ? {} : { error }),
		};
	} catch (cause) {
		return {
			callId: call.id,
			revisionNumber: call.revisionNumber,
			revisionId: call.revisionId,
			repetition: call.repetition,
			caseId: call.caseId,
			promptFingerprint: call.promptFingerprint,
			maximumCostNanoUsd: call.maximumCostNanoUsd,
			actualCostNanoUsd: call.maximumCostNanoUsd,
			latencyMs: Math.round(performance.now() - started),
			status: null,
			incompleteReason: null,
			refusal: false,
			usage: null,
			inputTokens: 0,
			outputTokens: 0,
			cachedInputTokens: 0,
			cacheWriteInputTokens: 0,
			error: describeError(cause),
		};
	}
}

function buildFinalReport(args: {
	plan: LabPlan;
	attempts: readonly Attempt[];
	stoppedRevisions: ReadonlyMap<string, string>;
	actualSpendNanoUsd: number;
	historicalSpendNanoUsd: number;
}) {
	const byRevision = Object.fromEntries(
		PROMPT_REVISIONS.map((revision) => {
			const attempts = args.attempts.filter(
				(attempt) => attempt.revisionId === revision.id,
			);
			const runs = evaluationRunsFor(args.plan, attempts, revision.id);
			const semanticReport =
				runs.length === 0
					? null
					: createGermanRelationEvaluationReport({ runs });
			const misses = runs.flatMap((run) =>
				run.cases.flatMap((item) => {
					const analysis = analyzeCombinedGermanKnowledgeCase(item);
					return analysis.contractPass
						? []
						: [
								{
									runId: run.runId,
									caseId: item.caseId,
									classifications: classifyMiss(analysis),
									analysis,
								},
							];
				}),
			);
			const errors = attempts.filter(
				(attempt) => attempt.error !== undefined,
			).length;
			const refusals = attempts.filter(({ refusal }) => refusal).length;
			const incomplete = attempts.filter(
				({ incompleteReason }) => incompleteReason !== null,
			).length;
			const latencies = attempts
				.map(({ latencyMs }) => latencyMs)
				.sort((left, right) => left - right);
			const inputTokens = sum(attempts, ({ inputTokens }) => inputTokens);
			return [
				revision.id,
				{
					revisionNumber: revision.number,
					title: revision.title,
					hypothesis: revision.hypothesis,
					promptFingerprint: revision.promptFingerprint,
					plannedRepetitions: revision.repetitions,
					completedRepetitions: runs.length,
					callCount: attempts.length,
					errorCount: errors,
					refusalCount: refusals,
					incompleteCount: incomplete,
					stopReason: args.stoppedRevisions.get(revision.id) ?? null,
					latencyMs: {
						median: percentile(latencies, 0.5),
						p95: percentile(latencies, 0.95),
						total: sum(attempts, ({ latencyMs }) => latencyMs),
					},
					tokens: {
						input: inputTokens,
						output: sum(
							attempts,
							({ outputTokens }) => outputTokens,
						),
						cachedInput: sum(
							attempts,
							({ cachedInputTokens }) => cachedInputTokens,
						),
						cacheWriteInput: sum(
							attempts,
							({ cacheWriteInputTokens }) =>
								cacheWriteInputTokens,
						),
						cacheHitRatio:
							inputTokens === 0
								? 0
								: sum(
										attempts,
										({ cachedInputTokens }) =>
											cachedInputTokens,
									) / inputTokens,
					},
					actualSpendUsd: formatNanoUsd(
						sum(
							attempts,
							({ actualCostNanoUsd }) => actualCostNanoUsd,
						),
					),
					semanticReport,
					misses,
					gatePass:
						errors === 0 &&
						refusals === 0 &&
						incomplete === 0 &&
						semanticReport?.overallGatePass === true,
				},
			];
		}),
	) as Record<string, Record<string, unknown>>;
	return Object.freeze({
		formatVersion: "german-relation-prompt-iteration-lab-v1",
		actualSpendUsd: formatNanoUsd(args.actualSpendNanoUsd),
		historicalIssue192SpendUsd: formatNanoUsd(args.historicalSpendNanoUsd),
		cumulativeIssue192SpendUsd: formatNanoUsd(
			args.historicalSpendNanoUsd + args.actualSpendNanoUsd,
		),
		budgetUsd: formatNanoUsd(LAB_BUDGET_NANO_USD),
		byRevision,
		recommendation: recommend(byRevision),
	});
}

function evaluationRunsFor(
	plan: LabPlan,
	attempts: readonly Attempt[],
	revisionId: string,
): readonly GermanRelationEvaluationRun[] {
	const repetitionNumbers = [
		...new Set(attempts.map(({ repetition }) => repetition)),
	].sort((left, right) => left - right);
	return repetitionNumbers.flatMap((repetition) => {
		const repetitionAttempts = attempts.filter(
			(attempt) => attempt.repetition === repetition,
		);
		if (
			repetitionAttempts.length !== plan.developmentCaseIds.length ||
			repetitionAttempts.some(({ output }) => output === undefined)
		)
			return [];
		const byCaseId = new Map(
			repetitionAttempts.map((attempt) => [attempt.caseId, attempt]),
		);
		return [
			{
				runId: `${revisionId}/repetition-${repetition}`,
				cases: plan.developmentCaseIds.map((caseId) => {
					const call = plan.calls.find(
						(item) =>
							item.revisionId === revisionId &&
							item.repetition === repetition &&
							item.caseId === caseId,
					);
					const attempt = byCaseId.get(caseId);
					if (call === undefined || attempt?.output === undefined)
						throw new Error(
							`Incomplete evaluation case ${caseId}.`,
						);
					return {
						caseId,
						input: call.evaluationInput,
						idealOutput: call.idealOutput,
						output: relationEvaluationOutput(attempt.output),
					};
				}),
			},
		];
	});
}

function classifyMiss(
	analysis: CombinedGermanKnowledgeCaseAnalysis,
): readonly string[] {
	const classifications = new Set<string>();
	if (!analysis.requestShapePass) classifications.add("request-shape");
	if (!analysis.crossAspectConsistencyPass)
		classifications.add("cross-aspect");
	if (!analysis.relationKindsPass) classifications.add("relation-kinds");
	for (const relation of Object.values(analysis.relations)) {
		if (relation.falsePositiveCount > 0)
			classifications.add("false-positive");
		if (relation.harmfulFalsePositiveCount > 0)
			classifications.add("harmful-false-positive");
		if (relation.omissionCount > 0) classifications.add("omission");
		if (relation.wrongFamilyCount > 0) classifications.add("wrong-family");
		if (relation.wrongKindCount > 0) classifications.add("wrong-kind");
		if (relation.confusions.length > 0)
			classifications.add("relation-kind-confusion");
		if (relation.unclassifiedFalsePositiveCount > 0)
			classifications.add("unclassified-target");
		if (!relation.nullBehaviorPass) classifications.add("null-behavior");
	}
	return [...classifications].sort();
}

function harmfulCountForRepetition(
	plan: LabPlan,
	attempts: readonly Attempt[],
	revisionId: string,
	repetition: number,
): number {
	const runs = evaluationRunsFor(
		plan,
		attempts.filter(
			(attempt) =>
				attempt.revisionId === revisionId &&
				attempt.repetition === repetition,
		),
		revisionId,
	);
	return runs.reduce(
		(total, run) =>
			total +
			run.cases.reduce((caseTotal, item) => {
				const analysis = analyzeCombinedGermanKnowledgeCase(item);
				return (
					caseTotal +
					Object.values(analysis.relations).reduce(
						(relationTotal, relation) =>
							relationTotal + relation.harmfulFalsePositiveCount,
						0,
					)
				);
			}, 0),
		0,
	);
}

function isLastCallOfRepetition(plan: LabPlan, call: LabCallPlan): boolean {
	const calls = plan.calls.filter(
		(item) =>
			item.revisionId === call.revisionId &&
			item.repetition === call.repetition,
	);
	return calls.at(-1)?.id === call.id;
}

function recommend(reports: Record<string, Record<string, unknown>>) {
	const passing = PROMPT_REVISIONS.filter(
		(revision) => reports[revision.id]?.gatePass === true,
	);
	if (passing.length === 0)
		return {
			decision: "no-prompt-revision-clears-the-frozen-gate",
			action: "Keep failing relation kinds disabled; do not hand an unqualified prompt to acceptance.",
		};
	const selected = passing.at(-1);
	return {
		decision: "recommend-prompt-revision",
		revisionId: selected?.id,
		promptFingerprint: selected?.promptFingerprint,
		policy: "combined atomic call / gpt-5.6-luna / reasoning none / exact #191 thresholds",
	};
}

function assertPaidAuthorization(
	plan: LabPlan,
	authorizedMaximumSpendUsd: string,
): void {
	if (authorizedMaximumSpendUsd !== plan.maximumSpendUsd)
		throw new Error(
			`Paid execution requires the exact preflight ceiling ${plan.maximumSpendUsd} USD; received ${authorizedMaximumSpendUsd || "none"}.`,
		);
}

function assertBeforeCallBudget(args: {
	plan: LabPlan;
	index: number;
	historicalSpendNanoUsd: number;
	actualSpendNanoUsd: number;
}): void {
	const remainingCeiling = sum(
		args.plan.calls.slice(args.index),
		({ maximumCostNanoUsd }) => maximumCostNanoUsd,
	);
	if (
		args.historicalSpendNanoUsd +
			args.actualSpendNanoUsd +
			remainingCeiling >
		args.plan.budgetNanoUsd
	)
		throw new Error(
			`Hard provider budget would be exceeded before call ${args.plan.calls[args.index]?.id}.`,
		);
}

async function retainedIssueSpendNanoUsd(): Promise<number> {
	return (
		(await retainedSpendNanoUsd(RUNS_DIRECTORY)) +
		(await retainedSpendNanoUsd(PREVIOUS_TOPOLOGY_RUNS_DIRECTORY))
	);
}

async function retainedSpendNanoUsd(directory: string): Promise<number> {
	let entries: Dirent[];
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (cause) {
		if ((cause as NodeJS.ErrnoException).code === "ENOENT") return 0;
		throw cause;
	}
	let total = 0;
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		try {
			const value: unknown = JSON.parse(
				await readFile(
					join(directory, entry.name, "results.json"),
					"utf8",
				),
			);
			if (typeof value !== "object" || value === null) continue;
			const attempts = (value as Record<string, unknown>).attempts;
			if (!Array.isArray(attempts)) continue;
			total += attempts.reduce((subtotal, attempt) => {
				if (typeof attempt !== "object" || attempt === null)
					return subtotal;
				const cost = (attempt as Record<string, unknown>)
					.actualCostNanoUsd;
				return (
					subtotal +
					(typeof cost === "number" &&
					Number.isFinite(cost) &&
					cost >= 0
						? cost
						: 0)
				);
			}, 0);
		} catch (cause) {
			if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
		}
	}
	return total;
}

function serializablePlan(plan: LabPlan) {
	return {
		question: plan.question,
		model: plan.model,
		reasoningEffort: plan.reasoningEffort,
		developmentCaseIds: plan.developmentCaseIds,
		revisions: plan.revisions,
		maximumSpendUsd: plan.maximumSpendUsd,
		budgetUsd: plan.budgetUsd,
		guards: plan.guards,
		byRevision: plan.byRevision,
		plannedCalls: plan.calls.length,
	};
}

function preflightState(plan: LabPlan): UiState {
	return {
		status: "preflight-passed",
		apiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
		lastAction: "All guards passed with zero provider calls.",
		plannedCalls: plan.calls.length,
		completedCalls: 0,
		skippedCalls: 0,
		maximumSpendUsd: plan.maximumSpendUsd,
		actualSpendUsd: formatNanoUsd(0),
		artifactPath: null,
		report: serializablePlan(plan),
	};
}

function render(state: Readonly<UiState>): void {
	console.clear();
	console.log("\x1b[1mTHROWAWAY German Relation Prompt Iteration Lab\x1b[0m");
	console.log(stableJson(state));
	console.log(
		"\n\x1b[1m[p]\x1b[0m preflight  \x1b[1m[r]\x1b[0m paid run  \x1b[1m[q]\x1b[0m quit",
	);
}

async function interactive(): Promise<void> {
	const plan = createLabPlan();
	let state = preflightState(plan);
	const terminal = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		for (;;) {
			render(state);
			const action = (await terminal.question("> ")).trim().toLowerCase();
			if (action === "q") return;
			if (action === "p") {
				state = preflightState(createLabPlan());
				continue;
			}
			if (action === "r") {
				const authorization = await terminal.question(
					`Type the exact preflight ceiling ${plan.maximumSpendUsd} to authorize provider spend: `,
				);
				try {
					await runPaidLab({
						authorizedMaximumSpendUsd: authorization.trim(),
						onState: (next) => {
							state = { ...next };
							render(state);
						},
					});
				} catch (cause) {
					state = {
						...state,
						status: "failed",
						lastAction: describeError(cause).message,
					};
				}
			}
		}
	} finally {
		terminal.close();
	}
}

async function retainArtifact(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temporaryPath = `${path}.tmp`;
	await writeFile(
		temporaryPath,
		`${JSON.stringify(value, null, 2)}\n`,
		"utf8",
	);
	await rename(temporaryPath, path);
}

function percentile(sorted: readonly number[], fraction: number): number {
	if (sorted.length === 0) return 0;
	return (
		sorted[
			Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
		] ?? 0
	);
}

function describeError(cause: unknown): { name: string; message: string } {
	return cause instanceof Error
		? { name: cause.name, message: cause.message }
		: { name: "Error", message: String(cause) };
}

function sum<Value>(
	values: readonly Value[],
	select: (value: Value) => number,
): number {
	return values.reduce((total, value) => total + select(value), 0);
}

async function runCli(args: readonly string[]): Promise<void> {
	const [command, option] = args;
	if (command === undefined) {
		await interactive();
		return;
	}
	if (command === "preflight" && option === undefined) {
		console.log(JSON.stringify(preflightState(createLabPlan()), null, 2));
		return;
	}
	if (command === "run" && option?.startsWith("--authorize-max-spend-usd=")) {
		const result = await runPaidLab({
			authorizedMaximumSpendUsd: option.slice(
				"--authorize-max-spend-usd=".length,
			),
			onState: (state) => render(state),
		});
		console.log(JSON.stringify(result.artifact.report, null, 2));
		console.log(`Retained ${result.artifactPath}`);
		return;
	}
	throw new Error(
		"Usage: run.ts [preflight | run --authorize-max-spend-usd=<exact-ceiling>]",
	);
}

if (import.meta.main) await runCli(process.argv.slice(2));
