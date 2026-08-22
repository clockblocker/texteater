import {
	auditDumDeclarationReachability,
	formatDumDeclarationReachabilityIssues,
} from "../dum-declaration-reachability";
import { buildPackages, createReport } from "../dum-entrypoint-rss/benchmark";
import { operationalEntrypoints } from "../dum-entrypoint-rss/inventory";
import { DUM_PARSER_INTERFACE_CONTRACT } from "../dum-parser-interface-contract";
import { findRepositoryRoot } from "../lib/workspaces";
import { compareDifferentialTarget } from "./differential";
import { DUM_DIFFERENTIAL_TARGETS } from "./differential-targets";
import {
	evaluateEntrypointRss,
	formatRssGateReport,
	PARSER_DIFFERENTIAL_POLICIES,
	type ParserDifferentialPolicy,
	RSS_ENTRYPOINT_POLICIES,
	type RssGateReportEntry,
	type RssPolicy,
} from "./policy";

function sameMembers(
	left: readonly string[],
	right: readonly string[],
): boolean {
	return (
		left.length === right.length &&
		[...left]
			.sort()
			.every((value, index) => value === [...right].sort()[index])
	);
}

function verifyDifferentialInventory(): boolean {
	const frozenParserIds = Object.entries(
		DUM_PARSER_INTERFACE_CONTRACT.packages,
	).flatMap(([packageName, parsers]) =>
		Object.keys(parsers).map(
			(parserName) => `${packageName}:${parserName}`,
		),
	);
	const policies = PARSER_DIFFERENTIAL_POLICIES as Readonly<
		Record<string, ParserDifferentialPolicy>
	>;
	if (!sameMembers(frozenParserIds, Object.keys(policies))) {
		process.stderr.write(
			"FAIL differential policy does not exactly match ADR 0014 parser inventory.\n",
		);
		return false;
	}

	const targetIds = new Set(DUM_DIFFERENTIAL_TARGETS.map(({ id }) => id));
	let passed = true;
	for (const target of DUM_DIFFERENTIAL_TARGETS) {
		const result = compareDifferentialTarget(target);
		if (result.mismatches.length === 0) {
			process.stdout.write(
				`PASS differential ${target.id}: ${result.representativeValueCount} representative + ${result.propertyValueCount} property-generated values\n`,
			);
		} else {
			passed = false;
			process.stderr.write(
				`FAIL differential ${target.id}: ${JSON.stringify(result.mismatches)}\n`,
			);
		}
	}

	const waiverCounts = new Map<number, number>();
	for (const [parserId, policy] of Object.entries(policies)) {
		if (policy.status === "strict") {
			if (!targetIds.has(policy.differentialTargetId)) {
				passed = false;
				process.stderr.write(
					`FAIL ${parserId}: missing differential target ${policy.differentialTargetId}.\n`,
				);
			}
			continue;
		}
		waiverCounts.set(
			policy.issue,
			(waiverCounts.get(policy.issue) ?? 0) + 1,
		);
	}
	for (const [issue, count] of [...waiverCounts].sort(
		([left], [right]) => left - right,
	)) {
		process.stdout.write(
			`WAIVED differential issue ${issue}: ${count} frozen parser surfaces remain unmigrated\n`,
		);
	}
	return passed;
}

async function verifyRss(): Promise<boolean> {
	const root = await findRepositoryRoot(import.meta.dir);
	if (!Bun.argv.includes("--skip-build")) await buildPackages(root);
	const declarationIssues = await auditDumDeclarationReachability({
		repositoryRoot: root,
	});
	if (declarationIssues.length === 0) {
		process.stdout.write(
			"PASS declaration closure: operational and type-only Dum entrypoints are schema-authoring-free\n",
		);
	} else {
		process.stderr.write(
			formatDumDeclarationReachabilityIssues(declarationIssues),
		);
	}
	const report = await createReport(root);
	const policyBySpecifier = RSS_ENTRYPOINT_POLICIES as Readonly<
		Record<string, RssPolicy>
	>;
	const expectedSpecifiers = operationalEntrypoints().map(
		({ specifier }) => specifier,
	);
	if (!sameMembers(expectedSpecifiers, Object.keys(policyBySpecifier))) {
		process.stderr.write(
			"FAIL RSS policy does not exactly match the operational entrypoint inventory.\n",
		);
		return false;
	}

	const entries: RssGateReportEntry[] = [];
	for (const measured of report.entrypoints) {
		if (measured.classification !== "operational") continue;
		const policy = policyBySpecifier[measured.specifier];
		if (policy === undefined) {
			process.stderr.write(
				`FAIL missing RSS policy: ${measured.specifier}\n`,
			);
			return false;
		}
		const result = evaluateEntrypointRss(policy, {
			importOnlyDeltaBytes: measured.importOnly.deltaBytes,
			importPlusOperationDeltaBytes:
				measured.importPlusOperation.deltaBytes,
			reachability: measured.reachability,
		});
		entries.push({
			...result,
			absoluteImportOnlyMedianBytes: measured.importOnly.medianBytes,
			absoluteImportPlusOperationMedianBytes:
				measured.importPlusOperation.medianBytes,
			importOnlyDeltaBytes: measured.importOnly.deltaBytes,
			importPlusOperationDeltaBytes:
				measured.importPlusOperation.deltaBytes,
			specifier: measured.specifier,
		});
	}
	process.stdout.write(
		formatRssGateReport({
			baselineMedianBytes: report.baseline.medianBytes,
			entries,
		}),
	);
	return (
		declarationIssues.length === 0 && entries.every(({ passed }) => passed)
	);
}

const differentialPassed = verifyDifferentialInventory();
const rssPassed = await verifyRss();
if (!differentialPassed || !rssPassed) process.exitCode = 1;
