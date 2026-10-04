import { describe, expect, test } from "bun:test";
import { checkCitations } from "../src/check-citations.js";
import {
	checkPromptCitations,
	loadSpecRecords,
	ruleStatementHash,
} from "../src/index.js";
import type {
	AnnotationLayer,
	CitingPrompt,
	Rule,
	SpecRecord,
} from "../src/types.js";
import { readRepositoryAdrIds } from "./adr-ids.js";

const adrs = readRepositoryAdrIds();
const seed = loadSpecRecords().find((record) => record.coverage === "Full");
if (!seed) throw Error("Expected a Full seed record");

const rule: Rule = {
	id: "de/noun-owns-its-article",
	statement:
		"A German common noun owns its article: the article is the first member of the noun's Attestation.",
	adrs: ["ADR-0035"],
	routes: [{ language: "de", family: "Lexeme", kind: "NOUN" }],
	records: [],
};
/** The seed citing `sources`, reviewed through `reviewDepth` or a Draft. */
const citing = (
	sources: Partial<SpecRecord["sources"]>,
	reviewDepth: AnnotationLayer | "Draft" = "Segmentation",
): SpecRecord => {
	const { reviewDepth: _, ...draft } = seed;
	return {
		...draft,
		...(reviewDepth === "Draft" ? {} : { reviewDepth }),
		// The seed's own Rule citations are cleared: each test passes the
		// Rules it checks against.
		sources: { ...seed.sources, rules: [], ...sources },
	};
};
const checks = (record: SpecRecord, rules: readonly Rule[] = []) =>
	checkCitations([record], { adrs, rules }).map((issue) => [
		issue.path,
		issue.check,
	]);

describe("the stale-citation guard", () => {
	test("reads ADR ids from the repository", () => {
		expect(adrs.has("ADR-0035")).toBe(true);
		expect(adrs.has("ADR-0033")).toBe(false);
	});

	test("fails a reviewed record or a Draft citing a deleted ADR", () => {
		expect(checks(citing({ adrs: ["ADR-0035", "ADR-0033"] }))).toEqual([
			["sources.adrs.1", "UnknownCitation"],
		]);
		expect(checks(citing({ adrs: ["ADR-0033"] }, "Draft"))).toEqual([
			["sources.adrs.0", "UnknownCitation"],
		]);
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
		const { reviewDepth: _, ...draft } = record;
		expect(checks(draft, [changed])).toEqual([]);
	});

	test("keeps a Rule's hash when its statement is only reflowed", () => {
		expect(ruleStatementHash(rule.statement.replaceAll(" ", "\n  "))).toBe(
			ruleStatementHash(rule.statement),
		);
	});
});

describe("the stale-citation guard on prompt paragraphs", () => {
	const current = { rule: rule.id, hash: ruleStatementHash(rule.statement) };
	const prompt: CitingPrompt = {
		name: "de/criteria",
		text: "Nouns take their article.\nKeep the article of a name cited with it.",
		paragraphs: [
			{ opens: "Nouns take", implements: [current] },
			{ opens: "Keep the article", implements: [current] },
		],
	};
	const checks = (
		prompts: readonly CitingPrompt[],
		rules: readonly Rule[] = [rule],
	) =>
		checkPromptCitations(prompts, rules).map((issue) => [
			issue.paragraph,
			issue.check,
		]);

	test("passes paragraphs citing the current statements", () => {
		expect(checks([prompt])).toEqual([]);
	});

	test("fails every paragraph citing a changed Rule until re-confirmed", () => {
		const changed = {
			...rule,
			statement: `${rule.statement} A shared article is article evidence.`,
		};
		expect(checks([prompt], [changed])).toEqual([
			[0, "StaleCitation"],
			[1, "StaleCitation"],
		]);
		const reconfirmed = {
			...prompt,
			paragraphs: prompt.paragraphs.map((paragraph) => ({
				...paragraph,
				implements: [
					{
						rule: rule.id,
						hash: ruleStatementHash(changed.statement),
					},
				],
			})),
		};
		expect(checks([reconfirmed], [changed])).toEqual([]);
	});

	test("fails an unknown Rule and an uncited paragraph", () => {
		const [first, second] = prompt.paragraphs;
		if (!first || !second) throw Error("Expected two paragraphs");
		expect(
			checks([
				{
					...prompt,
					paragraphs: [
						{
							...first,
							implements: [{ ...current, rule: "de/none" }],
						},
						{ ...second, implements: [] },
					],
				},
			]),
		).toEqual([
			[0, "UnknownCitation"],
			[1, "Uncited"],
		]);
	});

	test("fails when the paragraphs no longer line up with their citations", () => {
		expect(
			checks([
				{
					...prompt,
					text: `Nouns take their article.\n${prompt.text}`,
				},
			]),
		).toEqual([
			[2, "Paragraphs"],
			[1, "Paragraphs"],
		]);
	});
});
