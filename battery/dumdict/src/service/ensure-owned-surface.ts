import { sameLemma } from "../core/identity";
import { planEnsureOwnedSurface } from "../core/plan-mutation";
import type { SupportedLanguage } from "../dumling";
import type {
	DumdictMutationOptions,
	EnsureOwnedSurfaceRequest,
	MutationResult,
} from "../public";
import { applyPlan } from "./apply-plan";
import { assertLanguageMatches } from "./language-guard";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

const emptyNote = {
	attestedTranslations: [] as string[],
	attestations: [] as string[],
	notes: "",
};

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

	const draft = {
		reading: request.reading,
		note: emptyNote,
		ownedSurfaces: [request.ownedSurface],
	};
	const slice = await options.storage.loadNewNoteContext({ draft });
	options.sliceValidation.newNote(slice, draft);
	const plan = planEnsureOwnedSurface(slice, request);
	if (plan.status === "rejected") return plan;
	return applyPlan(options, plan, mutationOptions);
}
