import { resolve } from "node:path";

type DeploymentOptions = {
	readonly deployment?: string;
	readonly prod?: boolean;
};

const appDirectory = resolve(import.meta.dirname, "..");
const convexExecutable = resolve(
	import.meta.dirname,
	"../../../node_modules/.bin/convex",
);

async function runReadonlyInspection(
	source: string,
	options: DeploymentOptions = {},
): Promise<void> {
	const deploymentArguments = options.prod
		? ["--prod"]
		: options.deployment
			? ["--deployment", options.deployment]
			: [];
	const child = Bun.spawn(
		[
			convexExecutable,
			"run",
			"--inline-query",
			`return JSON.stringify(await (async () => { ${source} })());`,
			...deploymentArguments,
			"--typecheck",
			"disable",
			"--codegen",
			"disable",
		],
		{
			cwd: appDirectory,
			stdin: "inherit",
			stdout: "pipe",
			stderr: "inherit",
		},
	);
	const [exitCode, stdout] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
	]);
	if (exitCode !== 0) process.exit(exitCode);
	// Arbitrary payload keys (including JSON Schema's $schema) stay opaque
	// across Convex's value boundary and are decoded only by the local CLI.
	console.log(JSON.stringify(JSON.parse(JSON.parse(stdout)), null, 2));
}

const literal = (value: string | number) => JSON.stringify(value);

const loadPayloadHelper = `
	const loadPayload = async (stepId) => {
		const parts = await ctx.db
			.query("inspectionPayloads")
			.withIndex("by_step_id_and_part", (q) => q.eq("stepId", stepId))
			.collect();
		const text = parts
			.sort((left, right) => left.part - right.part)
			.map((part) => part.text)
			.join("");
		try { return JSON.parse(text); } catch { return text; }
	};
`;

const requestContextExpression = (requestIdVariable: string) => `
	const click = await ctx.db
		.query("inspectionClicks")
		.withIndex("by_request_id", (q) => q.eq("requestId", ${requestIdVariable}))
		.unique();
	const session = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", ${requestIdVariable}))
		.unique();
	const visitorEncounter = await ctx.db
		.query("visitorEncounters")
		.withIndex("by_request_id", (q) => q.eq("requestId", ${requestIdVariable}))
		.unique();
	const runs = await ctx.db
		.query("resolutionRuns")
		.withIndex("by_request_id_and_run_number", (q) => q.eq("requestId", ${requestIdVariable}))
		.collect();
	const segmentId = session?.segmentId ?? visitorEncounter?.segmentId;
	const sentenceId = session?.sentenceId ?? visitorEncounter?.sentenceId ?? click?.sentenceId;
	const segment = segmentId ? await ctx.db.get(segmentId) : null;
	const sentence = sentenceId ? await ctx.db.get(sentenceId) : null;
`;

export function inspectResolutionStep(
	stepId: string,
	options?: DeploymentOptions,
): Promise<void> {
	const source = `
		const step = await ctx.db.get(${literal(stepId)});
		if (!step) throw new Error("Inspection step not found: " + ${literal(stepId)});
		const requestId = step.requestId;
		${loadPayloadHelper}
		const payload = await loadPayload(step._id);
		${requestContextExpression("requestId")}
		const requestSteps = await ctx.db
			.query("inspectionSteps")
			.withIndex("by_request_id_and_started_at", (q) => q.eq("requestId", requestId))
			.collect();
		const stepsByTraceId = new Map(requestSteps.map((candidate) => [candidate.id, candidate]));
		const ancestors = [];
		let ancestor = step.parentId ? stepsByTraceId.get(step.parentId) : null;
		while (ancestor && ancestors.length < 16) {
			ancestors.push(ancestor);
			ancestor = ancestor.parentId ? stepsByTraceId.get(ancestor.parentId) : null;
		}
		const ancestorPayloads = await Promise.all(
			ancestors.map((candidate) => loadPayload(candidate._id)),
		);
		const runToken = [payload, ...ancestorPayloads]
			.map((candidate) => candidate && typeof candidate === "object" ? candidate.input?.runToken ?? candidate.runToken : null)
			.find(Boolean);
		const matchingRun = runs.find((run) => run.runToken === runToken) ?? runs
			.filter((run) => run.startedAt <= step.startedAt && (run.finishedAt ?? run.expiresAt) >= step.startedAt)
			.sort((left, right) => right.startedAt - left.startedAt)[0] ?? null;
		return {
			step,
			payload,
			ancestors,
			children: requestSteps.filter((candidate) => candidate.parentId === step.id),
			request: { click, session, visitorEncounter },
			run: matchingRun,
			segment,
			sentence,
		};
	`;
	return runReadonlyInspection(source, options);
}

export function inspectResolutionTrace(
	stepId: string,
	options?: DeploymentOptions,
): Promise<void> {
	const source = `
		const step = await ctx.db.get(${literal(stepId)});
		if (!step) throw new Error("Inspection step not found: " + ${literal(stepId)});
		${loadPayloadHelper}
		const payload = await loadPayload(step._id);
		return { step, trace: payload };
	`;
	return runReadonlyInspection(source, options);
}

export function inspectResolutionRequest(
	requestId: string,
	options?: DeploymentOptions,
): Promise<void> {
	const source = `
		const requestId = ${literal(requestId)};
		${loadPayloadHelper}
		${requestContextExpression("requestId")}
		const steps = await ctx.db
			.query("inspectionSteps")
			.withIndex("by_request_id_and_started_at", (q) => q.eq("requestId", requestId))
			.collect();
		const stepsWithPayloads = await Promise.all(
			steps.map(async (step) => ({
				...step,
				payload: await loadPayload(step._id),
			})),
		);
		return {
			request: { click, session, visitorEncounter },
			runs,
			segment,
			sentence,
			steps: stepsWithPayloads,
		};
	`;
	return runReadonlyInspection(source, options);
}

export function inspectResolutionRun(
	runId: string,
	options?: DeploymentOptions,
): Promise<void> {
	const source = `
		const run = await ctx.db.get(${literal(runId)});
		if (!run) throw new Error("Resolution run not found: " + ${literal(runId)});
		const requestId = run.requestId;
		${requestContextExpression("requestId")}
		const allSteps = await ctx.db
			.query("inspectionSteps")
			.withIndex("by_request_id_and_started_at", (q) => q.eq("requestId", requestId))
			.collect();
		const runEnd = run.finishedAt ?? run.expiresAt;
		return {
			run,
			request: { click, session, visitorEncounter },
			segment,
			sentence,
			steps: allSteps.filter((step) => step.startedAt >= run.startedAt && step.startedAt <= runEnd),
		};
	`;
	return runReadonlyInspection(source, options);
}

export function inspectSegment(
	segmentId: string,
	options?: DeploymentOptions,
): Promise<void> {
	const source = `
		const segment = await ctx.db.get(${literal(segmentId)});
		if (!segment) throw new Error("Segment not found: " + ${literal(segmentId)});
		const sentence = await ctx.db.get(segment.sentenceId);
		const sessions = await ctx.db
			.query("resolutionSessions")
			.withIndex("by_sentence_id", (q) => q.eq("sentenceId", segment.sentenceId))
			.filter((q) => q.eq(q.field("segmentId"), segment._id))
			.order("desc")
			.take(50);
		const visitorEncounters = await ctx.db
			.query("visitorEncounters")
			.withIndex("by_segment_id_and_attestation_id", (q) => q.eq("segmentId", segment._id))
			.order("desc")
			.take(50);
		const requestIds = [...new Set([...sessions.map((session) => session.requestId), ...visitorEncounters.map((encounter) => encounter.requestId)])];
		const inspections = (await Promise.all(requestIds.map((requestId) => ctx.db
			.query("inspectionClicks")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique()))).filter(Boolean);
		return { segment, sentence, sessions, visitorEncounters, inspections };
	`;
	return runReadonlyInspection(source, options);
}

export function listRecentResolutionInspections(
	limit = 20,
	options?: DeploymentOptions,
): Promise<void> {
	const source = `
		return await ctx.db.query("inspectionClicks").order("desc").take(${literal(limit)});
	`;
	return runReadonlyInspection(source, options);
}

/** How a row's requests were asked: live, a first stretch's, or through an OpenAI batch. */
const transportExpression = (rowVariable: string) =>
	`(${rowVariable}.openAIBatchId === undefined ? "Live" : "Batch")`;

/**
 * The latest batches of Luna requests asked ahead of the clicks, each with
 * how it was asked (a first stretch's, Live, or an OpenAI Batch) and its
 * requests by stage (#1351).
 */
export function listLunaAheadBatches(
	limit = 20,
	options?: DeploymentOptions,
): Promise<void> {
	const source = `
		const rows = await ctx.db
			.query("lunaAheadBatches")
			.withIndex("by_submitted_at")
			.order("desc")
			.take(${literal(limit)});
		return rows.map((row) => ({ transport: ${transportExpression("row")}, ...row }));
	`;
	return runReadonlyInspection(source, options);
}

/**
 * One batch of Luna requests asked ahead, by its row (which a click's
 * trace names for an answer asked live) or its OpenAI id, how it was
 * asked, and how many answers it stored.
 */
export function inspectLunaAheadBatch(
	batchId: string,
	options?: DeploymentOptions,
): Promise<void> {
	const source = `
		const id = ${literal(batchId)};
		const normalized = ctx.db.normalizeId("lunaAheadBatches", id);
		const batch = normalized
			? await ctx.db.get(normalized)
			: (await ctx.db.query("lunaAheadBatches").collect()).find((row) => row.openAIBatchId === id) ?? null;
		if (!batch) throw new Error("Luna ahead batch not found: " + id);
		const answers = await ctx.db
			.query("lunaAheadAnswers")
			.withIndex("by_batch_id", (q) => q.eq("batchId", batch._id))
			.collect();
		return { batch: { transport: ${transportExpression("batch")}, ...batch }, storedAnswers: answers.length };
	`;
	return runReadonlyInspection(source, options);
}

function usage(): never {
	console.error(`Usage:
  bun run resolution_inspector trace <inspectionStepId>
  bun run resolution_inspector step <inspectionStepId>
  bun run resolution_inspector request <requestId>
  bun run resolution_inspector run <resolutionRunId>
  bun run resolution_inspector segment <segmentId>
  bun run resolution_inspector recent [limit]
  bun run resolution_inspector batches [limit]
  bun run resolution_inspector batch <lunaAheadBatchId | openAIBatchId>

Options:
  --prod
  --deployment <name>`);
	process.exit(1);
}

function parseDeploymentOptions(args: string[]): {
	readonly positional: string[];
	readonly options: DeploymentOptions;
} {
	const positional: string[] = [];
	const options: { deployment?: string; prod?: boolean } = {};
	const rest = args.values();
	for (const argument of rest) {
		if (argument === "--prod") options.prod = true;
		else if (argument === "--deployment") {
			const deployment = rest.next().value;
			if (!deployment) usage();
			options.deployment = deployment;
		} else positional.push(argument);
	}
	if (options.prod && options.deployment) usage();
	return { positional, options };
}

if (import.meta.main) {
	const { positional, options } = parseDeploymentOptions(
		process.argv.slice(2),
	);
	const [command, identifier] = positional;
	if (command === "trace" && identifier)
		await inspectResolutionTrace(identifier, options);
	else if (command === "step" && identifier)
		await inspectResolutionStep(identifier, options);
	else if (command === "request" && identifier)
		await inspectResolutionRequest(identifier, options);
	else if (command === "run" && identifier)
		await inspectResolutionRun(identifier, options);
	else if (command === "segment" && identifier)
		await inspectSegment(identifier, options);
	else if (command === "batch" && identifier)
		await inspectLunaAheadBatch(identifier, options);
	else if (command === "batches") {
		const limit = identifier === undefined ? 20 : Number(identifier);
		if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) usage();
		await listLunaAheadBatches(limit, options);
	} else if (command === "recent") {
		const limit = identifier === undefined ? 20 : Number(identifier);
		if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) usage();
		await listRecentResolutionInspections(limit, options);
	} else usage();
}
