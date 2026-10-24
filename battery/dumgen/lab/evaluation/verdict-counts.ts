/**
 * Each side's case verdicts in a promptsmith `compareRuns` comparison,
 * counted under every verdict it can give a case.
 */
import type { compareRuns } from "promptsmith/storage";

type RunComparison = ReturnType<typeof compareRuns>;
/** A case's verdict on one side: promptsmith's evaluation verdict, or Mixed. */
type ComparedVerdict = NonNullable<
	RunComparison["cases"][number]["verdict"]["left"]
>;

/**
 * How many of one side's cases got each verdict. The counts are a
 * `Record` over the verdict type, so a verdict promptsmith adds fails the
 * type check here instead of dropping out of the totals; a case absent on
 * that side counts under none.
 */
export function verdictCounts(
	comparison: RunComparison,
	side: "left" | "right",
): Record<ComparedVerdict, number> {
	const counts: Record<ComparedVerdict, number> = {
		Passed: 0,
		Failed: 0,
		NeedsReview: 0,
		Mixed: 0,
		Unscored: 0,
	};
	for (const entry of comparison.cases) {
		const verdict = entry.verdict[side];
		if (verdict) counts[verdict]++;
	}
	return counts;
}
