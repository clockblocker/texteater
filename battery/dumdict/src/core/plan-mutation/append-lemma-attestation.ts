import type { SupportedLanguage } from "../../dumling";
import type { AddAttestationRequest } from "../../public";
import type { LemmaPatchSlice } from "../../storage";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

export function planAppendLemmaAttestation<L extends SupportedLanguage>(
	slice: LemmaPatchSlice<L>,
	request: AddAttestationRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	if (!slice.lemma) {
		return {
			status: "rejected",
			code: "lemmaMissing",
			message: "Lemma does not exist.",
		};
	}
	if (slice.lemma.id !== request.lemmaId) {
		throw new Error(
			"lemma patch slice lemma id does not match the requested lemma id.",
		);
	}

	return {
		status: "planned",
		baseRevision: slice.revision,
		changes: [
			{
				type: "patchLemma",
				lemmaId: request.lemmaId,
				ops: [{ kind: "addAttestation", value: request.attestation }],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "lemmaExists", lemmaId: request.lemmaId },
					{
						kind: "lemmaAttestationMissing",
						lemmaId: request.lemmaId,
						value: request.attestation,
					},
				],
			},
		],
		affected: { lemmaIds: [request.lemmaId] },
		summary: { message: "Added lemma attestation." },
	};
}
