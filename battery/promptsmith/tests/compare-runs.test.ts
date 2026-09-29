import { expect, test } from "bun:test";
import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	diffJson,
} from "promptsmith";
import { runOperationExperiment } from "promptsmith/evaluation";
import { compareRuns } from "promptsmith/storage";
import { z } from "zod";

test("JSON diffs report paths, compare arrays by index and treat key changes as differences", () => {
	expect(
		diffJson(
			{
				units: [
					{ text: "a", route: { kind: "Left" } },
					{ text: "b", route: { kind: "Left" } },
					{ text: "c", route: { kind: "Left" } },
				],
				dropped: 1,
				"odd key": true,
				shape: [1],
			},
			{
				units: [
					{ text: "a", route: { kind: "Left" } },
					{ text: "b", route: { kind: "Left" }, extra: null },
					{ text: "c", route: { kind: "Right" } },
					{ text: "d" },
				],
				"odd key": false,
				shape: { 0: 1 },
			},
		),
	).toEqual([
		{ path: "units[1].extra", change: "Added", right: null },
		{
			path: "units[2].route.kind",
			change: "Changed",
			left: "Left",
			right: "Right",
		},
		{ path: "units[3]", change: "Added", right: { text: "d" } },
		{ path: "dropped", change: "Removed", left: 1 },
		{ path: '["odd key"]', change: "Changed", left: true, right: false },
		{ path: "shape", change: "Changed", left: [1], right: { 0: 1 } },
	]);
	expect(diffJson("same", "same")).toEqual([]);
	expect(diffJson("left", "right")).toEqual([
		{ path: "", change: "Changed", left: "left", right: "right" },
	]);
	expect(diffJson({ a: [1, 2] }, { a: [1] })).toEqual([
		{ path: "a[1]", change: "Removed", left: 2 },
	]);
});

const inputSchema = z.strictObject({ value: z.number() });
const outputSchema = z.strictObject({
	items: z
		.array(z.strictObject({ tag: z.strictObject({ kind: z.string() }) }))
		.readonly(),
});
const corpus = defineGoldenCorpus({
	route: "compare",
	inputSchema,
	outputSchema,
	collections: {
		cases: defineGoldenCaseCollection(import.meta.url, {
			cases: {
				demo: {
					input: { value: 0 },
					idealOutput: { items: [{ tag: { kind: "Z" } }] },
				},
				kept: {
					input: { value: 1 },
					idealOutput: { items: [{ tag: { kind: "A" } }] },
				},
				moved: {
					input: { value: 2 },
					idealOutput: {
						items: [{ tag: { kind: "A" } }, { tag: { kind: "B" } }],
					},
				},
				dropped: {
					input: { value: 3 },
					idealOutput: { items: [{ tag: { kind: "Z" } }] },
				},
				added: {
					input: { value: 4 },
					idealOutput: { items: [{ tag: { kind: "Z" } }] },
				},
			},
		}),
	},
});
const settings = {
	experimentId: "compare",
	operationVersion: "1",
	evaluatorVersion: "1",
	sourceRevision: "test",
	configurations: {
		judgment: { model: "judge", settings: {} },
		generation: { model: "generator", settings: {} },
	},
};
type Output = z.output<typeof outputSchema>;
function operation(
	ids: string[],
	answer: (input: { value: number }, call: number) => Output,
) {
	let calls = 0;
	return {
		corpus,
		evaluation: corpus.select(ids),
		demonstrations: corpus.select(["demo"]),
		run: async (input: { value: number }) => answer(input, ++calls),
		evaluator: ({
			output,
			idealOutput,
		}: {
			output: Output;
			idealOutput: Output;
		}) => ({
			contractPass:
				JSON.stringify(output) === JSON.stringify(idealOutput),
		}),
	};
}
const ideal = (value: number): Output =>
	value === 1
		? { items: [{ tag: { kind: "A" } }] }
		: value === 2
			? { items: [{ tag: { kind: "A" } }, { tag: { kind: "B" } }] }
			: { items: [{ tag: { kind: "Z" } }] };

test("run comparison reports changed fields, changed verdicts and one-sided cases", async () => {
	const before = await runOperationExperiment({
		...settings,
		experiment: operation(["kept", "moved", "dropped"], (input) =>
			ideal(input.value),
		),
	});
	const after = await runOperationExperiment({
		...settings,
		experiment: operation(["kept", "moved", "added"], (input) =>
			input.value === 2
				? { items: [{ tag: { kind: "A" } }, { tag: { kind: "C" } }] }
				: ideal(input.value),
		),
	});
	const comparison = compareRuns(before, after);
	expect(comparison.cases.map((pair) => pair.caseId)).toEqual([
		"kept",
		"moved",
		"dropped",
		"added",
	]);
	expect(comparison.onlyLeft).toEqual(["dropped"]);
	expect(comparison.onlyRight).toEqual(["added"]);
	expect(comparison.changedVerdicts).toEqual(["moved"]);
	expect(comparison.changedOutputs).toEqual(["moved"]);
	expect(comparison.cases[1]).toMatchObject({
		verdict: { left: "Passed", right: "Failed" },
		verdictChanged: true,
		outputChanges: [
			{
				path: "items[1].tag.kind",
				change: "Changed",
				left: "B",
				right: "C",
			},
		],
	});
	expect(comparison.cases[2]).toMatchObject({
		right: null,
		verdict: { left: "Passed", right: null },
		verdictChanged: false,
		outputChanges: [],
	});
});

test("repeated cases compare by their most frequent output and a Mixed verdict", async () => {
	const steady = await runOperationExperiment({
		...settings,
		experiment: operation(["kept", "moved"], (input) => ideal(input.value)),
	});
	// kept: A, B, B across repetitions; moved: ideal, then broken, then ideal.
	const repeated = await runOperationExperiment({
		...settings,
		repetitions: 3,
		experiment: operation(["kept", "moved"], (input, call) => {
			if (input.value === 1)
				return {
					items: [{ tag: { kind: call === 1 ? "A" : "B" } }],
				};
			return call === 5 ? { items: [] } : ideal(input.value);
		}),
	});
	expect(repeated.summary.stability).toMatchObject({
		flipped: 2,
		varyingOutputs: 2,
	});
	const comparison = compareRuns(steady, repeated);
	expect(comparison.cases[0]).toMatchObject({
		verdict: { left: "Passed", right: "Mixed" },
		verdictChanged: true,
		outputChanges: [
			{
				path: "items[0].tag.kind",
				change: "Changed",
				left: "A",
				right: "B",
			},
		],
	});
	expect(comparison.cases[1]).toMatchObject({
		verdict: { left: "Passed", right: "Mixed" },
		outputChanges: [],
	});
	expect(comparison.changedOutputs).toEqual(["kept"]);
	expect(comparison.changedVerdicts).toEqual(["kept", "moved"]);
});
