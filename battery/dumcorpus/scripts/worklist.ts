/**
 * Prints the worklist: each record whose Draft layers fail a check against
 * the current model or lack a target's Attestation or Reading, or that holds
 * imported cases, with its issues and imported case ids; then how many
 * records stop at each layer, the imported cases per source file, and last
 * the Rules whose statement is too long.
 *
 *   bun run worklist
 */
import { longStatements, rulesNeedingRecords } from "../src/check-rules.js";
import {
	germanOpenSplits,
	germanSplitRulings,
} from "../src/de/worklist/identity-split-rulings.js";
import { annotationLayers, layerRank } from "../src/layers.js";
import { loadSpecRecords, loadSpecWorklist } from "../src/load.js";
import { rules } from "../src/rules.js";
import { rulesAwaitingRecords } from "../src/rules-awaiting-records.js";
import { uncitedRecordsByStatus } from "../src/worklist/evidence-gaps.js";
import {
	formatIdentity,
	identitySplits,
	type SplitSort,
	sortSplit,
	splitsFamilyOrKind,
} from "../src/worklist/identity-splits.js";
import { germanKeptValues } from "../src/worklist/kept-values.js";
import { readRecordFiles } from "../src/worklist/record-files.js";
import {
	loadSchemaValues,
	reviewedValueKeys,
	unkeptValues,
} from "../src/worklist/schema-values.js";

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

const germanFiles = readRecordFiles("de");
const splits = identitySplits(germanFiles).map((split) => ({
	split,
	sorted: sortSplit(split, germanSplitRulings, germanOpenSplits),
}));
const sorts: SplitSort["sort"][] = ["Decided", "Open", "Unexplained"];
console.log(
	`\nIdentity splits: ${splits.length} German Canonical Forms have more than one identity, ${
		splits.filter(({ split }) => splitsFamilyOrKind(split)).length
	} of them in Family or Kind; ${sorts
		.map(
			(sort) =>
				`${sort} ${splits.filter(({ sorted }) => sorted.sort === sort).length}`,
		)
		.join(", ")}`,
);
const because = (sorted: SplitSort): string => {
	if (sorted.sort === "Decided")
		return [
			...new Set(
				sorted.rulings.flatMap((ruling) => [
					...ruling.adrs,
					...ruling.rules,
				]),
			),
		].join(", ");
	if (sorted.sort === "Open")
		return `#${sorted.open.issue}${
			sorted.open.findings ? ` ${sorted.open.findings.join(", ")}` : ""
		}: ${sorted.open.question}`;
	return "no ADR, Rule or open issue names it";
};
for (const sort of sorts) {
	console.log(`\n${sort}:`);
	for (const { split, sorted } of splits.filter(
		({ sorted }) => sorted.sort === sort,
	)) {
		console.log(`${split.spellings.join(" / ")} (${because(sorted)})`);
		for (const { identity, uses } of split.identities) {
			console.log(`  ${formatIdentity(identity)}`);
			for (const use of uses)
				console.log(
					`    ${use.record} (${use.reviewDepth ? `reviewed through ${use.reviewDepth}` : "Draft"}; ${
						use.rules.length > 0 ? use.rules.join(", ") : "no Rule"
					})`,
				);
		}
	}
}
const uncited = uncitedRecordsByStatus(germanFiles);
console.log(
	`\nEvidence gaps: ${uncited.reduce((sum, [, count]) => sum + count, 0)} of ${
		germanFiles.length
	} German records cite no Rule (${uncited
		.map(([status, count]) => `${status} ${count}`)
		.join(", ")})`,
);
const needing = rulesNeedingRecords(rules);
console.log(`${needing.length} Rules list no record:`);
for (const rule of needing) {
	const awaiting = rulesAwaitingRecords.find((entry) => entry.rule === rule);
	console.log(
		`  ${rule}${
			awaiting
				? ` (awaits #${awaiting.issue}${
						awaiting.findings
							? ` ${awaiting.findings.join(", ")}`
							: ""
					}: ${awaiting.why}${
						awaiting.showing
							? ` Showing: ${awaiting.showing.join(", ")}`
							: ""
					})`
				: ""
		}`,
	);
}

const schemaValues = await loadSchemaValues("de");
const unkept = unkeptValues(
	schemaValues,
	reviewedValueKeys(
		loadSpecRecords().filter((record) => record.language === "de"),
	),
	germanKeptValues,
);
console.log(
	`\nSchema values nothing keeps: ${unkept.length} of the ${schemaValues.length} Core and inflectional values German routes allow; no record reviewed through Attestation uses them and no keep-list entry (${germanKeptValues.length}) keeps them`,
);
const unkeptByRoute = Map.groupBy(unkept, (value) => value.route);
for (const [route, values] of unkeptByRoute)
	console.log(
		`  ${route} (${values.length}): ${values
			.map(
				(value) =>
					`${value.bag === "Core" ? "" : "infl. "}${value.feature}=${value.value}`,
			)
			.join(", ")}`,
	);
