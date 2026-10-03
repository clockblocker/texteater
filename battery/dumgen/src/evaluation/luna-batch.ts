/**
 * Luna requests sent through OpenAI's Batch API, for evaluation runs only
 * (#891); production clicks stay synchronous through `createOpenAILuna`.
 *
 * One batch is one JSONL file of `/v1/responses` lines, each
 * `{custom_id, method: "POST", url: "/v1/responses", body}`, uploaded to
 * `/v1/files` with purpose `batch`, then created at `/v1/batches` with the
 * 24-hour completion window, polled at `/v1/batches/{id}` until it is
 * `completed`, `failed`, `expired` or `cancelled`, and read back from its
 * output and error files (`/v1/files/{id}/content`). Output lines come in
 * any order and are matched by `custom_id`. A batch holds at most 50,000
 * requests and 200 MB, and costs half the synchronous Standard rate
 * (https://developers.openai.com/api/docs/guides/batch and
 * https://developers.openai.com/api/reference/resources/batches, read
 * 2026-10-03).
 *
 * Each line's body is exactly what `createOpenAILuna` sends, less its
 * `service_tier` (a batch has its own), and each answer is read by the same
 * `lunaResponseOf`, so a cache filled by a batch replays as one filled
 * synchronously does. Nothing is retried: a line that failed, or that the
 * batch never ran, comes back as a failure for its request alone.
 */
import type { LunaRequest, LunaResponse } from "../luna.js";
import { lunaResponseOf, lunaResponsesBody } from "../openai-luna.js";

/** The HTTP calls a batch makes; the runtime's `fetch` fits. */
export type BatchFetch = (
	url: string,
	init: {
		readonly method: "GET" | "POST";
		readonly headers: Readonly<Record<string, string>>;
		readonly body?: string | FormData;
		readonly signal: AbortSignal;
	},
) => Promise<{
	readonly ok: boolean;
	readonly status: number;
	text(): Promise<string>;
}>;

/** One request of a batch, under the id its answer comes back with. */
export type BatchRequest = {
	readonly customId: string;
	readonly request: LunaRequest;
};

/** How one request of a settled batch came out. */
export type BatchAnswer =
	| { readonly ok: true; readonly response: LunaResponse }
	| { readonly ok: false; readonly message: string };

/** A batch as OpenAI created it. */
export type SubmittedBatch = {
	readonly id: string;
	readonly inputFileId: string;
};

/** A batch that reached a final status, with every request's answer. */
export type SettledBatch = {
	readonly id: string;
	readonly status: string;
	readonly answers: ReadonlyMap<string, BatchAnswer>;
	/** What OpenAI's batch object reports: request counts and token usage. */
	readonly requestCounts?: unknown;
	readonly usage?: unknown;
};

/** Sends a batch of Luna requests and waits for its answers. */
export type LunaBatch = {
	submit(
		requests: readonly BatchRequest[],
		signal: AbortSignal,
	): Promise<SubmittedBatch>;
	/** Polls until the batch is final, then reads its output and error files. */
	settle(
		id: string,
		requests: readonly BatchRequest[],
		signal: AbortSignal,
	): Promise<SettledBatch>;
};

export type OpenAILunaBatchOptions = {
	readonly apiKey: string;
	/** The API root; `https://api.openai.com/v1` by default. */
	readonly baseUrl?: string;
	readonly fetch?: BatchFetch;
	/** Between polls; 30 seconds by default. */
	readonly pollMs?: number;
	/** Ask for explicit prompt caching, as `createOpenAILuna`'s option does. */
	readonly promptCaching?: boolean;
	/** Up to 16 strings OpenAI keeps on the batch, such as the experiment. */
	readonly metadata?: Readonly<Record<string, string>>;
};

/** The most requests OpenAI takes in one batch. */
export const batchRequestLimit = 50_000;

const finalStatuses = new Set(["completed", "failed", "expired", "cancelled"]);

type BatchObject = {
	readonly id?: string;
	readonly status?: string;
	readonly output_file_id?: string | null;
	readonly error_file_id?: string | null;
	readonly request_counts?: unknown;
	readonly usage?: unknown;
	readonly errors?: {
		readonly data?: readonly { message?: string }[];
	} | null;
};

type OutputLine = {
	readonly custom_id?: string;
	readonly response?: {
		readonly status_code?: number;
		readonly body?: unknown;
	} | null;
	readonly error?: {
		readonly code?: string;
		readonly message?: string;
	} | null;
};

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

/** The JSONL line one request becomes. */
function batchLineOf(
	{ customId, request }: BatchRequest,
	options: { readonly promptCaching?: boolean } = {},
): string {
	const { service_tier: _tier, ...body } = lunaResponsesBody(
		request,
		options,
	);
	return JSON.stringify({
		custom_id: customId,
		method: "POST",
		url: "/v1/responses",
		body,
	});
}

/** One output or error line's answer for its request. */
function answerOf(line: OutputLine, request: LunaRequest): BatchAnswer {
	if (line.error)
		return {
			ok: false,
			message: `OpenAI batch line failed: ${line.error.code ?? "error"}: ${line.error.message ?? ""}`,
		};
	const status = line.response?.status_code;
	const body = JSON.stringify(line.response?.body ?? null);
	if (status === undefined || status < 200 || status >= 300)
		return {
			ok: false,
			message: `OpenAI answered ${status ?? "no status"}: ${body.slice(0, 200)}`,
		};
	try {
		return { ok: true, response: lunaResponseOf(body, request) };
	} catch (error) {
		return { ok: false, message: messageOf(error) };
	}
}

export function createOpenAILunaBatch(
	options: OpenAILunaBatchOptions,
): LunaBatch {
	if (!options.apiKey.trim())
		throw Error("createOpenAILunaBatch needs an OpenAI API key");
	const root = (options.baseUrl ?? "https://api.openai.com/v1").replace(
		/\/+$/u,
		"",
	);
	const send: BatchFetch =
		options.fetch ??
		((target, init) => globalThis.fetch(target, { ...init }));
	const pollMs = options.pollMs ?? 30_000;
	const authorization = { Authorization: `Bearer ${options.apiKey}` };
	const call = async (
		path: string,
		init: {
			readonly method: "GET" | "POST";
			readonly body?: string | FormData;
			readonly json?: boolean;
		},
		signal: AbortSignal,
	): Promise<string> => {
		const response = await send(`${root}${path}`, {
			method: init.method,
			headers: init.json
				? { ...authorization, "Content-Type": "application/json" }
				: authorization,
			...(init.body === undefined ? {} : { body: init.body }),
			signal,
		});
		const text = await response.text();
		if (!response.ok)
			throw Error(
				`OpenAI answered ${response.status} to ${init.method} ${path}: ${text.slice(0, 200)}`,
			);
		return text;
	};
	const batchOf = async (id: string, signal: AbortSignal) =>
		JSON.parse(
			await call(`/batches/${id}`, { method: "GET" }, signal),
		) as BatchObject;
	const lines = async (fileId: string, signal: AbortSignal) =>
		(await call(`/files/${fileId}/content`, { method: "GET" }, signal))
			.split("\n")
			.filter((line) => line.trim())
			.map((line) => JSON.parse(line) as OutputLine);
	return {
		async submit(requests, signal) {
			if (requests.length === 0) throw Error("A batch needs a request");
			if (requests.length > batchRequestLimit)
				throw Error(
					`A batch holds at most ${batchRequestLimit} requests, not ${requests.length}`,
				);
			const jsonl = `${requests
				.map((request) =>
					batchLineOf(request, {
						...(options.promptCaching
							? { promptCaching: true }
							: {}),
					}),
				)
				.join("\n")}\n`;
			const form = new FormData();
			form.append("purpose", "batch");
			form.append(
				"file",
				new Blob([jsonl], { type: "application/jsonl" }),
				"luna-batch.jsonl",
			);
			const file = JSON.parse(
				await call("/files", { method: "POST", body: form }, signal),
			) as { id?: string };
			if (!file.id) throw Error("OpenAI's file upload returned no id");
			const batch = JSON.parse(
				await call(
					"/batches",
					{
						method: "POST",
						json: true,
						body: JSON.stringify({
							input_file_id: file.id,
							endpoint: "/v1/responses",
							completion_window: "24h",
							...(options.metadata
								? { metadata: options.metadata }
								: {}),
						}),
					},
					signal,
				),
			) as BatchObject;
			if (!batch.id)
				throw Error("OpenAI's batch creation returned no id");
			return { id: batch.id, inputFileId: file.id };
		},
		async settle(id, requests, signal) {
			let batch = await batchOf(id, signal);
			while (!finalStatuses.has(batch.status ?? "")) {
				await new Promise<void>((resolve, reject) => {
					const timer = setTimeout(resolve, pollMs);
					signal.addEventListener(
						"abort",
						() => {
							clearTimeout(timer);
							reject(
								Error("Polling the OpenAI batch was aborted"),
							);
						},
						{ once: true },
					);
				});
				batch = await batchOf(id, signal);
			}
			const byId = new Map(
				requests.map((request) => [request.customId, request.request]),
			);
			const answers = new Map<string, BatchAnswer>();
			for (const fileId of [batch.output_file_id, batch.error_file_id])
				if (fileId)
					for (const line of await lines(fileId, signal)) {
						const request =
							line.custom_id === undefined
								? undefined
								: byId.get(line.custom_id);
						if (request && line.custom_id !== undefined)
							answers.set(
								line.custom_id,
								answerOf(line, request),
							);
					}
			const why =
				batch.errors?.data
					?.map(({ message }) => message)
					.filter(Boolean)
					.join("; ") ?? "";
			for (const { customId } of requests)
				if (!answers.has(customId))
					answers.set(customId, {
						ok: false,
						message: `The OpenAI batch ${id} ended ${batch.status} without an answer for this request${why ? ` (${why})` : ""}`,
					});
			return {
				id,
				status: batch.status ?? "unknown",
				answers,
				...(batch.request_counts === undefined
					? {}
					: { requestCounts: batch.request_counts }),
				...(batch.usage === undefined ? {} : { usage: batch.usage }),
			};
		},
	};
}
