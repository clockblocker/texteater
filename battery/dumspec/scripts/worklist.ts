/**
 * Prints the worklist: each record that fails a check against the current
 * model or holds imported cases, with its issues and imported case ids, then
 * the imported cases per source file.
 *
 *   bun run worklist
 */
import { loadSpecWorklist } from "../src/load.js";

const worklist = loadSpecWorklist();
const perSource = new Map<string, number>();
for (const entry of worklist) {
	console.log(`${entry.record} (${entry.status})`);
	for (const issue of entry.issues)
		console.log(`  ${issue.path} [${issue.check}]: ${issue.message}`);
	for (const legacy of entry.legacy) {
		console.log(`  legacy ${legacy.source} ${legacy.caseId}`);
		perSource.set(legacy.source, (perSource.get(legacy.source) ?? 0) + 1);
	}
}
console.log(
	`\n${worklist.length} records, ${worklist.filter((entry) => entry.issues.length > 0).length} failing a check`,
);
for (const [source, count] of [...perSource].toSorted())
	console.log(`${count}\t${source}`);
