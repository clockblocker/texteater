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
