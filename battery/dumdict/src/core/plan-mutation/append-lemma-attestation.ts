import type { SupportedLanguage } from "../../dumling";
import type { LemmaPatchSlice } from "../../storage";
import type {
	AppendLemmaAttestationIntent,
	PlanMutationRejected,
	PlanMutationResult,
} from "./result";

export function planAppendLemmaAttestation<L extends SupportedLanguage>(
	slice: LemmaPatchSlice<L>,
	intent: AppendLemmaAttestationIntent<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	if (!slice.lemma) {
		return {
			status: "rejected",
			code: "lemmaMissing",
			message: "Lemma does not exist.",
		};
	}
	if (slice.lemma.id !== intent.lemmaId) {
		throw new Error(
			"lemma patch slice lemma id does not match the requested lemma id.",
		);
	}

	return {
		status: "planned",
		baseRevision: slice.revision,
		intent,
		changes: [
			{
				type: "patchLemma",
				lemmaId: intent.lemmaId,
				ops: [{ kind: "addAttestation", value: intent.attestation }],
				preconditions: [
					{ kind: "revisionMatches", revision: slice.revision },
					{ kind: "lemmaExists", lemmaId: intent.lemmaId },
					{
						kind: "lemmaAttestationMissing",
						lemmaId: intent.lemmaId,
						value: intent.attestation,
					},
				],
			},
		],
		affected: { lemmaIds: [intent.lemmaId] },
		summary: { message: "Added lemma attestation." },
	};
}
