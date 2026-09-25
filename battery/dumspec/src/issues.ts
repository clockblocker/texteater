import type { SpecRecordId } from "./types.js";

export type SpecCheck =
	| "Id"
	| "Shape"
	| "Attestation"
	| "Segments"
	| "Members"
	| "Coverage"
	| "Grundform"
	| "UnknownCitation"
	| "StaleCitation";

/** One failed check on one record. `path` points into the record file. */
export interface SpecIssue {
	record: SpecRecordId;
	check: SpecCheck;
	path: string;
	message: string;
}

/** Thrown by the loader when any record fails a check. */
export class SpecRecordError extends Error {
	override readonly name = "SpecRecordError";

	constructor(readonly issues: readonly SpecIssue[]) {
		super(
			`${issues.length} Spec Record issue(s):\n${issues
				.map(
					(issue) =>
						`- ${issue.record} ${issue.path} [${issue.check}]: ${issue.message}`,
				)
				.join("\n")}`,
		);
	}
}
