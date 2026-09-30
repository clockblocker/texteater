/**
 * A run's per-unit outcomes: one row per (case, gold unit) with its verdict
 * in every repetition under every policy. They are small enough to commit
 * (`outcomes.jsonl.gz`), so paired comparisons and noise floors work
 * without the gitignored raw runs.
 */
import { gunzipSync, gzipSync } from "node:zlib";
import type { Unit } from "../../evaluation/spec-corpus/segment-in-units.js";
import { keyOf } from "../de/routes.js";
import type { LabCase } from "./corpus.js";
import { bucketOf, mcnemar, policiesOf, scoreCase } from "./metrics.js";
import type { LabRun } from "./run.js";

/**
 * One letter per repetition: Match, wrong Segments, wrong Route, missing
 * (X), sTub, or E when the repetition failed.
 */
export type VerdictLetter = "M" | "S" | "R" | "X" | "T" | "E";

const letters = {
	Match: "M",
	WrongSegments: "S",
	WrongRoute: "R",
	Missing: "X",
	Stub: "T",
} as const satisfies Record<string, VerdictLetter>;

export type PolicyOutcome = {
	/** One `VerdictLetter` per repetition. */
	readonly v: string;
	/** Per repetition, the route returned for a WrongRoute unit, else null; absent when no repetition was WrongRoute. */
	readonly r?: readonly (string | null)[];
};

export type OutcomeRow = {
	readonly case: string;
	/** The gold unit's index in the case's ideal output. */
	readonly unit: number;
	readonly bucket: string;
	readonly gold: string;
	readonly text: string;
	/** Unresolved and Foreign gold units, which the evaluator does not score. */
	readonly stub: boolean;
	readonly policies: Readonly<Record<string, PolicyOutcome>>;
};

const isStub = (unit: Unit) =>
	unit.route === "Unresolved" || unit.route.family === "Foreign";

/** Scores every repetition of every policy per gold unit. */
export function outcomesOf(
	run: LabRun,
	cases: ReadonlyMap<string, LabCase>,
): OutcomeRow[] {
	const policies = policiesOf(run);
	const rows: OutcomeRow[] = [];
	for (const caseRun of run.cases) {
		const labCase = cases.get(caseRun.id);
		if (!labCase) continue;
		const byPolicy = policies.map((policy) => ({
			policy,
			checks: caseRun.repetitions.map(
				(repetition) =>
					scoreCase(labCase, repetition, policy).evaluation?.units,
			),
		}));
		labCase.idealOutput.units.forEach((unit, index) => {
			const outcomes: Record<string, PolicyOutcome> = {};
			for (const { policy, checks } of byPolicy) {
				const units = checks.map((entry) => entry?.[index]);
				const verdicts = units.map((check, repetition) =>
					checks[repetition] === undefined
						? "E"
						: check
							? letters[check.verdict]
							: "X",
				);
				const routes = units.map((check) => {
					const returned = check?.returned[0];
					return check?.verdict === "WrongRoute" && returned
						? keyOf(returned.route)
						: null;
				});
				outcomes[policy] = {
					v: verdicts.join(""),
					...(routes.some((route) => route !== null)
						? { r: routes }
						: {}),
				};
			}
			rows.push({
				case: caseRun.id,
				unit: index,
				bucket: bucketOf(labCase, unit),
				gold: keyOf(unit.route),
				text: unit.segments
					.map((segment) => labCase.input.segments[segment]?.text)
					.join(" "),
				stub: isStub(unit),
				policies: outcomes,
			});
		});
	}
	return rows;
}

export function encodeOutcomes(rows: readonly OutcomeRow[]): Uint8Array {
	return gzipSync(rows.map((row) => `${JSON.stringify(row)}\n`).join(""));
}

export function decodeOutcomes(data: Uint8Array): OutcomeRow[] {
	return gunzipSync(data)
		.toString("utf8")
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as OutcomeRow);
}

/** The policies the rows carry, in first-seen order. */
export const outcomePolicies = (rows: readonly OutcomeRow[]) => [
	...new Set(rows.flatMap((row) => Object.keys(row.policies))),
];

/** Whether a unit matches in more than half of its repetitions. */
export function majorityMatch(outcome: PolicyOutcome | undefined): boolean {
	if (!outcome) return false;
	const matches = [...outcome.v].filter((letter) => letter === "M").length;
	return matches * 2 > outcome.v.length;
}

export type PairedUnit = {
	readonly id: string;
	readonly text: string;
	readonly bucket: string;
};

export type BucketTally = {
	units: number;
	left: number;
	right: number;
	leftOnly: number;
	rightOnly: number;
};

export type Paired = {
	readonly both: number;
	readonly neither: number;
	readonly leftOnly: readonly PairedUnit[];
	readonly rightOnly: readonly PairedUnit[];
	readonly buckets: Readonly<Record<string, BucketTally>>;
};

/**
 * Paired comparison per scored gold unit present on both sides: its
 * majority verdict over repetitions, for a McNemar read. `only` restricts
 * the cases.
 */
export function pairOutcomes(
	left: { readonly rows: readonly OutcomeRow[]; readonly policy: string },
	right: { readonly rows: readonly OutcomeRow[]; readonly policy: string },
	only?: ReadonlySet<string>,
): Paired {
	const keyOfRow = (row: OutcomeRow) => `${row.case}#${row.unit}`;
	const rights = new Map(right.rows.map((row) => [keyOfRow(row), row]));
	const leftOnly: PairedUnit[] = [];
	const rightOnly: PairedUnit[] = [];
	const buckets: Record<string, BucketTally> = {};
	let both = 0;
	let neither = 0;
	for (const row of left.rows) {
		if (row.stub || (only && !only.has(row.case))) continue;
		const other = rights.get(keyOfRow(row));
		if (!other) continue;
		const leftMatch = majorityMatch(row.policies[left.policy]);
		const rightMatch = majorityMatch(other.policies[right.policy]);
		const tally = buckets[row.bucket] ?? {
			units: 0,
			left: 0,
			right: 0,
			leftOnly: 0,
			rightOnly: 0,
		};
		buckets[row.bucket] = tally;
		tally.units++;
		if (leftMatch) tally.left++;
		if (rightMatch) tally.right++;
		const unit = {
			id: row.case,
			text: `${row.text} ${row.gold}`,
			bucket: row.bucket,
		};
		if (leftMatch && rightMatch) both++;
		else if (!leftMatch && !rightMatch) neither++;
		else if (leftMatch) {
			tally.leftOnly++;
			leftOnly.push(unit);
		} else {
			tally.rightOnly++;
			rightOnly.push(unit);
		}
	}
	return { both, neither, leftOnly, rightOnly, buckets };
}

/** The unit accuracy of one policy, summed over repetitions, as `summarizePolicy` counts it. */
export function unitAccuracyOf(
	rows: readonly OutcomeRow[],
	policy: string,
): number {
	let scored = 0;
	let match = 0;
	for (const row of rows) {
		if (row.stub) continue;
		for (const letter of row.policies[policy]?.v ?? "") {
			if (letter === "T") continue;
			scored++;
			if (letter === "M") match++;
		}
	}
	return scored === 0 ? Number.NaN : match / scored;
}

export const pairedP = (paired: Paired) =>
	mcnemar(paired.leftOnly.length, paired.rightOnly.length);
