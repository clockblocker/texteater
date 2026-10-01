import { expect, test } from "bun:test";
import { slotLinks } from "../../src/segment-in-units/de/arms/candidates.js";
import {
	floorsKey,
	floorsOf,
	referenceFloors,
	referencePolicy,
	runFloors,
} from "../../src/segment-in-units/de/arms/reference.js";
import {
	combinedGrid,
	singleGrid,
} from "../../src/segment-in-units/de/arms/reference-floors.js";
import type { Slot } from "../../src/segment-in-units/de/candidates.js";
import type { Piece } from "../../src/segment-in-units/de/sentence.js";
import type { FocusSet } from "../../src/segment-in-units/lab/corpus.js";
import type { PolicySummary } from "../../src/segment-in-units/lab/metrics.js";
import type { OutcomeRow } from "../../src/segment-in-units/lab/outcomes.js";
import {
	adoptable,
	sweepRows,
	sweepTable,
} from "../../src/segment-in-units/lab/sweep.js";

test("the reference's floors are the run's with the floors #762 adopted", () => {
	expect(runFloors).toEqual({
		satellite: 0.5,
		margin: 0,
		idiom: 0.7,
		expression: 0.7,
		fixed: 0.5,
		saying: 0.5,
	});
	expect(referenceFloors).toEqual({
		...runFloors,
		idiom: 0.6,
		fixed: 0.3,
		saying: 0.4,
	});
	expect(floorsOf({})).toEqual(referenceFloors);
	expect(floorsOf({ floors: "run" })).toEqual(runFloors);
	expect(floorsOf({ expression: "0.6", grid: "single" })).toEqual({
		...referenceFloors,
		expression: 0.6,
	});
	expect(() => floorsOf({ idiom: "high" })).toThrow("is not a number");
	expect(() => floorsOf({ floors: "755" })).toThrow(
		"must be reference or run",
	);
});

test("a setting is named after the floors it moves from the run's", () => {
	expect(floorsKey(runFloors)).toBe(referencePolicy);
	expect(floorsKey(referenceFloors)).toBe("idiom=0.6,fixed=0.3,saying=0.4");
	expect(floorsKey({ ...runFloors, fixed: 0.4, expression: 0.6 })).toBe(
		"expression=0.6,fixed=0.4",
	);
	const keys = [...singleGrid, ...combinedGrid].map(floorsKey);
	expect(new Set(keys).size).toBe(keys.length);
	expect(keys).not.toContain(referencePolicy);
	expect(keys).toContain(floorsKey(referenceFloors));
});

const piece = (id: number, text: string): Piece => ({
	id,
	segment: 2 * (id - 1),
	text,
	surface: text,
	clause: 0,
});

test("a satellite host must beat none by the margin; an idiom host only beats none", () => {
	const hut = piece(1, "Hut");
	const auf = piece(2, "auf");
	const setzt = piece(3, "setzt");
	const slots: Slot[] = [
		{ kind: "particle", piece: auf, hosts: [setzt] },
		{ kind: "idiom", piece: hut, hosts: [setzt] },
	];
	const answers = {
		s_particle_2: {
			type: "choice",
			choice: "p3",
			confidence: 0.45,
			probabilities: { p3: 0.45, none: 0.4 },
		},
		s_idiom_1: {
			type: "choice",
			choice: "p3",
			confidence: 0.46,
			probabilities: { p3: 0.46, none: 0.44 },
		},
	} as const;
	const kinds = (margin?: number) =>
		slotLinks(slots, answers, margin).map((link) => link.kind);
	expect(kinds()).toEqual(["particle", "idiom"]);
	expect(kinds(0.1)).toEqual(["idiom"]);
	expect(kinds(-0.1)).toEqual(["particle", "idiom"]);
});

// Units a#0 (focus, rejected) and a#1, b#0 (guardrail) under a baseline
// `base` and two settings: `fix` recovers the focus unit, `merge` recovers
// it but breaks a guardrail unit and flips another.
const focus: FocusSet = {
	name: "fixture-focus",
	set: { name: "dev", hash: "fixture" },
	sourceRun: "fixture",
	policy: "base",
	cases: ["a"],
	units: [
		{
			caseId: "a",
			unit: 0,
			text: "a 0",
			bucket: "contiguous Locution",
			wrongByMajority: true,
			flips: false,
			disputedGold: false,
			cause: "rejected",
		},
	],
};

const row = (
	caseId: string,
	unit: number,
	verdicts: Record<string, string>,
): OutcomeRow => ({
	case: caseId,
	unit,
	bucket: "contiguous Locution",
	gold: "Locution/ADV",
	text: `${caseId} ${unit}`,
	stub: false,
	policies: Object.fromEntries(
		Object.entries(verdicts).map(([policy, v]) => [policy, { v }]),
	),
});

const rows = [
	row("a", 0, { base: "SSS", fix: "MMM", merge: "MMM" }),
	row("a", 1, { base: "MMM", fix: "MMM", merge: "SSS" }),
	row("b", 0, { base: "MMM", fix: "MMM", merge: "MSM" }),
];

const summary = (
	policy: string,
	merged: number,
	split: number,
): PolicySummary =>
	({
		policy,
		tally: { merged, crossed: 0, split },
	}) as unknown as PolicySummary;

test("a sweep reads each setting against its baseline", () => {
	const swept = sweepRows({
		rows,
		summaries: [
			summary("base", 0, 3),
			summary("fix", 0, 0),
			summary("merge", 4, 0),
		],
		baseline: "base",
		focus,
		unrouted: { merge: 2 },
	});
	const [base, fix, merge] = swept;
	if (!base || !fix || !merge) throw Error("missing rows");
	expect(fix).toMatchObject({ gained: 1, lost: 0, flips: 0, overMerged: 0 });
	expect(fix.focus.fixed).toBe(1);
	expect(merge).toMatchObject({ gained: 1, lost: 1, flips: 1, unrouted: 2 });
	expect(merge.guardrail).toMatchObject({ broken: 1, destabilised: 1 });
	expect(adoptable(fix, base)).toBe(true);
	expect(adoptable(merge, base)).toBe(false);
	const table = sweepTable(swept, "base");
	expect(table).toContain(
		"| `base` (baseline) | 66.67 | +0 −0, p 1.0 | 0/3 |",
	);
	expect(table).toContain(
		"| `merge` | 55.56 | +1 −1, p 1.0 | 1/3 | 1 | 0 | 0 | 0 | 0 | 1 | 4 (+4) | 0 (−3) | 2 | no |",
	);
	expect(table).toContain("| `fix` | 100.00 | +1 −0, p 1.0 | 0/3 | 1 |");
});
