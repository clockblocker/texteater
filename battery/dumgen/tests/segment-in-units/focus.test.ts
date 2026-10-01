import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
	type FocusSet,
	type FocusUnit,
	focusOf,
	focusPath,
	type LabSet,
	loadFocus,
} from "../../src/segment-in-units/lab/corpus.js";
import {
	compareFocus,
	focusGroups,
	groupOf,
	rateOf,
	scoreFocus,
} from "../../src/segment-in-units/lab/focus.js";
import type { OutcomeRow } from "../../src/segment-in-units/lab/outcomes.js";
import { focusIterationTable } from "../../src/segment-in-units/lab/table.js";

const focus = JSON.parse(readFileSync(focusPath, "utf8")) as FocusSet;

test("the membership focus set lists each case its units name, once", () => {
	const cases = new Set(focus.units.map((unit) => unit.caseId));
	expect([...cases].sort()).toEqual([...focus.cases]);
	const keys = focus.units.map((unit) => `${unit.caseId}#${unit.unit}`);
	expect(new Set(keys).size).toBe(keys.length);
	expect(
		focus.units.every((unit) => unit.wrongByMajority || unit.flips),
	).toBe(true);
});

test("the focus set refuses a set it was not taken from", () => {
	const set = (hash: string): LabSet =>
		({
			name: focus.set.name,
			hash,
			cases: [],
		}) as unknown as LabSet;
	expect(loadFocus(set(focus.set.hash)).units.length).toBe(
		focus.units.length,
	);
	expect(() => loadFocus(set("0000000000000000"))).toThrow(
		"The membership focus set was taken from",
	);
});

test("the focus set reads only on the set it was taken from", () => {
	expect(focusOf(focus.set)?.units.length).toBe(focus.units.length);
	expect(focusOf({ ...focus.set, hash: "0000000000000000" })).toBeUndefined();
	expect(focusOf({ name: "heldout", hash: focus.set.hash })).toBeUndefined();
});

test("the focus groups are the #755 causes, with disputed gold apart", () => {
	const counts = Object.fromEntries(
		focusGroups.map((group) => [
			group,
			focus.units.filter((unit) => groupOf(unit) === group).length,
		]),
	);
	expect(counts).toEqual({
		"not nominated": 1,
		rejected: 55,
		accepted: 57,
		assembly: 5,
		ambiguous: 12,
		"disputed gold": 55,
	});
	expect(() =>
		groupOf({ ...unitOf("x", 0, "rejected"), cause: "guessed" }),
	).toThrow("no #755 cause");
});

function unitOf(
	caseId: string,
	unit: number,
	cause: string,
	disputedGold = false,
): FocusUnit {
	return {
		caseId,
		unit,
		text: `${caseId} ${unit}`,
		bucket: "contiguous Locution",
		wrongByMajority: true,
		flips: false,
		disputedGold,
		cause,
	};
}

// Focus units a#0 (rejected), a#1 (accepted), b#0 (disputed) and b#2
// (ambiguous); a#2 and b#1 are the guardrail; case c lies outside the set.
const fixture: FocusSet = {
	name: "fixture-focus",
	set: { name: "dev", hash: "fixture" },
	sourceRun: "fixture",
	policy: "p",
	cases: ["a", "b"],
	units: [
		unitOf("a", 0, "rejected"),
		unitOf("a", 1, "accepted"),
		unitOf("b", 0, "rejected", true),
		unitOf("b", 2, "ambiguous"),
	],
};

const rowOf = (
	caseId: string,
	unit: number,
	verdicts: string,
	stub = false,
): OutcomeRow => ({
	case: caseId,
	unit,
	bucket: "one piece",
	gold: "Lexeme/NOUN",
	text: `${caseId} ${unit}`,
	stub,
	policies: { p: { v: verdicts } },
});

const left = [
	rowOf("a", 0, "SSS"), // wrong → held: fixed
	rowOf("a", 1, "MMS"), // held, flipping → steady: stabilised
	rowOf("a", 2, "MMM"), // guardrail, held → wrong: broken
	rowOf("a", 3, "TTT", true), // a Stub: never scored
	rowOf("b", 0, "SSM"), // disputed, wrong and flipping → held: fixed and stabilised
	rowOf("b", 1, "RRR"), // guardrail, membership held either side
	rowOf("b", 2, "MMM"), // held → wrong and flipping: broken and destabilised
	rowOf("c", 0, "MMM"), // another case: destabilised
];
const right = [
	rowOf("a", 0, "MMM"),
	rowOf("a", 1, "MMM"),
	rowOf("a", 2, "SSS"),
	rowOf("a", 3, "TTT", true),
	rowOf("b", 0, "MMM"),
	rowOf("b", 1, "RAM"),
	rowOf("b", 2, "MSS"),
	rowOf("c", 0, "MMX"),
];

test("a focus score splits held, wrong and flipping units by cause and keeps the guardrail apart", () => {
	const score = scoreFocus(left, "p", fixture);
	expect(score.focus).toEqual({
		units: 4,
		scored: 12,
		membership: 6,
		tolerant: 6,
		held: 2,
		flips: 2,
	});
	expect(score.groups.rejected).toMatchObject({ units: 1, held: 0 });
	expect(score.groups["disputed gold"]).toMatchObject({
		units: 1,
		held: 0,
		flips: 1,
	});
	expect(score.groups["not nominated"].units).toBe(0);
	expect(score.guardrail).toEqual({
		units: 2,
		scored: 6,
		membership: 6,
		tolerant: 3,
		held: 2,
		flips: 0,
	});
	expect(score.otherCases.units).toBe(1);
	expect(rateOf(score.focus, "membership")).toBe(0.5);
	expect(scoreFocus(left, "p", fixture, new Set(["a"])).focus.units).toBe(2);
});

test("compareFocus counts fixed, broken, stabilised and destabilised units", () => {
	const {
		delta,
		changed,
		left: before,
		right: after,
	} = compareFocus(
		{ rows: left, policy: "p" },
		{ rows: right, policy: "p" },
		fixture,
	);
	expect(delta.focus).toMatchObject({
		units: 4,
		fixed: 2,
		broken: 1,
		stabilised: 2,
		destabilised: 1,
	});
	expect(delta.groups.rejected).toMatchObject({ units: 1, fixed: 1 });
	expect(delta.groups.accepted).toMatchObject({
		units: 1,
		fixed: 0,
		stabilised: 1,
	});
	expect(delta.groups["disputed gold"]).toMatchObject({
		fixed: 1,
		stabilised: 1,
	});
	expect(delta.groups.ambiguous).toMatchObject({
		broken: 1,
		destabilised: 1,
	});
	expect(delta.guardrail).toMatchObject({
		units: 2,
		fixed: 0,
		broken: 1,
		stabilised: 0,
		destabilised: 0,
	});
	expect(delta.otherCases).toMatchObject({ units: 1, destabilised: 1 });
	expect(
		changed.map((unit) => `${unit.case}#${unit.unit} ${unit.changes}`),
	).toEqual([
		"a#0 fixed",
		"a#1 stabilised",
		"a#2 broken",
		"b#0 fixed,stabilised",
		"b#2 broken,destabilised",
		"c#0 destabilised",
	]);
	expect([before.focus.held, after.focus.held]).toEqual([2, 3]);
	expect([before.focus.flips, after.focus.flips]).toEqual([2, 1]);
});

test("a run compared with itself changes nothing", () => {
	const { delta, changed } = compareFocus(
		{ rows: left, policy: "p" },
		{ rows: left, policy: "p" },
		fixture,
	);
	for (const change of [
		delta.focus,
		delta.guardrail,
		delta.otherCases,
		...Object.values(delta.groups),
	])
		expect(change).toMatchObject({
			fixed: 0,
			broken: 0,
			stabilised: 0,
			destabilised: 0,
			p: 1,
		});
	expect(changed).toEqual([]);
});

test("the focus table shows each run's focus units, causes and guardrail against its parent", () => {
	const score = scoreFocus(right, "p", fixture);
	const { delta } = compareFocus(
		{ rows: left, policy: "p" },
		{ rows: right, policy: "p" },
		fixture,
	);
	const lines = focusIterationTable([
		{ runId: "r2", parent: "r1", score, delta },
		{ runId: "r3", parent: null, score, delta: null },
	])
		.trimEnd()
		.split("\n");
	expect(lines[0]).toBe(
		"| runId | focus held | focus mem% | focus flips | focus tol% | not nominated | rejected | accepted | assembly | ambiguous | disputed gold (#739) | Δ focus vs parent | guardrail held | guardrail mem% | guardrail flips | Δ guardrail vs parent |",
	);
	expect(lines[2]).toBe(
		"| `r2` | 3/4 | 83.3 | 1 | 83.3 | 0/0 | 1/1 | 1/1 | 0/0 | 0/1 | 1/1 | fixed 2, broken 1, stabilised 2, destabilised 1 | 2/3 | 55.6 | 1 | fixed 0, broken 1, stabilised 0, destabilised 1 |",
	);
	expect(lines[3]?.endsWith("| – | 2/3 | 55.6 | 1 | – |")).toBe(true);
});
