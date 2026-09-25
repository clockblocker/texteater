import { type AdrStatuses, staleAdrStatus } from "./check-citations.js";
import type { Rule, RuleId, SpecRecordId } from "./types.js";

const idPattern = /^(de|en|he)\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** One failed check on one Rule. */
export interface RuleIssue {
	rule: RuleId;
	message: string;
}

/**
 * Checks the Rules themselves: unique ids of the form `<language>/<name>`,
 * routes in that language, and ADRs and showing records that exist. A Rule
 * resting on a superseded or deprecated ADR fails, as a Reviewed record does.
 */
export function checkRules(
	rules: readonly Rule[],
	context: { adrStatuses: AdrStatuses; recordIds: readonly SpecRecordId[] },
): RuleIssue[] {
	const issues: RuleIssue[] = [];
	const recordIds = new Set(context.recordIds);
	const seen = new Set<RuleId>();
	for (const rule of rules) {
		const issue = (message: string) =>
			issues.push({ rule: rule.id, message });
		if (seen.has(rule.id)) issue("Another Rule has this id");
		seen.add(rule.id);
		const language = idPattern.exec(rule.id)?.[1];
		if (!language)
			issue("A Rule id is <language>/<kebab-case name>, in ASCII");
		if (rule.statement.trim() === "") issue("The statement is empty");
		for (const route of rule.routes)
			if (route.language !== language)
				issue(
					`Route ${route.language}/${route.family}/${route.kind} is not in the Rule's language`,
				);
		for (const adr of rule.adrs) {
			const status = context.adrStatuses.get(adr);
			if (status === undefined) issue(`No ADR ${adr}`);
			else if (staleAdrStatus.test(status))
				issue(
					`${adr} is ${status}; restate the Rule on the ADR that replaced it`,
				);
		}
		for (const record of rule.records)
			if (!recordIds.has(record)) issue(`No Spec Record ${record}`);
	}
	return issues;
}

/** The Rules no Spec Record shows yet. */
export function rulesNeedingRecords(rules: readonly Rule[]): RuleId[] {
	return rules
		.filter((rule) => rule.records.length === 0)
		.map((rule) => rule.id);
}
