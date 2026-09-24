import { expect, test } from "bun:test";
import { Effect } from "effect";
import { projectSegmentation } from "../src/concrete-lang/de/segmentation/experiment.js";
import cases from "../src/concrete-lang/de/segmentation/operation-cases.json";
import { choiceAnswers, intakeFixture } from "../src/testing.js";
import type { OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { segmentInputSchema } from "../src/universal/schemas.js";

for (const [id, example] of Object.entries(cases))
	test(`${id}: independent intake and lossless source segmentation`, async () => {
		const input = segmentInputSchema.parse(example.input),
			traces: OperationTrace[] = [];
		const fixture = intakeFixture({
			items: example.idealOutput.map((output, index) => ({
				...output,
				stitchedText:
					"stitchedText" in output
						? output.stitchedText
						: input.sourceSentences[index],
			})),
		});
		const dumgen = createDumgen({
			...fixture,
			onOperation: (trace) => traces.push(trace),
		});
		const output = await Effect.runPromise(dumgen.segment(input));
		expect<unknown>(projectSegmentation(output)).toEqual(
			example.idealOutput,
		);
		const calls = traces[0]?.calls ?? [];
		expect(
			calls.filter((call) => call.executor === "TypeSafe"),
		).toHaveLength(input.sourceSentences.length);
		for (const call of calls.filter((call) => call.executor === "TypeSafe"))
			expect(call.dependsOn).toEqual([]);
		const needsStitch = example.idealOutput.filter(
			(item, index) =>
				item.decision === "Accepted" &&
				"stitchedText" in item &&
				item.stitchedText !== input.sourceSentences[index],
		);
		expect(calls.filter((call) => call.executor === "Luna")).toHaveLength(
			needsStitch.length,
		);
		const ids = output.flatMap((item) =>
			item.decision === "Accepted" ? [item.sentence.id] : [],
		);
		expect(new Set(ids).size).toBe(ids.length);
		for (const item of output) {
			if (item.decision === "Accepted" && item.language !== "de") {
				const clickedSegmentIndex = item.sentence.segments.findIndex(
					(segment) => segment.kind === "ResolvableText",
				);
				if (clickedSegmentIndex < 0) continue;
				const result = await Effect.runPromise(
					Effect.either(
						dumgen.classifyTarget({
							sentence: item.sentence,
							clickedSegmentIndex,
						}),
					),
				);
				expect(result._tag).toBe("Left");
				if (result._tag === "Left")
					expect(result.left._tag).toBe("NotImplemented");
			}
		}
	});
for (const mode of [
	"uncertain",
	"invalid-characters",
	"invalid-spacing",
	"provider-failure",
] as const)
	test(`intake ${mode} never repairs by retry or classifier fallback`, async () => {
		let generations = 0;
		const traces: OperationTrace[] = [];
		const dumgen = createDumgen({
			judge: async ({ questions }) => {
				if (mode === "provider-failure") throw Error("offline");
				return choiceAnswers(questions, (id) =>
					id === "language"
						? "de"
						: id === "validity"
							? mode === "uncertain"
								? "Unresolved"
								: "Accepted"
							: "Needed",
				);
			},
			execute: async () => {
				generations++;
				return {
					output: {
						stitchedText:
							mode === "invalid-characters"
								? "Hallo!"
								: " Hallo. ",
					},
				};
			},
			onOperation: (trace) => traces.push(trace),
		});
		const result = await Effect.runPromise(
			Effect.either(dumgen.segment({ sourceSentences: ["Hallo."] })),
		);
		expect(result._tag).toBe("Left");
		if (result._tag === "Left")
			expect(result.left._tag).toBe(
				mode === "uncertain"
					? "Unresolved"
					: mode === "provider-failure"
						? "ProviderFailure"
						: "InvalidModelOutput",
			);
		expect(generations).toBe(
			mode === "uncertain" || mode === "provider-failure" ? 0 : 1,
		);
		expect(traces[0]?.outcome).toBe("Failure");
	});
test("intake judges every sentence at once and links stitching to its own judgment", async () => {
	const sourceSentences = [
		"Hal lo Welt.",
		"Guten Tag.",
		"Wie geht es dir?",
	] as const;
	const traces: OperationTrace[] = [];
	let inFlight = 0,
		peak = 0;
	const dumgen = createDumgen({
		judge: async ({ state, questions }) => {
			inFlight++;
			peak = Math.max(peak, inFlight);
			await new Promise((resolve) => setTimeout(resolve, 20));
			inFlight--;
			const { sourceText } = state as { sourceText: string };
			return choiceAnswers(questions, (id) =>
				id === "language"
					? "de"
					: id === "validity"
						? "Accepted"
						: sourceText === sourceSentences[0]
							? "Needed"
							: "Unchanged",
			);
		},
		execute: async () => ({ output: { stitchedText: "Hallo Welt." } }),
		onOperation: (trace) => traces.push(trace),
	});
	const output = await Effect.runPromise(
		dumgen.segment({
			sourceSentences: [
				sourceSentences[0] ?? "",
				...sourceSentences.slice(1),
			],
		}),
	);
	expect(peak).toBe(sourceSentences.length);
	expect(
		output.map((item) =>
			item.decision === "Accepted"
				? item.sentence.segments.map(({ text }) => text).join("")
				: item.decision,
		),
	).toEqual(["Hallo Welt.", "Guten Tag.", "Wie geht es dir?"]);
	const calls = traces[0]?.calls ?? [];
	const stitching = calls.filter((call) => call.executor === "Luna");
	expect(stitching).toHaveLength(1);
	const parent = calls.find((call) => call.id === stitching[0]?.dependsOn[0]);
	if (!parent) throw Error("Stitching is not linked to a recorded call");
	expect(parent.executor).toBe("TypeSafe");
	expect(parent.request.input).toMatchObject({
		sourceText: sourceSentences[0],
	});
});
test("English contractions and abbreviations remain lossless local source units", async () => {
	const dumgen = createDumgen({
		judge: async () => {
			throw Error("Unexpected judgment");
		},
		execute: async () => {
			throw Error("Unexpected generation");
		},
	});
	const sentence = await Effect.runPromise(
		dumgen.segmentSentence({
			language: "en",
			stitchedText: "Mr. Jones can't sell Mary's book.",
		}),
	);
	expect(
		sentence.segments
			.filter((s) => s.kind === "ResolvableText")
			.map((s) => s.text),
	).toEqual(["Mr.", "Jones", "can't", "sell", "Mary's", "book"]);
});
