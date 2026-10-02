import { expect, test } from "bun:test";
import {
	createTypeSafeAsk,
	type Fetch,
} from "../../src/segment/typesafe-ask.js";

type Reply = { readonly status: number; readonly body: string };

const answered = JSON.stringify({
	model: "jev-1.13.0",
	answers: { q: { type: "noul", noul: 0.8 } },
	usage: { input_tokens: 120, output_tokens: 2 },
});

/** A fetch that replies in turn and records what it was sent. */
function fakeFetch(replies: readonly Reply[]) {
	const sent: { url: string; init: Parameters<Fetch>[1] }[] = [];
	const fetch: Fetch = async (url, init) => {
		sent.push({ url, init });
		const reply = replies[sent.length - 1];
		if (!reply) throw Error("No reply left");
		return {
			ok: reply.status >= 200 && reply.status < 300,
			status: reply.status,
			text: async () => reply.body,
		};
	};
	return { fetch, sent };
}

/** A fetch that never answers and rejects once its signal aborts. */
function hangingFetch() {
	const sent: AbortSignal[] = [];
	const fetch: Fetch = (_, init) => {
		sent.push(init.signal);
		return new Promise((_, reject) =>
			init.signal.addEventListener("abort", () =>
				reject(Error("aborted")),
			),
		);
	};
	return { fetch, sent };
}

const request = {
	model: "jev-1.13.0",
	state: { sentence: "Er kam." },
	questions: { q: { type: "noul" as const, instructions: "Kam er?" } },
};

const context = () => ({
	stage: "route",
	signal: new AbortController().signal,
});

test("sends the System One request as the TypeSafe API takes it, and reads its answer", async () => {
	const { fetch, sent } = fakeFetch([{ status: 200, body: answered }]);
	const ask = createTypeSafeAsk({
		apiKey: "key-123",
		baseUrl: "https://jev.example/",
		fetch,
	});
	expect(await ask(request, context())).toEqual({
		model: "jev-1.13.0",
		answers: { q: { type: "noul", noul: 0.8 } },
		usage: { input_tokens: 120, output_tokens: 2 },
	});
	expect(sent).toHaveLength(1);
	expect(sent[0]?.url).toBe("https://jev.example/v1/systemone");
	expect(sent[0]?.init.method).toBe("POST");
	expect(sent[0]?.init.headers).toMatchObject({
		Authorization: "Bearer key-123",
		"Content-Type": "application/json",
	});
	// The stage names the request for the host; it is not sent.
	expect(JSON.parse(sent[0]?.init.body ?? "")).toEqual(request);
});

test("sends each request once: a transient failure throws like any other, with no retry", async () => {
	for (const status of [408, 429, 500, 503, 401]) {
		const once = fakeFetch([
			{ status, body: "no" },
			{ status: 200, body: answered },
		]);
		await expect(
			createTypeSafeAsk({ apiKey: "key", fetch: once.fetch })(
				request,
				context(),
			),
		).rejects.toThrow(`TypeSafe answered ${status}: no`);
		expect(once.sent).toHaveLength(1);
	}
	let attempts = 0;
	const failing: Fetch = async () => {
		attempts++;
		throw Error("ECONNRESET");
	};
	await expect(
		createTypeSafeAsk({ apiKey: "key", fetch: failing })(
			request,
			context(),
		),
	).rejects.toThrow("TypeSafe connection failed: ECONNRESET");
	expect(attempts).toBe(1);
});

test("a request ends at its deadline or when the caller's signal aborts", async () => {
	const late = hangingFetch();
	await expect(
		createTypeSafeAsk({ apiKey: "key", fetch: late.fetch, timeoutMs: 5 })(
			request,
			context(),
		),
	).rejects.toThrow("TypeSafe did not answer within 5 ms");
	expect(late.sent).toHaveLength(1);

	const cancelled = hangingFetch();
	const caller = new AbortController();
	const asked = createTypeSafeAsk({
		apiKey: "key",
		fetch: cancelled.fetch,
	})(request, { stage: "route", signal: caller.signal });
	caller.abort();
	await expect(asked).rejects.toThrow("The TypeSafe request was aborted");
	expect(cancelled.sent[0]?.aborted).toBe(true);
});

test("an answer that is not System One's throws, and so does a blank key", async () => {
	const garbled = fakeFetch([{ status: 200, body: "<html>" }]);
	await expect(
		createTypeSafeAsk({ apiKey: "key", fetch: garbled.fetch })(
			request,
			context(),
		),
	).rejects.toThrow("not JSON");
	const shapeless = fakeFetch([{ status: 200, body: '{"answers":{}}' }]);
	await expect(
		createTypeSafeAsk({ apiKey: "key", fetch: shapeless.fetch })(
			request,
			context(),
		),
	).rejects.toThrow("unexpected body");
	expect(() => createTypeSafeAsk({ apiKey: " " })).toThrow("API key");
});
