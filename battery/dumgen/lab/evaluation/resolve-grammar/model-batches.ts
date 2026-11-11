/**
 * The Luna misses a live run sends through OpenAI's Batch API in stages
 * (#891), for the cached transports (`models.ts`): a pass holds each
 * attempt's first Luna miss here; the transports admit the held requests
 * under the run's caps; this queue sends them as one batch, journals it
 * under the cache before it is waited on, so an interrupted run's batch
 * is resumed, not sent twice, and fills the cache from its answers.
 * Nothing is retried: a request whose batch line failed keeps its failure
 * for the rest of the run and is never sent again.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { LunaRequest, LunaResponse } from "../../../src/luna.js";
import { lunaRequestSchema } from "../../stored-json.js";
import type { BatchRequest, LunaBatch } from "../luna-batch.js";
import { readEntry, writeEntry } from "./cache-entries.js";
import { lunaUsd } from "./pricing.js";

/** One Luna batch a live run sent, as the ledger records it. */
export type LunaBatchRecord = {
	readonly batchId: string;
	readonly inputFileId: string;
	readonly submittedAt: string;
	readonly status: string;
	readonly requests: number;
	readonly answered: number;
	readonly failed: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cachedInputTokens: number;
	readonly cacheWriteTokens: number;
	readonly usd: number;
	/** OpenAI's own counts and usage for the batch. */
	readonly requestCounts?: unknown;
	readonly usage?: unknown;
	/** Set when a later run settled a batch an interrupted one sent. */
	readonly resumed?: boolean;
};

/** A batch's priced size when it is sent. */
export type BatchEstimate = {
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly usd: number;
};

/** What a live batch run reports as each batch is sent and settled. */
export type LunaBatchEvent =
	| {
			readonly event: "submitted";
			readonly batchId: string;
			readonly inputFileId: string;
			readonly submittedAt: string;
			readonly requests: number;
			readonly estimate: BatchEstimate;
	  }
	| ({ readonly event: "settled" } & LunaBatchRecord);

/** A Luna request waiting for the run's next batch. */
export type PendingLuna = {
	readonly request: LunaRequest;
	readonly stage: string;
};

/** A batch on disk, from its submission until it settled. */
type BatchJournal = {
	readonly batchId: string;
	readonly inputFileId: string;
	readonly submittedAt: string;
	readonly requests: readonly BatchRequest[];
	readonly settled?: LunaBatchRecord;
};

const batchJournalSchema = z.object({
	batchId: z.string(),
	inputFileId: z.string(),
	submittedAt: z.string(),
	requests: z.array(
		z.object({ customId: z.string(), request: lunaRequestSchema }),
	),
	settled: z
		.object({
			batchId: z.string(),
			inputFileId: z.string(),
			submittedAt: z.string(),
			status: z.string(),
			requests: z.number(),
			answered: z.number(),
			failed: z.number(),
			inputTokens: z.number(),
			outputTokens: z.number(),
			cachedInputTokens: z.number(),
			cacheWriteTokens: z.number(),
			usd: z.number(),
			requestCounts: z.unknown().optional(),
			usage: z.unknown().optional(),
			resumed: z.boolean().optional(),
		})
		.optional(),
}) satisfies z.ZodType<BatchJournal>;

/** A fresh answer's tokens, as the transports count them. */
type AnswerTokens = {
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cachedInputTokens: number;
	readonly cacheWriteTokens: number;
};

export type BatchQueueOptions = {
	readonly batch: LunaBatch;
	/** Where the batches' journals are kept, under the cache. */
	readonly journals: string;
	readonly onLunaBatch?: (event: LunaBatchEvent) => void | Promise<void>;
	/** Counts a fresh answer's tokens and caches it under its request's key. */
	readonly store: (
		customId: string,
		response: LunaResponse,
	) => Promise<AnswerTokens>;
};

/** One run's held Luna misses, its failed lines and the batches it sent. */
export class LunaBatchQueue {
	readonly records: LunaBatchRecord[] = [];
	readonly #options: BatchQueueOptions;
	readonly #pending = new Map<string, PendingLuna>();
	readonly #failed = new Map<string, string>();

	constructor(options: BatchQueueOptions) {
		this.#options = options;
	}

	/** Why the request under `key` failed in a batch, if it did. */
	failure(key: string): string | undefined {
		return this.#failed.get(key);
	}

	/** Holds a miss for the next batch, once however many attempts share it. */
	hold(key: string, pending: PendingLuna) {
		if (!this.#pending.has(key)) this.#pending.set(key, pending);
	}

	/** Luna requests the last pass held for a batch. */
	get pending(): number {
		return this.#pending.size;
	}

	/** The held requests, in the order they were held. */
	held(): IterableIterator<[string, PendingLuna]> {
		return this.#pending.entries();
	}

	/**
	 * Settles the batches an interrupted run sent and never read, filling
	 * the cache from them; none are sent again.
	 */
	async resume(signal: AbortSignal): Promise<void> {
		let names: string[];
		try {
			names = await readdir(this.#options.journals);
		} catch {
			return;
		}
		for (const name of names
			.filter((file) => file.endsWith(".json"))
			.sort()) {
			const journal = await readEntry(
				batchJournalSchema,
				join(this.#options.journals, name),
			);
			if (journal && !journal.settled)
				await this.#settle(journal, signal, true);
		}
	}

	/** Sends the admitted held requests as one batch, waits for it and fills the cache. */
	async send(
		chosen: readonly (readonly [string, PendingLuna])[],
		estimate: BatchEstimate,
		signal: AbortSignal,
	): Promise<void> {
		const requests = chosen.map(([customId, { request }]) => ({
			customId,
			request,
		}));
		const submitted = await this.#options.batch.submit(requests, signal);
		const journal: BatchJournal = {
			batchId: submitted.id,
			inputFileId: submitted.inputFileId,
			submittedAt: new Date().toISOString(),
			requests,
		};
		await writeEntry(
			join(this.#options.journals, `${submitted.id}.json`),
			journal,
		);
		for (const [key] of chosen) this.#pending.delete(key);
		await this.#options.onLunaBatch?.({
			event: "submitted",
			batchId: journal.batchId,
			inputFileId: journal.inputFileId,
			submittedAt: journal.submittedAt,
			requests: requests.length,
			estimate,
		});
		await this.#settle(journal, signal, false);
	}

	/** Waits for one batch, fills the cache from its answers and records it. */
	async #settle(
		journal: BatchJournal,
		signal: AbortSignal,
		resumed: boolean,
	) {
		const settled = await this.#options.batch.settle(
			journal.batchId,
			journal.requests,
			signal,
		);
		const totals = {
			answered: 0,
			failed: 0,
			inputTokens: 0,
			outputTokens: 0,
			cachedInputTokens: 0,
			cacheWriteTokens: 0,
		};
		for (const { customId } of journal.requests) {
			const answer = settled.answers.get(customId);
			if (answer?.ok) {
				const tokens = await this.#options.store(
					customId,
					answer.response,
				);
				totals.answered++;
				totals.inputTokens += tokens.inputTokens;
				totals.outputTokens += tokens.outputTokens;
				totals.cachedInputTokens += tokens.cachedInputTokens;
				totals.cacheWriteTokens += tokens.cacheWriteTokens;
			} else {
				totals.failed++;
				this.#failed.set(
					customId,
					answer?.message ??
						`No answer in OpenAI batch ${journal.batchId}`,
				);
			}
		}
		const record: LunaBatchRecord = {
			batchId: journal.batchId,
			inputFileId: journal.inputFileId,
			submittedAt: journal.submittedAt,
			status: settled.status,
			requests: journal.requests.length,
			...totals,
			usd: lunaUsd(totals, "batch"),
			...(settled.requestCounts === undefined
				? {}
				: { requestCounts: settled.requestCounts }),
			...(settled.usage === undefined ? {} : { usage: settled.usage }),
			...(resumed ? { resumed: true } : {}),
		};
		this.records.push(record);
		await writeEntry(
			join(this.#options.journals, `${journal.batchId}.json`),
			{ ...journal, settled: record },
		);
		await this.#options.onLunaBatch?.({ event: "settled", ...record });
	}
}
