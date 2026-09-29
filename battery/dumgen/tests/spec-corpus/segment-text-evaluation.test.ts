import { describe, expect, test } from "bun:test";
import { goldOf } from "../../src/evaluation/spec-corpus/gold.js";
import { projectCorpus } from "../../src/evaluation/spec-corpus/projection.js";
import {
	type SegmentTextOutput,
	segmentText,
	type Unit,
} from "../../src/evaluation/spec-corpus/segment-text.js";
import { evaluateSegmentText } from "../../src/evaluation/spec-corpus/segment-text-evaluation.js";
import { emptySidecar, specRecord } from "./fixtures.js";

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
	segmentText,
	goldOf({ records: [partial, full, foreign], sidecar: emptySidecar }),
);
const evaluate = evaluateSegmentText(projected.facts);
function score(id: string, units: Unit[]) {
	const golden = projected.corpus.cases[id];
	if (!golden) throw Error(`No case ${id}`);
	return evaluate({
		caseId: id,
		input: golden.input,
		idealOutput: golden.idealOutput,
		output: { units } satisfies SegmentTextOutput,
	});
}
const route = (kind: string, family = "Lexeme") => ({
	language: "de",
	family,
	kind,
});

describe("Segment.Text on a Partial record", () => {
	test("passes when the unit covering the target matches its Segments and route", () => {
		const result = score(partial.id, [
			{ segments: [0], route: route("PROPN") },
			{ segments: [2, 3, 6], route: route("VERB") },
			{ segments: [4], route: "Unresolved" },
		]);
		expect(result).toMatchObject({
			contractPass: true,
			matched: 1,
			scored: 1,
			stubbed: 0,
		});
		expect(result.sentence).toBeUndefined();
	});

	test("fails a split, a false merge, a wrong route and a missing unit, and names the target", () => {
		const verdicts = [
			[
				{ segments: [2], route: route("AUX") },
				{ segments: [6], route: route("VERB") },
			],
			[{ segments: [2, 4, 6], route: route("VERB") }],
			[{ segments: [2, 6], route: route("VERB", "Locution") }],
			[{ segments: [0], route: route("PROPN") }],
		].map((units) => {
			const result = score(partial.id, units);
			expect(result.contractPass).toBe(false);
			expect(result.units[0]?.source).toEqual({ target: 0 });
			expect(result.units[0]?.text).toBe("hat gegessen");
			return result.units[0]?.verdict;
		});
		expect(verdicts).toEqual([
			"WrongSegments",
			"WrongSegments",
			"WrongRoute",
			"Missing",
		]);
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

describe("Segment.Text on a Full record", () => {
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
