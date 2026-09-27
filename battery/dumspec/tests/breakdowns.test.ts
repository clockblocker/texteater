import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkBreakdownRecord } from "../src/check-breakdown.js";
import { loadBreakdownRecords } from "../src/index.js";
import type { SpecCheck } from "../src/issues.js";
import { readRecords } from "../src/load.js";
import { ruleCitation, seedJson } from "./negative-fixtures.js";

const seed = "breakdown/de/den-faden-verlieren";

describe("Breakdown Records", () => {
	const breakdowns = loadBreakdownRecords();

	test("load one German Breakdown per Family", () => {
		expect(
			breakdowns.map(({ id, lemma }) => [id, lemma.family, lemma.kind]),
		).toEqual([
			["breakdown/de/den-faden-verlieren", "Locution", "VERB"],
			["breakdown/de/uebung-macht-den-meister", "Saying", "Saying"],
		]);
	});

	test("read den Faden verlieren as [den, Faden] NOUN and [verlieren] VERB, Faden literally", () => {
		const faden = breakdowns.find((record) => record.id === seed);
		expect(
			faden?.targets.map(({ attestation, reading }) => [
				attestation.members.map((member) => member.attested),
				attestation.surface.lemma.kind,
				reading?.emojiDescription,
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
			delete verlieren.grundform;
			delete verlieren.reading;
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
			record.status = "Reviewed";
			record.sources.rules = [ruleCitation];
			delete record.targets[1].reading;
		},
	},
	{
		name: "a Reviewed Breakdown citing no Rule",
		check: "Uncited",
		edit: (record) => {
			record.status = "Reviewed";
		},
	},
];

describe("Breakdown Record negative fixtures", () => {
	for (const fixture of fixtures)
		test(`fail ${fixture.check}: ${fixture.name}`, () => {
			const json = seedJson(seed);
			expect(checkBreakdownRecord(seed, json).success).toBe(true);
			fixture.edit(json);
			const checked = checkBreakdownRecord(fixture.id ?? seed, json);
			if (checked.success) throw Error("Expected the fixture to fail");
			expect(new Set(checked.issues.map((issue) => issue.check))).toEqual(
				new Set([fixture.check]),
			);
		});

	test("the loader lists a failing Draft Breakdown and fails a Reviewed one", () => {
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
			reviewed.status = "Reviewed";
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
					entry.issues.map((issue) => issue.check),
					entry.targetsWithoutReading,
				]),
			).toEqual([["breakdown/de/draft", ["Coverage"], [0]]]);
		} finally {
			rmSync(directory, { recursive: true });
		}
	});
});
