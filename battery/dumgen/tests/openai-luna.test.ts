import { expect, test } from "bun:test";
import { defaultLunaConfiguration, type LunaRequest } from "../src/luna.js";
import { createOpenAILuna } from "../src/openai-luna.js";
import type { Fetch } from "../src/segment/typesafe-ask.js";

const completed = (text: string) =>
	JSON.stringify({
		status: "completed",
		model: "gpt-5.6-luna",
		output: [{ content: [{ type: "output_text", text }] }],
		usage: { input_tokens: 300, output_tokens: 12 },
	});

function fakeFetch(replies: readonly { status: number; body: string }[]) {
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

const request: LunaRequest = {
	systemPrompt: "Write the Canonical Form.",
	input: { members: ["Häuser"] },
	outputSchema: {
		type: "object",
		properties: { canonicalForm: { type: "string" } },
	},
	configuration: defaultLunaConfiguration,
};
const context = () => ({
	stage: "canonical",
	signal: new AbortController().signal,
});

test("sends one Responses request in promptsmith's shape and reads the JSON value and usage", async () => {
	const { fetch, sent } = fakeFetch([
		{ status: 200, body: completed('{"value":{"canonicalForm":"Haus"}}') },
	]);
	const luna = createOpenAILuna({
		apiKey: "key-1",
		baseUrl: "https://luna.example/v1/",
		fetch,
	});
	expect(await luna(request, context())).toEqual({
		output: { canonicalForm: "Haus" },
		metadata: {
			model: "gpt-5.6-luna",
			usage: { input_tokens: 300, output_tokens: 12 },
		},
	});
	expect(sent[0]?.url).toBe("https://luna.example/v1/responses");
	const body = JSON.parse(sent[0]?.init.body ?? "{}");
	expect(body).toMatchObject({
		model: "gpt-5.6-luna",
		reasoning: { effort: "none" },
		store: false,
		input: [
			{ role: "system", content: "Write the Canonical Form." },
			{ role: "user", content: '{"members":["Häuser"]}' },
		],
		text: {
			format: {
				type: "json_schema",
				schema: {
					properties: {
						value: {
							type: "object",
							properties: { canonicalForm: { type: "string" } },
						},
					},
					required: ["value"],
				},
			},
		},
	});
});

test("sends each request once, and its deadline or the caller's signal ends it", async () => {
	const { fetch, sent } = fakeFetch([{ status: 429, body: "slow down" }]);
	await expect(
		createOpenAILuna({ apiKey: "key-1", fetch })(request, context()),
	).rejects.toThrow("OpenAI answered 429");
	expect(sent).toHaveLength(1);
	const hanging: Fetch = (_, init) =>
		new Promise((_, reject) =>
			init.signal.addEventListener("abort", () =>
				reject(Error("aborted")),
			),
		);
	await expect(
		createOpenAILuna({ apiKey: "key-1", fetch: hanging, timeoutMs: 5 })(
			request,
			context(),
		),
	).rejects.toThrow("did not answer within 5 ms");
	const caller = new AbortController();
	const pending = createOpenAILuna({ apiKey: "key-1", fetch: hanging })(
		request,
		{ stage: "canonical", signal: caller.signal },
	);
	caller.abort();
	await expect(pending).rejects.toThrow("was aborted");
	expect(() => createOpenAILuna({ apiKey: " " })).toThrow("API key");
});
