/**
 * Scoring on the membership focus set (#755, #761): the dev gold units the
 * candidate reference got wrong by majority or that flipped between
 * repetitions. A fix there would drown in the ~1000 other units of the same
 * cases, so a run on the set the focus was taken from is read on the focus
 * units first, split by their #755 cause, with the units of records in
 * review (#739) apart. Every other unit the run scored is the guardrail: a
 * run that fixes focus units and breaks others shows it.
 *
 * Both functions read outcome rows only, so a raw run, stored outcomes
 * and a variant scored in memory (a floor sweep, #762) score alike. The
 * focus set is fixed: it is never re-derived from a later run.
 */

import { z } from "zod";
import { recordOf } from "../../records.js";
import { type Cause, causes } from "./attribution.js";
import type { FocusSet, FocusUnit } from "./corpus.js";
import { mcnemar } from "./metrics.js";
import {
	isHit,
	majorityHit,
	membershipFlipped,
	type OutcomeRow,
	type PolicyOutcome,
} from "./outcomes.js";

/** Where a focus unit is reported: under its #755 cause, or apart when its gold is disputed (#739). */
export type FocusGroup = Cause | "disputed gold";

export const focusGroups: readonly FocusGroup[] = [...causes, "disputed gold"];

export const focusGroupLabel = (group: FocusGroup) =>
	group === "disputed gold" ? "disputed gold (#739)" : group;

export function groupOf(unit: FocusUnit): FocusGroup {
	if (unit.disputedGold) return "disputed gold";
	const cause = causes.find((entry) => entry === unit.cause);
	if (!cause)
		throw Error(
			`Focus unit ${unit.caseId}#${unit.unit} has no #755 cause: ${unit.cause}`,
		);
	return cause;
}

/**
 * Where a scored unit falls: a focus unit, another unit of a focus case
 * (the guardrail), or a unit of a case outside the focus set, which a run
 * over all of dev also scores.
 */
type Scope = "focus" | "guardrail" | "otherCases";

/** Scored gold units of one scope, under one policy. */
export type UnitTally = {
	units: number;
	/** Their repetitions. */
	scored: number;
	/** Repetitions whose membership held. */
	membership: number;
	/** Repetitions whose membership held with a same or tolerated route (ADR 0008). */
	tolerant: number;
	/** Units whose membership held in most repetitions. */
	held: number;
	/** Units whose membership held in some repetitions and not others. */
	flips: number;
};

const emptyTally = (): UnitTally => ({
	units: 0,
	scored: 0,
	membership: 0,
	tolerant: 0,
	held: 0,
	flips: 0,
});

function count(tally: UnitTally, outcome: PolicyOutcome): void {
	tally.units++;
	for (const letter of outcome.v) {
		if (letter === "T") continue;
		tally.scored++;
		if (isHit(letter, "membership")) tally.membership++;
		if (isHit(letter, "tolerant")) tally.tolerant++;
	}
	if (majorityHit(outcome, "membership")) tally.held++;
	if (membershipFlipped(outcome)) tally.flips++;
}

/** Membership or the tolerant route over a tally's repetitions; NaN when it has none. */
export const rateOf = (tally: UnitTally, measure: "membership" | "tolerant") =>
	tally.scored === 0 ? Number.NaN : tally[measure] / tally.scored;

/** Two tallies as one: the guardrail and the other cases make a run's whole non-focus side. */
export const sumTallies = (a: UnitTally, b: UnitTally): UnitTally => ({
	units: a.units + b.units,
	scored: a.scored + b.scored,
	membership: a.membership + b.membership,
	tolerant: a.tolerant + b.tolerant,
	held: a.held + b.held,
	flips: a.flips + b.flips,
});

export type FocusScore = {
	/** The focus set's name. */
	readonly focusSet: string;
	readonly policy: string;
	readonly focus: UnitTally;
	/** The focus units by #755 cause, those in review (#739) apart. */
	readonly groups: Readonly<Record<FocusGroup, UnitTally>>;
	/** Every other unit of the focus cases. */
	readonly guardrail: UnitTally;
	/** Units of cases outside the focus set: none unless the run covers more of dev. */
	readonly otherCases: UnitTally;
};

type Placed = {
	readonly row: OutcomeRow;
	readonly outcome: PolicyOutcome;
	readonly scope: Scope;
	readonly group?: FocusGroup;
};

const unitKey = (caseId: string, unit: number) => `${caseId}#${unit}`;

/** The scored rows that carry `policy`, each placed in its scope and group. */
function place(
	rows: readonly OutcomeRow[],
	policy: string,
	focus: FocusSet,
	only: ReadonlySet<string> | undefined,
): Placed[] {
	const units = new Map(
		focus.units.map((unit) => [unitKey(unit.caseId, unit.unit), unit]),
	);
	const cases = new Set(focus.cases);
	return rows.flatMap((row): Placed[] => {
		const outcome = row.policies[policy];
		if (row.stub || !outcome || (only && !only.has(row.case))) return [];
		const unit = units.get(unitKey(row.case, row.unit));
		if (unit)
			return [{ row, outcome, scope: "focus", group: groupOf(unit) }];
		return [
			{
				row,
				outcome,
				scope: cases.has(row.case) ? "guardrail" : "otherCases",
			},
		];
	});
}

function tallyOf(placed: readonly Placed[], policy: string, focus: FocusSet) {
	const groups = recordOf(focusGroups, () => emptyTally());
	const scopes: Record<Scope, UnitTally> = {
		focus: emptyTally(),
		guardrail: emptyTally(),
		otherCases: emptyTally(),
	};
	for (const { outcome, scope, group } of placed) {
		count(scopes[scope], outcome);
		if (group) count(groups[group], outcome);
	}
	return {
		focusSet: focus.name,
		policy,
		focus: scopes.focus,
		groups,
		guardrail: scopes.guardrail,
		otherCases: scopes.otherCases,
	};
}

/**
 * One policy of one run read on the focus units, by cause, and on the
 * guardrail. `only` restricts the cases, as `--subset` does.
 */
export function scoreFocus(
	rows: readonly OutcomeRow[],
	policy: string,
	focus: FocusSet,
	only?: ReadonlySet<string>,
): FocusScore {
	return tallyOf(place(rows, policy, focus, only), policy, focus);
}

/** What happened to one unit's membership from left to right. */
export type Change = "fixed" | "broken" | "stabilised" | "destabilised";

/** The paired changes of one scope or group. */
export type UnitChange = {
	/** Units scored on both sides. */
	readonly units: number;
	/** Wrong by majority on the left, held by majority on the right. */
	readonly fixed: number;
	/** Held by majority on the left, wrong by majority on the right. */
	readonly broken: number;
	/** Flipping between repetitions on the left, not on the right. */
	readonly stabilised: number;
	/** Not flipping on the left, flipping on the right. */
	readonly destabilised: number;
	/** Exact McNemar p of fixed against broken. */
	readonly p: number;
};

/** The changes a comparison records in the ledger. */
export type FocusDelta = {
	readonly focus: UnitChange;
	readonly groups: Readonly<Record<FocusGroup, UnitChange>>;
	readonly guardrail: UnitChange;
	readonly otherCases: UnitChange;
};

const unitChangeSchema = z.object({
	units: z.number(),
	fixed: z.number(),
	broken: z.number(),
	stabilised: z.number(),
	destabilised: z.number(),
	p: z.number(),
}) satisfies z.ZodType<UnitChange>;

/** A focus delta as a ledger compare line keeps it. */
export const focusDeltaSchema = z.object({
	focus: unitChangeSchema,
	groups: z.record(z.enum(focusGroups), unitChangeSchema),
	guardrail: unitChangeSchema,
	otherCases: unitChangeSchema,
}) satisfies z.ZodType<FocusDelta>;

type ChangedUnit = {
	readonly case: string;
	readonly unit: number;
	readonly text: string;
	readonly gold: string;
	readonly bucket: string;
	readonly scope: Scope;
	readonly group?: FocusGroup;
	readonly changes: readonly Change[];
};

export type FocusComparison = {
	/** Each side scored on the units both sides score. */
	readonly left: FocusScore;
	readonly right: FocusScore;
	readonly delta: FocusDelta;
	/** Every unit with a change, in row order. */
	readonly changed: readonly ChangedUnit[];
};

const changesOf = (left: PolicyOutcome, right: PolicyOutcome): Change[] => {
	const changes: Change[] = [];
	const leftHeld = majorityHit(left, "membership");
	const rightHeld = majorityHit(right, "membership");
	if (!leftHeld && rightHeld) changes.push("fixed");
	if (leftHeld && !rightHeld) changes.push("broken");
	const leftFlips = membershipFlipped(left);
	const rightFlips = membershipFlipped(right);
	if (leftFlips && !rightFlips) changes.push("stabilised");
	if (!leftFlips && rightFlips) changes.push("destabilised");
	return changes;
};

/**
 * Per unit scored on both sides, under each side's policy: fixed, broken,
 * stabilised and destabilised, on the focus units, by cause, and on the
 * guardrail. Units are paired by case and gold unit index, so both sides
 * must come from the set the focus was taken from.
 */
export function compareFocus(
	left: { readonly rows: readonly OutcomeRow[]; readonly policy: string },
	right: { readonly rows: readonly OutcomeRow[]; readonly policy: string },
	focus: FocusSet,
	only?: ReadonlySet<string>,
): FocusComparison {
	const rights = new Map(
		place(right.rows, right.policy, focus, only).map((entry) => [
			unitKey(entry.row.case, entry.row.unit),
			entry,
		]),
	);
	const pairs = place(left.rows, left.policy, focus, only).flatMap(
		(entry) => {
			const other = rights.get(unitKey(entry.row.case, entry.row.unit));
			return other ? [{ left: entry, right: other }] : [];
		},
	);
	const counts = new Map<string, Record<Change | "units", number>>();
	const bump = (key: string, changes: readonly Change[]) => {
		const entry = counts.get(key) ?? {
			units: 0,
			fixed: 0,
			broken: 0,
			stabilised: 0,
			destabilised: 0,
		};
		counts.set(key, entry);
		entry.units++;
		for (const change of changes) entry[change]++;
	};
	const changed: ChangedUnit[] = [];
	for (const pair of pairs) {
		const { row, scope, group } = pair.left;
		const changes = changesOf(pair.left.outcome, pair.right.outcome);
		bump(scope, changes);
		if (group) bump(group, changes);
		if (changes.length > 0)
			changed.push({
				case: row.case,
				unit: row.unit,
				text: row.text,
				gold: row.gold,
				bucket: row.bucket,
				scope,
				...(group ? { group } : {}),
				changes,
			});
	}
	const changeOf = (key: string): UnitChange => {
		const entry = counts.get(key);
		if (!entry)
			return {
				units: 0,
				fixed: 0,
				broken: 0,
				stabilised: 0,
				destabilised: 0,
				p: 1,
			};
		return { ...entry, p: mcnemar(entry.fixed, entry.broken) };
	};
	return {
		left: tallyOf(
			pairs.map((pair) => pair.left),
			left.policy,
			focus,
		),
		right: tallyOf(
			pairs.map((pair) => pair.right),
			right.policy,
			focus,
		),
		delta: {
			focus: changeOf("focus"),
			groups: recordOf(focusGroups, changeOf),
			guardrail: changeOf("guardrail"),
			otherCases: changeOf("otherCases"),
		},
		changed,
	};
}
