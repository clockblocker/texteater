import { describe, expect, test } from "bun:test";
import {
	buildDumgen,
	createOpenAIPromptExecutor,
	DumgenOpenAIResponseError,
	GPT_5_NANO_MODEL,
} from "dumgen";
import type OpenAI from "openai";
import { z } from "zod";

describe("OpenAI dumgen runtime", () => {
	test("classifies through GPT-5 nano with a cacheable structured request", async () => {
		const requests: unknown[] = [];
		const client = {
			responses: {
				async parse(request: unknown) {
					requests.push(request);
					return {
						output_parsed: {
							label: "literal",
							reason: "Der Kontext bezeichnet eine Sitzbank.",
						},
					};
				},
			},
		} as unknown as OpenAI;

		const dumgen = buildDumgen(createOpenAIPromptExecutor({ client }));
		const result = await dumgen.de.classify(
			"Sie sitzt auf der Bank.",
			"Bank",
		);

		expect(result).toEqual({
			label: "literal",
			reason: "Der Kontext bezeichnet eine Sitzbank.",
		});
		expect(requests).toHaveLength(1);
		expect(requests[0]).toMatchObject({
			model: GPT_5_NANO_MODEL,
			input: [
				{
					role: "system",
				},
				{
					role: "user",
					content:
						'{"selection":"Bank","sentence":"Sie sitzt auf der Bank."}',
				},
			],
			max_output_tokens: 256,
			reasoning: {
				effort: "minimal",
			},
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

		const request = requests[0] as {
			readonly input: readonly [{ readonly content: string }];
			readonly prompt_cache_key: string;
		};
		expect(request.input[0].content).toContain(
			"Klassifiziere die Markierung",
		);
		expect(request.prompt_cache_key).toHaveLength(64);
	});

	test("rejects malformed model output at the runtime boundary", async () => {
		const dumgen = buildDumgen(async () => '{"label":"other"}');

		await expect(
			dumgen.de.classify("Sie sitzt auf der Bank.", "Bank"),
		).rejects.toThrow();
	});

	test("reports refusals instead of treating them as empty output", async () => {
		const client = {
			responses: {
				async parse() {
					return {
						output: [
							{
								content: [
									{
										type: "refusal",
										refusal: "Cannot process this request.",
									},
								],
							},
						],
						output_parsed: null,
					};
				},
			},
		} as unknown as OpenAI;
		const executePrompt = createOpenAIPromptExecutor({ client });

		await expect(
			executePrompt({
				systemPrompt: "Return a classification.",
				input: "test",
				outputSchema: z.object({
					label: z.string(),
				}),
			}),
		).rejects.toBeInstanceOf(DumgenOpenAIResponseError);
	});
});
