import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createReport } from "../../../tooling/dum-entrypoint-rss/benchmark";
import {
	RSS_ENTRYPOINT_POLICIES,
	evaluateEntrypointRss,
} from "../../../tooling/dum-runtime-verification/policy";

const root = resolve(import.meta.dir, "../../..");
const report = await createReport(root);
const budgetResults = report.entrypoints.flatMap((entry) =>
	entry.classification === "operational"
		? [
				{
					specifier: entry.specifier,
					...evaluateEntrypointRss(
						RSS_ENTRYPOINT_POLICIES[
							entry.specifier as keyof typeof RSS_ENTRYPOINT_POLICIES
						],
						{
							importOnlyDeltaBytes: entry.importOnly.deltaBytes,
							importPlusOperationDeltaBytes:
								entry.importPlusOperation.deltaBytes,
							reachability: entry.reachability,
						},
					),
				},
			]
		: [],
);
await writeFile(
	Bun.argv[2]!,
	`${JSON.stringify({ ...report, budgetResults }, null, 2)}\n`,
);
console.log(JSON.stringify(budgetResults));
