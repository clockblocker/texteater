import { sameLemma } from "../core/identity";
import { planAddNewNote } from "../core/plan-mutation";
import { validateNewNoteSlice } from "../core/validate-slice";
import type { SupportedLanguage } from "../dumling";
import type {
	AddNewNoteRequest,
	DumdictMutationOptions,
	MutationResult,
} from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import { applyPlan } from "./apply-plan";
import { assertLanguageMatches } from "./language-guard";

export async function addNewNote<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: AddNewNoteRequest<L>,
	mutationOptions?: DumdictMutationOptions<L>,
): Promise<MutationResult<L>> {
	assertLanguageMatches(
		options.language,
		request.draft.reading.lemma.language,
	);
	for (const ownedSurface of request.draft.ownedSurfaces ?? []) {
		assertLanguageMatches(options.language, ownedSurface.surface.language);
		assertLanguageMatches(
			options.language,
			ownedSurface.surface.lemma.language,
		);
		if (
			!sameLemma(ownedSurface.surface.lemma, request.draft.reading.lemma)
		) {
			return {
				status: "rejected",
				code: "invalidDraft",
				message:
					"Owned Surfaces must belong to the draft Reading's Lemma.",
			};
		}
	}

	const slice = await options.storage.loadNewNoteContext(request);
	validateNewNoteSlice(options.language, slice, request.draft);

	const plan = planAddNewNote(slice, request);
	if (plan.status === "rejected") {
		return plan;
	}

	return applyPlan(options, plan, mutationOptions);
}
