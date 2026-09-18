/** Execution success and evaluator acceptance are independent. Unknown metrics stay unscored. */
export function summarizeQuality(
	records: readonly { status: string; evaluation?: unknown }[],
) {
	const counts = { passed: 0, failed: 0, needsReview: 0, unscored: 0 };
	for (const record of records) {
		const evaluation = record.evaluation;
		if (
			record.status !== "Success" ||
			!evaluation ||
			typeof evaluation !== "object"
		) {
			counts.unscored++;
		} else if (
			"needsReview" in evaluation &&
			evaluation.needsReview === true
		) {
			counts.needsReview++;
		} else if (
			"contractPass" in evaluation &&
			evaluation.contractPass === true
		) {
			counts.passed++;
		} else if (
			"contractPass" in evaluation &&
			evaluation.contractPass === false
		) {
			counts.failed++;
		} else counts.unscored++;
	}
	return counts;
}
