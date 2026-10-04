import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Questions } from "@typesafe-ai/sdk";
import { noul } from "../../src/segment/ask.js";
import {
	type JevAsk,
	type JevRequest,
	pinnedJevModel,
} from "../../src/segment/jev.js";
import {
	type CallRecord,
	JevCache,
	transportText,
} from "../../src/segment-in-units/lab/jev-cache.js";

const directory = await mkdtemp(join(tmpdir(), "segment-jev-cache-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

let fresh = 0;
const cacheDirectory = () => join(directory, `cache-${fresh++}`);
const context = { stage: "test", signal: new AbortController().signal };
const questions: Questions = {
	a: noul("Is a so?"),
	b: noul("Is b so?"),
	r_10: noul("Is r_10 so?"),
	r_1_2: noul("Is r_1_2 so?"),
};
const request = (asked: Questions = questions): JevRequest => ({
	model: pinnedJevModel,
	state: { sentence: "Er zog sich an." },
	questions: asked,
});

/** A transport that answers every question with a Noul, counting its requests. */
function answering(counter = { requests: 0 }): JevAsk {
	return async ({ questions: asked }) => {
		counter.requests++;
		return {
			model: pinnedJevModel,
			answers: Object.fromEntries(
				Object.keys(asked).map((id) => [
					id,
					{ type: "noul", noul: 0.7 },
				]),
			),
			usage: { input_tokens: 10, output_tokens: 0 },
		};
	};
}

const refusing =
	(status: number): JevAsk =>
	async () => {
		throw Object.assign(Error(`TypeSafe answered ${status}: no`), {
			status,
		});
	};

test("a rate limit is retried, and every retry is counted by its cause", async () => {
	let attempts = 0;
	const answer = answering();
	const jev = new JevCache({
		cacheDirectory: cacheDirectory(),
		transport: async (asked, at) => {
			attempts++;
			if (attempts <= 2)
				return refusing(attempts === 1 ? 429 : 503)(asked, at);
			return answer(asked, at);
		},
		retryDelay: () => 0,
	});
	const calls: CallRecord[] = [];
	const response = await jev.ask(0, calls)(request(), context);
	expect(Object.keys(response.answers)).toHaveLength(4);
	expect(attempts).toBe(3);
	expect(calls).toMatchObject([{ cached: false, retries: 2 }]);
	expect(jev.transport).toEqual({
		requests: 1,
		retries: 2,
		retriedRequests: 1,
		failures: 0,
		interrupted: 0,
		retriesBy: { "429": 1, "503": 1 },
		failuresBy: {},
	});
	expect(transportText(jev.transport)).toBe(
		"jev transport: 1 fresh requests, 2 retries over 1 of them (429 ×1, 503 ×1), 0 failed, 0 interrupted",
	);
});

test("a bad request fails at once, and retries stop at maxRetries; both count as failures", async () => {
	let attempts = 0;
	const jev = new JevCache({
		cacheDirectory: cacheDirectory(),
		transport: async (asked, at) => {
			attempts++;
			return refusing(asked.questions.a ? 400 : 503)(asked, at);
		},
		maxRetries: 1,
		retryDelay: () => 0,
	});
	const calls: CallRecord[] = [];
	await expect(jev.ask(0, calls)(request(), context)).rejects.toThrow(
		"TypeSafe answered 400",
	);
	expect(attempts).toBe(1);
	await expect(
		jev.ask(0, calls)(request({ b: questions.b as never }), context),
	).rejects.toThrow("TypeSafe answered 503");
	expect(attempts).toBe(3);
	expect(calls.map((call) => call.error)).toEqual([
		"TypeSafe answered 400: no",
		"TypeSafe answered 503: no",
	]);
	expect(jev.transport).toMatchObject({
		requests: 2,
		retries: 1,
		failures: 2,
		failuresBy: { "400": 1, "503": 1 },
	});
});

test("a request abandoned with its operation counts as interrupted, not failed", async () => {
	const controller = new AbortController();
	const jev = new JevCache({
		cacheDirectory: cacheDirectory(),
		transport: async () => {
			controller.abort();
			throw Error("The TypeSafe request was aborted");
		},
		retryDelay: () => 0,
	});
	await expect(
		jev.ask(0)(request(), { stage: "test", signal: controller.signal }),
	).rejects.toThrow("aborted");
	expect(jev.transport).toMatchObject({ failures: 0, interrupted: 1 });
});

test("answers are cached per question, so another chunking hits and a partial hit sends only the rest", async () => {
	const counter = { requests: 0 };
	const root = cacheDirectory();
	const jev = new JevCache({
		cacheDirectory: root,
		transport: answering(counter),
	});
	await jev.ask(0)(request(), context);
	expect(counter.requests).toBe(1);
	const calls: CallRecord[] = [];
	const offline = new JevCache({ cacheDirectory: root, offline: true });
	const half = await offline.ask(0, calls)(
		request({ r_10: questions.r_10 as never, a: questions.a as never }),
		context,
	);
	expect(Object.keys(half.answers).sort()).toEqual(["a", "r_10"]);
	expect(calls).toMatchObject([{ cached: true, questions: 2 }]);
	// Another repetition is its own entry.
	await expect(offline.ask(1)(request(), context)).rejects.toThrow(
		"cache miss in offline mode",
	);
	const sent: string[][] = [];
	const partial = new JevCache({
		cacheDirectory: root,
		transport: async (asked, at) => {
			sent.push(Object.keys(asked.questions));
			return answering()(asked, at);
		},
	});
	await partial.ask(0)(
		request({ ...questions, c: noul("Is c so?") }),
		context,
	);
	expect(sent).toEqual([["c"]]);
});

test("an answer from another jev version fails its request and is not cached", async () => {
	const root = cacheDirectory();
	const jev = new JevCache({
		cacheDirectory: root,
		transport: async (asked, at) => ({
			...(await answering()(asked, at)),
			model: "jev-9.9.9",
		}),
	});
	await expect(jev.ask(0)(request(), context)).rejects.toThrow(
		`Expected pinned ${pinnedJevModel}, jev answered as jev-9.9.9`,
	);
	expect(jev.transport).toMatchObject({
		failures: 1,
		failuresBy: { "invalid answer": 1 },
	});
	await expect(
		new JevCache({ cacheDirectory: root, offline: true }).ask(0)(
			request(),
			context,
		),
	).rejects.toThrow("cache miss");
});
