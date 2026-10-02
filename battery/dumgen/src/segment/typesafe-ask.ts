/**
 * The production `JevAsk`: each request goes to the TypeSafe API through
 * the runtime's `fetch`, in the wire format the TypeSafe SDK and the lab's
 * jev client use: `POST /v1/systemone` with the request as JSON and the API
 * key as a bearer token. It reads no environment and imports nothing from
 * `node:*`, so a Convex action or Node can run it; the host passes the key.
 *
 * A 408, 429 or 5xx answer, a timeout or a connection error is retried with
 * exponential backoff. Any other failure throws at once, and so does the
 * last retry's.
 */
import type { Answers } from "./ask.js";
import type { JevAsk, JevResponse } from "./jev.js";

/** The part of `fetch` the ask uses; the runtime's global by default. */
export type Fetch = (
	url: string,
	init: {
		readonly method: "POST";
		readonly headers: Readonly<Record<string, string>>;
		readonly body: string;
		readonly signal: AbortSignal;
	},
) => Promise<{
	readonly ok: boolean;
	readonly status: number;
	readonly headers: { get(name: string): string | null };
	text(): Promise<string>;
}>;

export type TypeSafeAskOptions = {
	/** The TypeSafe API key (`TYPESAFE_API_KEY` in the repository's hosts). */
	readonly apiKey: string;
	/** The API root; `https://api.typesafe.ai` by default. */
	readonly baseUrl?: string;
	readonly fetch?: Fetch;
	/** Per attempt; 120 seconds by default, as the lab's client. */
	readonly timeoutMs?: number;
	/** Retries after a transient failure; 2 by default. */
	readonly maxRetries?: number;
};

const retryableStatus = (status: number) =>
	status === 408 || status === 429 || status >= 500;

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with jitter, or the server's `Retry-After` up to a minute. */
function delayMs(attempt: number, retryAfter: string | null): number {
	const seconds = Number(retryAfter ?? Number.NaN);
	if (retryAfter !== null && Number.isFinite(seconds) && seconds >= 0)
		return Math.min(seconds * 1000, 60_000);
	return Math.min(500 * 2 ** attempt, 8000) * (0.75 + Math.random() * 0.25);
}

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

function responseOf(body: string): JevResponse {
	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch {
		throw Error(
			`TypeSafe answered a body that is not JSON: ${body.slice(0, 200)}`,
		);
	}
	if (parsed && typeof parsed === "object") {
		const { model, answers, usage } = parsed as Record<string, unknown>;
		const tokens = usage as Record<string, unknown> | null | undefined;
		if (
			typeof model === "string" &&
			answers &&
			typeof answers === "object" &&
			typeof tokens?.input_tokens === "number" &&
			typeof tokens.output_tokens === "number"
		)
			return {
				model,
				answers: answers as Answers,
				usage: {
					input_tokens: tokens.input_tokens,
					output_tokens: tokens.output_tokens,
				},
			};
	}
	throw Error(`TypeSafe answered an unexpected body: ${body.slice(0, 200)}`);
}

/** One attempt: the body of a 2xx answer, or why it failed. */
type Attempt =
	| { readonly body: string }
	| {
			readonly failure: Error;
			readonly retryable: boolean;
			readonly retryAfter: string | null;
	  };

export function createTypeSafeAsk(options: TypeSafeAskOptions): JevAsk {
	if (!options.apiKey.trim())
		throw Error("createTypeSafeAsk needs a TypeSafe API key");
	const url = `${(options.baseUrl ?? "https://api.typesafe.ai").replace(/\/+$/u, "")}/v1/systemone`;
	const send: Fetch =
		options.fetch ??
		((target, init) => globalThis.fetch(target, { ...init }));
	const timeoutMs = options.timeoutMs ?? 120_000;
	const maxRetries = options.maxRetries ?? 2;
	const headers = {
		Authorization: `Bearer ${options.apiKey}`,
		Accept: "application/json",
		"Content-Type": "application/json",
	};
	const post = async (body: string): Promise<Attempt> => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const response = await send(url, {
				method: "POST",
				headers,
				body,
				signal: controller.signal,
			});
			const text = await response.text();
			if (response.ok) return { body: text };
			return {
				failure: Error(
					`TypeSafe answered ${response.status}: ${text.slice(0, 200)}`,
				),
				retryable: retryableStatus(response.status),
				retryAfter: response.headers.get("retry-after"),
			};
		} catch (error) {
			return {
				failure: Error(
					controller.signal.aborted
						? `TypeSafe did not answer within ${timeoutMs} ms`
						: `TypeSafe connection failed: ${messageOf(error)}`,
				),
				retryable: true,
				retryAfter: null,
			};
		} finally {
			clearTimeout(timer);
		}
	};
	return async (request) => {
		const body = JSON.stringify({
			model: request.model,
			state: request.state,
			questions: request.questions,
		});
		for (let attempt = 0; ; attempt++) {
			const result = await post(body);
			if ("body" in result) return responseOf(result.body);
			if (!result.retryable || attempt >= maxRetries)
				throw result.failure;
			await sleep(delayMs(attempt, result.retryAfter));
		}
	};
}
