import { planAppendLemmaAttestation } from "../core/plan-mutation";
import { validateLemmaPatchSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type { AddAttestationRequest, MutationResult } from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { assertDumlingIdLanguageMatches } from "./language-guard";
import { mutationResultFromCommit } from "./result-mapping";

export async function addAttestation<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: AddAttestationRequest<L>,
): Promise<MutationResult<L>> {
	assertDumlingIdLanguageMatches(options.language, request.lemmaId);

	const slice = await options.storage.loadLemmaForPatch({
		lemmaId: request.lemmaId,
	});
	validateLemmaPatchSlice(options.language, slice, request.lemmaId);

	const plan = planAppendLemmaAttestation(slice, {
		type: "appendLemmaAttestation",
		lemmaId: request.lemmaId,
		attestation: request.attestation,
	});
	if (plan.status === "rejected") {
		return plan;
	}

	const commit = await options.storage.commitChanges({
		baseRevision: plan.baseRevision,
		changes: plan.changes,
	});
	return mutationResultFromCommit(plan, commit);
}
