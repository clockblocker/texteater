import { expect, test } from "bun:test";
import { type DumTraceSink, withTraceRecorder } from "common-utils/workflow";
import * as Effect from "effect/Effect";
import { z } from "zod";
import { AiSdkGenerationError } from "../../src/ai-sdk/ai-sdk-generation-error";
import {
	DUMGEN_GENERATION_MODEL,
	DUMGEN_REASONING_EFFORT,
} from "../../src/ai-sdk/model-policy";
import { buildOpenAiFetchModelGenerator } from "../../src/ai-sdk/openai-fetch";

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const failure = <A, E>(effect: Effect.Effect<A, E>) =>
	Effect.runPromise(Effect.flip(effect));

test("the fetch adapter records generation events through the trace sink", async () => {
	const events: unknown[] = [];
	const sink: DumTraceSink = {
		record: (event) => Effect.sync(() => events.push(event)),
		diagnostic: () => {},
		inlinePayloadBytes: 1_000_000,
	};
	const fetch = async () =>
		Response.json({
			output: [
				{
					content: [{ text: "traceable", type: "output_text" }],
					type: "message",
				},
			],
			status: "completed",
		});

	await expect(
		run(
			withTraceRecorder(
				buildOpenAiFetchModelGenerator({
					apiKey: "test-key",
					fetch,
				}).unstructuredGeneration("input"),
				sink,
			),
		),
	).resolves.toBe("traceable");
	expect(events).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				event: "model.generation.event",
				payload: expect.objectContaining({ kind: "AttemptStarted" }),
			}),
			expect.objectContaining({
				event: "model.generation.event",
				payload: expect.objectContaining({ kind: "Succeeded" }),
			}),
		]),
	);
});

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
	const sdk = buildOpenAiFetchModelGenerator({ apiKey: "test-key", fetch });

	await expect(
		run(
			sdk.structuredGeneration(
				'{"question":"hello"}',
				z.strictObject({ answer: z.string() }),
				{ maxOutputTokens: 42, systemPrompt: "Answer the request." },
			),
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
		run(
			buildOpenAiFetchModelGenerator({
				apiKey: "test-key",
				fetch,
			}).structuredGeneration(
				"input",
				z.strictObject({ answer: z.string() }),
				{ maxOutputTokens: 192 },
			),
		),
	).resolves.toEqual({ answer: "complete" });
	expect(tokenBudgets).toEqual([192, 1024]);
});

test("structured recovery shares the transport request budget with retries", async () => {
	let requests = 0;
	const responses = [
		Response.json({ error: { code: "server_error" } }, { status: 500 }),
		Response.json({
			incomplete_details: { reason: "max_output_tokens" },
			output: [],
			status: "incomplete",
		}),
		Response.json({
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
		}),
	];
	const fetch = async () => {
		requests += 1;
		return responses.shift() as Response;
	};

	await expect(
		run(
			buildOpenAiFetchModelGenerator({
				apiKey: "test-key",
				fetch,
				random: () => 0,
				sleep: () => Effect.void,
			}).structuredGeneration(
				"input",
				z.strictObject({ answer: z.string() }),
			),
		),
	).resolves.toEqual({ answer: "complete" });
	expect(requests).toBe(3);
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
	const sdk = buildOpenAiFetchModelGenerator({ apiKey: "test-key", fetch });

	await expect(run(sdk.unstructuredGeneration("input"))).resolves.toBe(
		"raw text",
	);
	await expect(
		failure(sdk.unstructuredGeneration("input")),
	).resolves.toMatchObject({
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
		failure(
			buildOpenAiFetchModelGenerator({
				apiKey: "secret-key",
				fetch,
			}).unstructuredGeneration("input"),
		),
	).resolves.toMatchObject({
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
		run(
			buildOpenAiFetchModelGenerator({
				apiKey: "test-key",
				fetch,
				random: () => 0,
				sleep: (delayMs) => Effect.sync(() => delays.push(delayMs)),
			}).unstructuredGeneration("input"),
		),
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
		caught = await failure(
			buildOpenAiFetchModelGenerator({
				apiKey: "test-key",
				fetch,
				sleep: () =>
					Effect.dieMessage("a rejected request must not sleep"),
			}).unstructuredGeneration("input"),
		);
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
		run(
			buildOpenAiFetchModelGenerator({
				apiKey: "test-key",
				fetch,
				sleep: (delayMs) => Effect.sync(() => delays.push(delayMs)),
			}).unstructuredGeneration("input"),
		),
	).resolves.toBe("recovered");
	expect(delays).toEqual([2_000]);
});

test("cancellation aborts an in-flight response body read", async () => {
	let aborted = false;
	const fetch = async (
		_input: string | URL | Request,
		init?: RequestInit,
	) => {
		const signal = init?.signal;
		return {
			headers: new Headers(),
			json: () =>
				new Promise<never>((_resolve, reject) => {
					signal?.addEventListener(
						"abort",
						() => {
							aborted = true;
							reject(new DOMException("aborted", "AbortError"));
						},
						{ once: true },
					);
				}),
			ok: true,
			status: 200,
		} as unknown as Response;
	};
	const result = await run(
		Effect.timeoutOption(
			buildOpenAiFetchModelGenerator({
				apiKey: "test-key",
				fetch,
			}).unstructuredGeneration("input"),
			"10 millis",
		),
	);

	expect(result._tag).toBe("None");
	expect(aborted).toBe(true);
});

test("cancelling one generation does not abort another generation", async () => {
	const aborted: boolean[] = [];
	let request = 0;
	const fetch = (_input: string | URL | Request, init?: RequestInit) => {
		const index = request++;
		return new Promise<Response>((resolve, reject) => {
			init?.signal?.addEventListener(
				"abort",
				() => {
					aborted[index] = true;
					reject(new DOMException("aborted", "AbortError"));
				},
				{ once: true },
			);
			if (index === 1)
				setTimeout(
					() =>
						resolve(
							Response.json({
								output: [
									{
										content: [
											{
												text: "second",
												type: "output_text",
											},
										],
										type: "message",
									},
								],
								status: "completed",
							}),
						),
					40,
				);
		});
	};
	const sdk = buildOpenAiFetchModelGenerator({ apiKey: "test-key", fetch });
	const first = run(
		Effect.timeoutOption(sdk.unstructuredGeneration("first"), "20 millis"),
	);
	await Bun.sleep(5);
	const second = run(sdk.unstructuredGeneration("second"));

	expect(await first).toMatchObject({ _tag: "None" });
	expect(await second).toBe("second");
	expect(aborted[0]).toBe(true);
	expect(aborted[1]).not.toBe(true);
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
		failure(
			buildOpenAiFetchModelGenerator({
				apiKey: "test-key",
				fetch,
				sleep: (delayMs) => Effect.sync(() => delays.push(delayMs)),
			}).unstructuredGeneration("input"),
		),
	).resolves.toMatchObject({
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
