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

const payloadExpression = (stepVariable: string) => `
	const payloadParts = await ctx.db
		.query("inspectionPayloads")
		.withIndex("by_step_id_and_part", (q) => q.eq("stepId", ${stepVariable}._id))
		.collect();
	const payloadJson = payloadParts
		.sort((left, right) => left.part - right.part)
		.map((part) => part.text)
		.join("");
	let payload = payloadJson;
	try { payload = JSON.parse(payloadJson); } catch {}
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
	const visitorClick = await ctx.db
		.query("visitorClicks")
		.withIndex("by_request_id", (q) => q.eq("requestId", ${requestIdVariable}))
		.unique();
	const runs = await ctx.db
		.query("resolutionRuns")
		.withIndex("by_request_id_and_run_number", (q) => q.eq("requestId", ${requestIdVariable}))
		.collect();
	const segmentId = session?.segmentId ?? visitorClick?.segmentId;
	const sentenceId = session?.sentenceId ?? visitorClick?.sentenceId ?? click?.sentenceId;
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
		${payloadExpression("step")}
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
		const ancestorPayloads = await Promise.all(ancestors.map(async (candidate) => {
			const parts = await ctx.db
				.query("inspectionPayloads")
				.withIndex("by_step_id_and_part", (q) => q.eq("stepId", candidate._id))
				.collect();
			const text = parts.sort((left, right) => left.part - right.part).map((part) => part.text).join("");
			try { return JSON.parse(text); } catch { return text; }
		}));
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
			request: { click, session, visitorClick },
			run: matchingRun,
			segment,
			sentence,
		};
	`;
	return runReadonlyInspection(source, options);
}

export function inspectResolutionRequest(
	requestId: string,
	options?: DeploymentOptions,
): Promise<void> {
	const source = `
		const requestId = ${literal(requestId)};
		${requestContextExpression("requestId")}
		const steps = await ctx.db
			.query("inspectionSteps")
			.withIndex("by_request_id_and_started_at", (q) => q.eq("requestId", requestId))
			.collect();
		const stepsWithPayloads = await Promise.all(steps.map(async (step) => {
			const parts = await ctx.db
				.query("inspectionPayloads")
				.withIndex("by_step_id_and_part", (q) => q.eq("stepId", step._id))
				.collect();
			const text = parts.sort((left, right) => left.part - right.part).map((part) => part.text).join("");
			let payload = text;
			try { payload = JSON.parse(text); } catch {}
			return { ...step, payload };
		}));
		return {
			request: { click, session, visitorClick },
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
			request: { click, session, visitorClick },
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
			.filter((q) => q.eq(q.field("segmentId"), segment._id))
			.order("desc")
			.take(50);
		const visitorClicks = await ctx.db
			.query("visitorClicks")
			.withIndex("by_segment_id", (q) => q.eq("segmentId", segment._id))
			.order("desc")
			.take(50);
		const requestIds = [...new Set([...sessions.map((session) => session.requestId), ...visitorClicks.map((click) => click.requestId)])];
		const inspections = (await Promise.all(requestIds.map((requestId) => ctx.db
			.query("inspectionClicks")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique()))).filter(Boolean);
		return { segment, sentence, sessions, visitorClicks, inspections };
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

function usage(): never {
	console.error(`Usage:
  bun run resolution_inspector step <inspectionStepId>
  bun run resolution_inspector request <requestId>
  bun run resolution_inspector run <resolutionRunId>
  bun run resolution_inspector segment <segmentId>
  bun run resolution_inspector recent [limit]

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
	for (let index = 0; index < args.length; index++) {
		const argument = args[index];
		if (argument === "--prod") options.prod = true;
		else if (argument === "--deployment") {
			const deployment = args[++index];
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
	if (command === "step" && identifier)
		await inspectResolutionStep(identifier, options);
	else if (command === "request" && identifier)
		await inspectResolutionRequest(identifier, options);
	else if (command === "run" && identifier)
		await inspectResolutionRun(identifier, options);
	else if (command === "segment" && identifier)
		await inspectSegment(identifier, options);
	else if (command === "recent") {
		const limit = identifier === undefined ? 20 : Number(identifier);
		if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) usage();
		await listRecentResolutionInspections(limit, options);
	} else usage();
}
