/**
 * Luna requests sent through OpenAI's Batch API: an evaluation's (#891),
 * and a host's requests asked ahead of the clicks that will send them
 * (#1351); a click itself stays synchronous through `createOpenAILuna`.
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
 *
 * `settle` waits for a batch in one process, as an evaluation does; a host
 * that cannot wait, such as a Convex action, looks at the batch once per
 * scheduled run with `check`, and reads a final batch's lines with `lines`.
 */
import { isRecord, messageOf } from "common-utils";
import type { LunaRequest, LunaResponse, OutputLimit } from "./luna.js";
import { lunaResponseOf, lunaResponsesBody } from "./openai-luna.js";

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
} & OutputLimit;

/** How one request of a settled batch came out. */
type BatchAnswer =
	| { readonly ok: true; readonly response: LunaResponse }
	| { readonly ok: false; readonly message: string };

/** A batch as OpenAI created it. */
type SubmittedBatch = {
	readonly id: string;
	readonly inputFileId: string;
};

/** A batch that reached a final status, with every request's answer. */
type SettledBatch = {
	readonly id: string;
	readonly status: string;
	readonly answers: ReadonlyMap<string, BatchAnswer>;
	/** What OpenAI's batch object reports: request counts and token usage. */
	readonly requestCounts?: unknown;
	readonly usage?: unknown;
};

/** A batch as one look at it finds it. */
export type BatchState = {
	readonly id: string;
	readonly status: string;
	/** Whether the status is final: `completed`, `failed`, `expired` or `cancelled`. */
	readonly final: boolean;
	readonly outputFileId?: string;
	readonly errorFileId?: string;
	/** What OpenAI's batch object reports: request counts and token usage. */
	readonly requestCounts?: unknown;
	readonly usage?: unknown;
	/** The batch's own errors, joined; empty when it reports none. */
	readonly errors: string;
};

/**
 * One line of a final batch's output or error file: the Responses API body
 * as JSON, to be read by `lunaResponseOf` with the request it answers, or
 * why the line has none.
 */
export type BatchLine =
	| { readonly customId: string; readonly ok: true; readonly body: string }
	| {
			readonly customId: string;
			readonly ok: false;
			readonly message: string;
	  };

/** Sends a batch of Luna requests and reads its answers. */
export type LunaBatch = {
	submit(
		requests: readonly BatchRequest[],
		signal: AbortSignal,
	): Promise<SubmittedBatch>;
	/** One look at the batch, with no wait. */
	check(id: string, signal: AbortSignal): Promise<BatchState>;
	/** A final batch's output and error lines, in the files' order. */
	lines(
		batch: BatchState,
		signal: AbortSignal,
	): Promise<readonly BatchLine[]>;
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

/** A check of one parsed JSON value: whether it has the expected shape. */
type Shape<T> = (value: unknown) => value is T;

const optional =
	<T>(shape: Shape<T>) =>
	(value: unknown): value is T | undefined =>
		value === undefined || shape(value);
const nullable =
	<T>(shape: Shape<T>) =>
	(value: unknown): value is T | null | undefined =>
		value === null || optional(shape)(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number";

const isBatchObject: Shape<BatchObject> = (value): value is BatchObject => {
	if (!isRecord(value)) return false;
	const { id, status, output_file_id, error_file_id, errors } = value;
	if (
		!optional(isString)(id) ||
		!optional(isString)(status) ||
		!nullable(isString)(output_file_id) ||
		!nullable(isString)(error_file_id)
	)
		return false;
	if (errors === undefined || errors === null) return true;
	if (!isRecord(errors)) return false;
	const { data } = errors;
	return (
		data === undefined ||
		(Array.isArray(data) &&
			data.every(
				(entry) => isRecord(entry) && optional(isString)(entry.message),
			))
	);
};

const isOutputLine: Shape<OutputLine> = (value): value is OutputLine => {
	if (!isRecord(value)) return false;
	const { custom_id, response, error } = value;
	if (!optional(isString)(custom_id)) return false;
	if (
		response !== undefined &&
		response !== null &&
		!(isRecord(response) && optional(isNumber)(response.status_code))
	)
		return false;
	return (
		error === undefined ||
		error === null ||
		(isRecord(error) &&
			optional(isString)(error.code) &&
			optional(isString)(error.message))
	);
};

const isUploadedFile = (value: unknown): value is { readonly id?: string } =>
	isRecord(value) && optional(isString)(value.id);

/** The JSONL line one request becomes. */
function inputLineOf(
	{ customId, request, maxOutputTokens }: BatchRequest,
	options: { readonly promptCaching?: boolean } = {},
): string {
	const { service_tier: _tier, ...body } = lunaResponsesBody(request, {
		...options,
		...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
	});
	return JSON.stringify({
		custom_id: customId,
		method: "POST",
		url: "/v1/responses",
		body,
	});
}

/** One output or error line as a `BatchLine`, or nothing without its custom_id. */
function batchLineOf(line: OutputLine): BatchLine | undefined {
	const customId = line.custom_id;
	if (customId === undefined) return undefined;
	if (line.error)
		return {
			customId,
			ok: false,
			message: `OpenAI batch line failed: ${line.error.code ?? "error"}: ${line.error.message ?? ""}`,
		};
	const status = line.response?.status_code;
	const body = JSON.stringify(line.response?.body ?? null);
	if (status === undefined || status < 200 || status >= 300)
		return {
			customId,
			ok: false,
			message: `OpenAI answered ${status ?? "no status"}: ${body.slice(0, 200)}`,
		};
	return { customId, ok: true, body };
}

/** One line's answer for its request. */
function answerOf(line: BatchLine, request: LunaRequest): BatchAnswer {
	if (!line.ok) return { ok: false, message: line.message };
	try {
		return { ok: true, response: lunaResponseOf(line.body, request) };
	} catch (error) {
		return { ok: false, message: messageOf(error) };
	}
}

/** JSON `text`, checked by `shape`; one it rejects throws, naming `what`. */
function parsedJson<T>(shape: Shape<T>, text: string, what: string): T {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw Error(`${what} is not JSON: ${text.slice(0, 200)}`);
	}
	if (!shape(value))
		throw Error(`${what} is not as expected: ${text.slice(0, 200)}`);
	return value;
}

/** What one look at a batch object finds. */
function stateOf(id: string, batch: BatchObject): BatchState {
	const status = batch.status ?? "unknown";
	return {
		id,
		status,
		final: finalStatuses.has(status),
		...(batch.output_file_id ? { outputFileId: batch.output_file_id } : {}),
		...(batch.error_file_id ? { errorFileId: batch.error_file_id } : {}),
		...(batch.request_counts === undefined
			? {}
			: { requestCounts: batch.request_counts }),
		...(batch.usage === undefined ? {} : { usage: batch.usage }),
		errors:
			batch.errors?.data
				?.map(({ message }) => message)
				.filter(Boolean)
				.join("; ") ?? "",
	};
}

/** Waits `ms`, or rejects once `signal` aborts. */
const pause = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(Error("Polling the OpenAI batch was aborted"));
			},
			{ once: true },
		);
	});

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
	const check = async (id: string, signal: AbortSignal) =>
		stateOf(
			id,
			parsedJson(
				isBatchObject,
				await call(`/batches/${id}`, { method: "GET" }, signal),
				`OpenAI's batch ${id}`,
			),
		);
	const fileLines = async (fileId: string, signal: AbortSignal) =>
		(await call(`/files/${fileId}/content`, { method: "GET" }, signal))
			.split("\n")
			.filter((line) => line.trim())
			.flatMap((line, index) => {
				const read = batchLineOf(
					parsedJson(
						isOutputLine,
						line,
						`Line ${index + 1} of OpenAI's file ${fileId}`,
					),
				);
				return read ? [read] : [];
			});
	const lines = async (batch: BatchState, signal: AbortSignal) => {
		const read: BatchLine[] = [];
		for (const fileId of [batch.outputFileId, batch.errorFileId])
			if (fileId) read.push(...(await fileLines(fileId, signal)));
		return read;
	};
	return {
		async submit(requests, signal) {
			if (requests.length === 0) throw Error("A batch needs a request");
			if (requests.length > batchRequestLimit)
				throw Error(
					`A batch holds at most ${batchRequestLimit} requests, not ${requests.length}`,
				);
			const jsonl = `${requests
				.map((request) =>
					inputLineOf(
						request,
						options.promptCaching ? { promptCaching: true } : {},
					),
				)
				.join("\n")}\n`;
			const form = new FormData();
			form.append("purpose", "batch");
			form.append(
				"file",
				new Blob([jsonl], { type: "application/jsonl" }),
				"luna-batch.jsonl",
			);
			const file = parsedJson(
				isUploadedFile,
				await call("/files", { method: "POST", body: form }, signal),
				"OpenAI's file upload",
			);
			if (!file.id) throw Error("OpenAI's file upload returned no id");
			const batch = parsedJson(
				isBatchObject,
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
				"OpenAI's batch creation",
			);
			if (!batch.id)
				throw Error("OpenAI's batch creation returned no id");
			return { id: batch.id, inputFileId: file.id };
		},
		check,
		lines,
		async settle(id, requests, signal) {
			let batch = await check(id, signal);
			while (!batch.final) {
				await pause(pollMs, signal);
				batch = await check(id, signal);
			}
			const byId = new Map(
				requests.map((request) => [request.customId, request.request]),
			);
			const answers = new Map<string, BatchAnswer>();
			for (const line of await lines(batch, signal)) {
				const request = byId.get(line.customId);
				if (request)
					answers.set(line.customId, answerOf(line, request));
			}
			for (const { customId } of requests)
				if (!answers.has(customId))
					answers.set(customId, {
						ok: false,
						message: `The OpenAI batch ${id} ended ${batch.status} without an answer for this request${batch.errors ? ` (${batch.errors})` : ""}`,
					});
			return {
				id,
				status: batch.status,
				answers,
				...(batch.requestCounts === undefined
					? {}
					: { requestCounts: batch.requestCounts }),
				...(batch.usage === undefined ? {} : { usage: batch.usage }),
			};
		},
	};
}
