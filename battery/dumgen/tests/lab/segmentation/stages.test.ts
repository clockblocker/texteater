import { expect, test } from "bun:test";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../../lab/evaluation/spec-corpus/segment-in-units.js";
import {
	assertPartition,
	type Edge,
	groupsOf,
	runStages,
	type Stages,
} from "../../../lab/segmentation/harness/stages.js";
import { validateUnits } from "../../../lab/segmentation/harness/validate.js";

const route = { language: "de", family: "Lexeme", kind: "VERB" } as const;

// "Er fängt im Haus an." with `im` split into `i` + `m` (a Fusion).
const input: SegmentInUnitsInput = {
	language: "de",
	segments: [
		{ kind: "ResolvableText", text: "Er" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "fängt" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "i", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Haus" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "an" },
		{ kind: "Punctuation", text: "." },
	],
};
const source = "Er fängt im Haus an.";
const unit = (...segments: number[]) => ({ segments, route });
const valid: SegmentInUnitsOutput = {
	units: [unit(0), unit(2, 9), unit(4), unit(5), unit(7)],
};

test("a discontinuous unit and each Fusion component validate per Segment", () => {
	expect(validateUnits(input, valid, source)).toEqual([]);
});

test("every kind of invalid answer is reported", () => {
	const kinds = (output: SegmentInUnitsOutput, text = source) =>
		validateUnits(input, output, text).map((issue) => issue.kind);
	expect(kinds(valid, "Er fängt in dem Haus an.")).toEqual(["SourceChanged"]);
	expect(kinds({ units: [...valid.units, { segments: [], route }] })).toEqual(
		["EmptyUnit"],
	);
	expect(kinds({ units: [...valid.units, unit(42)] })).toEqual([
		"InvalidReference",
	]);
	expect(kinds({ units: [...valid.units, unit(1)] })).toEqual([
		"NotResolvable",
	]);
	expect(
		kinds({ units: [unit(0), unit(9, 2), unit(4), unit(5), unit(7)] }),
	).toEqual(["Unordered"]);
	expect(kinds({ units: [unit(0), unit(2, 9), unit(4), unit(7)] })).toEqual([
		"Unowned",
	]);
	expect(kinds({ units: [...valid.units, unit(5)] })).toEqual([
		"SharedOwner",
	]);
});

test("a partition holds every piece exactly once", () => {
	expect(groupsOf([1, 2, 3, 4], [[4, 2]])).toEqual([[1], [2, 4], [3]]);
	expect(() => assertPartition([1, 2, 3], [[1], [2, 3]])).not.toThrow();
	expect(() =>
		assertPartition(
			[1, 2, 3],
			[
				[1, 2],
				[2, 3],
			],
		),
	).toThrow("Piece 2 is in two groups");
	expect(() => assertPartition([1, 2, 3], [[1], [2]])).toThrow("misses 3");
});

// Pieces are the 1-based ResolvableText Segments: Er=1, fängt=2, i=3, m=4,
// Haus=5, an=6.
const segmentOf = [0, 2, 4, 5, 7, 9];
const outputOf = (groups: readonly (readonly number[])[]) => ({
	units: groups.map((group) =>
		unit(...group.map((id) => segmentOf[id - 1] ?? -1)),
	),
});

function stagesWith(args: {
	readonly edges: readonly Edge[];
	readonly partition?: readonly (readonly number[])[];
	readonly merges?: readonly Edge[];
	readonly routed?: readonly (readonly number[])[];
}): Stages<null, null> {
	const pieces = [1, 2, 3, 4, 5, 6];
	return {
		nominate: async () => ({
			pieces,
			connections: [
				{
					id: "sep",
					kind: "separable",
					pieces: [2, 6],
					source: "judged",
					probability: 0.9,
					supported: true,
				},
			],
			judgments: {},
			evidence: null,
		}),
		resolve: () => ({
			partition:
				args.partition ??
				groupsOf(
					pieces,
					args.edges.map((edge) => edge.pieces),
				),
			edges: args.edges,
			detail: null,
		}),
		route: async (_, membership) => {
			const partition =
				args.routed ??
				groupsOf(pieces, [
					...membership.edges.map((edge) => edge.pieces),
					...(args.merges ?? []).map((edge) => edge.pieces),
				]);
			return {
				output: outputOf(partition),
				partition,
				merges: args.merges ?? [],
			};
		},
	};
}

const context = {} as never;

test("runStages traces selected connections, assembly edges and merges", async () => {
	const { output, trace } = await runStages(
		stagesWith({
			edges: [
				{ pieces: [2, 6], connection: "sep" },
				{ pieces: [3, 4], rule: "sibling" },
			],
			merges: [{ pieces: [4, 5], rule: "interjection" }],
		}),
		input,
		context,
	);
	expect(trace.selected).toEqual(["sep"]);
	expect(trace.assembly).toEqual([{ pieces: [3, 4], rule: "sibling" }]);
	expect(trace.resolved).toEqual([[1], [2, 6], [3, 4], [5]]);
	expect(trace.final).toEqual([[1], [2, 6], [3, 4, 5]]);
	expect(output.units).toHaveLength(3);
});

test("runStages rejects a resolver whose edges do not make its partition", async () => {
	await expect(
		runStages(
			stagesWith({
				edges: [{ pieces: [2, 6], connection: "sep" }],
				partition: [[1], [2, 6], [3, 4], [5]],
			}),
			input,
			context,
		),
	).rejects.toThrow("The resolver's edges do not make its partition");
});

test("runStages rejects routing that regroups without recording a merge", async () => {
	await expect(
		runStages(
			stagesWith({
				edges: [{ pieces: [2, 6], connection: "sep" }],
				routed: [[1, 2, 6], [3], [4], [5]],
			}),
			input,
			context,
		),
	).rejects.toThrow("Routing changed membership beyond its recorded merges");
});

test("runStages rejects an edge naming an unknown connection", async () => {
	await expect(
		runStages(
			stagesWith({ edges: [{ pieces: [2, 6], connection: "missing" }] }),
			input,
			context,
		),
	).rejects.toThrow("Edge names unknown connection missing");
});
