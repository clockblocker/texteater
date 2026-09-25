import { describe, expect, test } from "bun:test";
import { checkCitations } from "../src/check-citations.js";
import { loadSpecRecords, ruleStatementHash } from "../src/index.js";
import type { Rule, SpecRecord } from "../src/types.js";
import { readRepositoryAdrStatuses } from "./adr-statuses.js";

const adrStatuses = readRepositoryAdrStatuses();
const seed = loadSpecRecords().find((record) => record.status === "Reviewed");
if (!seed) throw Error("Expected a Reviewed seed record");

const rule: Rule = {
	id: "de/noun-owns-its-article",
	statement:
		"A German common noun owns its article: the article is the first member of the noun's Attestation.",
	adrs: ["ADR-0035"],
	routes: [{ language: "de", family: "Lexeme", kind: "NOUN" }],
	records: [],
};
const citing = (
	sources: Partial<SpecRecord["sources"]>,
	status: SpecRecord["status"] = "Reviewed",
): SpecRecord => ({
	...seed,
	status,
	sources: { ...seed.sources, ...sources },
});
const checks = (record: SpecRecord, rules: readonly Rule[] = []) =>
	checkCitations([record], { adrStatuses, rules }).map((issue) => [
		issue.path,
		issue.check,
	]);

describe("the stale-citation guard", () => {
	test("reads ADR statuses from the repository", () => {
		expect(adrStatuses.get("ADR-0035")).toBe("accepted");
		expect(adrStatuses.get("ADR-0033")).toBe("superseded by ADR-0036");
		expect(adrStatuses.get("dumgen/ADR-0002")).toStartWith("superseded");
	});

	test("fails a Reviewed record citing a superseded ADR", () => {
		expect(checks(citing({ adrs: ["ADR-0035", "ADR-0033"] }))).toEqual([
			["sources.adrs.1", "StaleCitation"],
		]);
		expect(checks(citing({ adrs: ["dumgen/ADR-0002"] }))).toEqual([
			["sources.adrs.0", "StaleCitation"],
		]);
	});

	test("lets a Draft cite a superseded ADR until its review", () => {
		expect(checks(citing({ adrs: ["ADR-0033"] }, "Draft"))).toEqual([]);
	});

	test("fails any record citing an ADR or Rule that does not exist", () => {
		const unknown = citing(
			{
				adrs: ["ADR-9999"],
				rules: [
					{ rule: rule.id, hash: ruleStatementHash(rule.statement) },
				],
			},
			"Draft",
		);
		expect(checks(unknown)).toEqual([
			["sources.adrs.0", "UnknownCitation"],
			["sources.rules.0", "UnknownCitation"],
		]);
	});

	test("fails a Reviewed record whose cited Rule changed since review", () => {
		const record = citing({
			rules: [{ rule: rule.id, hash: ruleStatementHash(rule.statement) }],
		});
		expect(checks(record, [rule])).toEqual([]);
		const changed = {
			...rule,
			statement: `${rule.statement} A shared article is article evidence.`,
		};
		expect(checks(record, [changed])).toEqual([
			["sources.rules.0.hash", "StaleCitation"],
		]);
		expect(checks({ ...record, status: "Draft" }, [changed])).toEqual([]);
	});

	test("keeps a Rule's hash when its statement is only reflowed", () => {
		expect(ruleStatementHash(rule.statement.replaceAll(" ", "\n  "))).toBe(
			ruleStatementHash(rule.statement),
		);
	});
});
