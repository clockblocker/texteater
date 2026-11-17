/**
 * Luna answered from answers a host stored ahead of the request (#1351):
 * a `LunaAsk` in front of the live one, for `LunaTransport.fromAsk`. The
 * host asked some requests ahead, through OpenAI's Batch API
 * (`luna-batch.ts`), and keeps each answer's Responses API body under the
 * request's key (`lunaRequestKey`). A request of a stored stage whose key
 * finds a body is answered from it, read by the same `lunaResponseOf` as a
 * live answer; anything else goes to the live transport.
 *
 * The key is the whole request, configuration and all, so a stored answer
 * stands only for the request that was asked: a request that changed since
 * (another hint, another model) finds nothing and is asked live. A stored
 * answer names its source in the response's metadata (`storedAnswer`),
 * which the call's trace keeps, and reports no tokens, as none were spent
 * on it. One that cannot be read comes back with no output and its
 * problem, and one the stage's check refuses, as any refused answer does;
 * the `Luna` service then asks again with `live`, which this transport
 * sends to the live one.
 */
import { canonicalJson, isRecord, messageOf } from "common-utils";
import type { LunaAsk, LunaRequest, LunaResponse } from "./luna.js";
import { lunaResponseOf } from "./openai-luna.js";

/** A stored answer: the Responses API body, and where it came from, such as a batch's id. */
export type StoredLunaAnswer = {
	readonly body: string;
	readonly source: string;
};

/**
 * The key a request's stored answer is kept under: the SHA-256 of its
 * canonical JSON, in hex. The output limit travels beside the request and
 * is no part of it.
 */
export async function lunaRequestKey(request: LunaRequest): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(canonicalJson(request)),
	);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

/** A stored answer read as a live one is, under its source. */
function storedResponse(
	answer: StoredLunaAnswer,
	request: LunaRequest,
): LunaResponse {
	let response: LunaResponse;
	try {
		response = lunaResponseOf(answer.body, request);
	} catch (error) {
		return {
			output: undefined,
			metadata: {
				storedAnswer: answer.source,
				problem: `The stored answer cannot be read: ${messageOf(error)}`,
			},
		};
	}
	const { usage: _spentAhead, ...metadata } = isRecord(response.metadata)
		? response.metadata
		: {};
	return {
		output: response.output,
		metadata: { ...metadata, storedAnswer: answer.source },
	};
}

/**
 * `live`, with each request of `stages` answered from `find` when it holds
 * the request's key. A lookup that fails asks live.
 */
export function storedLunaAsk(
	live: LunaAsk,
	options: {
		readonly stages: ReadonlySet<string>;
		readonly find: (key: string) => Promise<StoredLunaAnswer | undefined>;
	},
): LunaAsk {
	return async (request, context) => {
		if (context.live || !options.stages.has(context.stage))
			return live(request, context);
		let answer: StoredLunaAnswer | undefined;
		try {
			answer = await options.find(await lunaRequestKey(request));
		} catch {
			answer = undefined;
		}
		return answer
			? storedResponse(answer, request)
			: live(request, context);
	};
}
