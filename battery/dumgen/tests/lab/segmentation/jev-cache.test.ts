import { afterAll, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Questions } from "@typesafe-ai/sdk";
import { canonicalJson } from "common-utils";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import {
	type CallRecord,
	hashOf,
	JevCache,
	transportText,
} from "../../../lab/segmentation/harness/jev-cache.js";
import { RequestBudget } from "../../../src/call.js";
import { type AskRequest, noul } from "../../../src/segment/ask.js";
import {
	type JevAsk,
	type JevRequest,
	pinnedJevModel,
} from "../../../src/segment/jev.js";

const directory = await mkdtemp(join(tmpdir(), "segment-jev-cache-"));
afterAll(() => rm(directory, { recursive: true, force: true }));

let fresh = 0;
const cacheDirectory = () => join(directory, `cache-${fresh++}`);
const context = { stage: "test", signal: new AbortController().signal };
const questions = {
	a: noul("Is a so?"),
	b: noul("Is b so?"),
	r_10: noul("Is r_10 so?"),
	r_1_2: noul("Is r_1_2 so?"),
} satisfies Questions;
const request = (asked: Questions = questions): JevRequest => ({
	model: pinnedJevModel,
	state: { sentence: "Er zog sich an." },
	questions: asked,
});

/** One request through the arms' port at repetition 0, on a budget of its own. */
const throughPort = (
	jev: JevCache,
	asked: AskRequest,
	calls: CallRecord[] = [],
	options: Parameters<JevCache["port"]>[2] = {},
) =>
	Effect.flatMap(jev.port(0, calls, options), (ask) => ask(asked)).pipe(
		Effect.provide(RequestBudget.layer(12)),
	);

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
		jev.ask(0, calls)(request({ b: questions.b }), context),
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
		request({ r_10: questions.r_10, a: questions.a }),
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

test("buckets, question keys, prompt hashes and request sizes are taken over each value's canonical JSON, so the lab's cache stays readable", async () => {
	const root = cacheDirectory();
	// Keys out of order, nested, and an id that needs escaping.
	const state = { units: [{ to: 2, from: 0 }], sentence: "Er zog sich an." };
	const asked = { ...questions, 'say "x"': noul("Is ä so?") };
	const bucketOf = async (key: string) =>
		JSON.parse(
			await readFile(
				join(root, "jev-questions", key.slice(0, 2), `${key}.json`),
				"utf8",
			),
		);
	const keys = Object.entries(asked)
		.map(([id, question]) => hashOf({ id, question }))
		.sort();
	const jev = new JevCache({ cacheDirectory: root, transport: answering() });
	await jev.ask(1)(
		{ model: pinnedJevModel, state, questions: asked },
		context,
	);
	const bucket = await bucketOf(
		hashOf({ model: pinnedJevModel, state, repetition: 1 }),
	);
	expect(Object.keys(bucket.answers).sort()).toEqual(keys);
	expect(jev.promptHashes()).toEqual({
		test: hashOf([hashOf({ state, questions: asked })]),
	});
	await Effect.runPromise(
		throughPort(jev, { stage: "test", state, questions: asked }, [], {
			salt: "limit",
			questionsPerRequest: 2,
		}),
	);
	const salted = await bucketOf(
		hashOf({ model: pinnedJevModel, state, repetition: 0, salt: "limit" }),
	);
	expect(Object.keys(salted.answers).sort()).toEqual(keys);
	const projecting = new JevCache({
		cacheDirectory: root,
		offline: true,
		project: ({ questions: missing }) =>
			Object.fromEntries(
				Object.keys(missing).map((id) => [
					id,
					{ type: "noul", noul: 0.5 },
				]),
			),
	});
	const extra = { c: noul("Is c so?") };
	await projecting.ask(1)(
		{ model: pinnedJevModel, state, questions: asked },
		context,
	);
	await projecting.ask(1)(
		{ model: pinnedJevModel, state, questions: { ...asked, ...extra } },
		context,
	);
	expect(projecting.projection.samples.map(({ chars }) => chars)).toEqual([
		canonicalJson({ state, questions: asked }).length,
	]);
	expect(projecting.projection.requests.map(({ chars }) => chars)).toEqual([
		canonicalJson({ state, questions: extra }).length,
	]);
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

test("the arms' port fails with a typed ProviderFailure when no answer came, a cache miss offline or a refused request", async () => {
	const failureOf = async (jev: JevCache) => {
		const exit = await Effect.runPromiseExit(
			throughPort(jev, { stage: "test", ...request() }),
		);
		if (exit._tag === "Success") throw Error("The port answered");
		const [reason] = exit.cause.reasons;
		return reason?._tag === "Fail" ? reason.error : reason;
	};
	expect(
		await failureOf(
			new JevCache({ cacheDirectory: cacheDirectory(), offline: true }),
		),
	).toMatchObject({
		_tag: "ProviderFailure",
		stage: "test",
		message: "jev cache miss in offline mode (test)",
	});
	expect(
		await failureOf(
			new JevCache({
				cacheDirectory: cacheDirectory(),
				transport: refusing(400),
			}),
		),
	).toMatchObject({
		_tag: "ProviderFailure",
		stage: "test",
		message: "TypeSafe answered 400: no",
	});
});

test("interrupting the arms' port aborts the requests it sent", async () => {
	const aborted: string[] = [];
	// Each chunk reads its cache bucket before it reaches jev, in either
	// order, so the port is interrupted once both requests are in flight.
	let inFlight = 0;
	const sent = Promise.withResolvers<void>();
	const jev = new JevCache({
		cacheDirectory: cacheDirectory(),
		questionsPerRequest: 2,
		// Never answers: each request settles only when its signal aborts.
		transport: (asked, { signal }) =>
			new Promise((_resolve, reject) => {
				if (++inFlight === 2) sent.resolve();
				signal.addEventListener("abort", () => {
					aborted.push(Object.keys(asked.questions).join(","));
					reject(signal.reason);
				});
			}),
	});
	const calls: CallRecord[] = [];
	const fiber = Effect.runFork(
		throughPort(jev, { stage: "test", ...request() }, calls),
	);
	await sent.promise;
	await Effect.runPromise(Fiber.interrupt(fiber));
	expect(aborted.sort()).toEqual(["a,b", "r_10,r_1_2"]);
	expect(jev.transport.interrupted).toBe(2);
});

test("a reservation holds each fresh request's price until it is over, so requests in flight cannot carry the spend past a budget", async () => {
	const budget = 250;
	/** Eight requests at once against a slow jev, stopped at `budget`. */
	const spendOn = async (reserving: boolean) => {
		let spent = 0;
		let reserved = 0;
		const sizes: number[] = [];
		const jev = new JevCache({
			cacheDirectory: cacheDirectory(),
			transport: async (asked, at) => {
				await new Promise((resolve) => setTimeout(resolve, 20));
				return answering()(asked, at).then((response) => ({
					...response,
					usage: { input_tokens: 100, output_tokens: 0 },
				}));
			},
			beforeSpend: () => {
				if (spent >= budget) throw Error("budget reached");
			},
			onSpend: (tokens) => {
				spent += tokens;
			},
			...(reserving
				? {
						reserve: ({ chars }: { readonly chars: number }) => {
							sizes.push(chars);
							if (spent + reserved + 100 > budget)
								throw Error("would pass the budget");
							reserved += 100;
							return () => {
								reserved -= 100;
							};
						},
					}
				: {}),
		});
		const calls: CallRecord[] = [];
		const asked = await Promise.allSettled(
			Array.from({ length: 8 }, (_, index) =>
				jev.ask(0, calls)(
					request({ [`q${index}`]: noul(`Is ${index} so?`) }),
					context,
				),
			),
		);
		return {
			spent,
			reserved,
			sizes,
			calls,
			answered: asked.filter(({ status }) => status === "fulfilled")
				.length,
		};
	};
	const unreserved = await spendOn(false);
	expect(unreserved.spent).toBe(800);
	const reserving = await spendOn(true);
	expect(reserving).toMatchObject({ spent: 200, reserved: 0, answered: 2 });
	// The size a fresh call records is the one its reservation was asked with.
	expect(reserving.calls.map(({ chars }) => chars).sort()).toEqual(
		reserving.sizes.slice(0, 2).sort(),
	);
	expect(reserving.sizes.every((chars) => chars > 0)).toBe(true);
});
