import { expect, test } from "bun:test";
import { z } from "zod";
import { AiSdkGenerationError } from "../../src/ai-sdk/ai-sdk-generation-error";
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
		failure: {
			attempts: 1,
			category: "RequestRejected",
			retryable: false,
			status: 401,
		},
	});
});

test("the fetch adapter retries transient provider failures and then succeeds", async () => {
	const statuses = [500, 500, 200];
	const delays: number[] = [];
	const fetch = async () => {
		const status = statuses.shift();
		if (status === 200) {
			return Response.json({
				output: [
					{
						content: [{ text: "recovered", type: "output_text" }],
						type: "message",
					},
				],
				status: "completed",
			});
		}
		return Response.json(
			{ error: { code: "server_error", message: "temporary" } },
			{
				headers: { "x-request-id": `provider-${statuses.length}` },
				status,
			},
		);
	};

	await expect(
		buildOpenAiFetchSdk({
			apiKey: "test-key",
			fetch,
			random: () => 0,
			sleep: async (delayMs) => {
				delays.push(delayMs);
			},
		}).unstructuredGeneration("input"),
	).resolves.toBe("recovered");
	expect(statuses).toEqual([]);
	expect(delays).toEqual([250, 500]);
});

test("the fetch adapter does not retry rejected requests and keeps only safe metadata", async () => {
	let attempts = 0;
	const fetch = async () => {
		attempts += 1;
		return Response.json(
			{
				error: {
					code: "invalid_json_schema",
					message: "raw provider body with should-not-leak",
				},
			},
			{
				headers: { "x-request-id": "provider-request-1" },
				status: 400,
				statusText: "Bad Request",
			},
		);
	};

	let caught: unknown;
	try {
		await buildOpenAiFetchSdk({
			apiKey: "test-key",
			fetch,
			sleep: async () => {
				throw new Error("a rejected request must not sleep");
			},
		}).unstructuredGeneration("input");
	} catch (error) {
		caught = error;
	}

	expect(attempts).toBe(1);
	expect(caught).toMatchObject({
		name: "AiSdkGenerationError",
		failure: {
			attempts: 1,
			category: "RequestRejected",
			providerCode: "invalid_json_schema",
			providerRequestId: "provider-request-1",
			retryable: false,
			status: 400,
		},
	});
	expect(JSON.stringify(caught)).not.toContain("should-not-leak");
});

test("the fetch adapter honors Retry-After for rate limits", async () => {
	let attempt = 0;
	const delays: number[] = [];
	const fetch = async () => {
		attempt += 1;
		return attempt === 1
			? Response.json(
					{ error: { code: "rate_limit_exceeded" } },
					{ headers: { "Retry-After": "2" }, status: 429 },
				)
			: Response.json({
					output: [
						{
							content: [
								{ text: "recovered", type: "output_text" },
							],
							type: "message",
						},
					],
					status: "completed",
				});
	};

	await expect(
		buildOpenAiFetchSdk({
			apiKey: "test-key",
			fetch,
			sleep: async (delayMs) => {
				delays.push(delayMs);
			},
		}).unstructuredGeneration("input"),
	).resolves.toBe("recovered");
	expect(delays).toEqual([2_000]);
});

test("a long Retry-After yields immediately to the durable retry tier", async () => {
	let attempts = 0;
	const delays: number[] = [];
	const fetch = async () => {
		attempts += 1;
		return Response.json(
			{ error: { code: "rate_limit_exceeded" } },
			{ headers: { "Retry-After": "120" }, status: 429 },
		);
	};

	await expect(
		buildOpenAiFetchSdk({
			apiKey: "test-key",
			fetch,
			sleep: async (delayMs) => {
				delays.push(delayMs);
			},
		}).unstructuredGeneration("input"),
	).rejects.toMatchObject({
		failure: {
			attempts: 1,
			category: "RateLimited",
			retryAfterMs: 120_000,
			retryable: true,
			status: 429,
		},
	});
	expect(attempts).toBe(1);
	expect(delays).toEqual([]);
});

test("generation failure policy rejects contradictory reason and retryability", () => {
	expect(
		() =>
			new AiSdkGenerationError("refusal", "refused", {
				failure: {
					attempts: 1,
					category: "ProviderUnavailable",
					retryable: true,
				},
			}),
	).toThrow("incompatible");
	expect(
		() =>
			new AiSdkGenerationError("provider-error", "failed", {
				failure: {
					attempts: 1,
					category: "ProviderUnavailable",
					retryable: false,
				} as never,
			}),
	).toThrow("cannot have retryable=false");
});
