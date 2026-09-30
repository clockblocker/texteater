import { describe, expect, test } from "bun:test";
import { goldOf } from "../../src/evaluation/spec-corpus/gold.js";
import { projectCorpus } from "../../src/evaluation/spec-corpus/projection.js";
import {
	type SegmentInUnitsOutput,
	segmentInUnits,
	type Unit,
} from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { evaluateSegmentInUnits } from "../../src/evaluation/spec-corpus/segment-in-units-evaluation.js";
import {
	tolerableRoute,
	toleratedKindPairs,
	toleratedPairOf,
} from "../../src/evaluation/spec-corpus/segment-in-units-route-tolerance.js";
import { emptySidecar, segmentsOf, specRecord } from "./fixtures.js";

// "Nora hat bereits gegessen." → Nora 0, hat 2, bereits 4, gegessen 6, "." 7
const partial = specRecord({
	id: "de/nora-hat-bereits-gegessen",
	sentence: "Nora hat bereits gegessen.",
	targets: [[[2, 6], "Lexeme", "VERB"]],
});
// "Er sagt qzxv blorp." → Er 0, sagt 2, qzxv 4, blorp 6
const full = specRecord({
	id: "de/er-sagt-qzxv-blorp",
	sentence: "Er sagt qzxv blorp.",
	targets: [
		[[0], "Lexeme", "PRON"],
		[[2], "Lexeme", "VERB"],
	],
	noTarget: [4, 6],
	coverage: "Full",
});
const foreign = specRecord({
	id: "de/das-ist-cool",
	sentence: "Das ist cool.",
	targets: [[[4], "Foreign", "Foreign"]],
});

const projected = projectCorpus(
	segmentInUnits,
	goldOf({ records: [partial, full, foreign], sidecar: emptySidecar }),
);
const evaluate = evaluateSegmentInUnits(projected.facts);
function score(id: string, units: Unit[]) {
	const golden = projected.corpus.cases[id];
	if (!golden) throw Error(`No case ${id}`);
	return evaluate({
		caseId: id,
		input: golden.input,
		idealOutput: golden.idealOutput,
		output: { units } satisfies SegmentInUnitsOutput,
	});
}
const route = (kind: string, family = "Lexeme") => ({
	language: "de",
	family,
	kind,
});

describe("segment.inUnits on a Partial record", () => {
	test("passes when the unit covering the target matches its Segments and route", () => {
		const result = score(partial.id, [
			{ segments: [0], route: route("PROPN") },
			{ segments: [2, 3, 6], route: route("VERB") },
			{ segments: [4], route: "Unresolved" },
		]);
		expect(result).toMatchObject({
			contractPass: true,
			membership: 1,
			tolerantMatched: 1,
			matched: 1,
			scored: 1,
			stubbed: 0,
		});
		expect(result.sentence).toBeUndefined();
	});

	test("fails a split, a false merge and a missing unit, and names the target", () => {
		const verdicts = [
			[
				{ segments: [2], route: route("AUX") },
				{ segments: [6], route: route("VERB") },
			],
			[{ segments: [2, 4, 6], route: route("VERB") }],
			[{ segments: [0], route: route("PROPN") }],
		].map((units) => {
			const result = score(partial.id, units);
			expect(result).toMatchObject({
				contractPass: false,
				membership: 0,
				matched: 0,
			});
			expect(result.units[0]?.source).toEqual({ target: 0 });
			expect(result.units[0]?.text).toBe("hat gegessen");
			return result.units[0]?.verdict;
		});
		expect(verdicts).toEqual(["WrongSegments", "WrongSegments", "Missing"]);
	});

	test("passes a wrong route on membership, which ADR 0008 puts first, and counts it against the route", () => {
		const result = score(partial.id, [
			{ segments: [2, 6], route: route("VERB", "Locution") },
		]);
		expect(result).toMatchObject({
			contractPass: true,
			membership: 1,
			tolerantMatched: 0,
			matched: 0,
		});
		expect(result.units[0]).toMatchObject({
			verdict: "WrongRoute",
			tolerated: false,
		});
	});

	test("does not score foreign material yet, so a record of it alone is Unscored", () => {
		const result = score(foreign.id, [
			{ segments: [4], route: "Unresolved" },
		]);
		expect(result.contractPass).toBeUndefined();
		expect(result.units[0]?.verdict).toBe("Stub");
		expect(result.stubbed).toBe(1);
	});
});

describe("segment.inUnits on a Full record", () => {
	const targets: Unit[] = [
		{ segments: [0], route: route("PRON") },
		{ segments: [2], route: route("VERB") },
	];

	test("passes when the whole Sentence matches, with No Target entries as stubs", () => {
		const result = score(full.id, [
			...targets,
			{ segments: [4], route: "Unresolved" },
			{ segments: [6], route: route("NOUN") },
		]);
		expect(result.contractPass).toBe(true);
		expect(result.stubbed).toBe(2);
		expect(result.sentence).toEqual({
			pass: true,
			falseUnits: [],
			uncovered: [],
			repeated: [],
		});
	});

	test("fails a false merge the targets alone do not see", () => {
		const merged: Unit = { segments: [4, 6], route: "Unresolved" };
		const result = score(full.id, [...targets, merged]);
		expect(result.units.map(({ verdict }) => verdict)).toEqual([
			"Match",
			"Match",
			"Stub",
			"Stub",
		]);
		expect(result.contractPass).toBe(false);
		expect(result.sentence?.falseUnits).toEqual([merged]);
	});

	test("fails a Sentence that leaves a Segment out or repeats one", () => {
		const result = score(full.id, [
			...targets,
			{ segments: [4], route: "Unresolved" },
			{ segments: [4, 5], route: "Unresolved" },
		]);
		expect(result.contractPass).toBe(false);
		expect(result.sentence).toMatchObject({
			uncovered: [6],
			repeated: [4],
		});
	});
});

describe("segment.inUnits route tolerance (ADR 0008)", () => {
	// "So ist es." with one gold unit on "So", routed as each case asks.
	const input = {
		language: "de" as const,
		segments: segmentsOf("So ist es."),
	};
	const evaluateOne = evaluateSegmentInUnits({
		"de/so": { coverage: "Partial", sources: [{ target: 0 }] },
	});
	function judge(expected: Unit["route"], returned: Unit["route"]) {
		const result = evaluateOne({
			caseId: "de/so",
			input,
			idealOutput: { units: [{ segments: [0], route: expected }] },
			output: { units: [{ segments: [0], route: returned }] },
		});
		const [check] = result.units;
		return {
			verdict: check?.verdict,
			tolerated: check?.verdict === "WrongRoute" && check.tolerated,
			contractPass: result.contractPass,
			membership: result.membership,
			tolerantMatched: result.tolerantMatched,
			matched: result.matched,
		};
	}

	const pairs = toleratedKindPairs.flatMap(([left, right]) => [
		[left, right],
		[right, left],
	]);
	test.each(pairs)("tolerates gold %s returned as %s", (gold, returned) => {
		expect(judge(route(gold), route(returned))).toEqual({
			verdict: "WrongRoute",
			tolerated: true,
			contractPass: true,
			membership: 1,
			tolerantMatched: 1,
			matched: 0,
		});
		expect(toleratedPairOf(route(gold), route(returned))).toBeDefined();
	});

	test("keeps any other Kind pair an error", () => {
		expect(judge(route("ADJ"), route("NOUN"))).toMatchObject({
			verdict: "WrongRoute",
			tolerated: false,
			membership: 1,
			tolerantMatched: 0,
		});
		expect(tolerableRoute(route("VERB"), route("AUX"))).toBe(false);
	});

	test("keeps a Family difference an error, even between tolerated Kinds", () => {
		expect(judge(route("ADV", "Locution"), route("ADV"))).toMatchObject({
			verdict: "WrongRoute",
			tolerated: false,
			tolerantMatched: 0,
		});
		expect(tolerableRoute(route("PART", "Locution"), route("ADV"))).toBe(
			false,
		);
		expect(tolerableRoute(route("NOUN"), "Unresolved")).toBe(false);
	});

	test("keeps a wrong language an error", () => {
		expect(
			tolerableRoute(route("PART"), {
				language: "en",
				family: "Lexeme",
				kind: "ADV",
			}),
		).toBe(false);
	});

	test("counts an equal route as tolerable and a strict match", () => {
		expect(judge(route("ADV"), route("ADV"))).toMatchObject({
			verdict: "Match",
			membership: 1,
			tolerantMatched: 1,
			matched: 1,
		});
		expect(tolerableRoute(route("ADV"), route("ADV"))).toBe(true);
		expect(toleratedPairOf(route("ADV"), route("ADV"))).toBeUndefined();
	});
});
