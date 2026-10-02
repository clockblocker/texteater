import { expect, test } from "bun:test";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../src/evaluation/spec-corpus/segment-in-units.js";
import {
	evaluateSource,
	evaluateSourceAndUnits,
	type GermanSource,
	germanSourceOf,
	sourceSpans,
} from "../../src/segment-in-units/de/source-evaluation.js";

const route = { language: "de", family: "Lexeme", kind: "NOUN" };
const gold: SegmentInUnitsInput = {
	language: "de",
	segments: [
		{ kind: "ResolvableText", text: "i", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Wald" },
	],
};
const idealOutput: SegmentInUnitsOutput = {
	units: [
		{ segments: [0], route: { ...route, kind: "ADP" } },
		{ segments: [1, 3], route },
	],
};
const sourceOf = (
	input: SegmentInUnitsInput,
	unresolved: number[] = [],
): GermanSource => ({
	input,
	spans: sourceSpans(input.segments),
	unresolved,
});

test("exact source coordinates map units even when a predicted Segment index shifts", () => {
	const actual: SegmentInUnitsInput = {
		language: "de",
		segments: [
			{ kind: "Whitespace", text: " " },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Wort" },
		],
	};
	const expected: SegmentInUnitsInput = {
		language: "de",
		segments: [
			{ kind: "Whitespace", text: "  " },
			{ kind: "ResolvableText", text: "Wort" },
		],
	};
	expect(sourceSpans(actual.segments)).toEqual([
		{ start: 0, end: 1 },
		{ start: 1, end: 2 },
		{ start: 2, end: 6 },
	]);
	const evaluation = evaluateSourceAndUnits(
		expected,
		{ units: [{ segments: [1], route }] },
		sourceOf(actual),
		{ units: [{ segments: [2], route }] },
		"Full",
	);
	expect(evaluation.segmentMapping).toEqual([null, null, 1]);
	expect(evaluation.source.boundaryExact).toBe(false);
	expect(evaluation.units).toMatchObject({
		groupingMatches: 1,
		routeMatches: 1,
		fullPass: true,
	});
});

test("the Segment stage's result reads as a source with spans in its Stitched Text", () => {
	const source = germanSourceOf({
		language: "de",
		text: "im Wald",
		segments: [
			{ kind: "ResolvableText", text: "i", surface: "in" },
			{ kind: "ResolvableText", text: "m", surface: "dem" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Wald" },
		],
		unresolved: [3],
	});
	expect(source.input).toEqual(gold);
	expect(source.spans).toEqual(sourceSpans(gold.segments));
	expect(source.unresolved).toEqual([3]);
	expect(evaluateSource(gold, source)).toMatchObject({
		textPreserved: true,
		strictSurfaceExact: true,
		unresolvedSegments: 1,
	});
});

test("an unsplit Fusion cannot vanish from the end-to-end denominator", () => {
	const actual: SegmentInUnitsInput = {
		language: "de",
		segments: [
			{ kind: "ResolvableText", text: "im" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Wald" },
		],
	};
	const output: SegmentInUnitsOutput = {
		units: [{ segments: [0, 2], route }],
	};
	const evaluation = evaluateSourceAndUnits(
		gold,
		idealOutput,
		sourceOf(actual),
		output,
		"Full",
	);
	expect(evaluation.segmentMapping).toEqual([null, 2, 3]);
	expect(evaluation.source).toMatchObject({
		textPreserved: true,
		boundaryExact: false,
	});
	expect(evaluation.units).toMatchObject({
		gold: 2,
		groupingMatches: 0,
		routeMatches: 0,
		wrongSegments: 2,
		missing: 0,
		unmappable: 1,
		extra: 1,
		fullPass: false,
	});
});

test("opaque replacement and missing predictions count as different failures", () => {
	const opaque: SegmentInUnitsInput = {
		...gold,
		segments: gold.segments.map((segment) =>
			segment.text === "Wald"
				? { ...segment, kind: "OpaqueText" }
				: segment,
		),
	};
	const evaluation = evaluateSourceAndUnits(
		gold,
		idealOutput,
		sourceOf(opaque),
		idealOutput,
	);
	expect(evaluation.segmentMapping[3]).toBeNull();
	expect(evaluation.units.wrongSegments).toBe(1);
	expect(evaluation.units.unmappable).toBe(1);
	const missing = evaluateSourceAndUnits(gold, idealOutput, sourceOf(gold), {
		units: [],
	});
	expect(missing.units).toMatchObject({
		gold: 2,
		missing: 2,
		groupingMatches: 0,
	});
});

test("surface recovery is reported separately from membership and route", () => {
	const actual: SegmentInUnitsInput = {
		...gold,
		segments: gold.segments.map((segment) =>
			segment.text === "m" ? { ...segment, surface: "der" } : segment,
		),
	};
	const evaluation = evaluateSourceAndUnits(
		gold,
		idealOutput,
		sourceOf(actual),
		idealOutput,
	);
	expect(evaluation.source).toMatchObject({
		boundaryExact: true,
		kindExact: true,
		strictSurfaceExact: false,
		annotatedSurfaceExact: false,
		goldSurfaceAssertions: 2,
		matchedSurfaceAssertions: 1,
	});
	expect(evaluation.units).toMatchObject({
		groupingMatches: 2,
		routeMatches: 2,
		strictRecoveryMatches: 1,
		annotatedRecoveryMatches: 1,
	});
});

test("added authored recovery is an explicit strict mismatch when gold omits it", () => {
	const plain: SegmentInUnitsInput = {
		language: "de",
		segments: [{ kind: "ResolvableText", text: "z.B." }],
	};
	const expanded: SegmentInUnitsInput = {
		...plain,
		segments: [
			{
				...plain.segments[0],
				kind: "ResolvableText",
				text: "z.B.",
				surface: "zum Beispiel",
			},
		],
	};
	const evaluation = evaluateSource(plain, sourceOf(expanded));
	expect(evaluation).toMatchObject({
		boundaryExact: true,
		kindExact: true,
		strictSurfaceExact: false,
		annotatedSurfaceExact: true,
		goldSurfaceAssertions: 0,
	});
});

test("an explicit copy surface matches the same effective unannotated surface", () => {
	const explicit: SegmentInUnitsInput = {
		language: "de",
		segments: [{ kind: "ResolvableText", text: "geht", surface: "geht" }],
	};
	const plain: SegmentInUnitsInput = {
		language: "de",
		segments: [{ kind: "ResolvableText", text: "geht" }],
	};
	expect(evaluateSource(explicit, sourceOf(plain))).toMatchObject({
		strictSurfaceExact: true,
		annotatedSurfaceExact: true,
		goldSurfaceAssertions: 1,
		matchedSurfaceAssertions: 1,
	});
});

test("source uncertainty and route abstention remain visible without removing a unit", () => {
	const first = idealOutput.units[0];
	if (!first) throw Error("Missing first gold unit");
	const output: SegmentInUnitsOutput = {
		units: [first, { segments: [1, 3], route: "Unresolved" }],
	};
	const evaluation = evaluateSourceAndUnits(
		gold,
		idealOutput,
		sourceOf(gold, [1]),
		output,
		"Full",
	);
	expect(evaluation.source.unresolvedSegments).toBe(1);
	expect(evaluation.units).toMatchObject({
		gold: 2,
		groupingMatches: 2,
		routeMatches: 1,
		abstained: 1,
		unresolved: 1,
		wrongRoute: 0,
		fullPass: false,
	});
});

test("duplicate ownership and extra predictions fail a Full contract", () => {
	const output: SegmentInUnitsOutput = {
		units: [...idealOutput.units, { segments: [3], route }],
	};
	const evaluation = evaluateSourceAndUnits(
		gold,
		idealOutput,
		sourceOf(gold),
		output,
		"Full",
	);
	expect(evaluation.units).toMatchObject({
		groupingMatches: 2,
		extra: 1,
		contractPass: false,
		fullPass: false,
	});
	const partial = evaluateSourceAndUnits(
		gold,
		idealOutput,
		sourceOf(gold),
		output,
		"Partial",
	);
	expect(partial.units).toMatchObject({
		extra: 0,
		unmatched: 1,
		contractPass: false,
	});
});

test("empty units and invalid member indices fail the contract in Partial records too", () => {
	for (const segments of [[], [-1], [0.5], [99]]) {
		const output: SegmentInUnitsOutput = {
			units: [...idealOutput.units, { segments, route }],
		};
		expect(
			evaluateSourceAndUnits(gold, idealOutput, sourceOf(gold), output)
				.units.contractPass,
		).toBe(false);
	}
});

test("claimed metadata cannot hide lost or moved source characters", () => {
	const source = {
		...sourceOf(gold),
		spans: [{ start: 10, end: 11 }, ...sourceSpans(gold.segments).slice(1)],
	};
	expect(evaluateSource(gold, source).textPreserved).toBe(false);
});

test("a same-length source rewrite cannot count as exact member ownership", () => {
	const changed: SegmentInUnitsInput = {
		...gold,
		segments: gold.segments.map((segment) =>
			segment.text === "Wald" ? { ...segment, text: "Wild" } : segment,
		),
	};
	const evaluation = evaluateSourceAndUnits(
		gold,
		idealOutput,
		sourceOf(changed),
		idealOutput,
		"Full",
	);
	expect(evaluation.source.textPreserved).toBe(false);
	expect(evaluation.segmentMapping[3]).toBeNull();
	expect(evaluation.units).toMatchObject({
		groupingMatches: 1,
		routeMatches: 1,
		wrongSegments: 1,
		fullPass: false,
	});
});

test("forged offsets cannot give moved source words exact membership or route credit", () => {
	const expected: SegmentInUnitsInput = {
		language: "de",
		segments: [
			{ kind: "ResolvableText", text: "A" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "B" },
		],
	};
	const actual: SegmentInUnitsInput = {
		...expected,
		segments: [...expected.segments].reverse(),
	};
	const output: SegmentInUnitsOutput = {
		units: [
			{
				segments: [0],
				route: { language: "de", family: "Lexeme", kind: "NOUN" },
			},
			{
				segments: [2],
				route: { language: "de", family: "Lexeme", kind: "NOUN" },
			},
		],
	};
	const source: GermanSource = {
		input: actual,
		spans: [...sourceSpans(expected.segments)].reverse(),
		unresolved: [],
	};
	const score = evaluateSourceAndUnits(
		expected,
		output,
		source,
		output,
		"Full",
	);
	expect(score.segmentMapping).toEqual([null, 1, null]);
	expect(score.source.textPreserved).toBe(false);
	expect(score.units).toMatchObject({
		groupingMatches: 0,
		routeMatches: 0,
		unmappable: 2,
		fullPass: false,
	});
});
