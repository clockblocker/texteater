import { planAddNewNote } from "../core/plan-mutation";
import { validateNewNoteSlice } from "../core/validate-slice";
import {
	getLanguageApi,
	makeDumlingIdFor,
	type SupportedLanguage,
} from "../dumling";
import type { AddNewNoteRequest, MutationResult } from "../public";
import type { CreateDumdictServiceOptions } from "../storage";
import {
	assertDumlingIdLanguageMatches,
	assertLanguageMatches,
} from "./language-guard";
import { mutationResultFromCommit } from "./result-mapping";

export async function addNewNote<L extends SupportedLanguage>(
	options: CreateDumdictServiceOptions<L>,
	request: AddNewNoteRequest<L>,
): Promise<MutationResult<L>> {
	assertLanguageMatches(options.language, request.draft.lemma.language);
	const languageApi = getLanguageApi(options.language);
	const draftLemmaId = makeDumlingIdFor(options.language, request.draft.lemma);
	for (const ownedSurface of request.draft.ownedSurfaces ?? []) {
		assertLanguageMatches(options.language, ownedSurface.surface.language);
		assertLanguageMatches(
			options.language,
			ownedSurface.surface.lemma.language,
		);
		if (
			makeDumlingIdFor(
				options.language,
				languageApi.extract.lemma(ownedSurface.surface),
			) !== draftLemmaId
		) {
			return {
				status: "rejected",
				code: "invalidDraft",
				message: "Owned surfaces must belong to the draft lemma.",
			};
		}
	}
	for (const relation of request.draft.relations ?? []) {
		if (relation.target.kind === "existing") {
			assertDumlingIdLanguageMatches(options.language, relation.target.lemmaId);
		}
	}

	const slice = await options.storage.loadNewNoteContext(request);
	validateNewNoteSlice(options.language, slice, request.draft);

	const plan = planAddNewNote(slice, {
		type: "addNewNote",
		draft: request.draft,
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
