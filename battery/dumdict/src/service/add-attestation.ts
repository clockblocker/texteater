import { planAppendReadingAttestation } from "../core/plan-mutation";
import { validateReadingPatchSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type { AddAttestationRequest, MutationResult } from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { assertLanguageMatches } from "./language-guard";
import { mutationResultFromCommit } from "./result-mapping";

export async function addAttestation<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: AddAttestationRequest<L>,
): Promise<MutationResult<L>> {
	assertLanguageMatches(options.language, request.reading.lemma.language);
	const slice = await options.storage.loadReadingForPatch({
		reading: request.reading,
	});
	validateReadingPatchSlice(options.language, slice, request.reading);

	const plan = planAppendReadingAttestation(slice, request);
	if (plan.status === "rejected") {
		return plan;
	}

	const commit = await options.storage.commitChanges({
		baseRevision: plan.baseRevision,
		changes: plan.changes,
	});
	return mutationResultFromCommit(plan, commit);
}
