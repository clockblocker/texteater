/**
 * How much of the gold one prompt's corpus covers, split into Reviewed and
 * Draft by the Annotation Layer the prompt outputs: its cases, the excluded
 * ones among them, the records it skips and why, and the records dumcorpus
 * leaves out. The skips and left-out records are the worklist that would
 * grow the corpus.
 */

import { isReviewed } from "dumcorpus";
import type * as Dumling from "dumling/types";
import type { z } from "zod";
import type { Gold } from "./gold.js";
import type { ProjectedCorpus, ReviewGroup } from "./projection.js";

type Listing = Readonly<Record<string, readonly string[]>>;

export type CoverageRow = {
	readonly cases: number;
	/** Cases from Full records, which the whole Sentence is scored on. */
	readonly fullCoverage: number;
	/** Excluded records, by the issue that tracks them. */
	readonly excluded: Listing;
	/** Skipped records, by reason. */
	readonly skipped: Listing;
	/** Records dumcorpus leaves out, by the checks they fail. */
	readonly unloaded: Listing;
};

export type Coverage = {
	readonly route: string;
	readonly language: Dumling.Language;
	readonly byStatus: Readonly<Record<ReviewGroup, CoverageRow>>;
};

const statuses = ["Reviewed", "Draft"] as const;

function listing(
	items: readonly { key: string; record: string }[],
): Record<string, string[]> {
	const grouped: Record<string, string[]> = {};
	for (const { key, record } of items) {
		grouped[key] ??= [];
		grouped[key].push(record);
	}
	return grouped;
}

export function coverageOf<
	InputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
	Facts,
>(
	projected: ProjectedCorpus<InputSchema, OutputSchema, Facts>,
	gold: Gold,
	language: Dumling.Language,
): Coverage {
	const origins = Object.entries(projected.origins);
	const full = new Set(
		gold.records
			.filter((record) => record.coverage === "Full")
			.map(({ id }) => id),
	);
	const excludedIds = new Set(projected.excluded.ids);
	const byStatus = Object.fromEntries(
		statuses.map((status): [ReviewGroup, CoverageRow] => {
			const cases = origins.filter(
				([, origin]) => origin.status === status,
			);
			return [
				status,
				{
					cases: cases.length,
					fullCoverage: cases.filter(([, origin]) =>
						full.has(origin.record),
					).length,
					excluded: listing(
						[
							...new Set(
								cases
									.filter(([id]) => excludedIds.has(id))
									.map(([, origin]) => origin.record),
							),
						].map((record) => {
							const issue =
								gold.sidecar.exclusions[record]?.issue;
							return {
								key:
									issue === undefined
										? "No issue"
										: `#${issue}`,
								record,
							};
						}),
					),
					skipped: listing(
						projected.skipped
							.filter((skip) => skip.status === status)
							.map(({ reason, record, sameInputAs }) => ({
								key: reason,
								record: sameInputAs
									? `${record} (same input as ${sameInputAs})`
									: record,
							})),
					),
					unloaded: listing(
						gold.unloaded
							.filter(
								(entry) =>
									(isReviewed(entry, projected.layer)
										? "Reviewed"
										: "Draft") === status &&
									entry.record.startsWith(`${language}/`),
							)
							.map(({ record, checks }) => ({
								key: `Fails ${[...checks].sort().join(" and ")}`,
								record,
							})),
					),
				},
			];
		}),
	) as Record<ReviewGroup, CoverageRow>;
	return { route: projected.corpus.route, language, byStatus };
}

/**
 * The coverage as a plain-text table. Groups of at most `listUpTo` records
 * list them.
 */
export function formatCoverage(coverage: Coverage, listUpTo = 8): string {
	const { Reviewed, Draft } = coverage.byStatus;
	const lines: string[] = [];
	const width = 56;
	const row = (label: string, reviewed: number, draft: number) =>
		lines.push(
			`${label.padEnd(width)}${String(reviewed).padStart(9)}${String(draft).padStart(7)}`,
		);
	const total = (listing: Listing) =>
		Object.values(listing).reduce(
			(sum, records) => sum + records.length,
			0,
		);
	const groups = (
		label: string,
		key: "excluded" | "skipped" | "unloaded",
		indent = "",
	) => {
		const reviewed = Reviewed[key];
		const draft = Draft[key];
		row(`${indent}${label}`, total(reviewed), total(draft));
		for (const group of [
			...new Set([...Object.keys(reviewed), ...Object.keys(draft)]),
		].sort()) {
			const records = [
				...(reviewed[group] ?? []),
				...(draft[group] ?? []),
			];
			row(
				`${indent}  ${group}`,
				reviewed[group]?.length ?? 0,
				draft[group]?.length ?? 0,
			);
			if (records.length <= listUpTo)
				for (const record of records)
					lines.push(`${indent}      ${record}`);
		}
	};
	lines.push(`${coverage.route}: Spec Records in ${coverage.language}`);
	lines.push(
		`${"".padEnd(width)}${"Reviewed".padStart(9)}${"Draft".padStart(7)}`,
	);
	row("Cases", Reviewed.cases, Draft.cases);
	row("  from Full records", Reviewed.fullCoverage, Draft.fullCoverage);
	groups("excluded from test sets", "excluded", "  ");
	groups("Skipped by the projection", "skipped");
	groups("Not loaded (dumcorpus leaves the record out)", "unloaded");
	return `${lines.join("\n")}\n`;
}
