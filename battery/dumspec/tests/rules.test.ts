import { describe, expect, test } from "bun:test";
import { checkRules, rulesNeedingRecords } from "../src/check-rules.js";
import { loadSpecRecords, rules } from "../src/index.js";
import type { Rule } from "../src/types.js";
import { readRepositoryAdrStatuses } from "./adr-statuses.js";

const adrStatuses = readRepositoryAdrStatuses();
const recordIds = loadSpecRecords().map((record) => record.id);
const checks = (checked: readonly Rule[]) =>
	checkRules(checked, { adrStatuses, recordIds }).map(
		(issue) => issue.message,
	);

describe("the Rules", () => {
	test("rest on current ADRs and show existing records", () => {
		expect(rules.length).toBeGreaterThan(0);
		expect(checks(rules)).toEqual([]);
	});

	test("report the Rules that still need a showing record, without failing", () => {
		const needing = rulesNeedingRecords(rules);
		if (needing.length > 0)
			console.info(
				`${needing.length} of ${rules.length} Rules need a showing record:\n${needing.join("\n")}`,
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

	test("name a Rule without records as needing one", () => {
		const waiting = { ...rule, id: "de/waiting", records: [] };
		expect(rulesNeedingRecords([rule, waiting])).toEqual(["de/waiting"]);
	});

	test("fail a bad id, a foreign route, a superseded ADR or a missing record", () => {
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
			"ADR-0033 is superseded by ADR-0036; restate the Rule on the ADR that replaced it",
			"No ADR ADR-9999",
			"No Spec Record de/no-such-record",
			"A Rule id is <language>/<kebab-case name>, in ASCII",
			"Route de/Lexeme/NOUN is not in the Rule's language",
		]);
	});
});
