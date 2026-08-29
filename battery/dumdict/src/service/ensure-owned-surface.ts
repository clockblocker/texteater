import type { SupportedLanguage } from "dumling/types";
import { sameLemma } from "../core/identity";
import { planEnsureOwnedSurface } from "../core/plan-mutation";
import type {
	DumdictMutationOptions,
	EnsureOwnedSurfaceRequest,
	MutationResult,
} from "../public";
import { applyPlan } from "./apply-plan";
import { assertLanguageMatches } from "./language-guard";
import { loadReadingEntryContext } from "./load-reading-entry-context";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export async function ensureOwnedSurface<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: EnsureOwnedSurfaceRequest<L>,
	mutationOptions?: DumdictMutationOptions<L>,
): Promise<MutationResult<L>> {
	assertLanguageMatches(options.language, request.reading.lemma.language);
	assertLanguageMatches(
		options.language,
		request.ownedSurface.surface.language,
	);
	assertLanguageMatches(
		options.language,
		request.ownedSurface.surface.lemma.language,
	);
	if (!sameLemma(request.ownedSurface.surface.lemma, request.reading.lemma)) {
		return {
			status: "rejected",
			code: "invalidDraft",
			message: "The owned Surface must realize the Reading's Lemma.",
		};
	}

	const slice = await loadReadingEntryContext(options, {
		intent: "ensureOwnedSurface",
		request,
	});
	const plan = planEnsureOwnedSurface(slice, request);
	if (plan.status === "rejected") return plan;
	return applyPlan(options, plan, mutationOptions);
}
