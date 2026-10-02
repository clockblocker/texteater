import { expect, test } from "bun:test";
import {
	evaluateRawSegmentInUnits,
	type RawOutput,
	rawCaseOf,
	rawSegmentInUnitsMetrics,
} from "../../src/evaluation/segment-in-units-raw.js";
import type {
	SegmentInUnitsFacts,
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { evaluateSegmentInUnits } from "../../src/evaluation/spec-corpus/segment-in-units-evaluation.js";

const route = (kind: string) => ({ language: "de", family: "Lexeme", kind });

// i0 m1 _2 Wald3 .4
const gold: SegmentInUnitsInput = {
	language: "de",
	segments: [
		{ kind: "ResolvableText", text: "i", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Wald" },
		{ kind: "Punctuation", text: "." },
	],
};
const idealOutput: SegmentInUnitsOutput = {
	units: [
		{ segments: [0], route: route("ADP") },
		{ segments: [1, 3], route: route("NOUN") },
	],
};
const facts: Record<string, SegmentInUnitsFacts> = {
	im: { coverage: "Full", sources: [{ target: 0 }, { target: 1 }] },
};
const raw = rawCaseOf({ input: gold, idealOutput });
const evaluate = evaluateRawSegmentInUnits(facts);
const score = (output: RawOutput) =>
	evaluate({
		caseId: "im",
		input: raw.input,
		idealOutput: raw.idealOutput,
		output,
	});

test("a raw case reads the record's Sentence and keeps its Segments and units as the ideal", () => {
	expect(raw).toEqual({
		input: { language: "de", sentence: "im Wald." },
		idealOutput: { segments: gold.segments, units: idealOutput.units },
	});
});

test("gold Segments score exactly as in gold mode, and the unit stage would replay gold mode's requests", () => {
	const evaluation = score({
		segments: gold.segments,
		units: idealOutput.units,
	});
	const goldMode = evaluateSegmentInUnits(facts)({
		caseId: "im",
		input: gold,
		idealOutput,
		output: idealOutput,
	});
	const { pieces, ...units } = evaluation;
	expect(units).toEqual(goldMode);
	expect(pieces).toEqual({
		textPreserved: true,
		goldBoundaries: 4,
		predictedBoundaries: 4,
		matchedBoundaries: 4,
		goldPieces: 3,
		predictedPieces: 3,
		exactPieces: 3,
		exactSurfaces: 3,
		exactSentence: 1,
		goldSegments: 1,
		unresolved: 0,
		unaligned: 0,
	});
});

test("an unsplit Fusion is a Segment no gold unit asserts: it costs membership and precision, and its gold halves hover alone", () => {
	const evaluation = score({
		segments: [
			{ kind: "ResolvableText", text: "im" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Wald" },
			{ kind: "Punctuation", text: "." },
		],
		units: [{ segments: [0, 2], route: route("NOUN") }],
		unresolved: [0],
	});
	expect(evaluation.membership).toBe(0);
	expect(evaluation.scored).toBe(2);
	expect(evaluation.units.map(({ verdict }) => verdict)).toEqual([
		"Missing",
		"WrongSegments",
	]);
	expect(evaluation.contractPass).toBe(false);
	// i and m hover alone; Wald highlights itself and the unsplit im.
	expect(evaluation.hover).toMatchObject({
		segments: 3,
		precision: 1 + 1 + 1 / 2,
		recall: 1 + 1 / 2 + 1 / 2,
		unasserted: 1,
	});
	expect(evaluation.pieces).toEqual({
		textPreserved: true,
		goldBoundaries: 4,
		predictedBoundaries: 3,
		matchedBoundaries: 3,
		goldPieces: 3,
		predictedPieces: 2,
		exactPieces: 1,
		exactSurfaces: 1,
		exactSentence: 0,
		goldSegments: 0,
		unresolved: 1,
		unaligned: 1,
	});
});

test("a wrong surface keeps the piece exact but not its recovery", () => {
	const evaluation = score({
		segments: gold.segments.map((segment) =>
			segment.text === "m" ? { ...segment, surface: "der" } : segment,
		),
		units: idealOutput.units,
	});
	expect(evaluation.membership).toBe(2);
	expect(evaluation.pieces).toMatchObject({
		exactPieces: 3,
		exactSurfaces: 2,
		exactSentence: 1,
		goldSegments: 0,
	});
});

test("raw metrics add the Segment stage's rates to gold mode's", () => {
	const exact = score({ segments: gold.segments, units: idealOutput.units });
	const unsplit = score({
		segments: [
			{ kind: "ResolvableText", text: "im" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Wald" },
			{ kind: "Punctuation", text: "." },
		],
		units: [
			{ segments: [0], route: route("ADP") },
			{ segments: [2], route: route("NOUN") },
		],
	});
	const metrics = rawSegmentInUnitsMetrics({
		cases: [
			{ repetitions: [{ evaluation: exact }, { evaluation: unsplit }] },
		],
	});
	expect(metrics.rates.membership).toBe(2 / 4);
	expect(metrics.rates.multiMembership).toEqual({ rate: 1 / 2, units: 2 });
	expect(metrics.pieces.boundaries).toMatchObject({
		precision: 7 / 7,
		recall: 7 / 8,
		gold: 8,
	});
	expect(metrics.pieces.pieces).toMatchObject({
		precision: 4 / 5,
		recall: 4 / 6,
		gold: 6,
	});
	expect(metrics.pieces).toMatchObject({
		surfaces: 1,
		exactSentences: 1 / 2,
		goldSegments: 1 / 2,
		unaligned: 1,
	});
});
