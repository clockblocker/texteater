import { describe, expect, test } from "bun:test";
import { unitRoutes } from "../src/generated/routes.js";
import { loadSpecRecords, loadSpecSegmentations, rules } from "../src/index.js";
import {
	type CrosswalkContext,
	checkSttsCrosswalk,
	sttsGold,
} from "../src/stts/check-crosswalk.js";
import { germanSttsCrosswalk } from "../src/stts/crosswalk.js";
import { renderSttsTable } from "../src/stts/table.js";
import { type SttsRow, sttsTags } from "../src/stts/types.js";
import { readRepositoryAdrIds } from "./adr-ids.js";

const context: CrosswalkContext = {
	segmentations: loadSpecSegmentations(),
	records: loadSpecRecords(),
	rules,
	adrs: readRepositoryAdrIds(),
	routes: unitRoutes.de ?? [],
};
const messages = (rows: readonly SttsRow[]) =>
	checkSttsCrosswalk(rows, context).map(
		(issue) => `${issue.tag}: ${issue.message}`,
	);

describe("the German STTS crosswalk", () => {
	test("covers the 54 STTS tags and passes its checks", () => {
		expect(sttsTags.length).toBe(54);
		expect(germanSttsCrosswalk.map((row) => row.tag)).toEqual([
			...sttsTags,
		]);
		expect(messages(germanSttsCrosswalk)).toEqual([]);
	});

	test("regenerates the coverage table", () => {
		const table = renderSttsTable(germanSttsCrosswalk, (row) =>
			sttsGold(row, context),
		);
		expect(
			table.split("\n").filter((line) => line.startsWith("| ")).length,
		).toBe(55);
	});
});

describe("the crosswalk checks", () => {
	const row: SttsRow = {
		tag: "PTKNEG",
		stts: "negation particle",
		dumling: "Lexeme PART polarity Neg",
		mappings: [
			{
				use: "nicht",
				becomes: {
					role: "Target",
					route: { family: "Lexeme", kind: "PART" },
				},
				records: [
					{ record: "de/das-ist-nicht-mein-problem", word: "nicht" },
				],
			},
		],
		rules: ["de/nicht-is-part"],
		adrs: [],
		model: { status: "Yes" },
		gold: "Yes",
		pipeline: { status: "No", gaps: [{ gap: "Dumgen", issue: 701 }] },
	};
	const only = (checked: SttsRow) =>
		messages([checked]).filter((message) => !message.endsWith(": No row"));

	test("pass a row whose reviewed record shows its word", () => {
		expect(only(row)).toEqual([]);
	});

	test("fail a missing Rule, ADR or record, or a word that isn't there", () => {
		expect(
			only({
				...row,
				rules: ["de/no-such-rule"],
				adrs: ["ADR-9999"],
				mappings: [
					{
						...row.mappings[0],
						records: [
							{ record: "de/no-such-record", word: "nicht" },
							{
								record: "de/das-ist-nicht-mein-problem",
								word: "gar",
							},
						],
					} as SttsRow["mappings"][number],
				],
				gold: "No",
			}),
		).toEqual([
			"PTKNEG: No Rule de/no-such-rule",
			"PTKNEG: No ADR ADR-9999",
			"PTKNEG: nicht: No Spec Record de/no-such-record whose Segmentation passes",
			"PTKNEG: nicht: de/das-ist-nicht-mein-problem has no Segment gar",
		]);
	});

	test("fail a record where the word isn't the target, member or component said", () => {
		const [mapping] = row.mappings;
		if (!mapping) throw Error("Expected a mapping");
		expect(
			only({
				...row,
				mappings: [
					{
						...mapping,
						becomes: {
							role: "Member",
							route: { family: "Lexeme", kind: "PART" },
						},
					},
					{
						...mapping,
						use: "as ADV",
						becomes: {
							role: "Target",
							route: { family: "Lexeme", kind: "ADV" },
						},
					},
					{
						...mapping,
						use: "with a Lemma",
						records: [
							{ ...mapping.records[0], lemma: "nie" } as never,
						],
					},
					{
						...mapping,
						use: "fused",
						becomes: {
							role: "Component",
							route: { family: "Lexeme", kind: "PART" },
						},
					},
				],
				gold: "No",
			}),
		).toEqual([
			"PTKNEG: nicht: de/das-ist-nicht-mein-problem nicht is a target alone, not a member",
			"PTKNEG: as ADV: de/das-ist-nicht-mein-problem nicht is in a Lexeme/PART target, not Lexeme/ADV",
			"PTKNEG: with a Lemma: de/das-ist-nicht-mein-problem nicht is in the target of nicht, not nie",
			"PTKNEG: fused: de/das-ist-nicht-mein-problem nicht is no piece of a fused word",
		]);
	});

	test("fail gold claimed without a record reviewed through Attestation", () => {
		const [mapping] = row.mappings;
		if (!mapping) throw Error("Expected a mapping");
		expect(
			only({
				...row,
				mappings: [
					{
						...mapping,
						records: [
							{
								record: "de/niemand-wartet-vor-der-tuer",
								word: "Niemand",
							},
						],
						becomes: {
							role: "Target",
							route: { family: "Lexeme", kind: "PRON" },
						},
					},
				],
			}),
		).toEqual([
			"PTKNEG: Gold is Yes, but records reviewed through Attestation show No",
		]);
	});

	test("fail a mapping with no record and no reason, and a status short of Yes without a gap", () => {
		const [mapping] = row.mappings;
		if (!mapping) throw Error("Expected a mapping");
		expect(
			only({
				...row,
				mappings: [{ ...mapping, records: [] }],
				model: { status: "Partial", gaps: [] },
				gold: "No",
			}),
		).toEqual([
			"PTKNEG: The model status is Partial without a gap",
			"PTKNEG: nicht: no record and no reason",
		]);
	});
});
