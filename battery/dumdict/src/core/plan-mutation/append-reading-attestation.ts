import type { SupportedLanguage } from "../../dumling";
import type { AddAttestationRequest } from "../../public";
import type { ReadingPatchSlice } from "../../storage";
import { sameReading } from "../identity";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

export function planAppendReadingAttestation<L extends SupportedLanguage>(
	slice: ReadingPatchSlice<L>,
	request: AddAttestationRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	if (!slice.reading) {
		return {
			status: "rejected",
			code: "readingMissing",
			message: "Reading does not exist.",
		};
	}
	if (!sameReading(slice.reading.reading, request.reading)) {
		throw new Error(
			"reading patch slice does not match the requested Reading identity.",
		);
	}

	return {
		status: "planned",
		baseRevision: slice.revision,
		changes: [
			{
				type: "patchReading",
				reading: request.reading,
				ops: [{ kind: "addAttestation", value: request.attestation }],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "readingExists", reading: request.reading },
					{
						kind: "readingAttestationMissing",
						reading: request.reading,
						value: request.attestation,
					},
				],
			},
		],
		affected: { readings: [request.reading] },
		summary: { message: "Added reading attestation." },
	};
}
