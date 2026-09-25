import type { SpecIssue } from "./issues.js";
import { ruleStatementHash } from "./rules.js";
import type { AdrId, Rule, SpecRecord } from "./types.js";

/**
 * Each ADR's frontmatter status, such as `accepted` or `superseded by
 * ADR-0036`. Hosts read it from the repository's ADR files.
 */
export type AdrStatuses = ReadonlyMap<AdrId, string>;

const stale = /^(?:superseded|deprecated)\b/u;

/**
 * The stale-citation guard (ADR 0037, guard 1). Every record must cite ADRs
 * and Rules that exist. A Reviewed record must not cite a superseded or
 * deprecated ADR, or a Rule whose statement changed since its review.
 */
export function checkCitations(
	records: readonly SpecRecord[],
	context: { adrStatuses: AdrStatuses; rules: readonly Rule[] },
): SpecIssue[] {
	const rulesById = new Map(context.rules.map((rule) => [rule.id, rule]));
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
			else if (reviewed && stale.test(status))
				issue(
					"StaleCitation",
					path,
					`${adr} is ${status}; re-review the record against the ADR that replaced it`,
				);
		}
		for (const [index, citation] of record.sources.rules.entries()) {
			const path = `sources.rules.${index}`;
			const rule = rulesById.get(citation.rule);
			if (rule === undefined) {
				issue("UnknownCitation", path, `No Rule ${citation.rule}`);
				continue;
			}
			const hash = ruleStatementHash(rule.statement);
			if (reviewed && hash !== citation.hash)
				issue(
					"StaleCitation",
					`${path}.hash`,
					`Rule ${rule.id} changed since review; re-review the record and cite hash ${hash}`,
				);
		}
	}
	return issues;
}
