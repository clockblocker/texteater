import { expect, test } from "bun:test";
import { createOpenAIExecutor } from "promptsmith/openai";

test("Responses adapter transports arbitrary output shapes, settings, cancellation and usage", async () => {
	const controller = new AbortController();
	let body: Record<string, unknown> = {};
	const execute = createOpenAIExecutor({
		apiKey: "fixture",
		fetch: async (_url, init) => {
			body = JSON.parse(String(init?.body));
			expect(init?.signal).toBe(controller.signal);
			return Response.json({
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
			});
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
	expect(result.metadata).toEqual({
		responseId: "response",
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
