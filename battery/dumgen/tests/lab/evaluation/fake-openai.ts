/**
 * A fake OpenAI for the Luna transports' tests (#891): the synchronous
 * Responses endpoint and the Batch API's file upload, batch creation,
 * polling and file download, all answering from one function, so a cache
 * filled either way holds the same answers. No request leaves the process.
 */
import { isRecord } from "common-utils";
import type { BatchFetch } from "../../../lab/evaluation/luna-batch.js";
import type { Fetch } from "../../../src/segment/typesafe-ask.js";

/** A Responses API answer to one request body: its HTTP status and body. */
export type FakeAnswer = { readonly status: number; readonly body: unknown };

type FakeBatch = {
	readonly id: string;
	readonly lines: readonly string[];
	polls: number;
	status: string;
	output_file_id?: string;
	error_file_id?: string;
};

/** One line of an uploaded batch input file, or a thrown error. */
function inputLine(line: string) {
	const parsed: unknown = JSON.parse(line);
	if (
		isRecord(parsed) &&
		typeof parsed.custom_id === "string" &&
		typeof parsed.url === "string" &&
		isRecord(parsed.body)
	)
		return {
			custom_id: parsed.custom_id,
			url: parsed.url,
			body: parsed.body,
		};
	throw Error(`Not a batch input line: ${line}`);
}

export function fakeOpenAI(
	answer: (body: Record<string, unknown>) => FakeAnswer,
	options: {
		/** Lines that come back in the error file. */
		readonly failing?: (customId: string) => boolean;
		/** Lines the batch never runs; the batch then ends `expired`. */
		readonly dropped?: (customId: string) => boolean;
		/** Polls a batch stays in progress before it ends. */
		readonly pollsBeforeEnd?: number;
	} = {},
) {
	const files = new Map<string, string>();
	const batches = new Map<string, FakeBatch>();
	const counts = { responses: 0, uploads: 0, batches: 0, polls: 0 };
	/** How often each custom_id was sent in a batch. */
	const sentIds = new Map<string, number>();
	const bodies: Record<string, unknown>[] = [];
	const ok = (body: unknown, status = 200) => ({
		ok: status >= 200 && status < 300,
		status,
		text: async () =>
			typeof body === "string" ? body : JSON.stringify(body),
	});
	const fetch: Fetch = async (url, init) => {
		if (init.signal.aborted) throw Error("aborted");
		if (!url.endsWith("/responses")) throw Error(`No route ${url}`);
		counts.responses++;
		const reply = answer(JSON.parse(init.body));
		return ok(reply.body, reply.status);
	};
	const end = (batch: FakeBatch) => {
		const output: string[] = [];
		const errors: string[] = [];
		let dropped = false;
		for (const [index, line] of batch.lines.entries()) {
			const { custom_id, body } = inputLine(line);
			bodies.push(body);
			if (options.dropped?.(custom_id)) {
				dropped = true;
				continue;
			}
			if (options.failing?.(custom_id)) {
				errors.push(
					JSON.stringify({
						id: `batch_req_${index}`,
						custom_id,
						response: null,
						error: {
							code: "server_error",
							message: "The line failed.",
						},
					}),
				);
				continue;
			}
			const reply = answer(body);
			output.push(
				JSON.stringify({
					id: `batch_req_${index}`,
					custom_id,
					response: {
						status_code: reply.status,
						request_id: `req_${index}`,
						body: reply.body,
					},
					error: null,
				}),
			);
		}
		// Output lines come back in any order: these come reversed.
		output.reverse();
		const outputId = `file-out-${batch.id}`;
		files.set(outputId, `${output.join("\n")}\n`);
		batch.output_file_id = outputId;
		if (errors.length > 0) {
			const errorId = `file-err-${batch.id}`;
			files.set(errorId, `${errors.join("\n")}\n`);
			batch.error_file_id = errorId;
		}
		batch.status = dropped ? "expired" : "completed";
	};
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
	const batchFetch: BatchFetch = async (url, init) => {
		if (init.signal.aborted) throw Error("aborted");
		const path = new URL(url).pathname.replace(/^\/v1/u, "");
		if (init.method === "POST" && path === "/files") {
			const form = init.body;
			if (!(form instanceof FormData))
				throw Error("Expected a form upload");
			if (form.get("purpose") !== "batch")
				return ok({ error: "purpose" }, 400);
			const file = form.get("file");
			if (!(file instanceof Blob))
				throw Error("Expected an uploaded file");
			const text = await file.text();
			const id = `file-in-${++counts.uploads}`;
			files.set(id, text);
			return ok({ id, purpose: "batch" });
		}
		if (init.method === "POST" && path === "/batches") {
			if (typeof init.body !== "string")
				throw Error("Expected a JSON body");
			const parsed: unknown = JSON.parse(init.body);
			const fields: Readonly<Record<string, unknown>> = isRecord(parsed)
				? parsed
				: {};
			const { input_file_id, endpoint, completion_window } = fields;
			const text =
				typeof input_file_id === "string" && files.get(input_file_id);
			if (
				!text ||
				endpoint !== "/v1/responses" ||
				completion_window !== "24h"
			)
				return ok({ error: "bad batch" }, 400);
			const lines = text.split("\n").filter((line) => line.trim());
			for (const line of lines) {
				const { custom_id, url: lineUrl } = inputLine(line);
				if (lineUrl !== "/v1/responses")
					return ok({ error: "url" }, 400);
				sentIds.set(custom_id, (sentIds.get(custom_id) ?? 0) + 1);
			}
			const id = `batch_${++counts.batches}`;
			batches.set(id, { id, lines, polls: 0, status: "validating" });
			return ok({ id, status: "validating", input_file_id });
		}
		const batchMatch = /^\/batches\/([^/]+)$/u.exec(path);
		if (init.method === "GET" && batchMatch) {
			const batch = batches.get(batchMatch[1] ?? "");
			if (!batch) return ok({ error: "no batch" }, 404);
			counts.polls++;
			batch.polls++;
			if (
				batch.polls > (options.pollsBeforeEnd ?? 1) &&
				batch.status !== "completed" &&
				batch.status !== "expired"
			)
				end(batch);
			else if (batch.status === "validating")
				batch.status = "in_progress";
			return ok({
				id: batch.id,
				status: batch.status,
				output_file_id: batch.output_file_id ?? null,
				error_file_id: batch.error_file_id ?? null,
				request_counts: {
					total: batch.lines.length,
					completed: 0,
					failed: 0,
				},
			});
		}
		const fileMatch = /^\/files\/([^/]+)\/content$/u.exec(path);
		if (init.method === "GET" && fileMatch) {
			const text = files.get(fileMatch[1] ?? "");
			return text === undefined
				? ok({ error: "no file" }, 404)
				: ok(text);
		}
		throw Error(`No route ${init.method} ${path}`);
	};
	return { fetch, batchFetch, counts, sentIds, bodies };
}

/** The JSON a Responses body's user message carries, or `{}` without one. */
export function userInputOf(body: Readonly<Record<string, unknown>>): unknown {
	const user = Array.isArray(body.input) ? body.input[1] : undefined;
	return JSON.parse(
		isRecord(user) && typeof user.content === "string"
			? user.content
			: "{}",
	);
}

/** A completed Responses API body whose output is `{"value": value}`. */
export const completedResponse = (
	value: unknown,
	usage: { input_tokens: number; output_tokens: number },
) => ({
	status: "completed",
	model: "gpt-5.6-luna",
	output: [
		{
			type: "message",
			content: [{ type: "output_text", text: JSON.stringify({ value }) }],
		},
	],
	usage,
});
