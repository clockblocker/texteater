import { expect, test } from "bun:test";
import { Effect } from "effect";
import { readingOperationExperiment } from "../src/concrete-lang/de/reading-emoji-description/experiment.js";
import cases from "../src/concrete-lang/de/reading-emoji-description/operation-cases.json";
import { comparisonInputSchema } from "../src/generated/schemas.js";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { choiceAnswers, readingJudgment } from "./execution-fixture.js";

const base = comparisonInputSchema.parse(
	cases["reading-de-noun-bank-financial-reuse"].input,
);
for (const scenario of [
	{
		selection: "candidate_0",
		candidates: ["💰", "🪑"],
		generated: "✨",
		expected: { decision: "Reuse", emojiDescription: "💰" },
		calls: ["TypeSafe"],
	},
	{
		selection: "NoMatch",
		candidates: [],
		generated: "💰",
		expected: { decision: "New", emojiDescription: "💰" },
		calls: ["Luna"],
	},
	{
		selection: "NoMatch",
		candidates: ["🪑"],
		generated: "💰",
		expected: { decision: "New", emojiDescription: "💰" },
		calls: ["TypeSafe", "Luna"],
	},
	{
		selection: "NoMatch",
		candidates: ["💰", "💰"],
		generated: "💰",
		expected: { decision: "Reuse", emojiDescription: "💰" },
		calls: ["TypeSafe", "Luna"],
	},
	{
		selection: "Unresolved",
		candidates: ["💰"],
		generated: "✨",
		failure: "Unresolved",
		calls: ["TypeSafe"],
	},
	{
		selection: "NoMatch",
		candidates: ["🪑"],
		generated: "not emoji",
		failure: "InvalidModelOutput",
		calls: ["TypeSafe", "Luna"],
	},
] as const)
	test(`Reading ${scenario.selection} with ${scenario.candidates.length} candidates and ${scenario.generated}`, async () => {
		const traces: OperationTrace[] = [];
		const dumgen = createDumgen({
			judge: async ({ questions }) =>
				choiceAnswers(questions, () => scenario.selection),
			execute: async () => ({
				output: { emojiDescription: scenario.generated },
			}),
			onOperation: (trace) => traces.push(trace),
		});
		const result = await Effect.runPromise(
			Effect.either(
				dumgen.resolveOrGenerateReadingEmojiDescription({
					...base,
					candidates: scenario.candidates,
				}),
			),
		);
		if ("failure" in scenario) {
			expect(result._tag).toBe("Left");
			if (result._tag === "Left")
				expect<unknown>(result.left._tag).toBe(scenario.failure);
		} else {
			expect(result._tag).toBe("Right");
			if (result._tag === "Right")
				expect(result.right).toEqual(scenario.expected);
		}
		const trace = traces[0];
		expect(trace?.calls.map((call) => call.executor)).toEqual([
			...scenario.calls,
		]);
		if (trace?.calls.length === 2)
			expect<unknown>(trace.calls[1]?.dependsOn).toEqual([trace.calls[0]?.id]);
		if (
			scenario.candidates.length === 2 &&
			scenario.selection === "NoMatch"
		) {
			expect(trace?.events.map((event) => event.kind)).toEqual([
				"ReadingSelection",
				"GeneratedReadingCollision",
			]);
			expect(
				(trace?.calls[0]?.request.input as { candidates: string[] })
					.candidates,
			).toEqual(["💰"]);
		}
	});
test("all retained Reading cases execute the unified API and operation evaluators preserve meaning isolation", async () => {
	for (const [id, example] of Object.entries(cases)) {
		const input = comparisonInputSchema.parse(example.input),
			traces: OperationTrace[] = [];
		const options = {
			judge: readingJudgment(example.idealOutput),
			execute: async () => ({
				output: {
					emojiDescription: example.idealOutput.emojiDescription,
				},
			}),
			onOperation: (trace: OperationTrace) => traces.push(trace),
		};
		const output = await Effect.runPromise(
			createDumgen(options).resolveOrGenerateReadingEmojiDescription(
				input,
			),
		);
		expect<unknown>(output, id).toEqual(example.idealOutput);
		const experiment = readingOperationExperiment(
			id.startsWith("reading-generation-")
				? "reading-generation/de"
				: "reading-resolution/de",
			options,
		);
		const evaluated = await experiment.run(input, {
			signal: new AbortController().signal,
			recordTrace: () => {},
		});
		expect(evaluated, id).toEqual(output);
	}
});
