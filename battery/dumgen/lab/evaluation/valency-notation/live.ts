/**
 * The paid half of the bench. Accuracy rounds go through OpenAI's Batch API
 * with explicit prompt caching (the repository's convention for eval
 * rounds), each line the variant's own Responses body less its
 * `service_tier`; latency samples are synchronous on production's settings
 * (`service_tier: fast`). A notation answer that does not read back is
 * asked once more synchronously; JSON is never retried, as production does
 * not retry. Each answer is one JSONL record under
 * evidence/valency-notation/runs/, each run's dollars a line of
 * evidence/valency-notation/spend.jsonl.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { messageOf } from "common-utils";
import type { LunaRequest } from "../../../src/luna.js";
import { createOpenAILunaBatch } from "../../../src/luna-batch.js";
import { lunaTokens } from "../../../src/luna-call.js";
import { lunaUsd } from "../resolve-grammar/pricing.js";
import { answerText, type Variant, type VariantName } from "./variants.js";

export type BenchCase = {
	readonly id: string;
	readonly request: LunaRequest;
};

export type RunRecord = {
	readonly run: string;
	readonly mode: "batch" | "latency";
	readonly variant: VariantName;
	/** The prompt revision the variant was asked under. */
	readonly revision: string;
	readonly caseId: string;
	readonly repetition: number;
	readonly attempt: number;
	readonly tier: "batch" | "fast";
	readonly text?: string;
	readonly failure?: string;
	/** Why the answer did not read back, if it did not. */
	readonly problem?: string;
	readonly tokens: ReturnType<typeof lunaTokens>;
	readonly usd: number;
	readonly latencyMs?: number;
};

const root = "https://api.openai.com/v1";

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

type Exchange = {
	readonly text?: string;
	readonly failure?: string;
	readonly tokens: ReturnType<typeof lunaTokens>;
	readonly latencyMs: number;
};

/** One answer body as an exchange: its text and tokens, or why it has none. */
function exchangeOf(body: string, latencyMs: number): Exchange {
	try {
		const decoded: unknown = JSON.parse(body);
		const tokens = lunaTokens(decoded);
		const status =
			typeof decoded === "object" &&
			decoded !== null &&
			"status" in decoded
				? decoded.status
				: undefined;
		if (status !== "completed")
			return {
				failure: `OpenAI response ${String(status)}`,
				tokens,
				latencyMs,
			};
		return { text: answerText(body), tokens, latencyMs };
	} catch (error) {
		return {
			failure: messageOf(error).slice(0, 200),
			tokens: lunaTokens(undefined),
			latencyMs,
		};
	}
}

/** One synchronous request of a variant's body. */
async function sendSync(
	apiKey: string,
	body: Record<string, unknown>,
): Promise<Exchange> {
	const started = performance.now();
	try {
		const response = await fetch(`${root}/responses`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(60_000),
		});
		const text = await response.text();
		const latencyMs = performance.now() - started;
		if (!response.ok)
			return {
				failure: `OpenAI answered ${response.status}: ${text.slice(0, 200)}`,
				tokens: lunaTokens(undefined),
				latencyMs,
			};
		return exchangeOf(text, latencyMs);
	} catch (error) {
		return {
			failure: messageOf(error).slice(0, 200),
			tokens: lunaTokens(undefined),
			latencyMs: performance.now() - started,
		};
	}
}

type Base = Pick<
	RunRecord,
	"run" | "mode" | "variant" | "revision" | "caseId" | "repetition"
>;

function recordOf(
	base: Base,
	variant: Variant,
	benchCase: BenchCase,
	exchange: Exchange,
	attempt: number,
	tier: "batch" | "fast",
): RunRecord {
	const problem =
		exchange.text === undefined
			? exchange.failure
			: (() => {
					const decoded = variant.decode(
						exchange.text,
						benchCase.request,
					);
					return decoded.ok ? undefined : decoded.problem;
				})();
	return {
		...base,
		attempt,
		tier,
		...(exchange.text === undefined
			? { failure: exchange.failure ?? "no answer" }
			: { text: exchange.text }),
		...(problem === undefined ? {} : { problem }),
		tokens: exchange.tokens,
		usd: lunaUsd(exchange.tokens, tier),
		...(tier === "fast"
			? { latencyMs: Math.round(exchange.latencyMs) }
			: {}),
	};
}

/** Uploads one batch of raw bodies and creates it; returns its id. */
async function submitBodies(
	apiKey: string,
	lines: readonly { customId: string; body: Record<string, unknown> }[],
	metadata: Readonly<Record<string, string>>,
): Promise<string> {
	const jsonl = `${lines
		.map(({ customId, body }) => {
			const { service_tier: _tier, ...rest } = body;
			return JSON.stringify({
				custom_id: customId,
				method: "POST",
				url: "/v1/responses",
				body: { ...rest, max_output_tokens: 600 },
			});
		})
		.join("\n")}\n`;
	const form = new FormData();
	form.append("purpose", "batch");
	form.append(
		"file",
		new Blob([jsonl], { type: "application/jsonl" }),
		"valency-notation.jsonl",
	);
	const auth = { Authorization: `Bearer ${apiKey}` };
	const upload = await fetch(`${root}/files`, {
		method: "POST",
		headers: auth,
		body: form,
	});
	const file = (await upload.json()) as { id?: string };
	if (!file.id) throw Error(`Upload failed: ${JSON.stringify(file)}`);
	const created = await fetch(`${root}/batches`, {
		method: "POST",
		headers: { ...auth, "Content-Type": "application/json" },
		body: JSON.stringify({
			input_file_id: file.id,
			endpoint: "/v1/responses",
			completion_window: "24h",
			metadata,
		}),
	});
	const batch = (await created.json()) as { id?: string };
	if (!batch.id)
		throw Error(`Batch creation failed: ${JSON.stringify(batch)}`);
	return batch.id;
}

export type Job = {
	readonly variant: Variant;
	readonly revision: string;
	readonly benchCase: BenchCase;
	readonly repetition: number;
};

/** Asks every job through one batch, retries unreadable notation answers synchronously. */
export async function runBatch(
	jobs: readonly Job[],
	options: { readonly apiKey: string; readonly evidence: string },
): Promise<string> {
	const { run, file } = runFile(options.evidence, "batch");
	const lines = jobs.map((job, index) => ({
		customId: `${index}`,
		body: job.variant.body(job.benchCase.request),
	}));
	const id = await submitBodies(options.apiKey, lines, {
		experiment: "valency-notation",
		run,
	});
	console.log(`Submitted ${id}: ${lines.length} requests`);
	const batch = createOpenAILunaBatch({
		apiKey: options.apiKey,
		pollMs: 15_000,
	});
	const signal = AbortSignal.timeout(6 * 3600_000);
	let state = await batch.check(id, signal);
	while (!state.final) {
		await new Promise((resolve) => setTimeout(resolve, 15_000));
		state = await batch.check(id, signal);
	}
	console.log(`Batch ${id} ${state.status}`);
	const answers = new Map(
		(await batch.lines(state, signal)).map((line) => [line.customId, line]),
	);
	let usd = 0;
	let retries = 0;
	for (const [index, job] of jobs.entries()) {
		const base: Base = {
			run,
			mode: "batch",
			variant: job.variant.name,
			revision: job.revision,
			caseId: job.benchCase.id,
			repetition: job.repetition,
		};
		const line = answers.get(`${index}`);
		const exchange: Exchange = !line
			? {
					failure: "no answer",
					tokens: lunaTokens(undefined),
					latencyMs: 0,
				}
			: line.ok
				? exchangeOf(line.body, 0)
				: {
						failure: line.message,
						tokens: lunaTokens(undefined),
						latencyMs: 0,
					};
		const record = recordOf(
			base,
			job.variant,
			job.benchCase,
			exchange,
			1,
			"batch",
		);
		usd += record.usd;
		writeRecord(file, record);
		if (!job.variant.retries || record.problem === undefined) continue;
		retries += 1;
		const retry = recordOf(
			base,
			job.variant,
			job.benchCase,
			await sendSync(
				options.apiKey,
				job.variant.body(job.benchCase.request),
			),
			2,
			"fast",
		);
		usd += retry.usd;
		writeRecord(file, retry);
	}
	ledger(options.evidence, {
		run,
		mode: "batch",
		batch: id,
		variants: [
			...new Set(
				jobs.map((job) => `${job.variant.name}@${job.revision}`),
			),
		],
		requests: lines.length,
		retries,
		usd,
	});
	console.log(
		`Run ${run}: ${lines.length} requests, ${retries} sync retries, $${usd.toFixed(5)} → ${file}`,
	);
	return file;
}

/**
 * Synchronous samples: one unscored warm-up per variant fills its prompt
 * cache, then each case asks every variant, the order rotating so no
 * variant always goes first.
 */
export async function runLatency(
	variants: readonly { variant: Variant; revision: string }[],
	cases: readonly BenchCase[],
	options: { readonly apiKey: string; readonly evidence: string },
): Promise<string> {
	const { run, file } = runFile(options.evidence, "latency");
	let usd = 0;
	const [warmCase] = cases;
	if (!warmCase) throw Error("No latency cases");
	for (const { variant } of variants) {
		const warm = await sendSync(
			options.apiKey,
			variant.body(warmCase.request),
		);
		usd += lunaUsd(warm.tokens, "fast");
	}
	for (const [index, benchCase] of cases.entries()) {
		const order = variants.map(
			(_, at) =>
				variants[
					(at + index) % variants.length
				] as (typeof variants)[number],
		);
		for (const { variant, revision } of order) {
			const base: Base = {
				run,
				mode: "latency",
				variant: variant.name,
				revision,
				caseId: benchCase.id,
				repetition: 0,
			};
			const first = recordOf(
				base,
				variant,
				benchCase,
				await sendSync(options.apiKey, variant.body(benchCase.request)),
				1,
				"fast",
			);
			usd += first.usd;
			writeRecord(file, first);
			if (!variant.retries || first.problem === undefined) continue;
			const retry = recordOf(
				base,
				variant,
				benchCase,
				await sendSync(options.apiKey, variant.body(benchCase.request)),
				2,
				"fast",
			);
			usd += retry.usd;
			writeRecord(file, retry);
		}
	}
	ledger(options.evidence, {
		run,
		mode: "latency",
		variants: variants.map(
			({ variant, revision }) => `${variant.name}@${revision}`,
		),
		samples: cases.length,
		usd,
	});
	console.log(`Run ${run}: $${usd.toFixed(5)} → ${file}`);
	return file;
}
