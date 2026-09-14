/** Whole-chain import headroom over preloaded Effect; observed baseline is about 22 MiB. */
export const RSS_SHARED_BUDGET_BYTES = 30 * 1024 * 1024;

/** Isolated entrypoint RSS is diagnostic; schema isolation is always enforced. */
export type RssPolicy = { readonly status: "diagnostic" };
const MiB = 1024 * 1024;
const diagnostic = { status: "diagnostic" } as const;

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

/** Every operational export retains schema isolation; isolated RSS remains diagnostic. */
export const RSS_ENTRYPOINT_POLICIES = {
	dumling: diagnostic,
	"dumling/validation": diagnostic,
	dumrel: diagnostic,
	dumdict: diagnostic,
	"dumdict/runtime": diagnostic,
	"dumdict/relations": diagnostic,
	"dumdict/pending": diagnostic,
	"dumdict/memory": diagnostic,
	dumgen: diagnostic,
} as const satisfies Record<string, RssPolicy>;

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
	readonly status: RssPolicy["status"];
	readonly violations: readonly string[];
}

export function evaluateEntrypointRss(
	policy: RssPolicy,
	observation: RssObservation,
): RssPolicyResult {
	const violations: string[] = [];
	if (observation.reachability.heavyweightDependencies.length > 0)
		violations.push("operational surface reaches a heavyweight dependency");
	if (observation.reachability.schemaEntrypoints.length > 0)
		violations.push(
			"operational surface reaches a schema-authoring entrypoint",
		);
	return {
		passed: violations.length === 0,
		status: policy.status,
		violations,
	};
}

export interface RssGateReportEntry extends RssPolicyResult {
	readonly absoluteImportOnlyMedianBytes: number;
	readonly absoluteImportPlusOperationMedianBytes: number;
	readonly importOnlyDeltaBytes: number;
	readonly importPlusOperationDeltaBytes: number;
	readonly specifier: string;
}

function mib(bytes: number): string {
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
			`${entry.passed ? "PASS" : "FAIL"} ${entry.specifier} [${entry.status}]`,
			`  import-only: ${mib(entry.absoluteImportOnlyMedianBytes)} MiB absolute; +${mib(entry.importOnlyDeltaBytes)} MiB delta over empty baseline`,
			`  import+operation: ${mib(entry.absoluteImportPlusOperationMedianBytes)} MiB absolute; +${mib(entry.importPlusOperationDeltaBytes)} MiB delta over empty baseline`,
		);
		for (const violation of entry.violations)
			lines.push(`  violation: ${violation}`);
	}
	return `${lines.join("\n")}\n`;
}
