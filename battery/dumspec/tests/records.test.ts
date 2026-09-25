import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCitations } from "../src/check-citations.js";
import { checkRecord } from "../src/check-record.js";
import { findSpecRecord, loadSpecRecords, rules } from "../src/index.js";
import { readRecords } from "../src/load.js";
import { readRepositoryAdrStatuses } from "./adr-statuses.js";
import { negativeFixtures, seedJson } from "./negative-fixtures.js";

const records = loadSpecRecords();

describe("the corpus", () => {
	test("loads every record, sorted by id", () => {
		const ids = records.map((record) => record.id);
		expect(ids.length).toBeGreaterThan(0);
		expect(ids).toEqual(ids.toSorted());
	});

	test("finds a record by id", () => {
		const record = findSpecRecord(records, "de/pass-auf-dich-auf");
		expect(record?.language).toBe("de");
		expect(record?.targets[0]?.memberSegmentIndices).toEqual([0, 2, 6]);
		expect(findSpecRecord(records, "de/no-such-record")).toBeUndefined();
	});

	test("passes the stale-citation guard against the repository's ADRs", () => {
		expect(
			checkCitations(records, {
				adrStatuses: readRepositoryAdrStatuses(),
				rules,
			}),
		).toEqual([]);
	});

	test("seeds both coverages, both statuses, No Target and a quotation", () => {
		const has = (
			predicate: (record: (typeof records)[number]) => boolean,
		) => expect(records.some(predicate)).toBe(true);
		has((record) => record.coverage === "Full");
		has((record) => record.coverage === "Partial");
		has((record) => record.status === "Draft");
		has((record) => record.status === "Reviewed");
		has((record) => record.noTarget.length > 0);
		has((record) => record.provenance.kind === "Quoted");
		has((record) =>
			record.targets.some((target) => target.grundform !== undefined),
		);
	});
});

describe("negative fixtures", () => {
	for (const fixture of negativeFixtures)
		test(`fail ${fixture.check}: ${fixture.name}`, () => {
			const json = seedJson(fixture.seed);
			expect(checkRecord(fixture.seed, json).success).toBe(true);
			fixture.edit(json);
			const checked = checkRecord(fixture.id ?? fixture.seed, json);
			if (checked.success) throw Error("Expected the fixture to fail");
			expect(new Set(checked.issues.map((issue) => issue.check))).toEqual(
				new Set([fixture.check]),
			);
		});

	test("the loader reports invalid JSON and every failing record at once", () => {
		const directory = mkdtempSync(join(tmpdir(), "dumspec-records-"));
		try {
			mkdirSync(join(directory, "de"));
			writeFileSync(join(directory, "de/broken.json"), "{");
			const outOfOrder = seedJson("de/pass-auf-dich-auf");
			outOfOrder.targets[0].memberSegmentIndices = [2, 0, 6];
			writeFileSync(
				join(directory, "de/out-of-order.json"),
				JSON.stringify(outOfOrder),
			);
			writeFileSync(
				join(directory, "de/valid.json"),
				JSON.stringify(seedJson("de/ich-bin-im-wald")),
			);
			const { records: loaded, issues } = readRecords(directory);
			expect(loaded.map((record) => record.id)).toEqual(["de/valid"]);
			expect(
				new Set(
					issues.map((issue) => `${issue.record} ${issue.check}`),
				),
			).toEqual(new Set(["de/broken Shape", "de/out-of-order Members"]));
		} finally {
			rmSync(directory, { recursive: true });
		}
	});
});
