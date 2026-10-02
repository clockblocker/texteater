import { expect, test } from "bun:test";
import {
	createTypeSafeAsk,
	type Fetch,
} from "../../src/segment/typesafe-ask.js";

type Reply = {
	readonly status: number;
	readonly body: string;
	readonly headers?: Readonly<Record<string, string>>;
};

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
			headers: {
				get: (name: string) =>
					reply.headers?.[name.toLowerCase()] ?? null,
			},
			text: async () => reply.body,
		};
	};
	return { fetch, sent };
}

const request = {
	model: "jev-1.13.0",
	state: { sentence: "Er kam." },
	questions: { q: { type: "noul" as const, instructions: "Kam er?" } },
};

test("sends the System One request as the TypeSafe API takes it, and reads its answer", async () => {
	const { fetch, sent } = fakeFetch([{ status: 200, body: answered }]);
	const ask = createTypeSafeAsk({
		apiKey: "key-123",
		baseUrl: "https://jev.example/",
		fetch,
	});
	expect(await ask(request, { stage: "route" })).toEqual({
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

test("retries a transient failure, and throws any other at once", async () => {
	const transient = fakeFetch([
		{ status: 503, body: "busy", headers: { "retry-after": "0" } },
		{ status: 429, body: "slow down", headers: { "retry-after": "0" } },
		{ status: 200, body: answered },
	]);
	const ask = createTypeSafeAsk({ apiKey: "key", fetch: transient.fetch });
	expect((await ask(request, { stage: "route" })).model).toBe("jev-1.13.0");
	expect(transient.sent).toHaveLength(3);

	const rejected = fakeFetch([{ status: 401, body: "bad key" }]);
	await expect(
		createTypeSafeAsk({ apiKey: "key", fetch: rejected.fetch })(request, {
			stage: "route",
		}),
	).rejects.toThrow("TypeSafe answered 401: bad key");
	expect(rejected.sent).toHaveLength(1);

	const exhausted = fakeFetch([
		{ status: 500, body: "down", headers: { "retry-after": "0" } },
		{ status: 500, body: "still down" },
	]);
	await expect(
		createTypeSafeAsk({
			apiKey: "key",
			fetch: exhausted.fetch,
			maxRetries: 1,
		})(request, { stage: "route" }),
	).rejects.toThrow("TypeSafe answered 500: still down");
});

test("a timed-out attempt is retried, and an answer that is not System One's throws", async () => {
	let attempts = 0;
	const hanging: Fetch = (_, init) => {
		attempts++;
		return new Promise((_, reject) =>
			init.signal.addEventListener("abort", () =>
				reject(Error("aborted")),
			),
		);
	};
	await expect(
		createTypeSafeAsk({
			apiKey: "key",
			fetch: hanging,
			timeoutMs: 5,
			maxRetries: 0,
		})(request, { stage: "route" }),
	).rejects.toThrow("TypeSafe did not answer within 5 ms");
	expect(attempts).toBe(1);

	const garbled = fakeFetch([{ status: 200, body: "<html>" }]);
	await expect(
		createTypeSafeAsk({ apiKey: "key", fetch: garbled.fetch })(request, {
			stage: "route",
		}),
	).rejects.toThrow("not JSON");
	const shapeless = fakeFetch([{ status: 200, body: '{"answers":{}}' }]);
	await expect(
		createTypeSafeAsk({ apiKey: "key", fetch: shapeless.fetch })(request, {
			stage: "route",
		}),
	).rejects.toThrow("unexpected body");
	expect(() => createTypeSafeAsk({ apiKey: " " })).toThrow("API key");
});
