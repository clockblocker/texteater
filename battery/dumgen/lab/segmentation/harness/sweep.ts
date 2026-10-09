/**
 * A floor sweep read against its baseline setting (#762): per policy of one
 * run, membership on the whole set with its paired delta, consistency, what
 * changed on the membership focus units, the guardrail, and the shape of
 * the misses, so a setting that recovers rejected units by over-merging
 * others shows it. The table is Markdown, for the lab ticket.
 */
import type { FocusSet } from "./corpus.js";
import { compareFocus, type UnitChange } from "./focus.js";
import { mcnemar, type PolicySummary } from "./metrics.js";
import {
	accuracyOf,
	membershipFlipsOf,
	type OutcomeRow,
	pairOutcomes,
} from "./outcomes.js";
import { formatP } from "./table.js";

export type SweepRow = {
	readonly policy: string;
	/** Membership summed over repetitions. */
	readonly membership: number;
	/** Gold units held by majority here and not in the baseline, and the reverse. */
	readonly gained: number;
	readonly lost: number;
	readonly p: number;
	readonly flips: number;
	readonly flipBase: number;
	readonly focus: UnitChange;
	/** Every unit outside the focus set: the rest of the focus cases and the other cases. */
	readonly guardrail: UnitChange;
	/** Unit-repetitions whose gold unit came back inside a bigger unit (merged) or across units (crossed). */
	readonly overMerged: number;
	/** Unit-repetitions whose gold unit came back split into smaller units. */
	readonly split: number;
	/** Returned units routed `Unresolved`, summed over repetitions. */
	readonly unrouted: number;
};

function sumChanges(a: UnitChange, b: UnitChange): UnitChange {
	const fixed = a.fixed + b.fixed;
	const broken = a.broken + b.broken;
	return {
		units: a.units + b.units,
		fixed,
		broken,
		stabilised: a.stabilised + b.stabilised,
		destabilised: a.destabilised + b.destabilised,
		p: mcnemar(fixed, broken),
	};
}

/** What a sweep reads of a policy's summary: its name and its WrongSegments by shape. */
type SweptSummary = {
	readonly policy: string;
	readonly tally: Pick<
		PolicySummary["tally"],
		"merged" | "crossed" | "split"
	>;
};

/** Every policy of `summaries` against `baseline`, from one run's outcome rows. */
export function sweepRows(args: {
	readonly rows: readonly OutcomeRow[];
	readonly summaries: readonly SweptSummary[];
	readonly baseline: string;
	readonly focus: FocusSet;
	/** Per policy, returned units routed `Unresolved`. */
	readonly unrouted: Readonly<Record<string, number>>;
}): SweepRow[] {
	const { rows, baseline, focus } = args;
	return args.summaries.map(({ policy, tally }): SweepRow => {
		const paired = pairOutcomes(
			{ rows, policy: baseline },
			{ rows, policy },
		);
		const { delta } = compareFocus(
			{ rows, policy: baseline },
			{ rows, policy },
			focus,
		);
		const { flips, base } = membershipFlipsOf(rows, policy);
		return {
			policy,
			membership: accuracyOf(rows, policy, "membership"),
			gained: paired.rightOnly.length,
			lost: paired.leftOnly.length,
			p: mcnemar(paired.rightOnly.length, paired.leftOnly.length),
			flips,
			flipBase: base,
			focus: delta.focus,
			guardrail: sumChanges(delta.guardrail, delta.otherCases),
			overMerged: tally.merged + tally.crossed,
			split: tally.split,
			unrouted: args.unrouted[policy] ?? 0,
		};
	});
}

/**
 * Whether a setting earns adoption by the #762 rule: it gains membership
 * on the whole set, net, without raising membership flips.
 */
export const adoptable = (row: SweepRow, baseline: SweepRow) =>
	row.gained > row.lost && row.flips <= baseline.flips;

const signed = (value: number) =>
	value > 0 ? `+${value}` : value < 0 ? `−${-value}` : "0";

export function sweepTable(
	rows: readonly SweepRow[],
	baselinePolicy: string,
): string {
	const baseline = rows.find((row) => row.policy === baselinePolicy);
	if (!baseline) throw Error(`The sweep has no ${baselinePolicy}`);
	const lines = [
		"| setting | mem% | Δ membership (+a −b, p) | flips | focus fixed | focus broken | focus stabilised | focus destabilised | guardrail fixed | guardrail broken | over-merged (Δ) | split (Δ) | unrouted | adopt |",
		`|${" --- |".repeat(14)}`,
	];
	for (const row of rows)
		lines.push(
			`| ${[
				row.policy === baselinePolicy
					? `\`${row.policy}\` (baseline)`
					: `\`${row.policy}\``,
				(100 * row.membership).toFixed(2),
				`+${row.gained} −${row.lost}, p ${formatP(row.p)}`,
				`${row.flips}/${row.flipBase}`,
				row.focus.fixed,
				row.focus.broken,
				row.focus.stabilised,
				row.focus.destabilised,
				row.guardrail.fixed,
				row.guardrail.broken,
				`${row.overMerged} (${signed(row.overMerged - baseline.overMerged)})`,
				`${row.split} (${signed(row.split - baseline.split)})`,
				row.unrouted,
				row.policy === baselinePolicy
					? "–"
					: adoptable(row, baseline)
						? "yes"
						: "no",
			].join(" | ")} |`,
		);
	return `${lines.join("\n")}\n`;
}
