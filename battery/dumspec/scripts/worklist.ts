/**
 * Prints the worklist: each record that fails a check against the current
 * model, holds imported cases or has a target naming no Reading, with its
 * issues, imported case ids and those targets, then the imported cases per
 * source file.
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
	for (const target of entry.targetsWithoutReading)
		console.log(`  targets.${target} names no Reading`);
}
const count = (predicate: (entry: (typeof worklist)[number]) => boolean) =>
	worklist.filter(predicate).length;
console.log(
	`\n${worklist.length} records, ${count((entry) => entry.issues.length > 0)} failing a check, ${count((entry) => entry.targetsWithoutReading.length > 0)} with a target naming no Reading`,
);
for (const [source, cases] of [...perSource].toSorted())
	console.log(`${cases}\t${source}`);
