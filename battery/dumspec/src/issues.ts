import type { AnnotationLayer, SpecRecordId } from "./types.js";

export type SpecCheck =
	| "Id"
	| "Shape"
	| "Lemma"
	| "Wording"
	| "Breakdown"
	| "Route"
	| "Attestation"
	| "Reading"
	| "Knowledge"
	| "AdpositionCase"
	| "ArticleAgreement"
	| "Segments"
	| "Members"
	| "Coverage"
	| "Grundform"
	| "Uncited"
	| "UnknownCitation"
	| "StaleCitation";

/**
 * One failed check on one record. `path` points into the record file, and
 * `layer` names the Annotation Layer the check belongs to; a check of the
 * whole record, such as its id, shape or Rule citation, has none.
 */
export interface SpecIssue {
	record: SpecRecordId;
	check: SpecCheck;
	path: string;
	message: string;
	layer?: AnnotationLayer;
}

/** Thrown by the loader when any record fails a check. */
export class SpecRecordError extends Error {
	override readonly name = "SpecRecordError";

	constructor(readonly issues: readonly SpecIssue[]) {
		super(
			`${issues.length} Spec Record issue(s):\n${issues
				.map(
					(issue) =>
						`- ${issue.record} ${issue.path} [${issue.check}${issue.layer ? `, ${issue.layer}` : ""}]: ${issue.message}`,
				)
				.join("\n")}`,
		);
	}
}
