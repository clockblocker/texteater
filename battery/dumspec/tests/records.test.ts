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

	test("spells every Fusion over the Segments of its word", () => {
		expect(records.flatMap(fusionSpanMismatches)).toEqual([]);
	});

	test("seeds both coverages, No Target and a quotation", () => {
		const has = (
			predicate: (record: (typeof records)[number]) => boolean,
		) => expect(records.some(predicate)).toBe(true);
		has((record) => record.coverage === "Full");
		has((record) => record.coverage === "Partial");
		// Seeds stay Draft until a person reviews them; the guards set Reviewed on copies.
		has((record) => record.status === "Draft");
		has((record) => record.noTarget.length > 0);
		has((record) => record.provenance.kind === "Quoted");
		has((record) =>
			record.targets.some((target) => target.grundform !== undefined),
		);
	});
});

/**
 * A Fused member's Fusion must spell the Segments around it: each lettered
 * component is one Segment, in order and adjacent, and a hidden component
 * (the letterless ה of בבית) has no Segment.
 */
function fusionSpanMismatches(record: (typeof records)[number]): string[] {
	const texts = record.segments.map((segment) => segment.text);
	return record.targets.flatMap((target, t) =>
		target.attestation.members.flatMap((member, m) => {
			if (member.orthography !== "Fused") return [];
			const at = target.memberSegmentIndices[m] ?? -1;
			const spans = member.fusion.components.map(
				(component) => component.span,
			);
			const before = spans
				.slice(0, member.component)
				.filter((span) => span !== "");
			const after = spans
				.slice(member.component + 1)
				.filter((span) => span !== "");
			const start = at - before.length;
			const expected = [
				...before,
				spans[member.component] ?? "",
				...after,
			];
			const actual =
				start < 0 ? [] : texts.slice(start, start + expected.length);
			return sameStrings(actual, expected)
				? []
				: [
						`${record.id} targets.${t}.members.${m}: ${JSON.stringify(expected)} is not Segments ${JSON.stringify(actual)}`,
					];
		}),
	);
}

function sameStrings(left: readonly string[], right: readonly string[]) {
	return (
		left.length === right.length &&
		left.every((text, index) => text === right[index])
	);
}

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
