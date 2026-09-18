import { expect, test } from "bun:test";
import { createOpenAIExecutor } from "promptsmith/openai";

test("text output stays raw and the optional cache breakpoint precedes dynamic input", async () => {
	for (const cachePrompt of [false, true]) {
		let body: Record<string, unknown> = {};
		const execute = createOpenAIExecutor({
			apiKey: "fixture",
			fetch: async (_url, init) => {
				body = JSON.parse(String(init?.body));
				return Response.json({
					status: "completed",
					output: [
						{ content: [{ type: "output_text", text: "💪😓" }] },
					],
				});
			},
		});
		const result = await execute({
			systemPrompt: "Stable examples",
			input: { lemma: "anstrengend" },
			outputFormat: "text",
			cachePrompt,
			configuration: { model: "fixture", settings: {} },
		});
		expect(result.output).toBe("💪😓");
		expect(body.text).toEqual({ format: { type: "text" } });
		expect(body.input).toEqual([
			cachePrompt
				? {
						role: "developer",
						content: [
							{
								type: "input_text",
								text: "Stable examples",
								prompt_cache_breakpoint: { mode: "explicit" },
							},
						],
					}
				: { role: "system", content: "Stable examples" },
			{ role: "user", content: '{"lemma":"anstrengend"}' },
		]);
		if (cachePrompt)
			expect(body.prompt_cache_options).toEqual({ mode: "explicit" });
		else expect(body).not.toHaveProperty("prompt_cache_options");
	}
});

test("Responses adapter transports arbitrary output shapes, settings, cancellation and usage", async () => {
	const controller = new AbortController();
	let body: Record<string, unknown> = {};
	const execute = createOpenAIExecutor({
		apiKey: "fixture",
		fetch: async (_url, init) => {
			body = JSON.parse(String(init?.body));
			expect(init?.signal).toBe(controller.signal);
			return Response.json(
				{
					status: "completed",
					id: "response",
					usage: { total_tokens: 12 },
					output: [
						{
							content: [
								{
									type: "output_text",
									text: JSON.stringify({ value: ["a", "b"] }),
								},
							],
						},
					],
				},
				{
					headers: {
						"x-request-id": "request",
						"openai-processing-ms": "12.5",
					},
				},
			);
		},
	});
	const result = await execute({
		systemPrompt: "List letters",
		input: { count: 2 },
		outputSchema: { type: "array", items: { type: "string" } },
		configuration: { model: "fixture", settings: { temperature: 0 } },
		signal: controller.signal,
	});
	expect(result.output).toEqual(["a", "b"]);
	expect(result.metadata).toMatchObject({
		requestId: "request",
		timing: {
			headersMs: expect.any(Number),
			bodyMs: expect.any(Number),
			totalMs: expect.any(Number),
			providerProcessingMs: 12.5,
		},
		responseId: "response",
		model: null,
		usage: { total_tokens: 12 },
	});
	expect(body).toMatchObject({
		model: "fixture",
		temperature: 0,
		store: false,
		text: {
			format: {
				schema: {
					type: "object",
					properties: { value: { type: "array" } },
				},
			},
		},
	});
});
