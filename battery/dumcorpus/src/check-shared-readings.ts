import { readingIdentityKey } from "dumling";
import type { SpecRecordId, SpecTarget } from "./corpus-types.js";
import type { SpecIssue } from "./issues.js";
import { sameValue } from "./same-value.js";

/** A loaded record whose targets may carry Knowledge: a Spec or Breakdown Record. */
type RecordWithTargets = {
	readonly id: SpecRecordId;
	readonly targets: readonly SpecTarget[];
};

type Occurrence = {
	readonly record: SpecRecordId;
	readonly target: number;
	readonly value: unknown;
};

/**
 * The shared-Reading guard (#884). A Reading that appears in several records,
 * matched by Dumling's `readingIdentityKey`, carries one Knowledge value and
 * one coverage, so its gold is scored once. Returns an issue at every
 * occurrence of a Reading whose occurrences disagree. A target that holds no
 * Knowledge yet takes no part.
 */
export function sharedReadingIssues(
	records: readonly RecordWithTargets[],
): SpecIssue[] {
	const byReading = new Map<string, Occurrence[]>();
	for (const record of records)
		for (const [index, target] of record.targets.entries()) {
			if (target.reading === undefined || target.knowledge === undefined)
				continue;
			const key = readingIdentityKey(target.reading);
			byReading.set(key, [
				...(byReading.get(key) ?? []),
				{
					record: record.id,
					target: index,
					value: {
						knowledge: target.knowledge,
						coverage: target.coverage ?? null,
					},
				},
			]);
		}
	const issues: SpecIssue[] = [];
	for (const occurrences of byReading.values()) {
		const [first] = occurrences;
		if (
			first === undefined ||
			occurrences.every(({ value }) => sameValue(value, first.value))
		)
			continue;
		for (const occurrence of occurrences) {
			const others = occurrences
				.filter(({ value }) => !sameValue(value, occurrence.value))
				.map(({ record, target }) => `${record} targets.${target}`);
			issues.push({
				record: occurrence.record,
				check: "SharedReading",
				layer: "Knowledge",
				path: `targets.${occurrence.target}.reading`,
				message: `This Reading carries other Knowledge or coverage in ${[...new Set(others)].join(", ")}; a Reading shared by records carries one value`,
			});
		}
	}
	return issues;
}
