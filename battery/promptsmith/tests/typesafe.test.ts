import { expect, test } from "bun:test";
import { choice, createTypeSafeExecutor, noul } from "promptsmith/typesafe";

test("TypeSafe transport attempts a failing request once, even with retry overrides", async () => {
	let attempts = 0;
	const execute = createTypeSafeExecutor({
		apiKey: "fixture",
		retry: { maxRetries: 2 },
		fetch: async () => {
			attempts++;
			return new Response("rate limited", { status: 429 });
		},
	});
	await expect(
		execute(
			{ state: "test", questions: { valid: noul("Valid?") } },
			{
				retry: { maxRetries: 2 },
			},
		),
	).rejects.toThrow();
	expect(attempts).toBe(1);
});

test("System One adapter preserves typed questions, request options and usage", async () => {
	const controller = new AbortController();
	let body: Record<string, unknown> = {};
	const execute = createTypeSafeExecutor({
		apiKey: "fixture",
		fetch: async (_url, init) => {
			body = JSON.parse(String(init?.body));
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			expect(init?.signal?.aborted).toBe(false);
			return Response.json({
				model: "jev-fixture",
				answers: {
					category: {
						type: "choice",
						choice: "billing",
						confidence: 0.91,
						probabilities: { billing: 0.91, other: 0.09 },
					},
					urgent: { type: "noul", noul: 0.84 },
				},
				usage: { input_tokens: 20, output_tokens: 8 },
			});
		},
	});
	const result = await execute(
		{
			state: { ticket: "I was charged twice. Please fix this now." },
			questions: {
				category: choice("What is this ticket about?", {
					billing: null,
					other: null,
				}),
				urgent: noul("Does this ticket require urgent attention?"),
			},
		},
		{ signal: controller.signal },
	);

	expect(result.answers.category.choice).toBe("billing");
	expect(result.answers.urgent.noul).toBe(0.84);
	expect(result.usage).toEqual({ input_tokens: 20, output_tokens: 8 });
	expect(body).toMatchObject({
		model: "jev-latest",
		state: { ticket: "I was charged twice. Please fix this now." },
		questions: {
			category: { type: "choice" },
			urgent: { type: "noul" },
		},
	});
});
