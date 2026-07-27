import type { PendingLemmaRelation } from "../../dto";
import type { SupportedLanguage } from "../../dumling";

export function uniqueBy<T>(values: T[], keyFor: (value: T) => string): T[] {
	const seen = new Set<string>();
	const uniqueValues: T[] = [];
	for (const value of values) {
		const key = keyFor(value);
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		uniqueValues.push(value);
	}
	return uniqueValues;
}

export function pendingRelationKey<L extends SupportedLanguage>(
	relation: PendingLemmaRelation<L>,
) {
	return [
		relation.sourceLemmaId,
		relation.relationFamily,
		relation.relation,
		relation.targetPendingId,
	].join("\0");
}
