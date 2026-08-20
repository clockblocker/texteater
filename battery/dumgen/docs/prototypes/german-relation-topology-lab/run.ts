// THROWAWAY PROTOTYPE — interactive German relation prompt-topology laboratory.

import {
	mkdir,
	open,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

import type { GermanKnowledgeAnalysis } from "../../../src/knowledge-generation/de/schemas";
import { stableJson } from "../../../src/promptsmith/assembly";
import { analyzeCombinedGermanKnowledgeCase } from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluator";
import {
	createGermanRelationEvaluationReport,
	type GermanRelationEvaluationRun,
} from "../../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/relation-report";
import {
	actualCostNanoUsd,
	canonicalizeRelationOutput,
	createLabPlan,
	formatNanoUsd,
	LAB_BUDGET_NANO_USD,
	LAB_TOPOLOGIES,
	type LabCallPlan,
	type LabPlan,
	type LabTopology,
	usageCounters,
} from "./logic";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS_DIRECTORY = join(HERE, "runs");

type Attempt = Readonly<{
	callId: string;
	iteration: number;
	topology: LabTopology;
	caseId: string;
	relations: readonly string[];
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
			"Another paid German relation topology run is active; refusing concurrent spend.",
			{ cause },
		);
	});
	try {
		const historicalSpendNanoUsd = await retainedSpendNanoUsd();
		if (
			historicalSpendNanoUsd + plan.maximumSpendNanoUsd >
			LAB_BUDGET_NANO_USD
		)
			throw new Error(
				`Retained spend plus this run's ${plan.maximumSpendUsd} USD ceiling exceeds the cumulative 5 USD budget.`,
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

export async function resumeNonHarmfulArm(args: {
	readonly artifactPath: string;
	readonly authorizedMaximumSpendUsd: string;
	readonly onState?: (state: Readonly<UiState>) => void;
}) {
	const plan = createLabPlan();
	assertPaidAuthorization(plan, args.authorizedMaximumSpendUsd);
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) throw new Error("OPENAI_API_KEY is unavailable.");
	const artifactPath = resolve(args.artifactPath);
	if (
		!artifactPath.startsWith(`${RUNS_DIRECTORY}/`) ||
		!artifactPath.endsWith("/results.json")
	)
		throw new Error(
			"Resume artifact must be one retained topology-lab result.",
		);
	const retained: unknown = JSON.parse(await readFile(artifactPath, "utf8"));
	if (typeof retained !== "object" || retained === null)
		throw new Error("Resume artifact is not an object.");
	const record = retained as Record<string, unknown>;
	if (!Array.isArray(record.attempts))
		throw new Error("Resume artifact has no retained attempts.");
	const attempts = record.attempts as Attempt[];
	const completedIds = new Set(attempts.map(({ callId }) => callId));
	const calls = plan.cases
		.filter(({ topology }) => topology === "current-combined-narrow-groups")
		.flatMap(({ calls }) => calls)
		.filter(({ id }) => !completedIds.has(id));
	const initialSpendNanoUsd = sum(
		attempts,
		({ actualCostNanoUsd }) => actualCostNanoUsd,
	);
	await mkdir(RUNS_DIRECTORY, { recursive: true });
	const lockPath = join(RUNS_DIRECTORY, ".active-paid-run.lock");
	const lock = await open(lockPath, "wx").catch((cause) => {
		throw new Error(
			"Another paid German relation topology run is active; refusing concurrent spend.",
			{ cause },
		);
	});
	try {
		const retainedSpend = await retainedSpendNanoUsd();
		const historicalSpendNanoUsd = Math.max(
			0,
			retainedSpend - initialSpendNanoUsd,
		);
		const remainingCeiling = sum(
			calls,
			({ maximumCostNanoUsd }) => maximumCostNanoUsd,
		);
		if (
			historicalSpendNanoUsd + initialSpendNanoUsd + remainingCeiling >
			LAB_BUDGET_NANO_USD
		)
			throw new Error(
				"Retained spend plus the safe-arm continuation exceeds the cumulative 5 USD budget.",
			);
		return await executePaidLab({
			args,
			plan,
			apiKey,
			historicalSpendNanoUsd,
			calls,
			initialAttempts: attempts,
			initialSpendNanoUsd,
			artifactPath,
			startedAt:
				typeof record.startedAt === "string"
					? record.startedAt
					: new Date().toISOString(),
		});
	} finally {
		await lock.close();
		await rm(lockPath, { force: true });
	}
}

export async function rebuildRetainedReport(artifactPathInput: string) {
	const artifactPath = resolve(artifactPathInput);
	if (
		!artifactPath.startsWith(`${RUNS_DIRECTORY}/`) ||
		!artifactPath.endsWith("/results.json")
	)
		throw new Error(
			"Report artifact must be one retained topology-lab result.",
		);
	const retained: unknown = JSON.parse(await readFile(artifactPath, "utf8"));
	if (typeof retained !== "object" || retained === null)
		throw new Error("Report artifact is not an object.");
	const artifact = retained as Record<string, unknown>;
	if (!Array.isArray(artifact.attempts))
		throw new Error("Report artifact has no retained attempts.");
	const attempts = artifact.attempts as Attempt[];
	const actualSpendNanoUsd = sum(
		attempts,
		({ actualCostNanoUsd }) => actualCostNanoUsd,
	);
	const report = buildFinalReport(
		createLabPlan(),
		attempts,
		actualSpendNanoUsd,
	);
	const state =
		typeof artifact.state === "object" && artifact.state !== null
			? { ...(artifact.state as Record<string, unknown>), report }
			: { report };
	const updated = { ...artifact, state, report };
	await retainArtifact(artifactPath, updated);
	return Object.freeze({ artifactPath, report });
}

async function executePaidLab(context: {
	args: {
		readonly authorizedMaximumSpendUsd: string;
		readonly onState?: (state: Readonly<UiState>) => void;
	};
	plan: LabPlan;
	apiKey: string;
	historicalSpendNanoUsd: number;
	calls?: readonly LabCallPlan[];
	initialAttempts?: readonly Attempt[];
	initialSpendNanoUsd?: number;
	artifactPath?: string;
	startedAt?: string;
}) {
	const { args, plan, apiKey, historicalSpendNanoUsd } = context;
	const startedAt = context.startedAt ?? new Date().toISOString();
	const runId = startedAt.replaceAll(/[:.]/gu, "-");
	const artifactPath =
		context.artifactPath ?? join(RUNS_DIRECTORY, runId, "results.json");
	const calls = context.calls ?? plan.cases.flatMap(({ calls }) => calls);
	const client = new OpenAI({ apiKey });
	const attempts: Attempt[] = [...(context.initialAttempts ?? [])];
	let actualSpendNanoUsd = context.initialSpendNanoUsd ?? 0;
	const state: UiState = {
		status: "running",
		apiKeyAvailable: true,
		lastAction: "Paid run authorized; no call made yet.",
		plannedCalls: attempts.length + calls.length,
		completedCalls: attempts.length,
		maximumSpendUsd: plan.maximumSpendUsd,
		actualSpendUsd: formatNanoUsd(actualSpendNanoUsd),
		artifactPath,
		report: null,
	};
	args.onState?.(state);

	for (const [index, call] of calls.entries()) {
		assertBeforeCallBudget({
			plan,
			calls,
			index,
			historicalSpendNanoUsd,
			actualSpendNanoUsd,
		});
		const started = performance.now();
		try {
			const response = await client.responses.create(call.request);
			const latencyMs = Math.round(performance.now() - started);
			const rawOutputText = response.output_text;
			const refusal = stableJson(response.output).includes('"refusal"');
			const output = rawOutputText
				? call.outputSchema.parse(JSON.parse(rawOutputText))
				: undefined;
			const cost = actualCostNanoUsd(
				response.usage,
				call.maximumCostNanoUsd,
			);
			if (cost > call.maximumCostNanoUsd)
				throw new Error(
					`Provider usage exceeded the conservative cost ceiling for ${call.id}.`,
				);
			actualSpendNanoUsd += cost;
			const usage = usageCounters(response.usage);
			attempts.push({
				callId: call.id,
				iteration: call.iteration,
				topology: call.topology,
				caseId: call.caseId,
				relations: call.relations,
				maximumCostNanoUsd: call.maximumCostNanoUsd,
				actualCostNanoUsd: cost,
				latencyMs,
				status: response.status ?? null,
				incompleteReason: response.incomplete_details?.reason ?? null,
				refusal,
				usage: response.usage ?? null,
				...usage,
				responseId: response.id,
				resolvedModel: response.model,
				rawOutputText,
				...(output === undefined ? {} : { output }),
				...(rawOutputText.length > 0
					? {}
					: {
							error: {
								name: "EmptyProviderOutput",
								message:
									"Provider returned no structured output text.",
							},
						}),
			});
		} catch (cause) {
			const cost = call.maximumCostNanoUsd;
			actualSpendNanoUsd += cost;
			attempts.push({
				callId: call.id,
				iteration: call.iteration,
				topology: call.topology,
				caseId: call.caseId,
				relations: call.relations,
				maximumCostNanoUsd: call.maximumCostNanoUsd,
				actualCostNanoUsd: cost,
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
			});
		}

		state.completedCalls = attempts.length;
		state.actualSpendUsd = formatNanoUsd(actualSpendNanoUsd);
		state.lastAction = `Completed ${call.id}`;
		args.onState?.(state);
		await retainArtifact(artifactPath, {
			kind: "THROWAWAY-german-relation-topology-lab",
			startedAt,
			completedAt: null,
			plan: serializablePlan(plan),
			state,
			attempts,
			report: null,
		});
	}

	const report = buildFinalReport(plan, attempts, actualSpendNanoUsd);
	state.status = "complete";
	state.lastAction =
		"All bounded calls completed and the semantic report was built.";
	state.report = report;
	args.onState?.(state);
	const artifact = {
		kind: "THROWAWAY-german-relation-topology-lab",
		startedAt,
		completedAt: new Date().toISOString(),
		plan: serializablePlan(plan),
		state,
		attempts,
		report,
	};
	await retainArtifact(artifactPath, artifact);
	return Object.freeze({ artifactPath, artifact });
}

function buildFinalReport(
	plan: LabPlan,
	attempts: readonly Attempt[],
	actualSpendNanoUsd: number,
) {
	const reports = Object.fromEntries(
		LAB_TOPOLOGIES.map((topology) => {
			const topologyAttempts = attempts.filter(
				(attempt) => attempt.topology === topology,
			);
			const errorCount = topologyAttempts.filter(
				(attempt) => attempt.error !== undefined,
			).length;
			const refusalCount = topologyAttempts.filter(
				({ refusal }) => refusal,
			).length;
			const incompleteCount = topologyAttempts.filter(
				({ incompleteReason }) => incompleteReason !== null,
			).length;
			const observationSet = observationsFor(plan, topology, attempts);
			const observations = observationSet.runs;
			const semanticReport =
				observations.length > 0
					? createGermanRelationEvaluationReport({
							runs: observations,
						})
					: null;
			const regressions = observations.flatMap((run) =>
				run.cases.flatMap((item) => {
					const analysis = analyzeCombinedGermanKnowledgeCase(item);
					return analysis.contractPass
						? []
						: [{ runId: run.runId, caseId: item.caseId, analysis }];
				}),
			);
			const latencies = topologyAttempts
				.map(({ latencyMs }) => latencyMs)
				.sort((left, right) => left - right);
			const inputTokens = sum(
				topologyAttempts,
				({ inputTokens }) => inputTokens,
			);
			const cachedInputTokens = sum(
				topologyAttempts,
				({ cachedInputTokens }) => cachedInputTokens,
			);
			const harmfulFalsePositiveCount = regressions.reduce(
				(total, regression) =>
					total +
					Object.values(regression.analysis.relations).reduce(
						(subtotal, relation) =>
							subtotal + relation.harmfulFalsePositiveCount,
						0,
					),
				0,
			);
			const stoppedEarly =
				topologyAttempts.length < plan.byTopology[topology].callCount;
			return [
				topology,
				{
					topology,
					callCount: topologyAttempts.length,
					errorCount,
					refusalCount,
					incompleteCount,
					completedIterations: observationSet.completedIterations,
					evaluatedCaseIds: observationSet.evaluatedCaseIds,
					excludedCaseIds: observationSet.excludedCaseIds,
					executionErrorRelations: [
						...new Set(
							topologyAttempts.flatMap((attempt) =>
								attempt.error === undefined
									? []
									: attempt.relations,
							),
						),
					],
					stoppedEarly,
					stopReason:
						stoppedEarly && harmfulFalsePositiveCount >= 2
							? "repeated-harmful-false-positives"
							: null,
					harmfulFalsePositiveCount,
					latencyMs: {
						median: percentile(latencies, 0.5),
						p95: percentile(latencies, 0.95),
						total: sum(
							topologyAttempts,
							({ latencyMs }) => latencyMs,
						),
					},
					tokens: {
						input: inputTokens,
						output: sum(
							topologyAttempts,
							({ outputTokens }) => outputTokens,
						),
						cachedInput: cachedInputTokens,
						cacheWriteInput: sum(
							topologyAttempts,
							({ cacheWriteInputTokens }) =>
								cacheWriteInputTokens,
						),
						cacheHitRatio:
							inputTokens === 0
								? 0
								: cachedInputTokens / inputTokens,
					},
					actualSpendUsd: formatNanoUsd(
						sum(
							topologyAttempts,
							({ actualCostNanoUsd }) => actualCostNanoUsd,
						),
					),
					semanticReport,
					regressions,
					gatePass:
						errorCount === 0 &&
						refusalCount === 0 &&
						incompleteCount === 0 &&
						semanticReport?.overallGatePass === true,
				},
			];
		}),
	) as Record<LabTopology, Record<string, unknown>>;
	return Object.freeze({
		formatVersion: "german-relation-topology-lab-v1",
		actualSpendUsd: formatNanoUsd(actualSpendNanoUsd),
		budgetUsd: formatNanoUsd(LAB_BUDGET_NANO_USD),
		byTopology: reports,
		recommendation: recommend(reports),
	});
}

function observationsFor(
	plan: LabPlan,
	topology: LabTopology,
	attempts: readonly Attempt[],
): Readonly<{
	runs: readonly GermanRelationEvaluationRun[];
	completedIterations: readonly number[];
	evaluatedCaseIds: readonly string[];
	excludedCaseIds: readonly string[];
}> {
	const attemptedCallIds = new Set(attempts.map(({ callId }) => callId));
	const outputs = new Map(
		attempts.flatMap((attempt) =>
			attempt.output === undefined
				? []
				: [[attempt.callId, attempt.output] as const],
		),
	);
	const completedIterations = Array.from(
		{ length: plan.iterations },
		(_, index) => index + 1,
	).filter((iteration) =>
		plan.cases
			.filter(
				(item) =>
					item.iteration === iteration && item.topology === topology,
			)
			.every((item) =>
				item.calls.every((call) => attemptedCallIds.has(call.id)),
			),
	);
	const evaluatedCaseIds = plan.developmentCaseIds.filter((caseId) =>
		completedIterations.every((iteration) => {
			const casePlan = plan.cases.find(
				(item) =>
					item.iteration === iteration &&
					item.topology === topology &&
					item.caseId === caseId,
			);
			const everyCallCompleted =
				casePlan?.calls.every((call) => outputs.has(call.id)) === true;
			return everyCallCompleted;
		}),
	);
	const runs: GermanRelationEvaluationRun[] = completedIterations.map(
		(iteration) => {
			const casePlans = plan.cases.filter(
				(item) =>
					item.iteration === iteration &&
					item.topology === topology &&
					evaluatedCaseIds.includes(item.caseId),
			);
			return {
				runId: `${topology}/iteration-${iteration}`,
				cases: casePlans.map((casePlan) => ({
					caseId: casePlan.caseId,
					input: casePlan.input,
					idealOutput: casePlan.idealOutput,
					output: canonicalizeRelationOutput(casePlan, outputs),
				})),
			};
		},
	);
	return {
		runs: evaluatedCaseIds.length === 0 ? [] : runs,
		completedIterations,
		evaluatedCaseIds,
		excludedCaseIds: plan.developmentCaseIds.filter(
			(caseId) => !evaluatedCaseIds.includes(caseId),
		),
	};
}

function recommend(reports: Record<LabTopology, Record<string, unknown>>) {
	const passing = LAB_TOPOLOGIES.filter(
		(topology) => reports[topology].gatePass === true,
	);
	if (passing.length === 0)
		return {
			decision: "no-topology-clears-the-frozen-gate",
			action: "Keep failing relation kinds disabled and inspect retained per-kind regressions.",
		};
	const ranked = [...passing].sort((left, right) => {
		const leftReport = reports[left];
		const rightReport = reports[right];
		const callDelta =
			numberField(leftReport, "callCount") -
			numberField(rightReport, "callCount");
		if (callDelta !== 0) return callDelta;
		return (
			nestedNumber(leftReport, "latencyMs", "p95") -
			nestedNumber(rightReport, "latencyMs", "p95")
		);
	});
	return {
		decision: "recommend-topology",
		topology: ranked[0],
		policy: "gpt-5.6-luna / reasoning none / exact #191 thresholds",
		rationale:
			"All semantic gates tie at pass; prefer fewer calls, then lower p95 latency.",
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
	calls: readonly LabCallPlan[];
	index: number;
	historicalSpendNanoUsd: number;
	actualSpendNanoUsd: number;
}): void {
	const remainingCeiling = sum(
		args.calls.slice(args.index),
		({ maximumCostNanoUsd }) => maximumCostNanoUsd,
	);
	if (
		args.historicalSpendNanoUsd +
			args.actualSpendNanoUsd +
			remainingCeiling >
			args.plan.budgetNanoUsd ||
		args.historicalSpendNanoUsd +
			args.actualSpendNanoUsd +
			args.calls[args.index].maximumCostNanoUsd >
			args.plan.budgetNanoUsd
	)
		throw new Error(
			`Hard provider budget would be exceeded before call ${args.calls[args.index].id}.`,
		);
}

async function retainedSpendNanoUsd(): Promise<number> {
	let total = 0;
	for (const entry of await readdir(RUNS_DIRECTORY, {
		withFileTypes: true,
	})) {
		if (!entry.isDirectory()) continue;
		try {
			const value: unknown = JSON.parse(
				await readFile(
					join(RUNS_DIRECTORY, entry.name, "results.json"),
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
		iterations: plan.iterations,
		developmentCaseIds: plan.developmentCaseIds,
		topologies: plan.topologies,
		maximumSpendUsd: plan.maximumSpendUsd,
		budgetUsd: plan.budgetUsd,
		guards: plan.guards,
		byTopology: plan.byTopology,
		plannedCalls: plan.cases.reduce(
			(total, casePlan) => total + casePlan.calls.length,
			0,
		),
	};
}

function preflightState(plan: LabPlan): UiState {
	return {
		status: "preflight-passed",
		apiKeyAvailable: Boolean(process.env.OPENAI_API_KEY),
		lastAction: "All guards passed with zero provider calls.",
		plannedCalls: plan.cases.reduce(
			(total, casePlan) => total + casePlan.calls.length,
			0,
		),
		completedCalls: 0,
		maximumSpendUsd: plan.maximumSpendUsd,
		actualSpendUsd: formatNanoUsd(0),
		artifactPath: null,
		report: serializablePlan(plan),
	};
}

function render(state: Readonly<UiState>): void {
	console.clear();
	console.log("\x1b[1mTHROWAWAY German Relation Topology Lab\x1b[0m");
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

function numberField(value: Record<string, unknown>, key: string): number {
	return typeof value[key] === "number"
		? value[key]
		: Number.POSITIVE_INFINITY;
}

function nestedNumber(
	value: Record<string, unknown>,
	key: string,
	nestedKey: string,
): number {
	const nested = value[key];
	return typeof nested === "object" &&
		nested !== null &&
		typeof (nested as Record<string, unknown>)[nestedKey] === "number"
		? ((nested as Record<string, unknown>)[nestedKey] as number)
		: Number.POSITIVE_INFINITY;
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
	const [command, firstOption, secondOption] = args;
	if (command === undefined) {
		await interactive();
		return;
	}
	if (command === "preflight" && firstOption === undefined) {
		console.log(JSON.stringify(preflightState(createLabPlan()), null, 2));
		return;
	}
	if (
		command === "run" &&
		firstOption?.startsWith("--authorize-max-spend-usd=")
	) {
		const result = await runPaidLab({
			authorizedMaximumSpendUsd: firstOption.slice(
				"--authorize-max-spend-usd=".length,
			),
			onState: (state) => render(state),
		});
		console.log(JSON.stringify(result.artifact.report, null, 2));
		console.log(`Retained ${result.artifactPath}`);
		return;
	}
	if (
		command === "resume-safe" &&
		firstOption?.startsWith("--artifact=") &&
		secondOption?.startsWith("--authorize-max-spend-usd=")
	) {
		const result = await resumeNonHarmfulArm({
			artifactPath: firstOption.slice("--artifact=".length),
			authorizedMaximumSpendUsd: secondOption.slice(
				"--authorize-max-spend-usd=".length,
			),
			onState: (state) => render(state),
		});
		console.log(JSON.stringify(result.artifact.report, null, 2));
		console.log(`Retained ${result.artifactPath}`);
		return;
	}
	if (command === "report" && firstOption?.startsWith("--artifact=")) {
		const result = await rebuildRetainedReport(
			firstOption.slice("--artifact=".length),
		);
		console.log(JSON.stringify(result.report, null, 2));
		console.log(`Updated ${result.artifactPath}`);
		return;
	}
	throw new Error(
		"Usage: run.ts [preflight | run --authorize-max-spend-usd=<ceiling> | resume-safe --artifact=<results.json> --authorize-max-spend-usd=<ceiling> | report --artifact=<results.json>]",
	);
}

if (import.meta.main) await runCli(process.argv.slice(2));
