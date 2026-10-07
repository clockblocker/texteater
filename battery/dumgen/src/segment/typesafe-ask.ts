/**
 * The production `JevAsk`: each request goes to the TypeSafe API through
 * the runtime's `fetch`, in the wire format the TypeSafe SDK and the lab's
 * jev client use: `POST /v1/systemone` with the request as JSON and the API
 * key as a bearer token. It reads no environment and imports nothing from
 * `node:*`, so a Convex action or Node can run it; the host passes the key.
 *
 * It sends each request once and never retries (#445, #446): any failure
 * throws, and Dumgen reads it as a `ProviderFailure`. A refused request's
 * error carries the HTTP `status`, so an evaluation that retries can tell
 * a rate limit from a bad request. The request ends at its deadline or
 * when the caller's signal aborts, whichever comes first.
 */
import { isRecord, messageOf } from "common-utils";
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
	text(): Promise<string>;
}>;

export type TypeSafeAskOptions = {
	/** The TypeSafe API key (`TYPESAFE_API_KEY` in the repository's hosts). */
	readonly apiKey: string;
	/** The API root; `https://api.typesafe.ai` by default. */
	readonly baseUrl?: string;
	readonly fetch?: Fetch;
	/**
	 * The deadline of each request, from when it is sent; 120 seconds by
	 * default, which suits intake. A host sets a shorter one for clicks.
	 */
	readonly timeoutMs?: number;
};

/**
 * The envelope of a System One answer: the model, the token counts, and an
 * object of answers. Each answer's shape is checked against its question
 * by the call adapter (`checkedAnswers`), which knows the questions.
 */
function responseOf(body: string): JevResponse {
	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch {
		throw Error(
			`TypeSafe answered a body that is not JSON: ${body.slice(0, 200)}`,
		);
	}
	if (isRecord(parsed)) {
		const { model, answers, usage: tokens } = parsed;
		if (
			typeof model === "string" &&
			isRecord(answers) &&
			isRecord(tokens) &&
			typeof tokens.input_tokens === "number" &&
			typeof tokens.output_tokens === "number"
		)
			return {
				model,
				answers,
				usage: {
					input_tokens: tokens.input_tokens,
					output_tokens: tokens.output_tokens,
				},
			};
	}
	throw Error(`TypeSafe answered an unexpected body: ${body.slice(0, 200)}`);
}

export function createTypeSafeAsk(options: TypeSafeAskOptions): JevAsk {
	if (!options.apiKey.trim())
		throw Error("createTypeSafeAsk needs a TypeSafe API key");
	const url = `${(options.baseUrl ?? "https://api.typesafe.ai").replace(/\/+$/u, "")}/v1/systemone`;
	const send: Fetch =
		options.fetch ??
		((target, init) => globalThis.fetch(target, { ...init }));
	const timeoutMs = options.timeoutMs ?? 120_000;
	const headers = {
		Authorization: `Bearer ${options.apiKey}`,
		Accept: "application/json",
		"Content-Type": "application/json",
	};
	return async (request, { signal }) => {
		const deadline = AbortSignal.timeout(timeoutMs);
		const body = JSON.stringify({
			model: request.model,
			state: request.state,
			questions: request.questions,
		});
		let status: number;
		let ok: boolean;
		let text: string;
		try {
			const response = await send(url, {
				method: "POST",
				headers,
				body,
				signal: AbortSignal.any([signal, deadline]),
			});
			({ ok, status } = response);
			text = await response.text();
		} catch (error) {
			throw Error(
				signal.aborted
					? "The TypeSafe request was aborted"
					: deadline.aborted
						? `TypeSafe did not answer within ${timeoutMs} ms`
						: `TypeSafe connection failed: ${messageOf(error)}`,
			);
		}
		if (!ok)
			throw Object.assign(
				Error(`TypeSafe answered ${status}: ${text.slice(0, 200)}`),
				{ status },
			);
		return responseOf(text);
	};
}
