import { expect, test } from "bun:test";
import { Effect } from "effect";
import { translationAnalysisInputSchema } from "../src/concrete-lang/de/knowledge-production/structured-schemas.js";
import { resolveOrGenerateTranslation } from "../src/concrete-lang/de/knowledge-production/translation/operation.js";
import data from "../src/concrete-lang/de/knowledge-production/translation/source-data.json";
import { choiceAnswers } from "../src/testing.js";
import type { OperationTrace } from "../src/types.js";

const base = translationAnalysisInputSchema.parse(
	data.cases["translation-cover-near-equivalent"].input,
);
for (const [existing, generated] of [
	["polish", "Polish"],
	["Really!", "Really?"],
	["Polish", "Polish"],
] as const)
	test(`translation preserves ${existing} / ${generated}`, async () => {
		const traces: OperationTrace[] = [];
		const result = await Effect.runPromise(
			resolveOrGenerateTranslation(
				{
					judge: async ({ questions }) =>
						choiceAnswers(questions, () => "NoMatch"),
					execute: async () => ({
						output: { translation: generated },
					}),
					onOperation: (trace) => traces.push(trace),
				},
				{ ...base, existingTranslations: [existing] },
			),
		);
		expect(result).toEqual(
			existing === generated
				? {
						decision: "Covered",
						existingIndex: 0,
						translation: existing,
					}
				: { decision: "Add", translation: generated },
		);
		expect(traces[0]?.calls.map((call) => call.executor)).toEqual([
			"TypeSafe",
			"Luna",
		]);
		if (existing === generated)
			expect(traces[0]?.events.map((event) => event.kind)).toEqual([
				"TranslationSelection",
				"GeneratedTranslationCollision",
			]);
	});
test("translation uncertainty never generates, and empty candidates skip judgment", async () => {
	let generations = 0,
		judgments = 0;
	const options: import("../src/types.js").DumgenOptions = {
		judge: async ({ questions }) => {
			judgments++;
			return choiceAnswers(questions, () => "Unresolved");
		},
		execute: async () => {
			generations++;
			return { output: { translation: "start" } };
		},
	};
	const unresolved = await Effect.runPromise(
		Effect.either(resolveOrGenerateTranslation(options, base)),
	);
	expect(unresolved._tag).toBe("Left");
	if (unresolved._tag === "Left")
		expect(unresolved.left._tag).toBe("Unresolved");
	expect(generations).toBe(0);
	expect(
		await Effect.runPromise(
			resolveOrGenerateTranslation(options, {
				...base,
				existingTranslations: [],
			}),
		),
	).toEqual({ decision: "Add", translation: "start" });
	expect(judgments).toBe(1);
	expect(generations).toBe(1);
});
