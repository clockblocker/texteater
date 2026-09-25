import type * as Dumspec from "dumspec/types";

/**
 * The Spec Record target a projected case comes from, and its Review Status.
 * `target` is null for a case projected from a whole record, such as a
 * sentence analysis. Codegen writes it beside the case, so `evaluate` can
 * split its scores and list Reviewed disagreements without the runtime
 * reading dumspec.
 */
export type CaseOrigin = {
	record: Dumspec.SpecRecordId;
	target: number | null;
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

/**
 * The origin of a case projected from a whole record: Reviewed only when
 * every target is, or, for a record of No Target entries alone, when the
 * record is.
 */
export function recordOriginOf(record: Dumspec.SpecRecord): CaseOrigin {
	const reviewed =
		record.targets.length === 0
			? record.status === "Reviewed"
			: record.targets.every(
					(_, target) =>
						reviewStatusOf(record, target) === "Reviewed",
				);
	return {
		record: record.id,
		target: null,
		status: reviewed ? "Reviewed" : "Draft",
	};
}
