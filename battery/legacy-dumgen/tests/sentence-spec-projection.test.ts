import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { loadSpecRecords } from "dumspec";
import { stableJson } from "promptsmith";
import {
	isRecordKey,
	projectSentenceCase,
	projectSentenceCases,
	readSentenceSidecar,
	unlistedCaseId,
} from "../codegen/project-sentence-cases.js";
import remaining from "../src/concrete-lang/de/sentence-analysis/source-data.json";
import generated from "../src/generated/sentence-cases.json";
import before from "./sentence-cases-before-dumspec.json";

/**
 * `sentence-cases-before-dumspec.json` fingerprints the 36 sentence-analysis
 * cases as `source-data.json` held them before Spec Records began serving
 * them (ADR 0037, #634): each case's input, ideal output and explanation, and
 * the demonstration, evaluation and slice lists. Drop both once the last
 * review batch empties `source-data.json`.
 */
const records = loadSpecRecords();
const sidecar = readSentenceSidecar(
	new URL("../src/concrete-lang/de/sentence-analysis/", import.meta.url),
);
const sourceData: Readonly<Record<string, { input: unknown }>> =
	remaining.cases;
const projected = projectSentenceCases(sidecar, records, sourceData);
const listedIds = Object.entries(sidecar.cases).map(([key, entry]) =>
	"id" in entry ? entry.id : key,
);
const fingerprint = (value: unknown) =>
	createHash("sha256").update(stableJson(value)).digest("hex").slice(0, 16);

test("every sentence-analysis case is in source-data.json or a Spec Record, not both", () => {
	const fromRecords = listedIds.filter((id) => id in projected.cases);
	expect(fromRecords.filter((id) => id in sourceData)).toEqual([]);
	expect([...fromRecords, ...Object.keys(sourceData)].toSorted()).toEqual(
		Object.keys(before.cases).toSorted(),
	);
	for (const [key, entry] of Object.entries(sidecar.cases))
		expect(isRecordKey(key)).toBe("id" in entry);
});

test("Spec Records and source-data.json serve every sentence-analysis case unchanged", () => {
	expect(projected).toEqual(generated as unknown as typeof projected);
	expect(listedIds.toSorted()).toEqual(Object.keys(before.cases).toSorted());
	const cases: Readonly<Record<string, string>> = before.cases;
	expect(
		listedIds.filter(
			(id) =>
				fingerprint(projected.cases[id] ?? sourceData[id]) !==
				cases[id],
		),
	).toEqual([]);
	expect(projected.demonstrationIds).toEqual(before.demonstrationIds);
	expect(projected.evaluationCaseIds).toEqual(before.evaluationCaseIds);
	// One sidecar order keeps the evaluation list's, so the governed slice
	// runs warten-auf first instead of last; it scores the same cases.
	expect(Object.keys(projected.slices)).toEqual(Object.keys(before.slices));
	expect(projected.slices.governed?.toSorted()).toEqual(
		before.slices.governed.toSorted(),
	);
});

test("a Full record projects its Lexeme targets with the roles its Attestations decide", () => {
	const record = records.find(({ id }) => id === "de/pass-auf-dich-auf");
	if (!record) throw Error("Missing de/pass-auf-dich-auf");
	expect(projectSentenceCase(record).idealOutput).toEqual({
		targets: [
			{
				kind: "VERB",
				members: [
					{ offset: 0, role: "Head" },
					{ offset: 5, role: "GovernedPreposition" },
					{ offset: 14, role: "SeparableParticle" },
				],
			},
			{ kind: "PRON", members: [{ offset: 9 }] },
		],
		phrasemes: [],
	});
	expect(projected.origins["sentence-de-pass-auf-dich-auf"]).toEqual({
		record: "de/pass-auf-dich-auf",
		target: null,
		status: "Draft",
	});
});

test("every German Full Spec Record yields a sentence-analysis case", () => {
	const inputs = new Map(
		projected.caseIds.map((id) => [
			stableJson((projected.cases[id] ?? sourceData[id])?.input),
			id,
		]),
	);
	const full = records.filter(
		(record) => record.language === "de" && record.coverage === "Full",
	);
	expect(full.length).toBeGreaterThan(0);
	for (const record of full) {
		const id = inputs.get(stableJson(projectSentenceCase(record).input));
		expect(id).toBeDefined();
		if (id === unlistedCaseId(record.id))
			expect(projected.origins[id]?.record).toBe(record.id);
	}
	const scored = new Set([
		...projected.demonstrationIds,
		...projected.evaluationCaseIds,
		...Object.values(projected.slices).flat(),
	]);
	expect(
		projected.caseIds.filter(
			(id) => scored.has(id) && !listedIds.includes(id),
		),
	).toEqual([]);
});
