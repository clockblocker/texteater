/**
 * The iteration table `ledger --table` prints: one row per run with a
 * manifest, its parent and hypothesis, its headline numbers in the order
 * ADR 0008 ranks them (membership, its paired delta against the parent,
 * consistency, the tolerant route score, then the strict score) and its
 * cost. Runs on the membership focus set's source set get a second table
 * (#761): the focus units, by cause, and the guardrail. Both are Markdown,
 * for a comment on the active lab ticket.
 */
import {
	type FocusDelta,
	type FocusScore,
	focusGroupLabel,
	focusGroups,
	rateOf,
	sumTallies,
	type UnitChange,
	type UnitTally,
} from "./focus.js";
import type { BucketDelta } from "./ledger.js";
import { mcnemar } from "./metrics.js";

export type IterationRow = {
	readonly runId: string;
	readonly parent: string | null;
	readonly hypothesis: string | null;
	/** The primary policy's rates; null when the run's summary lacks them. */
	readonly membership: number | null;
	/** Gold units whose membership flips between repetitions, of `membershipFlipBase`. */
	readonly membershipFlips: number | null;
	readonly membershipFlipBase: number | null;
	readonly tolerantUnitAccuracy: number | null;
	/** The strict unit accuracy. */
	readonly unitAccuracy: number | null;
	readonly jevInputTokensPerSentence: number | null;
	/** The membership delta against the parent, from a recorded compare or the stored outcomes. */
	readonly delta: BucketDelta | null;
	/** A recorded compare's verdict, which wins over the derived one. */
	readonly verdict: string | null;
};

const cell = (text: string) =>
	text.replaceAll("|", "\\|").replace(/\s+/gu, " ");

const tokens = (value: number) =>
	value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);

/** A p-value in two significant digits, in exponent form below 0.001. */
export const formatP = (p: number) =>
	p < 0.001 ? p.toExponential(1) : p.toPrecision(2);

function deltaCell(delta: BucketDelta | null): string {
	if (!delta) return "–";
	return `+${delta.gained} −${delta.lost}, p ${formatP(delta.p)}`;
}

/** The verdict a delta earns when no compare recorded one. */
export function derivedVerdict(
	row: Pick<IterationRow, "parent" | "delta">,
): string {
	if (!row.parent) return "root";
	const { delta } = row;
	if (!delta) return "not compared";
	if (delta.beyondNoise === null)
		return delta.p < 0.05 ? "p < 0.05, no noise floor" : "no noise floor";
	if (!delta.beyondNoise) return "within noise";
	return delta.gained > delta.lost
		? "better beyond noise"
		: "worse beyond noise";
}

const percentCell = (value: number | null) =>
	value === null || Number.isNaN(value) ? "–" : (100 * value).toFixed(1);

export function iterationTable(rows: readonly IterationRow[]): string {
	const lines = [
		"| runId | parent | hypothesis | membership% | Δ membership vs parent (+a −b, p) | membership flips | tolerant% | strict% | jev input tokens/sentence | verdict |",
		"| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
	];
	for (const row of rows)
		lines.push(
			`| ${[
				`\`${row.runId}\``,
				row.parent ? `\`${row.parent}\`` : "–",
				cell(row.hypothesis ?? "–"),
				percentCell(row.membership),
				deltaCell(row.delta),
				row.membershipFlips === null
					? "–"
					: `${row.membershipFlips}/${row.membershipFlipBase ?? "?"}`,
				percentCell(row.tolerantUnitAccuracy),
				percentCell(row.unitAccuracy),
				row.jevInputTokensPerSentence === null
					? "–"
					: tokens(row.jevInputTokensPerSentence),
				cell(row.verdict ?? derivedVerdict(row)),
			].join(" | ")} |`,
		);
	return `${lines.join("\n")}\n`;
}

/** A run on the set the membership focus set was taken from (#761). */
export type FocusIterationRow = {
	readonly runId: string;
	readonly parent: string | null;
	readonly score: FocusScore;
	/** Against the parent, from a recorded compare or the stored outcomes; null when neither has it. */
	readonly delta: FocusDelta | null;
};

const heldCell = (tally: UnitTally) => `${tally.held}/${tally.units}`;

function changeCell(change: UnitChange | null): string {
	if (!change) return "–";
	return `fixed ${change.fixed}, broken ${change.broken}, stabilised ${change.stabilised}, destabilised ${change.destabilised}`;
}

/** The guardrail and the cases outside the focus set: every non-focus unit. */
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

/**
 * Per run: the focus units held by majority, their membership flips and
 * rates, the units held per #755 cause (those in review apart), and every
 * other unit as the guardrail, each against the parent.
 */
export function focusIterationTable(
	rows: readonly FocusIterationRow[],
): string {
	const lines = [
		`| runId | focus held | focus mem% | focus flips | focus tol% | ${focusGroups.map(focusGroupLabel).join(" | ")} | Δ focus vs parent | guardrail held | guardrail mem% | guardrail flips | Δ guardrail vs parent |`,
		`|${" --- |".repeat(10 + focusGroups.length)}`,
	];
	for (const { runId, score, delta } of rows) {
		const guardrail = sumTallies(score.guardrail, score.otherCases);
		lines.push(
			`| ${[
				`\`${runId}\``,
				heldCell(score.focus),
				percentCell(rateOf(score.focus, "membership")),
				String(score.focus.flips),
				percentCell(rateOf(score.focus, "tolerant")),
				...focusGroups.map((group) => heldCell(score.groups[group])),
				changeCell(delta?.focus ?? null),
				heldCell(guardrail),
				percentCell(rateOf(guardrail, "membership")),
				String(guardrail.flips),
				changeCell(
					delta
						? sumChanges(delta.guardrail, delta.otherCases)
						: null,
				),
			].join(" | ")} |`,
		);
	}
	return `${lines.join("\n")}\n`;
}
