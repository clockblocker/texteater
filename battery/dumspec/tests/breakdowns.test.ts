import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type BreakdownRecordCheck,
	checkBreakdownRecord,
} from "../src/check-breakdown.js";
import { loadBreakdownRecords } from "../src/index.js";
import type { SpecCheck } from "../src/issues.js";
import { readRecords } from "../src/load.js";
import { ruleCitation, seedJson } from "./negative-fixtures.js";

const seed = "breakdown/de/den-faden-verlieren";

describe("Breakdown Records", () => {
	const breakdowns = loadBreakdownRecords();

	test("load the German Breakdowns of both Families", () => {
		expect(
			breakdowns.map(({ id, lemma }) => [id, lemma.family, lemma.kind]),
		).toEqual([
			["breakdown/de/da-liegt-der-hase-im-pfeffer", "Locution", "VERB"],
			["breakdown/de/den-faden-verlieren", "Locution", "VERB"],
			["breakdown/de/den-nagel-auf-den-kopf-treffen", "Locution", "VERB"],
			["breakdown/de/guten-morgen", "Locution", "INTJ"],
			["breakdown/de/guten-tag", "Locution", "INTJ"],
			["breakdown/de/morgenstund-hat-gold-im-mund", "Saying", "Saying"],
			["breakdown/de/na-ja", "Locution", "INTJ"],
			["breakdown/de/nur-bahnhof-verstehen", "Locution", "VERB"],
			["breakdown/de/uebung-macht-den-meister", "Saying", "Saying"],
			["breakdown/de/um-zu", "Locution", "SCONJ"],
			["breakdown/de/wer-zuerst-kommt-mahlt-zuerst", "Saying", "Saying"],
		]);
	});

	test("read den Faden verlieren as [den, Faden] NOUN and [verlieren] VERB, Faden literally", () => {
		const faden = breakdowns.find((record) => record.id === seed);
		expect(
			faden?.targets.map(({ attestation, reading }) => [
				attestation.members.map((member) => member.attested),
				attestation.surface.lemma.kind,
				reading && "emojiDescription" in reading
					? reading.emojiDescription
					: undefined,
			]),
		).toEqual([
			[["den", "Faden"], "NOUN", "🧵"],
			[["verlieren"], "VERB", "🫳"],
		]);
	});
});

/** Each edits the seed so that exactly one check fails. */
const fixtures: {
	name: string;
	id?: string;
	check: SpecCheck;
	edit: (record: ReturnType<typeof seedJson>) => void;
}[] = [
	{
		name: "a path outside breakdown/<language>/<kebab-case>",
		id: "breakdown/Den_Faden",
		check: "Id",
		edit: () => {},
	},
	{
		name: "a Coverage field, which a Breakdown does not have",
		check: "Shape",
		edit: (record) => {
			record.coverage = "Full";
		},
	},
	{
		name: "a wording that is not the Lemma's Canonical Form",
		check: "Wording",
		edit: (record) => {
			record.lemma.canonicalForm = "den Faden nicht verlieren";
		},
	},
	{
		name: "a Lexeme Lemma",
		check: "Lemma",
		edit: (record) => {
			record.lemma = {
				...record.targets[1].attestation.surface.lemma,
				canonicalForm: "den Faden verlieren",
			};
		},
	},
	{
		name: "a target returning the whole Lemma",
		check: "Breakdown",
		edit: (record) => {
			const [, verlieren] = record.targets;
			verlieren.memberSegmentIndices = [0, 2, 4];
			verlieren.attestation.members = [
				{ attested: "den", orthography: "Standard" },
				{ attested: "Faden", orthography: "Standard" },
				{ attested: "verlieren", orthography: "Standard" },
			];
			verlieren.attestation.surface.normalizedSurface =
				"den Faden verlieren";
			verlieren.attestation.surface.lemma = record.lemma;
			verlieren.route = { family: "Locution", kind: "VERB" };
			delete verlieren.grundform;
			record.targets = [verlieren];
		},
	},
	{
		name: "a word in no target",
		check: "Coverage",
		edit: (record) => {
			record.targets.pop();
		},
	},
	{
		name: "a Reviewed target without its Reading",
		check: "Reading",
		edit: (record) => {
			record.reviewDepth = "Reading";
			record.sources.rules = [ruleCitation];
			delete record.targets[1].reading;
		},
	},
	{
		name: "a reviewed Breakdown citing no Rule",
		check: "Uncited",
		edit: (record) => {
			record.reviewDepth = "Segmentation";
		},
	},
];

/** Each issue's check, keyed with whether it fails the record. */
const issueKeys = (checked: BreakdownRecordCheck) =>
	new Map<string, SpecCheck>([
		...checked.errors.map((issue): [string, SpecCheck] => [
			`error ${issue.check} ${issue.path}`,
			issue.check,
		]),
		...checked.issues.map((issue): [string, SpecCheck] => [
			`work ${issue.check} ${issue.path}`,
			issue.check,
		]),
	]);

describe("Breakdown Record negative fixtures", () => {
	for (const fixture of fixtures)
		test(`fail ${fixture.check}: ${fixture.name}`, () => {
			const json = seedJson(seed);
			const checkedSeed = checkBreakdownRecord(seed, json);
			expect(checkedSeed.errors).toEqual([]);
			expect(checkedSeed.record).toBeDefined();
			const before = issueKeys(checkedSeed);
			fixture.edit(json);
			const added = [
				...issueKeys(checkBreakdownRecord(fixture.id ?? seed, json)),
			].filter(([key]) => !before.has(key));
			expect(new Set(added.map(([, check]) => check))).toEqual(
				new Set([fixture.check]),
			);
		});

	test("the loader lists a failing Draft Breakdown and fails a reviewed one", () => {
		const directory = mkdtempSync(join(tmpdir(), "dumspec-records-"));
		const write = (id: string, record: unknown) =>
			writeFileSync(
				join(directory, `${id}.json`),
				JSON.stringify(record),
			);
		try {
			mkdirSync(join(directory, "breakdown/de"), { recursive: true });
			write("breakdown/de/valid", seedJson(seed));
			const draft = seedJson(seed);
			draft.targets.pop();
			delete draft.targets[0].reading;
			write("breakdown/de/draft", draft);
			const reviewed = seedJson(seed);
			reviewed.reviewDepth = "Segmentation";
			reviewed.sources.rules = [ruleCitation];
			reviewed.targets.pop();
			write("breakdown/de/reviewed", reviewed);
			const { breakdownRecords, issues, worklist } =
				readRecords(directory);
			expect(breakdownRecords.map((record) => record.id)).toEqual([
				"breakdown/de/valid",
			]);
			expect(
				issues.map((issue) => `${issue.record} ${issue.check}`),
			).toEqual(["breakdown/de/reviewed Coverage"]);
			expect(
				worklist.map((entry) => [
					entry.record,
					entry.issues.map((issue) => `${issue.check} ${issue.path}`),
				]),
			).toEqual([
				[
					"breakdown/de/draft",
					["Reading targets.0.reading", "Coverage segments.4"],
				],
			]);
		} finally {
			rmSync(directory, { recursive: true });
		}
	});
});
