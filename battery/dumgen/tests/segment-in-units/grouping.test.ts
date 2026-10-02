import { describe, expect, test } from "bun:test";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
	Unit,
} from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { evaluateSegmentInUnits } from "../../src/evaluation/spec-corpus/segment-in-units-evaluation.js";
import { checkGrouping } from "../../src/evaluation/spec-corpus/segment-in-units-grouping.js";
import type { LabCase } from "../../src/segment-in-units/lab/corpus.js";
import { pinnedJevModel } from "../../src/segment-in-units/lab/jev.js";
import {
	groupingExamples,
	summarizePolicy,
} from "../../src/segment-in-units/lab/metrics.js";
import type { LabRun } from "../../src/segment-in-units/lab/run.js";
import { segmentsOf } from "../spec-corpus/fixtures.js";

const route = (kind: string, family = "Lexeme") => ({
	language: "de",
	family,
	kind,
});

// Er0 _1 fängt2 _3 heute4 _5 an6 .7
const separable = segmentsOf("Er fängt heute an.");
const separableGold: Unit[] = [
	{ segments: [0], route: route("PRON") },
	{ segments: [2, 6], route: route("VERB") },
	{ segments: [4], route: route("ADV") },
];
const grouping = (segments: number[][], ideal = separableGold) =>
	checkGrouping({
		segments: separable,
		ideal,
		returned: segments.map((members) => ({
			segments: members,
			route: "Unresolved",
		})),
	});

describe("Segment pairs and merges against a Full record", () => {
	test("the gold grouping recalls every gold pair and returns no false one", () => {
		expect(grouping([[0], [2, 6], [4]])).toEqual({
			goldPairs: 1,
			recalledPairs: 1,
			decidedPairs: 1,
			truePairs: 1,
			overMerged: [],
			underMerged: [],
		});
	});

	test("whitespace and punctuation in a returned unit do not count", () => {
		expect(grouping([[0, 1], [2, 3, 6, 7], [4]])).toMatchObject({
			decidedPairs: 1,
			truePairs: 1,
			overMerged: [],
			underMerged: [],
		});
	});

	test("a split separable verb loses its pair and is under-merged", () => {
		expect(grouping([[0], [2], [4], [6]])).toEqual({
			goldPairs: 1,
			recalledPairs: 0,
			decidedPairs: 0,
			truePairs: 0,
			overMerged: [],
			underMerged: [
				{ unit: 1, text: "fängt an", fragments: ["fängt", "an"] },
			],
		});
	});

	test("a gold Segment no returned unit holds is a fragment of its own", () => {
		expect(grouping([[0], [2], [4]]).underMerged).toEqual([
			{ unit: 1, text: "fängt an", fragments: ["fängt", "an"] },
		]);
	});

	test("an adverb swallowed into the verb adds false pairs and is over-merged", () => {
		expect(grouping([[0], [2, 4, 6]])).toEqual({
			goldPairs: 1,
			recalledPairs: 1,
			decidedPairs: 3,
			truePairs: 1,
			overMerged: [
				{
					segments: [2, 4, 6],
					text: "fängt heute an",
					parts: [
						{ text: "fängt an", unit: 1 },
						{ text: "heute", unit: 2 },
					],
				},
			],
			underMerged: [],
		});
	});

	test("a crossed grouping is both over-merged and under-merged", () => {
		const check = grouping([
			[0, 2],
			[4, 6],
		]);
		expect(check).toMatchObject({
			recalledPairs: 0,
			decidedPairs: 2,
			truePairs: 0,
		});
		expect(check.overMerged.map(({ text }) => text)).toEqual([
			"Er fängt",
			"heute an",
		]);
		expect(check.underMerged).toEqual([
			{ unit: 1, text: "fängt an", fragments: ["fängt", "an"] },
		]);
	});

	test("a No Target Segment merged into a neighbour is a false pair; pairs inside a Foreign unit go unscored", () => {
		// Er0 _1 sagt2 _3 very4 _5 cool6 _7 qzxv8 .9
		const segments = segmentsOf("Er sagt very cool qzxv.");
		const ideal: Unit[] = [
			{ segments: [0], route: route("PRON") },
			{ segments: [2], route: route("VERB") },
			{ segments: [4, 6], route: route("Foreign", "Foreign") },
			{ segments: [8], route: "Unresolved" },
		];
		const check = (members: number[][]) =>
			checkGrouping({
				segments,
				ideal,
				returned: members.map((entry) => ({
					segments: entry,
					route: "Unresolved",
				})),
			});
		expect(check([[0], [2], [4, 6], [8]])).toEqual({
			goldPairs: 0,
			recalledPairs: 0,
			decidedPairs: 0,
			truePairs: 0,
			overMerged: [],
			underMerged: [],
		});
		// The Foreign unit split is a Stub's grouping: not scored.
		expect(check([[0], [2], [4], [6, 8]])).toMatchObject({
			decidedPairs: 1,
			truePairs: 0,
			overMerged: [
				{
					text: "cool qzxv",
					parts: [
						{ text: "cool", unit: 2 },
						{ text: "qzxv", unit: 3 },
					],
				},
			],
			underMerged: [],
		});
	});
});

describe("Segment pairs and merges against a Partial record", () => {
	// Nora0 _1 hat2 _3 bereits4 _5 gegessen6 .7; only hat … gegessen is asserted.
	const segments = segmentsOf("Nora hat bereits gegessen.");
	const ideal: Unit[] = [{ segments: [2, 6], route: route("VERB") }];
	const check = (members: number[][]) =>
		checkGrouping({
			segments,
			ideal,
			returned: members.map((entry) => ({
				segments: entry,
				route: "Unresolved",
			})),
		});

	test("a pair of Segments no gold unit asserts is not decided", () => {
		expect(
			check([
				[0, 4],
				[2, 6],
			]),
		).toEqual({
			goldPairs: 1,
			recalledPairs: 1,
			decidedPairs: 1,
			truePairs: 1,
			overMerged: [],
			underMerged: [],
		});
	});

	test("an unasserted Segment joined to an asserted unit is over-merged, since the asserted unit is complete", () => {
		expect(check([[0, 2, 6], [4]])).toEqual({
			goldPairs: 1,
			recalledPairs: 1,
			decidedPairs: 3,
			truePairs: 1,
			overMerged: [
				{
					segments: [0, 2, 6],
					text: "Nora hat gegessen",
					parts: [
						{ text: "Nora" },
						{ text: "hat gegessen", unit: 0 },
					],
				},
			],
			underMerged: [],
		});
	});
});

test("the evaluator carries the grouping of each case", () => {
	const input: SegmentInUnitsInput = { language: "de", segments: separable };
	const evaluation = evaluateSegmentInUnits({
		"de/er-faengt-heute-an": {
			coverage: "Full",
			sources: [{ target: 0 }, { target: 1 }, { target: 2 }],
		},
	})({
		caseId: "de/er-faengt-heute-an",
		input,
		idealOutput: { units: separableGold },
		output: {
			units: [
				{ segments: [0], route: route("PRON") },
				{ segments: [2], route: route("VERB") },
				{ segments: [4], route: route("ADV") },
				{ segments: [6], route: route("ADP") },
			],
		},
	});
	expect(evaluation.grouping.underMerged).toEqual([
		{ unit: 1, text: "fängt an", fragments: ["fängt", "an"] },
	]);
});

describe("a run's grouping summary", () => {
	const full: LabCase = {
		id: "de/er-faengt-heute-an",
		record: "de/er-faengt-heute-an",
		input: { language: "de", segments: separable },
		idealOutput: { units: separableGold },
		facts: {
			coverage: "Full",
			sources: [{ target: 0 }, { target: 1 }, { target: 2 }],
		},
		rules: [],
		ruleExample: false,
	};
	// Nora0 hat2 bereits4 gegessen6, Partial: hat … gegessen is discontinuous.
	const partial: LabCase = {
		id: "de/nora-hat-bereits-gegessen",
		record: "de/nora-hat-bereits-gegessen",
		input: {
			language: "de",
			segments: segmentsOf("Nora hat bereits gegessen."),
		},
		idealOutput: {
			units: [{ segments: [2, 6], route: route("VERB") }],
		},
		facts: { coverage: "Partial", sources: [{ target: 0 }] },
		rules: [],
		ruleExample: false,
	};
	const output = (...units: number[][]): SegmentInUnitsOutput => ({
		units: units.map((segments) => ({
			segments,
			route: route("VERB"),
		})),
	});
	const repetition = (value: SegmentInUnitsOutput) => ({
		outputs: { p: value },
		primary: "p",
		calls: [],
		wallMs: 0,
	});
	const labRun: LabRun = {
		runId: "synthetic",
		arm: "test",
		options: {},
		set: "dev",
		setHash: "test",
		setGitHead: "test",
		subset: "all",
		gitHead: "test",
		startedAt: "",
		finishedAt: "",
		repetitions: 2,
		model: pinnedJevModel,
		cases: [
			{
				id: full.id,
				repetitions: [
					repetition(output([0], [2, 6], [4])),
					repetition(output([0], [2, 4, 6])),
				],
			},
			{
				id: partial.id,
				repetitions: [
					repetition(output([0, 2, 6], [4])),
					repetition(output([0], [2], [4], [6])),
				],
			},
		],
	};
	const cases = new Map([
		[full.id, full],
		[partial.id, partial],
	]);

	test("sums pairs over repetitions, precision on Full records only, and counts merges per repetition", () => {
		const summary = summarizePolicy(labRun, cases, "p");
		expect(summary.tally).toMatchObject({
			goldPairs: 4,
			recalledPairs: 3,
			fullPairs: 4,
			fullTruePairs: 2,
			decidedPairs: 7,
			truePairs: 3,
			overMerged: 2,
			underMerged: 1,
			discontinuousScored: 4,
			discontinuousMembership: 1,
		});
		expect(summary.pairRecords).toEqual({
			recall: 2,
			fullPrecision: 1,
			assertedPrecision: 2,
		});
		expect(summary.overMergedByRepetition).toEqual([1, 1]);
		expect(summary.underMergedByRepetition).toEqual([0, 1]);
		expect(summary.rates.pairRecall).toBe(3 / 4);
		expect(summary.rates.pairPrecision).toBe(2 / 4);
		expect(summary.rates.pairF1).toBeCloseTo((2 * 0.5 * 0.75) / 1.25);
		expect(summary.rates.assertedPairPrecision).toBe(3 / 7);
		expect(summary.rates.discontinuousMembership).toBe(1 / 4);
	});

	test("lists each merge once with the repetitions that made it", () => {
		const examples = groupingExamples(labRun, cases, "p");
		expect(examples).toEqual([
			{
				case: full.id,
				sentence: "Er fängt heute an.",
				kind: "over",
				text: "fängt heute an",
				parts: [
					{ text: "fängt an", gold: "Lexeme/VERB" },
					{ text: "heute", gold: "Lexeme/ADV" },
				],
				repetitions: [1],
			},
			{
				case: partial.id,
				sentence: "Nora hat bereits gegessen.",
				kind: "over",
				text: "Nora hat gegessen",
				parts: [
					{ text: "Nora" },
					{ text: "hat gegessen", gold: "Lexeme/VERB" },
				],
				repetitions: [0],
			},
			{
				case: partial.id,
				sentence: "Nora hat bereits gegessen.",
				kind: "under",
				text: "hat gegessen",
				gold: "Lexeme/VERB",
				parts: [{ text: "hat" }, { text: "gegessen" }],
				repetitions: [1],
			},
		]);
	});
});

test("two like gold units of one Sentence split the same way stay two examples", () => {
	// eine0 _1 Art2 _3 Ziel4 ,5 _6 eine7 _8 Art9 _10 Tätigkeit11
	const segments = segmentsOf("eine Art Ziel, eine Art Tätigkeit");
	const labCase: LabCase = {
		id: "de/eine-art",
		record: "de/eine-art",
		input: { language: "de", segments },
		idealOutput: {
			units: [
				{ segments: [0, 2], route: route("DET", "Locution") },
				{ segments: [4], route: route("NOUN") },
				{ segments: [7, 9], route: route("DET", "Locution") },
				{ segments: [11], route: route("NOUN") },
			],
		},
		facts: {
			coverage: "Full",
			sources: [
				{ target: 0 },
				{ target: 1 },
				{ target: 2 },
				{ target: 3 },
			],
		},
		rules: [],
		ruleExample: false,
	};
	const split: SegmentInUnitsOutput = {
		units: [0, 2, 4, 7, 9, 11].map((segment) => ({
			segments: [segment],
			route: route("NOUN"),
		})),
	};
	const run: LabRun = {
		runId: "synthetic",
		arm: "test",
		options: {},
		set: "dev",
		setHash: "test",
		setGitHead: "test",
		subset: "all",
		gitHead: "test",
		startedAt: "",
		finishedAt: "",
		repetitions: 1,
		model: pinnedJevModel,
		cases: [
			{
				id: labCase.id,
				repetitions: [
					{
						outputs: { p: split },
						primary: "p",
						calls: [],
						wallMs: 0,
					},
				],
			},
		],
	};
	const examples = groupingExamples(
		run,
		new Map([[labCase.id, labCase]]),
		"p",
	);
	expect(examples.map((example) => example.repetitions)).toEqual([[0], [0]]);
});
