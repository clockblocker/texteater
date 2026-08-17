import { planAppendReadingAttestation } from "../core/plan-mutation";
import { validateReadingPatchSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type {
	AddAttestationRequest,
	DumdictMutationOptions,
	MutationResult,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { applyPlan } from "./apply-plan";
import { assertLanguageMatches } from "./language-guard";

export async function addAttestation<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: AddAttestationRequest<L>,
	mutationOptions?: DumdictMutationOptions<L>,
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

	return applyPlan(options, plan, mutationOptions);
}
