import { expect, test } from "bun:test";
import { z } from "zod";
import {
	DUMGEN_GENERATION_MODEL,
	DUMGEN_REASONING_EFFORT,
} from "../../src/ai-sdk/model-policy";
import { buildOpenAiFetchSdk } from "../../src/ai-sdk/openai-fetch";

test("the fetch adapter sends strict structured Responses requests", async () => {
	const requests: Array<{ init?: RequestInit; url: string }> = [];
	const fetch = async (input: string | URL | Request, init?: RequestInit) => {
		requests.push({ init, url: String(input) });
		return Response.json({
			output: [
				{
					content: [
						{
							text: JSON.stringify({ answer: "structured text" }),
							type: "output_text",
						},
					],
					type: "message",
				},
			],
			status: "completed",
		});
	};
	const sdk = buildOpenAiFetchSdk({ apiKey: "test-key", fetch });

	await expect(
		sdk.structuredGeneration(
			'{"question":"hello"}',
			z.strictObject({ answer: z.string() }),
			{ maxOutputTokens: 42, systemPrompt: "Answer the request." },
		),
	).resolves.toEqual({ answer: "structured text" });

	expect(requests).toHaveLength(1);
	expect(requests[0]?.url).toBe("https://api.openai.com/v1/responses");
	expect(requests[0]?.init?.headers).toEqual({
		Authorization: "Bearer test-key",
		"Content-Type": "application/json",
	});
	const body = JSON.parse(String(requests[0]?.init?.body));
	expect(body).toMatchObject({
		input: [
			{ content: "Answer the request.", role: "system" },
			{ content: '{"question":"hello"}', role: "user" },
		],
		max_output_tokens: 42,
		model: DUMGEN_GENERATION_MODEL,
		reasoning: { effort: DUMGEN_REASONING_EFFORT },
		store: false,
		text: {
			format: {
				name: "dumgen_response",
				strict: true,
				type: "json_schema",
			},
			verbosity: "low",
		},
	});
	expect(body.text.format.schema).toMatchObject({
		additionalProperties: false,
		required: ["answer"],
		type: "object",
	});
});

test("the fetch adapter retries truncated structured output", async () => {
	const tokenBudgets: number[] = [];
	const responses = [
		{
			incomplete_details: { reason: "max_output_tokens" },
			output: [],
			status: "incomplete",
		},
		{
			output: [
				{
					content: [
						{
							text: JSON.stringify({ answer: "complete" }),
							type: "output_text",
						},
					],
					type: "message",
				},
			],
			status: "completed",
		},
	];
	const fetch = async (
		_input: string | URL | Request,
		init?: RequestInit,
	) => {
		tokenBudgets.push(JSON.parse(String(init?.body)).max_output_tokens);
		return Response.json(responses.shift());
	};

	await expect(
		buildOpenAiFetchSdk({ apiKey: "test-key", fetch }).structuredGeneration(
			"input",
			z.strictObject({ answer: z.string() }),
			{ maxOutputTokens: 192 },
		),
	).resolves.toEqual({ answer: "complete" });
	expect(tokenBudgets).toEqual([192, 1024]);
});

test("the fetch adapter extracts unstructured output and types failures", async () => {
	const responses = [
		{
			output: [
				{
					content: [{ text: "raw text", type: "output_text" }],
					type: "message",
				},
			],
			status: "completed",
		},
		{
			output: [
				{
					content: [{ refusal: "cannot comply", type: "refusal" }],
					type: "message",
				},
			],
			status: "completed",
		},
	];
	const fetch = async () => Response.json(responses.shift());
	const sdk = buildOpenAiFetchSdk({ apiKey: "test-key", fetch });

	await expect(sdk.unstructuredGeneration("input")).resolves.toBe("raw text");
	await expect(sdk.unstructuredGeneration("input")).rejects.toMatchObject({
		name: "AiSdkGenerationError",
		reason: "refusal",
	});
});

test("the fetch adapter reports HTTP errors without exposing credentials", async () => {
	const fetch = async () =>
		Response.json(
			{ error: { message: "invalid key" } },
			{ status: 401, statusText: "Unauthorized" },
		);

	await expect(
		buildOpenAiFetchSdk({
			apiKey: "secret-key",
			fetch,
		}).unstructuredGeneration("input"),
	).rejects.toMatchObject({
		name: "AiSdkGenerationError",
		reason: "provider-error",
	});
});
