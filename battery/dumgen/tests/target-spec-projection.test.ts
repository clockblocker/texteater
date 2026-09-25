import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { loadSpecRecords } from "dumspec";
import { stableJson } from "promptsmith";
import {
	projectTargetCases,
	readTargetSidecar,
} from "../codegen/project-target-cases.js";
import remaining from "../src/concrete-lang/de/target-classification/source-data.json";
import generated from "../src/generated/target-cases.json";
import before from "./target-cases-before-dumspec.json";

/**
 * `target-cases-before-dumspec.json` fingerprints the 616 target-classification
 * cases as `source-data.json` held them before Spec Records began serving
 * them (ADR 0037, #632): each case's input, ideal output, explanation,
 * contamination keys and sources, and the demonstration, evaluation and slice
 * lists. Drop both once the last review batch empties `source-data.json`.
 */
const projected = projectTargetCases(
	readTargetSidecar(
		new URL(
			"../src/concrete-lang/de/target-classification/",
			import.meta.url,
		),
	),
	loadSpecRecords(),
);
const sourceData: Readonly<Record<string, unknown>> = remaining.cases;
const fingerprint = (value: unknown) =>
	createHash("sha256").update(stableJson(value)).digest("hex").slice(0, 16);

test("every target-classification case is in source-data.json or a Spec Record, not both", () => {
	const fromRecords = Object.keys(projected.cases);
	const fromSourceData = Object.keys(sourceData);
	expect(fromRecords.filter((id) => id in sourceData)).toEqual([]);
	expect([...fromRecords, ...fromSourceData].toSorted()).toEqual(
		Object.keys(before.cases).toSorted(),
	);
});

test("Spec Records and source-data.json serve every target-classification case unchanged", () => {
	expect(projected).toEqual(generated as typeof projected);
	expect(projected.caseIds.toSorted()).toEqual(
		Object.keys(before.cases).toSorted(),
	);
	const cases: Readonly<Record<string, string>> = before.cases;
	expect(
		projected.caseIds.filter(
			(id) =>
				fingerprint(projected.cases[id] ?? sourceData[id]) !==
				cases[id],
		),
	).toEqual([]);
	expect(projected.demonstrationIds).toEqual(before.demonstrationIds);
	expect(projected.evaluationCaseIds).toEqual(before.evaluationCaseIds);
	expect(projected.slices).toEqual(before.slices);
});
