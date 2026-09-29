/**
 * Prints the worklist: each record whose Draft layers fail a check against
 * the current model or lack a target's Attestation or Reading, or that holds
 * imported cases, with its issues and imported case ids; then how many
 * records stop at each layer, the imported cases per source file, and last
 * the Rules whose statement is too long.
 *
 *   bun run worklist
 */
import { longStatements } from "../src/check-rules.js";
import { annotationLayers, layerRank } from "../src/layers.js";
import { loadSpecWorklist } from "../src/load.js";
import { rules } from "../src/rules.js";

const worklist = loadSpecWorklist();
const perSource = new Map<string, number>();
const failingAt = new Map<string, number>();
for (const entry of worklist) {
	const review = entry.reviewDepth
		? `reviewed through ${entry.reviewDepth}`
		: "Draft";
	const valid = entry.validThrough
		? `, valid through ${entry.validThrough}`
		: "";
	console.log(`${entry.record} (${review}${valid})`);
	for (const issue of entry.issues)
		console.log(
			`  ${issue.path} [${issue.check}, ${issue.layer ?? "record"}]: ${issue.message}`,
		);
	for (const legacy of entry.legacy) {
		console.log(`  legacy ${legacy.source} ${legacy.caseId}`);
		perSource.set(legacy.source, (perSource.get(legacy.source) ?? 0) + 1);
	}
	const failing = annotationLayers[layerRank(entry.validThrough) + 1];
	if (entry.issues.length > 0 && failing)
		failingAt.set(failing, (failingAt.get(failing) ?? 0) + 1);
}
console.log(
	`\n${worklist.length} records; the first layer failing: ${annotationLayers
		.map((layer) => `${layer} ${failingAt.get(layer) ?? 0}`)
		.join(
			", ",
		)}; ${worklist.filter((entry) => entry.legacy.length > 0).length} holding imported cases`,
);
for (const [source, cases] of [...perSource].toSorted())
	console.log(`${cases}\t${source}`);
const long = longStatements(rules);
if (long.length > 0) {
	console.log(
		`\n${long.length} Rules over 600 characters state more than a principle (ADR 0037):`,
	);
	for (const { rule, length } of long) console.log(`${length}\t${rule}`);
}
