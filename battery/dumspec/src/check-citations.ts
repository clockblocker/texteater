import type { SpecIssue } from "./issues.js";
import { ruleStatementHash } from "./rules.js";
import type {
	AdrId,
	CitingPrompt,
	Rule,
	RuleCitation,
	RuleId,
	SpecRecord,
} from "./types.js";

/**
 * Each ADR's frontmatter status, such as `accepted` or `superseded by
 * ADR-0036`. Hosts read it from the repository's ADR files.
 */
export type AdrStatuses = ReadonlyMap<AdrId, string>;

/** An ADR status that reopens whatever cites the ADR. */
export const staleAdrStatus = /^(?:superseded|deprecated)\b/u;

type RuleCitationCheck =
	| { check: "UnknownCitation" | "StaleCitation"; message: string }
	| undefined;

/** Whether a Rule citation names a Rule, and whether its hash is current. */
function checkRuleCitation(
	citation: RuleCitation,
	rulesById: ReadonlyMap<RuleId, Rule>,
	reopen: string,
): RuleCitationCheck {
	const rule = rulesById.get(citation.rule);
	if (rule === undefined)
		return {
			check: "UnknownCitation",
			message: `No Rule ${citation.rule}`,
		};
	const hash = ruleStatementHash(rule.statement);
	if (hash === citation.hash) return undefined;
	return {
		check: "StaleCitation",
		message: `Rule ${rule.id} changed since ${reopen} and cite hash ${hash}`,
	};
}

const byId = (rules: readonly Rule[]) =>
	new Map(rules.map((rule) => [rule.id, rule]));

/**
 * The stale-citation guard (ADR 0037, guard 1). Every record must cite ADRs
 * and Rules that exist. A Reviewed record must not cite a superseded or
 * deprecated ADR, or a Rule whose statement changed since its review.
 */
export function checkCitations(
	records: readonly SpecRecord[],
	context: { adrStatuses: AdrStatuses; rules: readonly Rule[] },
): SpecIssue[] {
	const rulesById = byId(context.rules);
	const issues: SpecIssue[] = [];
	for (const record of records) {
		const issue = (
			check: SpecIssue["check"],
			path: string,
			message: string,
		) => issues.push({ record: record.id, check, path, message });
		const reviewed = record.status === "Reviewed";
		for (const [index, adr] of record.sources.adrs.entries()) {
			const path = `sources.adrs.${index}`;
			const status = context.adrStatuses.get(adr);
			if (status === undefined)
				issue("UnknownCitation", path, `No ADR ${adr}`);
			else if (reviewed && staleAdrStatus.test(status))
				issue(
					"StaleCitation",
					path,
					`${adr} is ${status}; re-review the record against the ADR that replaced it`,
				);
		}
		for (const [index, citation] of record.sources.rules.entries()) {
			const path = `sources.rules.${index}`;
			const checked = checkRuleCitation(
				citation,
				rulesById,
				"review; re-review the record",
			);
			if (checked?.check === "UnknownCitation")
				issue(checked.check, path, checked.message);
			else if (checked && reviewed)
				issue(checked.check, `${path}.hash`, checked.message);
		}
	}
	return issues;
}

/** One failed check on one paragraph of a citing prompt. */
export interface PromptIssue {
	prompt: string;
	/** The paragraph's index, one per line of the prompt text. */
	paragraph: number;
	check: "Paragraphs" | "Uncited" | "UnknownCitation" | "StaleCitation";
	message: string;
}

/**
 * The stale-citation guard for prompt paragraphs (ADR 0037, guard 1). Each
 * line of a prompt is a paragraph, and its citation must find it by its
 * opening words and cite at least one Rule. A paragraph citing a Rule whose
 * statement changed since the paragraph was checked against it fails until
 * someone re-reads the paragraph and cites the new hash.
 */
export function checkPromptCitations(
	prompts: readonly CitingPrompt[],
	rules: readonly Rule[],
): PromptIssue[] {
	const rulesById = byId(rules);
	const issues: PromptIssue[] = [];
	for (const prompt of prompts) {
		const issue = (
			paragraph: number,
			check: PromptIssue["check"],
			message: string,
		) => issues.push({ prompt: prompt.name, paragraph, check, message });
		const lines = prompt.text.split("\n");
		if (lines.length !== prompt.paragraphs.length)
			issue(
				Math.min(lines.length, prompt.paragraphs.length),
				"Paragraphs",
				`The prompt has ${lines.length} paragraph(s) and ${prompt.paragraphs.length} citation(s); cite the Rules each paragraph implements`,
			);
		for (const [index, paragraph] of prompt.paragraphs.entries()) {
			const line = lines[index];
			if (line !== undefined && !line.startsWith(paragraph.opens))
				issue(
					index,
					"Paragraphs",
					`Paragraph ${index} opens ${JSON.stringify(line.slice(0, 40))}, not ${JSON.stringify(paragraph.opens)}; re-check the Rules it implements`,
				);
			if (paragraph.implements.length === 0)
				issue(index, "Uncited", "A paragraph cites at least one Rule");
			for (const citation of paragraph.implements) {
				const checked = checkRuleCitation(
					citation,
					rulesById,
					"this paragraph was checked; re-read the paragraph against it",
				);
				if (checked) issue(index, checked.check, checked.message);
			}
		}
	}
	return issues;
}
