/** Whole-chain import headroom over preloaded Effect; observed baseline is about 22 MiB. */
export const RSS_SHARED_BUDGET_BYTES = 30 * 1024 * 1024;

const MiB = 1024 * 1024;

export function evaluateSharedRss(addedPeakMedianBytes: number) {
	const passed =
		Number.isFinite(addedPeakMedianBytes) &&
		addedPeakMedianBytes >= 0 &&
		addedPeakMedianBytes <= RSS_SHARED_BUDGET_BYTES;
	return {
		passed,
		violations: passed
			? []
			: [
					"shared import peak delta is invalid or exceeds 30 MiB after Effect",
				],
	};
}

export interface RssObservation {
	readonly importOnlyDeltaBytes: number;
	readonly importPlusOperationDeltaBytes: number;
	readonly reachability: {
		readonly heavyweightDependencies: readonly string[];
		readonly schemaEntrypoints: readonly string[];
	};
}

export interface RssPolicyResult {
	readonly passed: boolean;
	readonly violations: readonly string[];
}

/** Isolated entrypoint RSS is diagnostic; every operational export still enforces schema isolation. */
export function evaluateEntrypointRss(
	observation: RssObservation,
): RssPolicyResult {
	const violations: string[] = [];
	if (observation.reachability.heavyweightDependencies.length > 0)
		violations.push("operational surface reaches a heavyweight dependency");
	if (observation.reachability.schemaEntrypoints.length > 0)
		violations.push(
			"operational surface reaches a schema-authoring entrypoint",
		);
	return { passed: violations.length === 0, violations };
}

export interface RssGateReportEntry extends RssPolicyResult {
	readonly absoluteImportOnlyMedianBytes: number;
	readonly absoluteImportPlusOperationMedianBytes: number;
	readonly importOnlyDeltaBytes: number;
	readonly importPlusOperationDeltaBytes: number;
	readonly specifier: string;
}

export function mib(bytes: number): string {
	return (bytes / MiB).toFixed(3);
}

export function formatRssGateReport(report: {
	readonly baselineMedianBytes: number;
	readonly entries: readonly RssGateReportEntry[];
}): string {
	const lines = [
		`empty-module baseline: ${mib(report.baselineMedianBytes)} MiB absolute`,
	];
	for (const entry of report.entries) {
		lines.push(
			`${entry.passed ? "PASS" : "FAIL"} ${entry.specifier}`,
			`  import-only: ${mib(entry.absoluteImportOnlyMedianBytes)} MiB absolute; +${mib(entry.importOnlyDeltaBytes)} MiB delta over empty baseline`,
			`  import+operation: ${mib(entry.absoluteImportPlusOperationMedianBytes)} MiB absolute; +${mib(entry.importPlusOperationDeltaBytes)} MiB delta over empty baseline`,
		);
		for (const violation of entry.violations)
			lines.push(`  violation: ${violation}`);
	}
	return `${lines.join("\n")}\n`;
}
