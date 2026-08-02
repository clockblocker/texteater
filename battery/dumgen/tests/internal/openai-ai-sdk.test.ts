import { expect, test } from "bun:test";
import type OpenAI from "openai";
import { z } from "zod";

import { buildOpenAiSdk } from "../../src/ai-sdk/openai";

test("the OpenAI adapter sends structured and unstructured requests", async () => {
	const requests: unknown[] = [];
	const client = {
		responses: {
			async create(request: unknown) {
				requests.push(request);
				return { output_text: "raw text" };
			},
			async parse(request: unknown) {
				requests.push(request);
				return { output_parsed: { answer: "structured text" } };
			},
		},
	} as unknown as OpenAI;
	const sdk = buildOpenAiSdk({ client });
	const outputSchema = z.strictObject({ answer: z.string() });
	const params = {
		systemPrompt: "Answer the request.",
		model: "test-model",
		maxOutputTokens: 42,
	};

	await expect(
		sdk.structuredGeneration('{"question":"hello"}', outputSchema, params),
	).resolves.toEqual({ answer: "structured text" });
	await expect(
		sdk.unstructuredGeneration('{"question":"hello"}', params),
	).resolves.toBe("raw text");

	expect(requests).toHaveLength(2);
	expect(requests[0]).toMatchObject({
		input: [
			{ content: "Answer the request.", role: "system" },
			{ content: '{"question":"hello"}', role: "user" },
		],
		max_output_tokens: 42,
		model: "test-model",
		reasoning: { effort: "minimal" },
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
	expect(requests[1]).toMatchObject({
		input: [
			{ content: "Answer the request.", role: "system" },
			{ content: '{"question":"hello"}', role: "user" },
		],
		max_output_tokens: 42,
		model: "test-model",
		text: { verbosity: "low" },
	});
});

test("the OpenAI adapter types empty response reasons", async () => {
	const responses = [
		{
			output_parsed: null,
			output: [
				{
					content: [{ type: "refusal", refusal: "cannot comply" }],
				},
			],
		},
		{
			output_parsed: null,
			incomplete_details: { reason: "max_output_tokens" },
		},
		{
			output_parsed: null,
			incomplete_details: { reason: "content_filter" },
		},
		{ output_parsed: null, status: "failed" },
	];
	const client = {
		responses: {
			async parse() {
				return responses.shift();
			},
		},
	} as unknown as OpenAI;
	const sdk = buildOpenAiSdk({ client });
	const outputSchema = z.strictObject({ answer: z.string() });

	for (const reason of [
		"refusal",
		"max-output-tokens",
		"content-filter",
		"provider-error",
	] as const) {
		await expect(
			sdk.structuredGeneration("input", outputSchema),
		).rejects.toMatchObject({ name: "AiSdkGenerationError", reason });
	}
});

test("the OpenAI adapter rejects incomplete unstructured output", async () => {
	const client = {
		responses: {
			async create() {
				return {
					incomplete_details: { reason: "max_output_tokens" },
					output_text: "partial",
					status: "incomplete",
				};
			},
		},
	} as unknown as OpenAI;

	await expect(
		buildOpenAiSdk({ client }).unstructuredGeneration("input"),
	).rejects.toMatchObject({
		name: "AiSdkGenerationError",
		reason: "max-output-tokens",
	});
});
