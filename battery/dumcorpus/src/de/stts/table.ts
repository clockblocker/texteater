import type { SttsGap, SttsRow, SttsStatus } from "./types.js";

const cell = (text: string) =>
	text.replaceAll("|", "\\|").replaceAll("\n", " ");

function gapText(gap: SttsGap): string {
	const issue =
		gap.issue === undefined
			? "not filed"
			: `#${gap.issue}${gap.findings ? ` ${gap.findings.join(", ")}` : ""}`;
	return `${gap.gap} (${issue})`;
}

function statusText(status: SttsStatus): string {
	return status.status === "Yes"
		? "Yes"
		: `${status.status}: ${status.gaps.map(gapText).join("; ")}`;
}

/**
 * The crosswalk as the Markdown coverage table first posted on #679: one
 * line per tag with its Dumling representation, accepted loss, Rules and
 * ADRs, the three statuses, and the mappings no record shows. `gold`, when
 * given, is the status the records support; a row claiming less shows both.
 */
export function renderSttsTable(
	rows: readonly SttsRow[],
	gold?: (row: SttsRow) => SttsRow["gold"],
): string {
	const lines = [
		"| STTS | Dumling | Rests on | Model | Gold | Pipeline | Mappings without a record |",
		"|---|---|---|---|---|---|---|",
	];
	for (const row of rows) {
		const supported = gold?.(row);
		const goldText =
			supported && supported !== row.gold
				? `${row.gold} (records show ${supported})`
				: row.gold;
		const missing = row.mappings.flatMap((mapping) =>
			mapping.missing
				? [`${mapping.use}: ${gapText(mapping.missing)}`]
				: [],
		);
		lines.push(
			`| ${[
				`${row.tag} (${row.stts})`,
				`${row.dumling}${row.loss ? `. Accepted loss: ${row.loss}` : ""}`,
				[...row.rules, ...row.adrs].join(", ") || "none",
				statusText(row.model),
				goldText,
				statusText(row.pipeline),
				missing.join("; ") || "none",
			]
				.map(cell)
				.join(" | ")} |`,
		);
	}
	return lines.join("\n");
}
