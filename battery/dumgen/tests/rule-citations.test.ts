import { describe, expect, test } from "bun:test";
import { checkPromptCitations, rules } from "dumspec";
import { grammarPolicyCitations } from "../src/concrete-lang/de/grammatical-resolution/rule-citations.js";
import {
	fixednessCriteriaCitations,
	notationCitations,
	realizationCriteriaCitations,
} from "../src/concrete-lang/de/sentence-analysis/rule-citations.js";
import { targetCriteriaCitations } from "../src/concrete-lang/de/target-classification/rule-citations.js";

// Each prompt's citations sit in the `rule-citations.ts` beside it. When a
// paragraph changes or a cited Rule is reworded, re-read the paragraph against
// the Rules it implements and update its `opens` or hash there.
const prompts = [
	targetCriteriaCitations,
	notationCitations,
	realizationCriteriaCitations,
	fixednessCriteriaCitations,
	...grammarPolicyCitations,
];

describe("the prompt paragraphs' Rule citations (system ADR 0037)", () => {
	test("every paragraph cites the current statement of a dumspec Rule", () => {
		expect(checkPromptCitations(prompts, rules)).toEqual([]);
	});

	test("rewording a Rule fails exactly the paragraphs citing it", () => {
		const id = "de/noun-owns-its-article";
		const reworded = rules.map((rule) =>
			rule.id === id
				? { ...rule, statement: `${rule.statement} Reworded.` }
				: rule,
		);
		const citing = prompts.flatMap((prompt) =>
			prompt.paragraphs.flatMap((paragraph, index) =>
				paragraph.implements.some((citation) => citation.rule === id)
					? [`${prompt.name} ${index} StaleCitation`]
					: [],
			),
		);
		expect(citing.length).toBeGreaterThan(1);
		expect(
			checkPromptCitations(prompts, reworded).map(
				(issue) => `${issue.prompt} ${issue.paragraph} ${issue.check}`,
			),
		).toEqual(citing);
	});
});
