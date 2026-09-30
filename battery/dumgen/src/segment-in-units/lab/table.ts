/**
 * The iteration table `ledger --table` prints: one row per run with a
 * manifest, its parent and hypothesis, its headline numbers in the order
 * ADR 0008 ranks them (membership, its paired delta against the parent,
 * consistency, the tolerant route score, then the strict score) and its
 * cost. It is Markdown, for a comment on the active lab ticket.
 */
import type { BucketDelta } from "./ledger.js";

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
	/** The membership delta against the parent, from a recorded compare or the committed outcomes. */
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
