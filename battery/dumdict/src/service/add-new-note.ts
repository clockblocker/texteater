import { traceStage } from "common-utils/workflow";
import type { SupportedLanguage } from "dumling/types";
import * as Effect from "effect/Effect";
import { sameLemma } from "../core/identity";
import { planAddNewNote } from "../core/plan-mutation";
import type {
	AddNewNoteRequest,
	DumdictInvalidInput,
	DumdictPreparationFailure,
	MutationResult,
	PreparedMutation,
} from "../public";
import { commitPrepared, prepared } from "./effect-mutation";
import { loadReadingEntryContext } from "./load-reading-entry-context";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export function prepareAddNewNote<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: AddNewNoteRequest<L>,
): Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure> {
	const language = request.draft.reading.lemma.language;
	if (language !== options.language)
		return Effect.fail({
			_tag: "DumdictInvalidInput",
			expectedLanguage: options.language,
			actualLanguage: language,
			message: "Draft Reading language does not match the dictionary.",
		} satisfies DumdictInvalidInput);
	for (const owned of request.draft.ownedSurfaces ?? []) {
		if (
			owned.surface.language !== options.language ||
			owned.surface.lemma.language !== options.language ||
			!sameLemma(owned.surface.lemma, request.draft.reading.lemma)
		)
			return Effect.fail({
				_tag: "DumdictInvalidInput",
				message:
					"Owned Surfaces must belong to the draft Reading's Lemma and dictionary language.",
			} satisfies DumdictInvalidInput);
	}
	return traceStage(
		"dumdict.prepareAddNewNote",
		loadReadingEntryContext(options, {
			intent: "addNewNote",
			request,
		}).pipe(
			Effect.flatMap((slice) =>
				prepared(options, planAddNewNote(slice, request)),
			),
		),
		request,
	);
}

export function addNewNote<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: AddNewNoteRequest<L>,
): Effect.Effect<
	MutationResult<L>,
	DumdictPreparationFailure | import("../public").DumdictCommitFailure
> {
	return prepareAddNewNote(options, request).pipe(
		Effect.flatMap((value) => commitPrepared(options, value)),
	);
}
