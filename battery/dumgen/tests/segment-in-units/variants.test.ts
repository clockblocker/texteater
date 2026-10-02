import { expect, test } from "bun:test";
import {
	type SegmentInUnitsInput,
	type SegmentInUnitsOutput,
	segmentInUnitsOutputSchema,
} from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { closedClassRouteShares } from "../../src/segment/de/closed-class.js";
import { routeVariants } from "../../src/segment/de/routing.js";
import { type Sentence, sentenceOf } from "../../src/segment/de/sentence.js";
import {
	pickedOutput,
	pickId,
	pickQuestions,
} from "../../src/segment-in-units/de/arms/reference.js";
import type { LabCase } from "../../src/segment-in-units/lab/corpus.js";
import { pinnedJevModel } from "../../src/segment-in-units/lab/jev.js";
import { summarizePolicy } from "../../src/segment-in-units/lab/metrics.js";
import {
	outcomesOf,
	pickScore,
	variantsOf,
} from "../../src/segment-in-units/lab/outcomes.js";
import type { LabRun } from "../../src/segment-in-units/lab/run.js";
import { segmentsOf } from "../spec-corpus/fixtures.js";

test("a unit is borderline when the top two shares of its deciding distribution lie within the margin", () => {
	const shares = {
		"Lexeme/PART": 0.45,
		"Lexeme/ADV": 0.4,
		"Lexeme/ADJ": 0.15,
	};
	expect(routeVariants("Lexeme/PART", shares, 0.1)).toEqual([
		"Lexeme/PART",
		"Lexeme/ADV",
	]);
	expect(routeVariants("Lexeme/PART", shares, 0.01)).toBeUndefined();
	expect(routeVariants("Lexeme/PART", shares, 0.35)).toEqual([
		"Lexeme/PART",
		"Lexeme/ADV",
		"Lexeme/ADJ",
	]);
	expect(routeVariants("Lexeme/PART", shares, 0.35, 2)).toEqual([
		"Lexeme/PART",
		"Lexeme/ADV",
	]);
	// A route an identity or Rule test chose stays first.
	expect(routeVariants("Lexeme/ADV", shares, 0.1)).toEqual([
		"Lexeme/ADV",
		"Lexeme/PART",
	]);
	expect(routeVariants("Unresolved", shares, 0.1)).toBeUndefined();
	expect(
		routeVariants("Lexeme/PART", { "Lexeme/PART": 1 }, 1),
	).toBeUndefined();
	expect(routeVariants("Lexeme/PART", undefined, 1)).toBeUndefined();
});

// Er0 _1 zog2 _3 eben4 _5 an6 .7
const input: SegmentInUnitsInput = {
	language: "de",
	segments: segmentsOf("Er zog eben an."),
};
const sentence: Sentence = sentenceOf(input);
const route = (kind: string) =>
	({ language: "de", family: "Lexeme", kind }) as const;

test("closed-class uses add up by the route they imply", () => {
	const eben = sentence.pieces[2];
	if (!eben) throw Error("no eben");
	const shares = closedClassRouteShares(eben, {
		modal: 0.5,
		focus: 0.3,
		temporal: 0.15,
		adjective: 0.05,
	});
	expect(Object.keys(shares).sort()).toEqual([
		"Lexeme/ADJ",
		"Lexeme/ADV",
		"Lexeme/PART",
	]);
	expect(shares["Lexeme/PART"]).toBe(0.5);
	expect(shares["Lexeme/ADV"]).toBeCloseTo(0.45);
	expect(shares["Lexeme/ADJ"]).toBe(0.05);
});

const borderline: SegmentInUnitsOutput = {
	units: [
		{ segments: [0], route: route("PRON") },
		{ segments: [2, 6], route: route("VERB") },
		{
			segments: [4],
			route: route("PART"),
			variants: [route("PART"), route("ADV")],
		},
	],
};
const partition = [[1], [2, 4], [3]];

test("the pick asks only about units with variants, among their variants", () => {
	expect(segmentInUnitsOutputSchema.safeParse(borderline).success).toBe(true);
	const questions = pickQuestions(
		{ sentence, ref: (piece) => `"${piece.text}"` },
		partition,
		borderline,
	);
	expect(Object.keys(questions)).toEqual([pickId([3])]);
	const question = questions[pickId([3])];
	expect(
		question?.type === "choice" && Object.keys(question.criteria),
	).toEqual(["Lexeme/PART", "Lexeme/ADV"]);
	const answer = (choice: string) => ({
		[pickId([3])]: {
			type: "choice" as const,
			choice,
			confidence: 0.6,
			probabilities: { [choice]: 0.6 },
		},
	});
	const picked = pickedOutput(partition, borderline, answer("Lexeme/ADV"));
	expect(picked.units[2]).toEqual({ segments: [4], route: route("ADV") });
	expect(picked.units.slice(0, 2)).toEqual(borderline.units.slice(0, 2));
	// An answer outside the variants keeps the unit's first route.
	expect(
		pickedOutput(partition, borderline, answer("Lexeme/NOUN")).units[2],
	).toEqual({ segments: [4], route: route("PART") });
});

const labCase: LabCase = {
	id: "de/er-zog-eben-an",
	record: "de/er-zog-eben-an",
	input,
	idealOutput: {
		units: [
			{ segments: [2, 6], route: route("VERB") },
			{ segments: [4], route: route("ADV") },
		],
	},
	facts: { coverage: "Partial", sources: [{ target: 0 }, { target: 1 }] },
	rules: [],
	ruleExample: false,
};

const repetition = (outputs: Record<string, SegmentInUnitsOutput>) => ({
	outputs,
	primary: "p",
	calls: [],
	wallMs: 0,
});
const withRoute = (kind: string): SegmentInUnitsOutput => ({
	units: [
		{ segments: [2, 6], route: route("VERB") },
		{ segments: [4], route: route(kind) },
	],
});
const withVariants = (...kinds: string[]): SegmentInUnitsOutput => ({
	units: [
		{ segments: [2, 6], route: route("VERB") },
		{
			segments: [4],
			route: route(kinds[0] ?? ""),
			variants: kinds.map(route),
		},
	],
});
// Gold eben is ADV. Repetition 1 carries PART|ADV and the pick finds ADV;
// repetition 2 carries PART|ADJ, the pick cannot help; repetition 3 is
// decided, PART.
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
	repetitions: 3,
	model: pinnedJevModel,
	cases: [
		{
			id: labCase.id,
			repetitions: [
				repetition({
					p: withRoute("PART"),
					v: withVariants("PART", "ADV"),
					"v+pick": withRoute("ADV"),
				}),
				repetition({
					p: withRoute("PART"),
					v: withVariants("PART", "ADJ"),
					"v+pick": withRoute("ADJ"),
				}),
				repetition({
					p: withRoute("PART"),
					v: withRoute("PART"),
					"v+pick": withRoute("PART"),
				}),
			],
		},
	],
};

test("outcomes, the summary and the pick score count variants on units with membership", () => {
	const cases = new Map([[labCase.id, labCase]]);
	const rows = outcomesOf(labRun, cases);
	expect(rows[1]?.policies.v).toEqual({
		v: "ARA",
		r: ["Lexeme/PART", "Lexeme/PART", "Lexeme/PART"],
		k: [2, 2, 0],
	});
	expect(rows[1]?.policies.p?.k).toBeUndefined();
	// PART for ADV is tolerated on a single route; PART|ADJ lacks ADV.
	expect(variantsOf(rows, "v")).toEqual({
		units: 6,
		withVariants: 2,
		routes: 4,
	});
	const summary = summarizePolicy(labRun, cases, "v");
	expect(summary.rates.variantRate).toBe(2 / 6);
	expect(summary.rates.meanVariants).toBe(2);
	expect(pickScore(rows, "v", "v+pick")).toEqual({
		units: 2,
		among: 1,
		strict: 1,
		tolerant: 2,
	});
});
