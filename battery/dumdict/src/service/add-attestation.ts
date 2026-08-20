import type { SupportedLanguage } from "dumling/types";
import { planAppendReadingAttestation } from "../core/plan-mutation";
import type {
	AddAttestationRequest,
	DumdictMutationOptions,
	MutationResult,
} from "../public";
import { applyPlan } from "./apply-plan";
import { assertLanguageMatches } from "./language-guard";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export async function addAttestation<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: AddAttestationRequest<L>,
	mutationOptions?: DumdictMutationOptions<L>,
): Promise<MutationResult<L>> {
	assertLanguageMatches(options.language, request.reading.lemma.language);
	const slice = await options.storage.loadReadingForPatch({
		reading: request.reading,
	});
	options.sliceValidation.readingPatch(slice, request.reading);

	const plan = planAppendReadingAttestation(slice, request);
	if (plan.status === "rejected") {
		return plan;
	}

	return applyPlan(options, plan, mutationOptions);
}
