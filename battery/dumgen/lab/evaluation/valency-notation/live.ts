/**
 * The paid half of the bench, on production's transport. Accuracy rounds
 * go through OpenAI's Batch API with explicit prompt caching (the
 * repository's convention for eval rounds), each request sent by
 * `createOpenAILunaBatch` exactly as a host's batch sends it; latency
 * samples go one by one through `createOpenAILuna` on production's
 * settings (`service_tier: fast`), as a click does. Nothing is retried, as
 * production retries nothing. Each answer is one JSONL record under
 * evidence/valency-notation/runs/, each run's dollars a line of
 * evidence/valency-notation/spend.jsonl.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { messageOf } from "common-utils";
import type { LunaRequest, LunaResponse } from "../../../src/luna.js";
import { createOpenAILunaBatch } from "../../../src/luna-batch.js";
import { lunaTokens } from "../../../src/luna-call.js";
import { createOpenAILuna } from "../../../src/openai-luna.js";
import { lunaUsd } from "../resolve-grammar/pricing.js";

export type BenchCase = {
	readonly id: string;
	readonly request: LunaRequest;
};

export type RunRecord = {
	readonly run: string;
	readonly mode: "batch" | "latency";
	/** The revision whose system prompt the request was asked under. */
	readonly revision: string;
	readonly caseId: string;
	readonly repetition: number;
	readonly tier: "batch" | "fast";
	/** Luna's output, as the transport read it; absent when it kept none. */
	readonly output?: unknown;
	/** Why there is no output: the exchange's failure or the transport's problem. */
	readonly failure?: string;
	readonly tokens: ReturnType<typeof lunaTokens>;
	readonly usd: number;
	readonly latencyMs?: number;
};

/** One request of a round: a case asked under a revision's system prompt. */
export type Job = {
	readonly revision: string;
	readonly systemPrompt: string;
	/** What the revision makes of production's input, if it changes it. */
	readonly input?: (input: unknown) => unknown;
	/** The answer schema the revision asks under, if not production's. */
	readonly schema?: Readonly<Record<string, unknown>>;
	readonly benchCase: BenchCase;
	readonly repetition: number;
};

const runId = (mode: string) =>
	`${mode}-${new Date().toISOString().replace(/[:.]/gu, "-")}`;

function runFile(evidence: string, mode: string) {
	const run = runId(mode);
	const dir = join(evidence, "runs");
	mkdirSync(dir, { recursive: true });
	return { run, file: join(dir, `${run}.jsonl`) };
}

const writeRecord = (file: string, record: RunRecord) =>
	appendFileSync(file, `${JSON.stringify(record)}\n`);

function ledger(evidence: string, entry: Readonly<Record<string, unknown>>) {
	appendFileSync(
		join(evidence, "spend.jsonl"),
		`${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`,
	);
}

const requestOf = (job: Job): LunaRequest => {
	const { request } = job.benchCase;
	const asked = {
		...request,
		systemPrompt: job.systemPrompt,
		...(job.input ? { input: job.input(request.input) } : {}),
	};
	return job.schema && asked.outputFormat !== "text"
		? { ...asked, outputSchema: job.schema }
		: asked;
};

/** A response's output, or the problem the transport named for keeping none. */
function outcomeOf(
	response: LunaResponse,
): Pick<RunRecord, "output" | "failure"> {
	if (response.output !== undefined) return { output: response.output };
	const { metadata } = response;
	const problem =
		typeof metadata === "object" &&
		metadata !== null &&
		"problem" in metadata
			? String(metadata.problem)
			: "no output";
	return { failure: problem };
}

/** Asks every job through one batch of production's request bodies. */
export async function runBatch(
	jobs: readonly Job[],
	options: { readonly apiKey: string; readonly evidence: string },
): Promise<string> {
	const { run, file } = runFile(options.evidence, "batch");
	const batch = createOpenAILunaBatch({
		apiKey: options.apiKey,
		promptCaching: true,
		pollMs: 15_000,
		metadata: { experiment: "valency-notation", run },
	});
	const requests = jobs.map((job, index) => ({
		customId: `${index}`,
		request: requestOf(job),
	}));
	const signal = AbortSignal.timeout(6 * 3600_000);
	const { id } = await batch.submit(requests, signal);
	console.log(`Submitted ${id}: ${requests.length} requests`);
	const settled = await batch.settle(id, requests, signal);
	console.log(`Batch ${id} ${settled.status}`);
	let usd = 0;
	for (const [index, job] of jobs.entries()) {
		const answer = settled.answers.get(`${index}`);
		const tokens = lunaTokens(answer?.ok ? answer.response.metadata : {});
		const record: RunRecord = {
			run,
			mode: "batch",
			revision: job.revision,
			caseId: job.benchCase.id,
			repetition: job.repetition,
			tier: "batch",
			...(answer === undefined
				? { failure: "no answer" }
				: answer.ok
					? outcomeOf(answer.response)
					: { failure: answer.message }),
			tokens,
			usd: lunaUsd(tokens, "batch"),
		};
		usd += record.usd;
		writeRecord(file, record);
	}
	ledger(options.evidence, {
		run,
		mode: "batch",
		batch: id,
		revisions: [...new Set(jobs.map(({ revision }) => revision))],
		requests: requests.length,
		usd,
	});
	console.log(
		`Run ${run}: ${requests.length} requests, $${usd.toFixed(5)} → ${file}`,
	);
	return file;
}

/**
 * Synchronous samples through `createOpenAILuna`: one unscored warm-up
 * per revision fills its prompt cache, then each case asks every
 * revision, the order rotating so no revision always goes first.
 */
export async function runLatency(
	revisions: readonly Omit<Job, "benchCase" | "repetition">[],
	cases: readonly BenchCase[],
	options: { readonly apiKey: string; readonly evidence: string },
): Promise<string> {
	const { run, file } = runFile(options.evidence, "latency");
	const ask = createOpenAILuna({
		apiKey: options.apiKey,
		promptCaching: true,
		timeoutMs: 60_000,
	});
	let usd = 0;
	const send = async (job: Job) => {
		const started = performance.now();
		try {
			const response = await ask(requestOf(job), {
				stage: "valency",
				signal: AbortSignal.timeout(60_000),
			});
			return {
				...outcomeOf(response),
				tokens: lunaTokens(response.metadata),
				latencyMs: performance.now() - started,
			};
		} catch (error) {
			return {
				failure: messageOf(error).slice(0, 200),
				tokens: lunaTokens(undefined),
				latencyMs: performance.now() - started,
			};
		}
	};
	const [warmCase] = cases;
	if (!warmCase) throw Error("No latency cases");
	for (const revision of revisions) {
		const warm = await send({
			...revision,
			benchCase: warmCase,
			repetition: 0,
		});
		usd += lunaUsd(warm.tokens, "fast");
	}
	for (const [index, benchCase] of cases.entries()) {
		const order = revisions.map(
			(_, at) =>
				revisions[
					(at + index) % revisions.length
				] as (typeof revisions)[number],
		);
		for (const revision of order) {
			const { latencyMs, ...answered } = await send({
				...revision,
				benchCase,
				repetition: 0,
			});
			const record: RunRecord = {
				run,
				mode: "latency",
				revision: revision.revision,
				caseId: benchCase.id,
				repetition: 0,
				tier: "fast",
				...answered,
				usd: lunaUsd(answered.tokens, "fast"),
				latencyMs: Math.round(latencyMs),
			};
			usd += record.usd;
			writeRecord(file, record);
		}
	}
	ledger(options.evidence, {
		run,
		mode: "latency",
		revisions: revisions.map(({ revision }) => revision),
		samples: cases.length,
		usd,
	});
	console.log(`Run ${run}: $${usd.toFixed(5)} → ${file}`);
	return file;
}
