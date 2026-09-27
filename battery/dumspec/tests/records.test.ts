import { describe, expect, test } from "bun:test";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { demoteBrokenReviewed } from "../scripts/demote-broken-reviewed.js";
import { checkCitations } from "../src/check-citations.js";
import { checkRecord } from "../src/check-record.js";
import {
	findSpecRecord,
	loadSpecRecords,
	loadSpecWorklist,
	rules,
} from "../src/index.js";
import { readRecords } from "../src/load.js";
import { readRepositoryAdrStatuses } from "./adr-statuses.js";
import {
	negativeFixtures,
	review,
	ruleCitation,
	seedJson,
} from "./negative-fixtures.js";

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
		const { textRecords } = readRecords(
			fileURLToPath(new URL("../records/", import.meta.url)),
		);
		expect(
			checkCitations([...records, ...textRecords], {
				adrStatuses: readRepositoryAdrStatuses(),
				rules,
			}),
		).toEqual([]);
	});

	test("reports the worklist of failing Drafts and imported cases", () => {
		const worklist = loadSpecWorklist();
		const imported = worklist.flatMap((entry) =>
			entry.legacy.map((legacy) => `${legacy.source} ${legacy.caseId}`),
		);
		for (const entry of worklist) {
			expect(
				entry.issues.length +
					entry.legacy.length +
					entry.targetsWithoutReading.length,
			).toBeGreaterThan(0);
			if (entry.status === "Reviewed") {
				expect(entry.issues).toEqual([]);
				expect(entry.targetsWithoutReading).toEqual([]);
			}
		}
		expect(imported.length).toBe(new Set(imported).size);
		console.log(
			`${worklist.length} records on the worklist (bun run worklist): ${
				worklist.filter((entry) => entry.issues.length > 0).length
			} Drafts failing a check, ${
				worklist.filter(
					(entry) => entry.targetsWithoutReading.length > 0,
				).length
			} with a target naming no Reading, ${imported.length} imported cases`,
		);
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

	test("the loader reports invalid JSON and every failing Reviewed record at once", () => {
		const directory = mkdtempSync(join(tmpdir(), "dumspec-records-"));
		try {
			mkdirSync(join(directory, "de"));
			writeFileSync(join(directory, "de/broken.json"), "{");
			const outOfOrder = review(seedJson("de/pass-auf-dich-auf"));
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

	test("the loader puts failing Drafts, imported cases and targets without a Reading on the worklist", () => {
		const directory = mkdtempSync(join(tmpdir(), "dumspec-records-"));
		try {
			mkdirSync(join(directory, "de"));
			mkdirSync(join(directory, "text"));
			const legacy = [
				{ source: "gold.json", caseId: "case-1", case: { any: 1 } },
			];
			const outOfOrder = seedJson("de/pass-auf-dich-auf");
			outOfOrder.targets[0].memberSegmentIndices = [2, 0, 6];
			writeFileSync(
				join(directory, "de/out-of-order.json"),
				JSON.stringify(outOfOrder),
			);
			const imported = review(seedJson("de/ich-bin-im-wald"));
			imported.legacy = legacy;
			writeFileSync(
				join(directory, "de/imported.json"),
				JSON.stringify(imported),
			);
			const unnamed = seedJson("de/pass-auf-dich-auf");
			unnamed.targets[0].reading = { emojiDescription: "👀" };
			writeFileSync(
				join(directory, "de/unnamed.json"),
				JSON.stringify(unnamed),
			);
			const shapeless = seedJson("de/ich-bin-im-wald");
			shapeless.legacy = [{ source: "gold.json" }];
			writeFileSync(
				join(directory, "de/shapeless.json"),
				JSON.stringify(shapeless),
			);
			writeFileSync(
				join(directory, "text/raw.json"),
				JSON.stringify({
					sourceText: "Das H aus",
					status: "Draft",
					legacy,
				}),
			);
			const {
				records: loaded,
				textRecords,
				issues,
				worklist,
			} = readRecords(directory);
			expect(loaded.map((record) => record.id)).toEqual([
				"de/imported",
				"de/unnamed",
			]);
			const wald = loaded[0]?.targets[1];
			expect(wald?.reading?.unitKind).toBe("Reading");
			expect(wald?.reading?.emojiDescription).toBe("👀");
			expect(wald?.reading?.lemma).toEqual(
				wald?.attestation.surface.lemma,
			);
			expect(textRecords.map((record) => record.sourceText)).toEqual([
				"Das H aus",
			]);
			expect(
				new Set(
					issues.map((issue) => `${issue.record} ${issue.check}`),
				),
			).toEqual(new Set(["de/shapeless Shape"]));
			expect(
				worklist.map((entry) => [
					entry.record,
					entry.status,
					[...new Set(entry.issues.map((issue) => issue.check))],
					entry.legacy.length,
					entry.targetsWithoutReading,
				]),
			).toEqual([
				["de/imported", "Reviewed", [], 1, []],
				["de/out-of-order", "Draft", ["Members"], 0, [0, 1]],
				["de/unnamed", "Draft", [], 0, [1]],
				["text/raw", "Draft", [], 1, []],
			]);
		} finally {
			rmSync(directory, { recursive: true });
		}
	});

	test("the loader fails a Reviewed Text Record that cites no Rule", () => {
		const directory = mkdtempSync(join(tmpdir(), "dumspec-records-"));
		const write = (id: string, record: unknown) =>
			writeFileSync(
				join(directory, `${id}.json`),
				JSON.stringify(record),
			);
		const sources = (rules: unknown[]) => ({
			adrs: [],
			rules,
			references: [],
		});
		try {
			mkdirSync(join(directory, "text"));
			write("text/draft", { sourceText: "Das H aus", status: "Draft" });
			write("text/uncited", {
				sourceText: "Das H aus",
				status: "Reviewed",
				sources: sources([]),
			});
			write("text/bare", { sourceText: "Das H aus", status: "Reviewed" });
			write("text/cited", {
				sourceText: "Das H aus",
				status: "Reviewed",
				sources: sources([ruleCitation]),
			});
			const { textRecords, issues } = readRecords(directory);
			expect(textRecords.map((record) => record.id)).toEqual([
				"text/cited",
				"text/draft",
			]);
			expect(
				issues.map((issue) => `${issue.record} ${issue.check}`),
			).toEqual(["text/bare Uncited", "text/uncited Uncited"]);
		} finally {
			rmSync(directory, { recursive: true });
		}
	});

	test("the demotion script demotes Reviewed records failing their checks", () => {
		const directory = mkdtempSync(join(tmpdir(), "dumspec-records-"));
		const write = (id: string, record: unknown) =>
			writeFileSync(
				join(directory, `${id}.json`),
				`${JSON.stringify(record, null, "\t")}\n`,
			);
		try {
			mkdirSync(join(directory, "de"));
			write("de/valid", review(seedJson("de/ich-bin-im-wald")));
			const broken = review(seedJson("de/pass-auf-dich-auf"));
			broken.targets[1].attestation.surface.lemma.coreFeatures = {};
			write("de/broken", broken);
			const draft = seedJson("de/pass-auf-dich-auf");
			draft.targets[0].memberSegmentIndices = [2, 0, 6];
			write("de/draft", draft);
			const unnamed = seedJson("de/ich-bin-im-wald");
			unnamed.status = "Reviewed";
			write("de/unnamed", unnamed);

			expect(demoteBrokenReviewed(directory)).toEqual([
				"de/broken",
				"de/unnamed",
			]);
			expect(seedFile(directory, "de/broken")).toEqual({
				...broken,
				status: "Draft",
			});
			expect(seedFile(directory, "de/valid").status).toBe("Reviewed");
			const { issues, worklist } = readRecords(directory);
			expect(issues).toEqual([]);
			expect(worklist.map((entry) => entry.record)).toEqual([
				"de/broken",
				"de/draft",
				"de/unnamed",
			]);
		} finally {
			rmSync(directory, { recursive: true });
		}
	});
});

function seedFile(directory: string, id: string) {
	return JSON.parse(readFileSync(join(directory, `${id}.json`), "utf8"));
}
