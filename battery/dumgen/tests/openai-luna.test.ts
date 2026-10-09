import { expect, test } from "bun:test";
import { defaultLunaConfiguration, type LunaRequest } from "../src/luna.js";
import { lunaTokens } from "../src/luna-call.js";
import { createOpenAILuna, lunaResponsesBody } from "../src/openai-luna.js";
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

test("JSON wrapped under another single key is unwrapped and marked; JSON without its value or a refusal keeps no output and says why", async () => {
	const { fetch } = fakeFetch([
		{ status: 200, body: completed('{"output":{"canonicalForm":"Haus"}}') },
		{
			status: 200,
			body: completed('{"canonicalForm":"Haus","members":[]}'),
		},
		{
			status: 200,
			body: JSON.stringify({
				status: "completed",
				output: [
					{
						type: "message",
						content: [
							{
								type: "refusal",
								refusal: "I can't help with that.",
							},
						],
					},
				],
			}),
		},
	]);
	const luna = createOpenAILuna({ apiKey: "key-1", fetch });
	expect(await luna(request, context())).toMatchObject({
		output: { canonicalForm: "Haus" },
		metadata: { unwrapped: "output" },
	});
	const bare = await luna(request, context());
	expect(bare.output).toBeUndefined();
	expect(bare.metadata).toMatchObject({
		problem: expect.stringContaining("without its value"),
	});
	const refused = await luna(request, context());
	expect(refused.output).toBeUndefined();
	expect(refused.metadata).toMatchObject({
		problem: "Luna refused: I can't help with that.",
	});
});

test("an incomplete response throws with its reason", async () => {
	const { fetch } = fakeFetch([
		{
			status: 200,
			body: JSON.stringify({
				status: "incomplete",
				incomplete_details: { reason: "max_output_tokens" },
			}),
		},
	]);
	const luna = createOpenAILuna({ apiKey: "key-1", fetch });
	await expect(luna(request, context())).rejects.toThrow(
		"OpenAI response incomplete (max_output_tokens)",
	);
});

test("a body that is JSON but not a Responses answer throws as an unexpected body, not a TypeError", async () => {
	const bodies = [
		{ status: "completed", output: { content: [] } },
		{ status: "completed", output: [{ content: "text" }] },
		{ status: "completed", output: [{ content: [{ text: "no type" }] }] },
		{ status: "completed", output: [], model: 5 },
		{ output: [] },
		[],
	].map((body) => JSON.stringify(body));
	for (const body of bodies) {
		const { fetch } = fakeFetch([{ status: 200, body }]);
		const luna = createOpenAILuna({ apiKey: "key-1", fetch });
		const failure = await luna(request, context()).then(
			() => undefined,
			(error: unknown) => error,
		);
		expect(failure).not.toBeInstanceOf(TypeError);
		expect(failure).toBeInstanceOf(Error);
		expect(failure instanceof Error ? failure.message : failure).toBe(
			`OpenAI answered an unexpected body: ${body}`,
		);
	}
});

test("the value written without its wrapper is taken when it holds the schema's required keys", async () => {
	const { fetch } = fakeFetch([
		{
			status: 200,
			body: completed('{"canonicalForm":"Haus","members":["Häuser"]}'),
		},
	]);
	const luna = createOpenAILuna({ apiKey: "key-1", fetch });
	expect(
		await luna(
			{
				...request,
				outputSchema: {
					type: "object",
					properties: {
						canonicalForm: { type: "string" },
						members: { type: "array" },
					},
					required: ["canonicalForm", "members"],
				},
			},
			context(),
		),
	).toMatchObject({
		output: { canonicalForm: "Haus", members: ["Häuser"] },
		metadata: { unwrapped: "top-level" },
	});
});

test("with prompt caching, the system prompt ends in an explicit breakpoint and the usage's cache tokens are read", async () => {
	const { fetch, sent } = fakeFetch([
		{
			status: 200,
			body: JSON.stringify({
				status: "completed",
				model: "gpt-5.6-luna",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: '{"value":{"canonicalForm":"Haus"}}',
							},
						],
					},
				],
				usage: {
					input_tokens: 1300,
					input_tokens_details: {
						cached_tokens: 1024,
						cache_write_tokens: 0,
					},
					output_tokens: 12,
				},
			}),
		},
	]);
	const luna = createOpenAILuna({
		apiKey: "key-1",
		fetch,
		promptCaching: true,
	});
	const response = await luna(request, context());
	const body = JSON.parse(sent[0]?.init.body ?? "{}");
	expect(body.prompt_cache_options).toEqual({ mode: "explicit" });
	expect(body.input[0]).toEqual({
		role: "developer",
		content: [
			{
				type: "input_text",
				text: "Write the Canonical Form.",
				prompt_cache_breakpoint: { mode: "explicit" },
			},
		],
	});
	expect(lunaTokens(response.metadata)).toEqual({
		inputTokens: 1300,
		outputTokens: 12,
		cachedInputTokens: 1024,
		cacheWriteTokens: 0,
	});
	// Off by default: the plain shape, as production clicks send it.
	expect(lunaResponsesBody(request)).not.toHaveProperty(
		"prompt_cache_options",
	);
});
