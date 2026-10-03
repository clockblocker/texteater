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
 */

import type { LunaAsk, LunaResponse } from "./luna.js";
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
};

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

type ResponsesPayload = {
	readonly status?: string;
	readonly output?: readonly {
		readonly type?: string;
		readonly content?: readonly {
			readonly type?: string;
			readonly text?: string;
			readonly refusal?: string;
		}[];
	}[];
	readonly incomplete_details?: { readonly reason?: string } | null;
	readonly usage?: unknown;
	readonly model?: string;
};

function responseOf(
	body: string,
	json: boolean,
	required: readonly string[] = [],
): LunaResponse {
	let payload: ResponsesPayload;
	try {
		payload = JSON.parse(body) as ResponsesPayload;
	} catch {
		throw Error(
			`OpenAI answered a body that is not JSON: ${body.slice(0, 200)}`,
		);
	}
	if (payload.status !== "completed")
		throw Error(
			`OpenAI response ${payload.status ?? "missing status"}${
				payload.incomplete_details?.reason
					? ` (${payload.incomplete_details.reason})`
					: ""
			}`,
		);
	const metadata = {
		model: payload.model ?? null,
		usage: payload.usage ?? null,
	};
	const contents = (payload.output ?? []).flatMap(
		(item) => item.content ?? [],
	);
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
	const record =
		parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: undefined;
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
		const json = request.outputFormat !== "text";
		const {
			$defs,
			$schema: _schema,
			...schema
		} = (request.outputSchema ?? {}) as Record<string, unknown>;
		const body = JSON.stringify({
			...request.configuration.settings,
			model: request.configuration.model,
			store: false,
			input: [
				{ role: "system", content: request.systemPrompt },
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
		});
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
		const required = Array.isArray(schema.required)
			? (schema.required as unknown[]).filter(
					(key): key is string => typeof key === "string",
				)
			: [];
		return responseOf(text, json, required);
	};
}
