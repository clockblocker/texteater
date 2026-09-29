export type EvaluationVerdict =
	| "Passed"
	| "Failed"
	| "NeedsReview"
	| "Unscored";

/** Reads the evaluator's contract, never the execution status alone. Unknown metrics stay unscored. */
export function evaluationVerdict(record: {
	status: string;
	evaluation?: unknown;
}): EvaluationVerdict {
	const evaluation = record.evaluation;
	if (
		record.status !== "Success" ||
		!evaluation ||
		typeof evaluation !== "object"
	)
		return "Unscored";
	if ("needsReview" in evaluation && evaluation.needsReview === true)
		return "NeedsReview";
	if ("contractPass" in evaluation && evaluation.contractPass === true)
		return "Passed";
	if ("contractPass" in evaluation && evaluation.contractPass === false)
		return "Failed";
	return "Unscored";
}

/** Execution success and evaluator acceptance are independent. Unknown metrics stay unscored. */
export function summarizeQuality(
	records: readonly { status: string; evaluation?: unknown }[],
) {
	const counts = { passed: 0, failed: 0, needsReview: 0, unscored: 0 };
	for (const record of records) {
		const verdict = evaluationVerdict(record);
		if (verdict === "Passed") counts.passed++;
		else if (verdict === "Failed") counts.failed++;
		else if (verdict === "NeedsReview") counts.needsReview++;
		else counts.unscored++;
	}
	return counts;
}
