import { describe, expect, test } from "bun:test";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { demoteBrokenReviewed } from "../scripts/demote-broken-reviewed.js";
import { checkCitations } from "../src/check-citations.js";
import { checkRecord, type RecordCheck } from "../src/check-record.js";
import {
	findSpecRecord,
	isReviewed,
	loadSpecRecords,
	loadSpecSegmentations,
	loadSpecWorklist,
	rules,
} from "../src/index.js";
import type { SpecIssue } from "../src/issues.js";
import { layerRank } from "../src/layers.js";
import { readRecords } from "../src/load.js";
import { readRepositoryAdrStatuses } from "./adr-statuses.js";
import {
	negativeFixtures,
	review,
	ruleCitation,
	seedJson,
} from "./negative-fixtures.js";

const records = loadSpecRecords();
const segmentations = loadSpecSegmentations();

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

	test("loads the Segmentation of every record whose Attestations load", () => {
		const ids = new Set(segmentations.map((record) => record.id));
		expect(records.every((record) => ids.has(record.id))).toBe(true);
		for (const record of records)
			for (const target of record.targets) {
				const { language, family, kind } =
					target.attestation.surface.lemma;
				expect(target.route).toEqual({ language, family, kind });
			}
	});

	test("reports the worklist of failing Draft layers and imported cases", () => {
		const worklist = loadSpecWorklist();
		const imported = worklist.flatMap((entry) =>
			entry.legacy.map((legacy) => `${legacy.source} ${legacy.caseId}`),
		);
		for (const entry of worklist) {
			expect(entry.issues.length + entry.legacy.length).toBeGreaterThan(
				0,
			);
			// A reviewed layer never fails: its issues would throw.
			for (const issue of entry.issues)
				expect(layerRank(issue.layer)).toBeGreaterThan(
					layerRank(entry.reviewDepth),
				);
		}
		expect(imported.length).toBe(new Set(imported).size);
		const failingAt = (layer: string) =>
			worklist.filter((entry) =>
				entry.issues.some((issue) => issue.layer === layer),
			).length;
		console.log(
			`${worklist.length} records on the worklist (bun run worklist): ${failingAt("Segmentation")} failing Segmentation, ${failingAt("Attestation")} Attestation, ${failingAt("Reading")} Reading, ${imported.length} imported cases`,
		);
	});

	test("spells every Fusion over the Segments of its word", () => {
		expect(records.flatMap(fusionSpanMismatches)).toEqual([]);
	});

	// Parsing normalizes ASCII `...` to `…`, which would hide it: read the files.
	test("writes every open slot of a stored Canonical Form as …", () => {
		const directory = new URL("../records/", import.meta.url);
		const asciiSlots = (value: unknown, path: string): string[] => {
			if (Array.isArray(value))
				return value.flatMap((item, index) =>
					asciiSlots(item, `${path}.${index}`),
				);
			if (value === null || typeof value !== "object") return [];
			return Object.entries(value).flatMap(([key, item]) =>
				key === "canonicalForm" &&
				typeof item === "string" &&
				item.includes("...")
					? [`${path}.${key}: ${item}`]
					: asciiSlots(item, `${path}.${key}`),
			);
		};
		const failures = readdirSync(directory, {
			recursive: true,
			encoding: "utf8",
		})
			.filter((file) => file.endsWith(".json"))
			.flatMap((file) =>
				asciiSlots(
					JSON.parse(readFileSync(new URL(file, directory), "utf8")),
					file,
				),
			);
		expect(failures).toEqual([]);
	});

	test("seeds both coverages, No Target and a quotation", () => {
		const has = (
			predicate: (record: (typeof records)[number]) => boolean,
		) => expect(records.some(predicate)).toBe(true);
		has((record) => record.coverage === "Full");
		has((record) => record.coverage === "Partial");
		// Seeds stay Draft until a person reviews them; the guards review copies.
		has((record) => record.reviewDepth === undefined);
		has((record) => isReviewed(record, "Reading"));
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

/**
 * Each issue a check reports, keyed with whether it fails the record, so an
 * issue that was a Draft's work and becomes an error counts as new.
 */
function issueKeys(checked: RecordCheck): Map<string, SpecIssue> {
	return new Map([
		...checked.errors.map((issue): [string, SpecIssue] => [
			`error ${issue.check} ${issue.path}`,
			issue,
		]),
		...checked.issues.map((issue): [string, SpecIssue] => [
			`work ${issue.check} ${issue.path}`,
			issue,
		]),
	]);
}

describe("negative fixtures", () => {
	for (const fixture of negativeFixtures)
		test(`fail ${fixture.check}: ${fixture.name}`, () => {
			const json = seedJson(fixture.seed);
			const seed = checkRecord(fixture.seed, json);
			expect(seed.errors).toEqual([]);
			expect(seed.record).toBeDefined();
			const before = issueKeys(seed);
			fixture.edit(json);
			const added = [
				...issueKeys(checkRecord(fixture.id ?? fixture.seed, json)),
			].filter(([key]) => !before.has(key));
			expect(new Set(added.map(([, issue]) => issue.check))).toEqual(
				new Set([fixture.check]),
			);
		});

	test("a target's Reading carries its Knowledge, checked against the Reading", () => {
		const json = seedJson("de/pass-auf-dich-auf");
		const knowledge = {
			definition: "to watch out",
			conjugationClass: ["Weak" as const],
		};
		json.targets[0].reading = { emojiDescription: "👀", knowledge };
		const checked = checkRecord("de/pass-auf-dich-auf", json);
		expect(checked.errors).toEqual([]);
		expect(checked.record?.targets[0]?.knowledge).toEqual(knowledge);
		expect(checked.record?.targets[1]).not.toHaveProperty("knowledge");
	});

	test("a record reviewed through Segmentation loads it while its Attestations are Draft", () => {
		const json = seedJson("de/pass-auf-dich-auf");
		json.reviewDepth = "Segmentation";
		json.sources.rules = [ruleCitation];
		delete json.targets[1].attestation;
		json.targets[0].attestation.surface.lemma.coreFeatures = {};
		const checked = checkRecord("de/pass-auf-dich-auf", json);
		expect(checked.errors).toEqual([]);
		expect(checked.validThrough).toBe("Segmentation");
		expect(checked.record).toBeUndefined();
		expect(
			checked.segmentation?.targets.map(
				({ memberSegmentIndices, route }) => [
					memberSegmentIndices,
					route.kind,
				],
			),
		).toEqual([
			[[0, 2, 6], "VERB"],
			[[4], "PRON"],
		]);
		expect(new Set(checked.issues.map((issue) => issue.layer))).toEqual(
			new Set(["Attestation"]),
		);

		json.targets[0].memberSegmentIndices = [0, 6, 2];
		expect(
			checkRecord("de/pass-auf-dich-auf", json).errors.map(
				({ check, layer }) => `${check} ${layer}`,
			),
		).toEqual(["Members Segmentation"]);
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
			expect(wald?.reading).toHaveProperty("emojiDescription", "👀");
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
					entry.reviewDepth,
					entry.validThrough,
					[
						...new Set(
							entry.issues.map(
								(issue) => `${issue.check} ${issue.layer}`,
							),
						),
					],
					entry.legacy.length,
				]),
			).toEqual([
				["de/imported", "Reading", "Reading", [], 1],
				[
					"de/out-of-order",
					undefined,
					undefined,
					[
						"Members Segmentation",
						"Members Attestation",
						"Reading Reading",
					],
					0,
				],
				[
					"de/unnamed",
					undefined,
					"Attestation",
					["Reading Reading"],
					0,
				],
				["text/raw", undefined, undefined, [], 1],
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

	test("the demotion script demotes a reviewed record to its deepest passing layer", () => {
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
			const unnamed = review(seedJson("de/ich-bin-im-wald"));
			delete unnamed.targets[0].reading;
			write("de/unnamed", unnamed);
			const uncited = seedJson("de/ich-bin-im-wald");
			uncited.reviewDepth = "Segmentation";
			write("de/uncited", uncited);

			expect(demoteBrokenReviewed(directory)).toEqual([
				{ record: "de/broken", from: "Reading", to: "Segmentation" },
				{ record: "de/uncited", from: "Segmentation" },
				{ record: "de/unnamed", from: "Reading", to: "Attestation" },
			]);
			expect(seedFile(directory, "de/broken")).toEqual({
				...broken,
				reviewDepth: "Segmentation",
			});
			expect(seedFile(directory, "de/uncited")).not.toHaveProperty(
				"reviewDepth",
			);
			expect(seedFile(directory, "de/valid").reviewDepth).toBe("Reading");
			const { issues, worklist } = readRecords(directory);
			expect(issues).toEqual([]);
			expect(worklist.map((entry) => entry.record)).toEqual([
				"de/broken",
				"de/draft",
				"de/uncited",
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
