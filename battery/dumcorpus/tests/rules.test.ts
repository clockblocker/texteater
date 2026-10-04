import { describe, expect, test } from "bun:test";
import {
	checkRules,
	checkRulesAwaitingRecords,
	longStatements,
	rulesNeedingRecords,
} from "../src/check-rules.js";
import { loadSpecRecords, rules } from "../src/index.js";
import { rulesAwaitingRecords } from "../src/rules-awaiting-records.js";
import type { Rule } from "../src/types.js";
import { readRepositoryAdrIds } from "./adr-ids.js";

const adrs = readRepositoryAdrIds();
const recordIds = loadSpecRecords().map((record) => record.id);
const checks = (checked: readonly Rule[]) =>
	checkRules(checked, { adrs, recordIds }).map((issue) => issue.message);

describe("the Rules", () => {
	test("rest on current ADRs and show existing records", () => {
		expect(rules.length).toBeGreaterThan(0);
		expect(checks(rules)).toEqual([]);
	});

	test("each show a record, unless an entry names the issue it awaits", () => {
		expect(rulesNeedingRecords(rules, rulesAwaitingRecords)).toEqual([]);
		expect(
			checkRulesAwaitingRecords(rules, rulesAwaitingRecords, recordIds),
		).toEqual([]);
	});

	test("warn about statements past 600 characters, without failing", () => {
		const long = longStatements(rules);
		if (long.length > 0)
			console.warn(
				`${long.length} Rules state more than a principle (ADR 0037):\n${long
					.map(({ rule, length }) => `${rule} (${length})`)
					.join("\n")}`,
			);
	});
});

describe("the Rule checks", () => {
	const rule: Rule = {
		id: "de/noun-owns-its-article",
		statement: "A German common noun owns its article.",
		adrs: ["ADR-0035"],
		routes: [{ language: "de", family: "Lexeme", kind: "NOUN" }],
		records: ["de/ich-bin-im-wald"],
	};

	test("name a Rule without records as needing one, unless an entry excuses it", () => {
		const waiting = { ...rule, id: "de/waiting", records: [] };
		expect(rulesNeedingRecords([rule, waiting])).toEqual(["de/waiting"]);
		expect(
			rulesNeedingRecords(
				[rule, waiting],
				[{ rule: "de/waiting", issue: 1, why: "Blocked" }],
			),
		).toEqual([]);
	});

	test("fail an awaiting entry for no Rule, a Rule with records or a missing record", () => {
		const waiting = { ...rule, id: "de/waiting", records: [] };
		expect(
			checkRulesAwaitingRecords(
				[rule, waiting],
				[
					{ rule: "de/gone", issue: 1, why: "Blocked" },
					{ rule: rule.id, issue: 1, why: "Blocked" },
					{
						rule: "de/waiting",
						issue: 1,
						why: "Linking",
						showing: ["de/ich-bin-im-wald", "de/no-such-record"],
					},
				],
				["de/ich-bin-im-wald"],
			).map((issue) => `${issue.rule}: ${issue.message}`),
		).toEqual([
			"de/gone: No such Rule",
			"de/noun-owns-its-article: The Rule lists records now; remove its awaiting entry",
			"de/waiting: No Spec Record de/no-such-record",
		]);
	});

	test("warn about a long statement unless it gives a reason", () => {
		const long = { ...rule, id: "de/long", statement: "x".repeat(601) };
		const excused = { ...long, id: "de/excused", longStatement: "A table" };
		expect(longStatements([rule, long, excused])).toEqual([
			{ rule: "de/long", length: 601 },
		]);
	});

	test("fail a long-statement reason that is empty or not needed", () => {
		expect(
			checks([
				{ ...rule, statement: "x".repeat(601), longStatement: " " },
				{ ...rule, id: "de/short", longStatement: "A table" },
			]),
		).toEqual([
			"longStatement gives no reason",
			"longStatement is set, but the statement is within 600 characters",
		]);
	});

	test("fail a bad id, a foreign route, a missing ADR or a missing record", () => {
		expect(checks([rule])).toEqual([]);
		expect(
			checks([
				rule,
				{
					...rule,
					routes: [
						{ language: "en", family: "Lexeme", kind: "NOUN" },
					],
					adrs: ["ADR-0033", "ADR-9999"],
					records: ["de/no-such-record"],
				},
				{ ...rule, id: "German/Noun" },
			]),
		).toEqual([
			"Another Rule has this id",
			"Route en/Lexeme/NOUN is not in the Rule's language",
			"No ADR ADR-0033",
			"No ADR ADR-9999",
			"No Spec Record de/no-such-record",
			"A Rule id is <language>/<kebab-case name>, in ASCII",
			"Route de/Lexeme/NOUN is not in the Rule's language",
		]);
	});
});
