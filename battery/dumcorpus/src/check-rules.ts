import type { AdrIds } from "./check-citations.js";
import type { Rule, RuleId, SpecRecordId } from "./corpus-types.js";
import { ruleIdPattern } from "./ids.js";

/**
 * The statement length past which a Rule is likely spelling out boundary
 * cases its records should show (ADR 0037).
 */
const statementLimit = 600;

/** One failed check on one Rule. */
export interface RuleIssue {
	rule: RuleId;
	message: string;
}

/**
 * Checks the Rules themselves: unique ids of the form `<language>/<name>`,
 * routes in that language, and ADRs and showing records that exist.
 * A `longStatement` reason must be given and must be needed.
 */
export function checkRules(
	rules: readonly Rule[],
	context: { adrs: AdrIds; recordIds: readonly SpecRecordId[] },
): RuleIssue[] {
	const issues: RuleIssue[] = [];
	const recordIds = new Set(context.recordIds);
	const seen = new Set<RuleId>();
	for (const rule of rules) {
		const issue = (message: string) =>
			issues.push({ rule: rule.id, message });
		if (seen.has(rule.id)) issue("Another Rule has this id");
		seen.add(rule.id);
		const language = ruleIdPattern.exec(rule.id)?.[1];
		if (!language)
			issue("A Rule id is <language>/<kebab-case name>, in ASCII");
		if (rule.statement.trim() === "") issue("The statement is empty");
		if (rule.longStatement !== undefined) {
			if (rule.longStatement.trim() === "")
				issue("longStatement gives no reason");
			if (rule.statement.length <= statementLimit)
				issue(
					`longStatement is set, but the statement is within ${statementLimit} characters`,
				);
		}
		for (const route of rule.routes)
			if (route.language !== language)
				issue(
					`Route ${route.language}/${route.family}/${route.kind} is not in the Rule's language`,
				);
		for (const adr of rule.adrs)
			if (!context.adrs.has(adr)) issue(`No ADR ${adr}`);
		for (const record of rule.records)
			if (!recordIds.has(record)) issue(`No Spec Record ${record}`);
	}
	return issues;
}

/** A Rule whose statement is too long, and its length in characters. */
export interface LongStatement {
	rule: RuleId;
	length: number;
}

/**
 * The Rules whose statement runs past 600 characters without a
 * `longStatement` reason, longest first. A warning, not a failure.
 */
export function longStatements(rules: readonly Rule[]): LongStatement[] {
	return rules
		.filter(
			(rule) =>
				rule.longStatement === undefined &&
				rule.statement.length > statementLimit,
		)
		.map((rule) => ({ rule: rule.id, length: rule.statement.length }))
		.toSorted((a, b) => b.length - a.length);
}

/**
 * A Rule allowed to show no record for now, and the issue that has to act
 * first. `showing` lists records already checked against the statement, for
 * the Rule to link. Remove the entry when the Rule gets its records.
 */
export interface RuleAwaitingRecords {
	rule: RuleId;
	issue: number;
	/** The issue's finding ids, where it numbers them. */
	findings?: readonly string[];
	why: string;
	showing?: readonly SpecRecordId[];
}

/** The Rules no Spec Record shows yet and no `awaiting` entry excuses. */
export function rulesNeedingRecords(
	rules: readonly Rule[],
	awaiting: readonly RuleAwaitingRecords[] = [],
): RuleId[] {
	const excused = new Set(awaiting.map((entry) => entry.rule));
	return rules
		.filter((rule) => rule.records.length === 0 && !excused.has(rule.id))
		.map((rule) => rule.id);
}

/**
 * Fails an `awaiting` entry that names no Rule, names a Rule that lists a
 * record now, or names a showing record that doesn't exist.
 */
export function checkRulesAwaitingRecords(
	rules: readonly Rule[],
	awaiting: readonly RuleAwaitingRecords[],
	recordIds: readonly SpecRecordId[],
): RuleIssue[] {
	const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
	const records = new Set(recordIds);
	return awaiting.flatMap((entry) => {
		const rule = rulesById.get(entry.rule);
		if (!rule) return [{ rule: entry.rule, message: "No such Rule" }];
		return [
			...(rule.records.length > 0
				? [
						{
							rule: entry.rule,
							message:
								"The Rule lists records now; remove its awaiting entry",
						},
					]
				: []),
			...(entry.showing ?? [])
				.filter((record) => !records.has(record))
				.map((record) => ({
					rule: entry.rule,
					message: `No Spec Record ${record}`,
				})),
		];
	});
}
