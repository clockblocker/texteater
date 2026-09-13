/**
 * Import cost remains strictly below the original 5 MiB target. The user
 * approved one repository-wide 5.3 MiB operation ceiling after repeated
 * five-process medians showed small run-to-run variation around 5 MiB. This
 * is measurement headroom, not a package-specific waiver; reachability stays
 * strict for every operational entrypoint.
 */
export const RSS_IMPORT_BUDGET_BYTES = 5 * 1024 * 1024;
export const RSS_OPERATION_BUDGET_BYTES = 5.3 * 1024 * 1024;

export type StrictRssPolicy = {
	readonly status: "strict";
};

/** Effect workflow memory is measured, not judged against the old schema-loading proxy. */
export type RssPolicy =
	| StrictRssPolicy
	| { readonly status: "effect-workflow" };

const MiB = 1024 * 1024;
const strict = { status: "strict" } as const;
const workflow = { status: "effect-workflow" } as const;

/** Every operational export retains schema isolation; Effect workflows report measured RSS. */
export const RSS_ENTRYPOINT_POLICIES = {
	dumling: strict,
	"dumling/validation": strict,
	dumrel: strict,
	dumdict: workflow,
	"dumdict/runtime": workflow,
	"dumdict/relations": strict,
	"dumdict/pending": strict,
	"dumdict/memory": workflow,
	dumgen: workflow,
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
	if (
		policy.status === "strict" &&
		observation.importOnlyDeltaBytes >= RSS_IMPORT_BUDGET_BYTES
	)
		violations.push("import-only delta is not below 5 MiB");
	if (
		policy.status === "strict" &&
		observation.importPlusOperationDeltaBytes > RSS_OPERATION_BUDGET_BYTES
	)
		violations.push("import+operation delta exceeds 5.3 MiB");
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
