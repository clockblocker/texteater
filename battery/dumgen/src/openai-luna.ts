/**
 * The production `LunaAsk`: each request goes to OpenAI's Responses API
 * through the runtime's `fetch`, in the request shape promptsmith's OpenAI
 * executor sends (the system prompt, the input as one user message, and a
 * JSON output wrapped in `value`). It reads no environment and imports
 * nothing from `node:*`, so a Convex action or Node can run it; the host
 * passes the key.
 *
 * It sends each request once and never retries (#445, #446): any failure
 * throws, and Dumgen reads it as a `ProviderFailure`. The request ends at
 * its deadline or when the caller's signal aborts, whichever comes first.
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
		readonly content?: readonly {
			readonly type?: string;
			readonly text?: string;
		}[];
	}[];
	readonly usage?: unknown;
	readonly model?: string;
};

function responseOf(body: string, json: boolean): LunaResponse {
	let payload: ResponsesPayload;
	try {
		payload = JSON.parse(body) as ResponsesPayload;
	} catch {
		throw Error(
			`OpenAI answered a body that is not JSON: ${body.slice(0, 200)}`,
		);
	}
	if (payload.status !== "completed")
		throw Error(`OpenAI response ${payload.status ?? "missing status"}`);
	const text = (payload.output ?? [])
		.flatMap((item) => item.content ?? [])
		.filter((content) => content.type === "output_text")
		.map((content) => content.text ?? "")
		.join("");
	let output: unknown = text;
	if (json)
		try {
			output = (JSON.parse(text) as { value?: unknown }).value;
		} catch {
			throw Error(`OpenAI answered output that is not JSON: ${text}`);
		}
	return {
		output,
		metadata: {
			model: payload.model ?? null,
			usage: payload.usage ?? null,
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
		return responseOf(text, json);
	};
}
