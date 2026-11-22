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

export type RunStatus = "Completed" | "Failed" | "Interrupted";

/** Counts case outcomes in one pass and derives the overall run status. */
export function summarizeRunCounts(
	records: readonly { readonly status: string }[],
): {
	readonly total: number;
	readonly succeeded: number;
	readonly interrupted: number;
	readonly failed: number;
	readonly status: RunStatus;
} {
	let succeeded = 0;
	let interrupted = 0;
	for (const record of records) {
		if (record.status === "Success") succeeded++;
		else if (record.status === "Interrupted") interrupted++;
	}
	const total = records.length;
	const failed = total - succeeded - interrupted;
	const status: RunStatus = interrupted
		? "Interrupted"
		: failed
			? "Failed"
			: "Completed";
	return { total, succeeded, interrupted, failed, status };
}
