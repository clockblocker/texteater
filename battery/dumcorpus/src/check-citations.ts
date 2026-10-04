import type { SpecIssue } from "./issues.js";
import { ruleStatementHash } from "./rules.js";
import type {
	AdrId,
	AnnotationLayer,
	CitingPrompt,
	ReviewStatus,
	Rule,
	RuleCitation,
	RuleId,
	Sources,
	SpecRecordId,
} from "./types.js";

/**
 * Each ADR's frontmatter status, such as `accepted` or `superseded by
 * ADR-0036`. Hosts read it from the repository's ADR files.
 */
export type AdrStatuses = ReadonlyMap<AdrId, string>;

/** An ADR status that reopens whatever cites the ADR. */
export const staleAdrStatus = /^(?:superseded|deprecated)\b/u;

/** The hash a citation of Rule `id` stores now; undefined for no such Rule. */
function currentHash(id: RuleId, rules: readonly Rule[]): string | undefined {
	const rule = rules.find((candidate) => candidate.id === id);
	return rule && ruleStatementHash(rule.statement);
}

/**
 * Whether a Rule Citation names one of `rules` and pins its current
 * statement: Current, Stale once the Rule is reworded, or Unknown.
 */
export function ruleCitationStatus(
	citation: RuleCitation,
	rules: readonly Rule[],
): "Current" | "Stale" | "Unknown" {
	const hash = currentHash(citation.rule, rules);
	if (hash === undefined) return "Unknown";
	return hash === citation.hash ? "Current" : "Stale";
}

type RuleCitationCheck =
	| { check: "UnknownCitation" | "StaleCitation"; message: string }
	| undefined;

/** Whether a Rule citation names a Rule, and whether its hash is current. */
function checkRuleCitation(
	citation: RuleCitation,
	rules: readonly Rule[],
	reopen: string,
): RuleCitationCheck {
	switch (ruleCitationStatus(citation, rules)) {
		case "Current":
			return undefined;
		case "Unknown":
			return {
				check: "UnknownCitation",
				message: `No Rule ${citation.rule}`,
			};
		case "Stale":
			return {
				check: "StaleCitation",
				message: `Rule ${citation.rule} changed since ${reopen} and cite hash ${currentHash(citation.rule, rules)}`,
			};
	}
}

/**
 * A record that cites sources: a Spec or Breakdown Record, reviewed through
 * `reviewDepth`, or a Text Record, reviewed whole.
 */
type CitingRecord = {
	id: SpecRecordId;
	reviewDepth?: AnnotationLayer;
	status?: ReviewStatus;
	sources?: Sources;
};

/**
 * The stale-citation guard (ADR 0037, guard 1). Every record must cite ADRs
 * and Rules that exist. A record reviewed through any layer must not cite a
 * superseded or deprecated ADR, or a Rule whose statement changed since its
 * review: Rules are not assigned to layers, so either reopens the record.
 */
export function checkCitations(
	records: readonly CitingRecord[],
	context: { adrStatuses: AdrStatuses; rules: readonly Rule[] },
): SpecIssue[] {
	const issues: SpecIssue[] = [];
	for (const { id, reviewDepth, status: recordStatus, sources } of records) {
		if (sources === undefined) continue;
		const issue = (
			check: SpecIssue["check"],
			path: string,
			message: string,
		) => issues.push({ record: id, check, path, message });
		const reviewed =
			reviewDepth !== undefined || recordStatus === "Reviewed";
		for (const [index, adr] of sources.adrs.entries()) {
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
		for (const [index, citation] of sources.rules.entries()) {
			const path = `sources.rules.${index}`;
			const checked = checkRuleCitation(
				citation,
				context.rules,
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
					rules,
					"this paragraph was checked; re-read the paragraph against it",
				);
				if (checked) issue(index, checked.check, checked.message);
			}
		}
	}
	return issues;
}
