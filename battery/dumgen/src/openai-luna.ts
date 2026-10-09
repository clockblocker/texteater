/**
 * The production `LunaAsk`: each request goes to OpenAI's Responses API
 * through the runtime's `fetch`, in the request shape promptsmith's OpenAI
 * executor sends (the system prompt, the input as one user message, and a
 * JSON output wrapped in `value`). It reads no environment and imports
 * nothing from `node:*`, so a Convex action or Node can run it; the host
 * passes the key.
 *
 * It sends each request once and never retries (#445, #446): a failed
 * exchange throws, and Dumgen reads it as a `ProviderFailure`. An answer
 * that came back but holds no usable output (a refusal, or JSON without
 * its `value`) is returned with no output and the problem in its metadata,
 * so the operation's check refuses it as `InvalidModelOutput` with that
 * reason in the trace (#876). The value written without its wrapper (an
 * object holding the schema's required keys, as round 3's empty answers
 * were), or wrapped under another single key, is unwrapped and marked. The
 * request ends at its deadline or when the caller's signal aborts,
 * whichever comes first.
 *
 * With `promptCaching` (or a request's `cachePrompt`) it asks for explicit
 * prompt caching as promptsmith's executor does (#891): the system prompt
 * goes as a developer message ending in a cache breakpoint, under
 * `prompt_cache_options: { mode: "explicit" }`. OpenAI caches only a
 * prefix of at least 1,024 input tokens on GPT-5.6 and later, writes at
 * 1.25 times the input rate and reads at 0.1 times; the usage's
 * `input_tokens_details` reports `cached_tokens` and `cache_write_tokens`.
 * The body and the reading of an answer are exported so an evaluation's
 * Batch API lines are sent and read exactly as these requests are.
 */

import { isRecord, messageOf } from "common-utils";
import type { LunaAsk, LunaRequest, LunaResponse } from "./luna.js";
import type { Fetch } from "./segment/typesafe-ask.js";

export type OpenAILunaOptions = {
	/** The OpenAI API key (`OPENAI_API_KEY` in the repository's hosts). */
	readonly apiKey: string;
	/** The API root; `https://api.openai.com/v1` by default. */
	readonly baseUrl?: string;
	readonly fetch?: Fetch;
	/**
	 * The deadline of each request, from when it is sent; 120 seconds by
	 * default. A host sets a shorter one for clicks.
	 */
	readonly timeoutMs?: number;
	/**
	 * Ask for explicit prompt caching of every request's system prompt;
	 * off by default, and a request's own `cachePrompt` asks for it too.
	 */
	readonly promptCaching?: boolean;
};

type ResponsesContent = {
	readonly type: string;
	readonly text?: string;
	readonly refusal?: string;
};

type ResponsesPayload = {
	readonly status: string;
	readonly output: readonly {
		readonly content: readonly ResponsesContent[];
	}[];
	readonly incomplete_details?: { readonly reason?: string };
	readonly usage?: unknown;
	readonly model?: string;
};

const isOptionalString = (value: unknown): value is string | undefined =>
	value === undefined || typeof value === "string";

function isResponsesContent(value: unknown): value is ResponsesContent {
	return (
		isRecord(value) &&
		typeof value.type === "string" &&
		isOptionalString(value.text) &&
		isOptionalString(value.refusal)
	);
}

/**
 * The Responses API body, or nothing when it is not one: a `status`, and
 * an `output` of items whose `content` lists typed parts. A missing
 * `output` or `content` reads as empty, as a response that did not
 * complete has none. `usage` stays unread here; `lunaTokens` reads it
 * defensively.
 */
function parseResponsesPayload(value: unknown): ResponsesPayload | undefined {
	if (!isRecord(value)) return undefined;
	const { status, output = [], incomplete_details, usage, model } = value;
	if (typeof status !== "string" || !isOptionalString(model))
		return undefined;
	const details = incomplete_details ?? {};
	if (!isRecord(details)) return undefined;
	const { reason } = details;
	if (!isOptionalString(reason)) return undefined;
	if (!Array.isArray(output)) return undefined;
	const items: { readonly content: readonly ResponsesContent[] }[] = [];
	for (const item of output) {
		if (!isRecord(item)) return undefined;
		const { content = [] } = item;
		if (!Array.isArray(content) || !content.every(isResponsesContent))
			return undefined;
		items.push({ content });
	}
	return {
		status,
		output: items,
		...(reason === undefined ? {} : { incomplete_details: { reason } }),
		...(usage === undefined ? {} : { usage }),
		...(model === undefined ? {} : { model }),
	};
}

/** The schema's required keys, which an unwrapped answer must hold. */
function requiredOf(request: LunaRequest): readonly string[] {
	const required = request.outputSchema?.required;
	return Array.isArray(required)
		? required.filter((key): key is string => typeof key === "string")
		: [];
}

/**
 * The Responses API body of one Luna request: the system prompt, the input
 * as one user message, and JSON output wrapped in `value`. With
 * `promptCaching`, the system prompt is a developer message ending in an
 * explicit cache breakpoint.
 */
export function lunaResponsesBody(
	request: LunaRequest,
	options: { readonly promptCaching?: boolean } = {},
): Record<string, unknown> {
	const json = request.outputFormat !== "text";
	const cache =
		options.promptCaching === true || request.cachePrompt === true;
	const {
		$defs,
		$schema: _schema,
		...schema
	}: Readonly<Record<string, unknown>> = request.outputSchema ?? {};
	return {
		...request.configuration.settings,
		model: request.configuration.model,
		store: false,
		...(cache ? { prompt_cache_options: { mode: "explicit" } } : {}),
		input: [
			cache
				? {
						role: "developer",
						content: [
							{
								type: "input_text",
								text: request.systemPrompt,
								prompt_cache_breakpoint: { mode: "explicit" },
							},
						],
					}
				: { role: "system", content: request.systemPrompt },
			{
				role: "user",
				content:
					typeof request.input === "string"
						? request.input
						: JSON.stringify(request.input),
			},
		],
		text: {
			format: json
				? {
						type: "json_schema",
						name: "output",
						strict: false,
						schema: {
							type: "object",
							properties: { value: schema },
							required: ["value"],
							additionalProperties: false,
							...($defs ? { $defs } : {}),
						},
					}
				: { type: "text" },
		},
	};
}

/**
 * What one Responses API answer body gives the request that asked it, as
 * `createOpenAILuna` returns it; throws when the answer is unusable as an
 * exchange (not JSON, not completed, output that is not JSON).
 */
export function lunaResponseOf(
	body: string,
	request: LunaRequest,
): LunaResponse {
	return responseOf(
		body,
		request.outputFormat !== "text",
		requiredOf(request),
	);
}

function responseOf(
	body: string,
	json: boolean,
	required: readonly string[] = [],
): LunaResponse {
	let decoded: unknown;
	try {
		decoded = JSON.parse(body);
	} catch {
		throw Error(
			`OpenAI answered a body that is not JSON: ${body.slice(0, 200)}`,
		);
	}
	const payload = parseResponsesPayload(decoded);
	if (!payload)
		throw Error(
			`OpenAI answered an unexpected body: ${body.slice(0, 200)}`,
		);
	if (payload.status !== "completed")
		throw Error(
			`OpenAI response ${payload.status}${
				payload.incomplete_details?.reason
					? ` (${payload.incomplete_details.reason})`
					: ""
			}`,
		);
	const metadata = {
		model: payload.model ?? null,
		usage: payload.usage ?? null,
	};
	const contents = payload.output.flatMap((item) => item.content);
	const refusal = contents
		.filter((content) => content.type === "refusal")
		.map((content) => content.refusal ?? content.text ?? "")
		.join("");
	const text = contents
		.filter((content) => content.type === "output_text")
		.map((content) => content.text ?? "")
		.join("");
	if (refusal && !text)
		return {
			output: undefined,
			metadata: {
				...metadata,
				problem: `Luna refused: ${refusal.slice(0, 200)}`,
			},
		};
	if (!json) return { output: text, metadata };
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw Error(`OpenAI answered output that is not JSON: ${text}`);
	}
	const record = isRecord(parsed) ? parsed : undefined;
	if (record && "value" in record) return { output: record.value, metadata };
	const keys = record ? Object.keys(record) : [];
	const [only] = keys;
	const inner = only === undefined ? undefined : record?.[only];
	// The value itself, unwrapped (round 3 saw {"canonicalForm": …}).
	if (record && required.length > 0 && required.every((key) => key in record))
		return {
			output: record,
			metadata: { ...metadata, unwrapped: "top-level" },
		};
	if (keys.length === 1 && inner !== null && typeof inner === "object")
		return { output: inner, metadata: { ...metadata, unwrapped: only } };
	return {
		output: undefined,
		metadata: {
			...metadata,
			problem: `Luna answered JSON without its value: ${text.slice(0, 200)}`,
		},
	};
}

export function createOpenAILuna(options: OpenAILunaOptions): LunaAsk {
	if (!options.apiKey.trim())
		throw Error("createOpenAILuna needs an OpenAI API key");
	const url = `${(options.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/u, "")}/responses`;
	const send: Fetch =
		options.fetch ??
		((target, init) => globalThis.fetch(target, { ...init }));
	const timeoutMs = options.timeoutMs ?? 120_000;
	return async (request, { signal }) => {
		const deadline = AbortSignal.timeout(timeoutMs);
		const body = JSON.stringify(
			lunaResponsesBody(request, {
				...(options.promptCaching ? { promptCaching: true } : {}),
			}),
		);
		let status: number;
		let ok: boolean;
		let text: string;
		try {
			const response = await send(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${options.apiKey}`,
					"Content-Type": "application/json",
				},
				body,
				signal: AbortSignal.any([signal, deadline]),
			});
			({ ok, status } = response);
			text = await response.text();
		} catch (error) {
			throw Error(
				signal.aborted
					? "The OpenAI request was aborted"
					: deadline.aborted
						? `OpenAI did not answer within ${timeoutMs} ms`
						: `OpenAI connection failed: ${messageOf(error)}`,
			);
		}
		if (!ok)
			throw Error(`OpenAI answered ${status}: ${text.slice(0, 200)}`);
		return lunaResponseOf(text, request);
	};
}
