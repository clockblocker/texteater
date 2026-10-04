/**
 * A run's per-unit outcomes: one row per (case, gold unit) with its verdict
 * in every repetition under every policy. They are much smaller than the
 * raw run (`<lab>/outcomes/<runId>.jsonl.gz`), so paired comparisons and
 * noise floors outlive it.
 */
import { gunzipSync, gzipSync } from "node:zlib";
import { keyOf } from "../../../src/segment/de/routes.js";
import {
	hasMembership,
	type UnitCheck,
} from "../../evaluation/spec-corpus/segment-in-units-evaluation.js";
import type { LabCase } from "./corpus.js";
import { bucketOf, isStub, mcnemar, policiesOf, scoreCase } from "./metrics.js";
import type { LabRun } from "./run.js";

/**
 * One letter per repetition: Match, a route ADR 0008 Accepts (a tolerated
 * WrongRoute), a wrong Route it does not, wrong Segments, missing (X),
 * sTub, or E when the repetition failed. Rows written before #757 read
 * every WrongRoute as R.
 */
export type VerdictLetter = "M" | "A" | "R" | "S" | "X" | "T" | "E";

function letterOf(check: UnitCheck): VerdictLetter {
	switch (check.verdict) {
		case "Match":
			return "M";
		case "WrongRoute":
			return check.tolerated ? "A" : "R";
		case "WrongSegments":
			return "S";
		case "Missing":
			return "X";
		case "Stub":
			return "T";
	}
}

/**
 * What a paired comparison counts as a hit, in the order ADR 0008 ranks
 * them: membership whatever the route, membership with a same or tolerated
 * route, or the strict match.
 */
export type Measure = "membership" | "tolerant" | "strict";

export const measures = [
	"membership",
	"tolerant",
	"strict",
] as const satisfies readonly Measure[];

const hitLetters: Readonly<Record<Measure, string>> = {
	membership: "MAR",
	tolerant: "MA",
	strict: "M",
};

/** Whether one repetition's verdict letter is a hit under `measure`. */
export const isHit = (letter: string, measure: Measure) =>
	hitLetters[measure].includes(letter);

export type PolicyOutcome = {
	/** One `VerdictLetter` per repetition. */
	readonly v: string;
	/** Per repetition, the route returned for a WrongRoute unit (A or R), else null; absent when no repetition was one. */
	readonly r?: readonly (string | null)[];
	/**
	 * Per repetition, how many route variants the returned unit carries when
	 * its membership holds, else 0; absent when no repetition carried any.
	 */
	readonly k?: readonly number[];
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
							? letterOf(check)
							: "X",
				);
				const routes = units.map((check) => {
					const returned = check?.returned[0];
					return check?.verdict === "WrongRoute" && returned
						? keyOf(returned.route)
						: null;
				});
				const variants = units.map((check) =>
					check && hasMembership(check)
						? (check.returned[0]?.variants?.length ?? 0)
						: 0,
				);
				outcomes[policy] = {
					v: verdicts.join(""),
					...(routes.some((route) => route !== null)
						? { r: routes }
						: {}),
					...(variants.some((count) => count > 0)
						? { k: variants }
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

/** Whether a unit is a hit under `measure` in more than half of its repetitions. */
export function majorityHit(
	outcome: PolicyOutcome | undefined,
	measure: Measure,
): boolean {
	if (!outcome) return false;
	const hits = [...outcome.v].filter((letter) =>
		isHit(letter, measure),
	).length;
	return hits * 2 > outcome.v.length;
}

/** Whether a unit's membership holds in some repetitions and not in others. */
export function membershipFlipped(outcome: PolicyOutcome | undefined): boolean {
	const held = [...(outcome?.v ?? "")].map((letter) =>
		isHit(letter, "membership"),
	);
	return held.some(Boolean) && held.some((entry) => !entry);
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
 * Paired comparison per scored gold unit present on both sides: whether
 * its majority over repetitions is a hit under `measure` (membership by
 * default, the ADR 0008 headline), for a McNemar read. `only` restricts
 * the cases.
 */
export function pairOutcomes(
	left: { readonly rows: readonly OutcomeRow[]; readonly policy: string },
	right: { readonly rows: readonly OutcomeRow[]; readonly policy: string },
	only?: ReadonlySet<string>,
	measure: Measure = "membership",
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
		const leftMatch = majorityHit(row.policies[left.policy], measure);
		const rightMatch = majorityHit(other.policies[right.policy], measure);
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

/**
 * One policy's rate under `measure`, summed over repetitions, as
 * `summarizePolicy` counts membership, tolerant and strict unit accuracy.
 */
export function accuracyOf(
	rows: readonly OutcomeRow[],
	policy: string,
	measure: Measure,
): number {
	let scored = 0;
	let hits = 0;
	for (const row of rows) {
		if (row.stub) continue;
		for (const letter of row.policies[policy]?.v ?? "") {
			if (letter === "T") continue;
			scored++;
			if (isHit(letter, measure)) hits++;
		}
	}
	return scored === 0 ? Number.NaN : hits / scored;
}

/**
 * Consistency, as `summarizePolicy` counts it: scored gold units whose
 * membership holds in some repetitions and not in others, of the units
 * with more than one repetition.
 */
export function membershipFlipsOf(
	rows: readonly OutcomeRow[],
	policy: string,
): { readonly flips: number; readonly base: number } {
	let flips = 0;
	let base = 0;
	for (const row of rows) {
		const outcome = row.policies[policy];
		if (row.stub || (outcome?.v.length ?? 0) < 2) continue;
		base++;
		if (membershipFlipped(outcome)) flips++;
	}
	return { flips, base };
}

export const pairedP = (paired: Paired) =>
	mcnemar(paired.leftOnly.length, paired.rightOnly.length);

/**
 * How often a policy's units carry route variants (ADR 0008), over the
 * unit-repetitions whose membership holds: the variant rate and the mean
 * variant count of those that carry them.
 */
export function variantsOf(
	rows: readonly OutcomeRow[],
	policy: string,
): {
	readonly units: number;
	readonly withVariants: number;
	readonly routes: number;
} {
	let units = 0;
	let withVariants = 0;
	let routes = 0;
	for (const row of rows) {
		const outcome = row.policies[policy];
		if (row.stub || !outcome) continue;
		[...outcome.v].forEach((letter, repetition) => {
			if (!isHit(letter, "membership")) return;
			units++;
			const count = outcome.k?.[repetition] ?? 0;
			if (count > 0) {
				withVariants++;
				routes += count;
			}
		});
	}
	return { units, withVariants, routes };
}

/**
 * The click-time pick on the units that carried variants (#760): over the
 * unit-repetitions whose membership held with variants under
 * `variantsPolicy`, how often the gold route was among the variants (the
 * pick's ceiling), and how often `pickPolicy` picked it exactly or an
 * acceptable route.
 */
export function pickScore(
	rows: readonly OutcomeRow[],
	variantsPolicy: string,
	pickPolicy: string,
): {
	readonly units: number;
	readonly among: number;
	readonly strict: number;
	readonly tolerant: number;
} {
	let units = 0;
	let among = 0;
	let strict = 0;
	let tolerant = 0;
	for (const row of rows) {
		const variants = row.policies[variantsPolicy];
		const picked = row.policies[pickPolicy];
		if (row.stub || !variants || !picked) continue;
		[...variants.v].forEach((letter, repetition) => {
			if ((variants.k?.[repetition] ?? 0) === 0) return;
			units++;
			if (isHit(letter, "tolerant")) among++;
			const pick = picked.v[repetition] ?? "";
			if (isHit(pick, "strict")) strict++;
			if (isHit(pick, "tolerant")) tolerant++;
		});
	}
	return { units, among, strict, tolerant };
}
