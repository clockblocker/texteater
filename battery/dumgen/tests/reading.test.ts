import { expect, test } from "bun:test";
import { Effect } from "effect";
import { createOpenAIExecutor } from "promptsmith/openai";
import { readingOperationExperiment } from "../src/concrete-lang/de/reading-emoji-description/experiment.js";
import { evaluateGeneratedEmoji } from "../src/concrete-lang/de/reading-emoji-description/generate/cases.js";
import cases from "../src/concrete-lang/de/reading-emoji-description/operation-cases.json";
import { comparisonInputSchema } from "../src/generated/schemas.js";
import { choiceAnswers, readingJudgment } from "../src/testing.js";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

const base = comparisonInputSchema.parse(
	cases["reading-de-noun-bank-financial-reuse"].input,
);

test("new Reading uses one raw-text request with local emoji validation and no judgment", async () => {
	for (const text of [
		"💪😓",
		'"💪😓"',
		'{"value":"💪😓"}',
		"effort 💪",
		"😓😓😓😓😓",
	]) {
		let calls = 0;
		const dumgen = createDumgen({
			judge: async () => {
				throw Error("New Reading must not request a semantic judgment");
			},
			execute: (request) =>
				createOpenAIExecutor({
					apiKey: "fixture",
					fetch: async (_url, init) => {
						calls++;
						const body = JSON.parse(String(init?.body));
						expect(body.text).toEqual({ format: { type: "text" } });
						return Response.json({
							status: "completed",
							output: [
								{ content: [{ type: "output_text", text }] },
							],
						});
					},
				})({
					...request,
					configuration: { model: "fixture", settings: {} },
				}),
		});
		const result = await Effect.runPromise(
			Effect.either(
				dumgen.resolveOrGenerateReadingEmojiDescription({
					...base,
					candidates: [],
				}),
			),
		);
		expect(calls).toBe(1);
		if (text === "💪😓")
			expect(result).toMatchObject({
				_tag: "Right",
				right: { decision: "New", emojiDescription: text },
			});
		else
			expect(result).toMatchObject({
				_tag: "Left",
				left: { _tag: "InvalidModelOutput" },
			});
	}
});

test("generation quality accepts reviewed alternatives and flags novel ones for review", () => {
	const ideal = { decision: "New", emojiDescription: "😓" };
	const evaluate = (emojiDescription: string) =>
		evaluateGeneratedEmoji(
			"reading-generation-strenuous-hike",
			{ decision: "New", emojiDescription },
			ideal,
		);
	expect(evaluate("💪😓")).toMatchObject({
		contractPass: true,
		exactMatch: false,
		needsReview: false,
	});
	expect(evaluate("💪")).toMatchObject({
		contractPass: false,
		needsReview: false,
	});
	expect(evaluate("🧗😩")).toMatchObject({
		contractPass: null,
		needsReview: true,
	});
});

test("bulk-discovered semantic failures cannot be counted as successful mnemonics", () => {
	for (const [id, emojiDescription, expected] of [
		["lock-door", "🏰", "🔒"],
		["wait-bus", "⏳🚌", "⏳"],
		["exciting-story", "😮‍💨❓", "🤩"],
	]) {
		if (!id || !emojiDescription || !expected)
			throw Error("Incomplete semantic fixture");
		expect(
			evaluateGeneratedEmoji(
				`reading-generation-${id}`,
				{ decision: "New", emojiDescription },
				{ decision: "New", emojiDescription: expected },
			),
		).toMatchObject({ contractPass: false, needsReview: false });
	}
});
test("neighbour bleed and padding are rejected, the bare complete symbol passes", () => {
	const evaluate = (id: string, emojiDescription: string, ideal: string) =>
		evaluateGeneratedEmoji(
			`reading-generation-${id}`,
			{ decision: "New", emojiDescription },
			{ decision: "New", emojiDescription: ideal },
		);
	// Production failures: bleiben took geschlossen's lock; geschlossen gained
	// a redundant negation sign.
	for (const [id, emojiDescription, ideal] of [
		["remain-closed", "🚪🔒", "📍"],
		["remain-cold", "🥶", "📍"],
		["seem-tired", "😴", "👀"],
		["find-boring", "🥱", "🤔"],
		["make-tired", "😴", "➡️"],
		["look-delicious", "👀😋", "👀"],
		["become-longer", "⬆️", "➡️"],
		["closed-tomorrow", "🔒🚫", "🔒"],
		["forbidden-smoking", "🚭", "🚫"],
		["silent-forest", "🌲🤫", "🤫"],
	] as const)
		expect(evaluate(id, emojiDescription, ideal)).toMatchObject({
			contractPass: false,
			needsReview: false,
		});
	expect(evaluate("closed-tomorrow", "🔒", "🔒")).toMatchObject({
		contractPass: true,
		exactMatch: true,
	});
	expect(evaluate("remain-closed", "📍", "📍")).toMatchObject({
		contractPass: true,
	});
	expect(evaluate("remain-closed", "🔒🚪", "📍")).toMatchObject({
		contractPass: false,
	});
	expect(evaluate("save-money", "💰🐷", "🐷💰")).toMatchObject({
		contractPass: true,
		exactMatch: false,
	});
});
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
		failure: "InvalidModelOutput",
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
			execute: async () => ({ output: scenario.generated }),
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
		if (!trace) throw new Error("Missing Reading operation trace");
		expect(trace.calls.map((call) => call.executor)).toEqual([
			...scenario.calls,
		]);
		if (trace.calls.length === 2)
			expect<unknown>(trace.calls[1]?.dependsOn).toEqual([
				trace.calls[0]?.id,
			]);
		const generation = trace.calls.find((call) => call.executor === "Luna");
		if (generation) {
			expect(generation.request.input).toEqual({
				markedContext:
					"Die <TARGET>Bank</TARGET> genehmigte den Kredit.",
				lemma: base.lemma.canonicalForm,
			});
			expect(generation.request).toHaveProperty("outputFormat", "text");
			expect(generation.request).toHaveProperty("cachePrompt", true);
			expect(generation.request).not.toHaveProperty("outputSchema");
		}
		if (
			scenario.candidates.length === 2 &&
			scenario.selection === "NoMatch"
		) {
			expect(trace.events.map((event) => event.kind)).toEqual([
				"ReadingSelection",
			]);
			const selection = trace.calls[0];
			if (!selection) throw new Error("Missing Reading selection call");
			expect(
				(selection.request.input as { candidates: string[] })
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
				output: example.idealOutput.emojiDescription,
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
