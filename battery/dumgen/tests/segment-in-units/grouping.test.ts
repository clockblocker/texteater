import { describe, expect, test } from "bun:test";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
	Unit,
} from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { evaluateSegmentInUnits } from "../../src/evaluation/spec-corpus/segment-in-units-evaluation.js";
import {
	checkGrouping,
	checkHover,
	hoverRates,
	sumHover,
} from "../../src/evaluation/spec-corpus/segment-in-units-grouping.js";
import { segmentInUnitsMetrics } from "../../src/evaluation/spec-corpus/segment-in-units-metrics.js";
import { pinnedJevModel } from "../../src/segment/jev.js";
import type { LabCase } from "../../src/segment-in-units/lab/corpus.js";
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

describe("what hovering each Segment highlights, B-cubed", () => {
	const hover = (segments: number[][], ideal = separableGold) =>
		checkHover({
			segments: separable,
			ideal,
			returned: segments.map((members) => ({
				segments: members,
				route: "Unresolved",
			})),
		});

	test("the gold grouping shows each Segment exactly its gold unit", () => {
		expect(hover([[0], [2, 6], [4]])).toEqual({
			segments: 4,
			precision: 4,
			recall: 4,
			highlighted: 6,
			unasserted: 0,
			multi: {
				segments: 2,
				precision: 2,
				recall: 2,
				highlighted: 4,
				unasserted: 0,
			},
		});
	});

	test("whitespace and punctuation in a returned unit are not highlighted", () => {
		expect(hover([[0, 1], [2, 3, 6, 7], [4]])).toEqual(
			hover([[0], [2, 6], [4]]),
		);
	});

	test("a split separable verb halves the recall of each of its Segments", () => {
		// Er 1/1, fängt 1/½, heute 1/1, an 1/½.
		expect(hover([[0], [2], [4], [6]])).toMatchObject({
			segments: 4,
			precision: 4,
			recall: 3,
			multi: { segments: 2, precision: 2, recall: 1 },
		});
	});

	test("an empty answer, which is how a failed case scores, highlights each Segment alone", () => {
		expect(hover([])).toEqual(hover([[0], [2], [4], [6]]));
	});

	test("an adverb swallowed into the verb costs every Segment of the merged unit precision", () => {
		// Er 1/1, fängt ⅔/1, heute ⅓/1, an ⅔/1.
		const check = hover([[0], [2, 4, 6]]);
		expect(check.segments).toBe(4);
		expect(check.precision).toBeCloseTo(8 / 3);
		expect(check.recall).toBe(4);
		expect(check.highlighted).toBe(10);
		expect(check.multi.precision).toBeCloseTo(4 / 3);
		const rates = hoverRates(check);
		expect(rates.precision).toBeCloseTo(2 / 3);
		expect(rates.recall).toBe(1);
		expect(rates.f1).toBeCloseTo(0.8);
	});

	test("a Segment two returned units hold highlights both", () => {
		// an sits in [2, 6] and [4, 6]: it highlights fängt, heute and itself.
		const check = hover([[0], [2, 6], [4, 6]]);
		// Er 1/1, fängt 1/1, heute ½/1, an ⅔/1.
		expect(check.precision).toBeCloseTo(1 + 1 + 1 / 2 + 2 / 3);
		expect(check.recall).toBe(4);
	});

	test("on a Partial record only Segments of asserted units are hovered, and an unasserted Segment highlighted with them counts against precision", () => {
		// Nora0 _1 hat2 _3 bereits4 _5 gegessen6 .7; only hat … gegessen is asserted.
		const segments = segmentsOf("Nora hat bereits gegessen.");
		const check = (members: number[][]) =>
			checkHover({
				segments,
				ideal: [{ segments: [2, 6], route: route("VERB") }],
				returned: members.map((entry) => ({
					segments: entry,
					route: "Unresolved",
				})),
			});
		expect(
			check([
				[0, 4],
				[2, 6],
			]),
		).toMatchObject({
			segments: 2,
			precision: 2,
			recall: 2,
			highlighted: 4,
			unasserted: 0,
		});
		const joined = check([[0, 2, 6], [4]]);
		expect(joined).toMatchObject({
			segments: 2,
			recall: 2,
			highlighted: 6,
			unasserted: 2,
		});
		expect(joined.precision).toBeCloseTo(4 / 3);
	});

	test("Stub Segments are not hovered, and one highlighted with a scored Segment counts against precision", () => {
		// Er0 _1 sagt2 _3 very4 _5 cool6 _7 qzxv8 .9
		const segments = segmentsOf("Er sagt very cool qzxv.");
		const ideal: Unit[] = [
			{ segments: [0], route: route("PRON") },
			{ segments: [2], route: route("VERB") },
			{ segments: [4, 6], route: route("Foreign", "Foreign") },
			{ segments: [8], route: "Unresolved" },
		];
		const check = (members: number[][]) =>
			checkHover({
				segments,
				ideal,
				returned: members.map((entry) => ({
					segments: entry,
					route: "Unresolved",
				})),
			});
		expect(check([[0], [2], [4], [6, 8]])).toMatchObject({
			segments: 2,
			precision: 2,
			recall: 2,
			multi: { segments: 0 },
		});
		expect(check([[0, 4], [2]])).toMatchObject({
			segments: 2,
			precision: 1.5,
			recall: 2,
			unasserted: 0,
		});
	});

	test("sums add answers, and rates are undefined over no Segments", () => {
		const total = sumHover([
			hover([[0], [2, 6], [4]]),
			hover([[0], [2], [4], [6]]),
		]);
		expect(total).toMatchObject({
			segments: 8,
			precision: 8,
			recall: 7,
			multi: { segments: 4, precision: 4, recall: 3 },
		});
		expect(hoverRates(sumHover([])).f1).toBeNaN();
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
	expect(evaluation.hover).toMatchObject({
		segments: 4,
		precision: 4,
		recall: 3,
	});
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

	test("averages hover over every hovered Segment, on Full records and over multi-piece units, with the records each is counted over", () => {
		// Full: gold (4 Segments at 1/1), then heute swallowed (8/3, 4).
		// Partial: Nora joined (4/3, 2), then split (2, 1).
		const summary = summarizePolicy(labRun, cases, "p");
		expect(summary.tally).toMatchObject({
			hoverSegments: 12,
			hoverRecallSum: 11,
			hoverHighlighted: 24,
			hoverUnasserted: 2,
			fullHoverSegments: 8,
			fullHoverRecallSum: 8,
			multiHoverSegments: 8,
			multiHoverRecallSum: 7,
		});
		expect(summary.tally.hoverPrecisionSum).toBeCloseTo(10);
		expect(summary.hoverRecords).toEqual({ all: 2, full: 1, multi: 2 });
		expect(summary.rates.hoverPrecision).toBeCloseTo(10 / 12);
		expect(summary.rates.hoverRecall).toBe(11 / 12);
		expect(summary.rates.hoverF1).toBeCloseTo(
			(2 * (10 / 12) * (11 / 12)) / (10 / 12 + 11 / 12),
		);
		expect(summary.rates.fullHoverPrecision).toBeCloseTo(20 / 3 / 8);
		expect(summary.rates.fullHoverRecall).toBe(1);
		expect(summary.rates.multiHoverPrecision).toBeCloseTo(20 / 3 / 8);
		expect(summary.rates.multiHoverRecall).toBe(7 / 8);
	});

	test("a failed repetition scores hover as an empty answer", () => {
		const failed: LabRun = {
			...labRun,
			repetitions: 1,
			cases: [
				{
					id: full.id,
					repetitions: [
						{ calls: [], wallMs: 0, error: "jev failed" },
					],
				},
			],
		};
		const { tally } = summarizePolicy(failed, cases, "p");
		expect(tally).toMatchObject({
			errors: 1,
			hoverSegments: 4,
			hoverPrecisionSum: 4,
			hoverRecallSum: 3,
		});
	});

	test("the evaluate CLI's metrics read hover from the evaluator", () => {
		const evaluate = evaluateSegmentInUnits({
			[full.id]: full.facts,
			[partial.id]: partial.facts,
		});
		const evaluated = (labCase: LabCase, units: SegmentInUnitsOutput) => ({
			evaluation: evaluate({
				caseId: labCase.id,
				input: labCase.input,
				idealOutput: labCase.idealOutput,
				output: units,
			}),
		});
		const metrics = segmentInUnitsMetrics({
			cases: [
				{
					repetitions: [
						evaluated(full, output([0], [2, 6], [4])),
						evaluated(full, output([0], [2, 4, 6])),
					],
				},
				{
					repetitions: [
						evaluated(partial, output([0, 2, 6], [4])),
						evaluated(partial, output([0], [2], [4], [6])),
					],
				},
			],
		});
		const summary = summarizePolicy(labRun, cases, "p");
		expect(metrics.rates.hover).toEqual({
			precision: summary.rates.hoverPrecision,
			recall: summary.rates.hoverRecall,
			f1: summary.rates.hoverF1,
			segments: 12,
		});
		expect(metrics.rates.fullHover).toMatchObject({
			recall: 1,
			segments: 8,
		});
		expect(metrics.rates.multiHover).toMatchObject({
			recall: 7 / 8,
			segments: 8,
		});
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
