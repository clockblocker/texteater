import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ParsingError } from "common-utils";
import { compareDifferentialTarget } from "../../../tooling/dum-runtime-verification/differential";
import { DUM_DIFFERENTIAL_TARGETS } from "../../../tooling/dum-runtime-verification/differential-targets";
import { auditDumDeclarationReachability } from "../../../tooling/dum-declaration-reachability";
import { operationalEntrypoints } from "../../../tooling/dum-entrypoint-rss/inventory";
import { auditEntrypointReachability } from "../../../tooling/dum-entrypoint-rss/reachability";
import { adversarialGate } from "./adversarial";

const root = resolve(import.meta.dir, "../../..");
const targets = DUM_DIFFERENTIAL_TARGETS.map(compareDifferentialTarget);
const controlTarget = DUM_DIFFERENTIAL_TARGETS[0]!;
const negativeControls = {
	acceptEverythingIsRejected:
		compareDifferentialTarget({
			...controlTarget,
			lightweight: (input) => input,
		}).mismatches.length > 0,
	erasedErrorsAreRejected: compareDifferentialTarget({
		...controlTarget,
		representativeValues: [],
		propertyValues: [null],
		lightweight: () => new ParsingError([]),
	}).mismatches.some((mismatch) => mismatch.kind === "issues"),
};
const adversarial = await adversarialGate(root);
const declarations = await auditDumDeclarationReachability({
	repositoryRoot: root,
});
const runtime = [];
for (const entry of operationalEntrypoints()) {
	const reachability = await auditEntrypointReachability(entry.specifier);
	runtime.push({ specifier: entry.specifier, ...reachability });
}
const passed =
	targets.every((target) => target.mismatches.length === 0) &&
	Object.values(negativeControls).every(Boolean) &&
	adversarial.failures.length === 0 &&
	declarations.length === 0 &&
	runtime.every(
		(entry) =>
			entry.heavyweightDependencies.length === 0 &&
			entry.schemaEntrypoints.length === 0,
	);
const report = {
	passed,
	negativeControls,
	targetCount: targets.length,
	valueCount: targets.reduce(
		(total, target) =>
			total + target.propertyValueCount + target.representativeValueCount,
		0,
	),
	differentialFailures: targets.filter((target) => target.mismatches.length),
	adversarial,
	declarationFailures: declarations,
	runtime,
};
await writeFile(Bun.argv[2]!, `${JSON.stringify(report, null, 2)}\n`);
console.log(
	JSON.stringify({
		passed,
		targets: report.targetCount,
		values: report.valueCount,
		adversarial,
	}),
);
process.exitCode = passed ? 0 : 1;
