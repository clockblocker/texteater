import type * as Dumspec from "dumspec/types";

/**
 * The Spec Record target a projected case comes from, and its Review Status.
 * Codegen writes it beside the case, so `evaluate` can split its scores and
 * list Reviewed disagreements without the runtime reading dumspec.
 */
export type CaseOrigin = {
	record: Dumspec.SpecRecordId;
	target: number;
	status: Dumspec.ReviewStatus;
};

/**
 * The Review Status of one target. It lives on the record today; read it only
 * here, so it can move to each target without touching the projections.
 */
function reviewStatusOf(
	record: Dumspec.SpecRecord,
	_target: number,
): Dumspec.ReviewStatus {
	return record.status;
}

export function caseOriginOf(
	record: Dumspec.SpecRecord,
	target: number,
): CaseOrigin {
	return {
		record: record.id,
		target,
		status: reviewStatusOf(record, target),
	};
}
