import { traceStage } from "common-utils/workflow";
import type { SupportedLanguage } from "dumling-old/types";
import * as Effect from "effect/Effect";
import { planEnsureReadingEntry } from "../core/plan-mutation";
import type {
	DumdictInvalidInput,
	DumdictPreparationFailure,
	EnsureReadingEntryRequest,
	MutationResult,
	PreparedMutation,
} from "../public";
import { commitPrepared, prepared } from "./effect-mutation";
import { loadReadingEntryContext } from "./load-reading-entry-context";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export function prepareEnsureReadingEntry<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: EnsureReadingEntryRequest<L>,
): Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure> {
	if (request.entry.reading.lemma.language !== options.language)
		return Effect.fail({
			_tag: "DumdictInvalidInput",
			expectedLanguage: options.language,
			actualLanguage: request.entry.reading.lemma.language,
			message: "Reading language does not match the dictionary.",
		} satisfies DumdictInvalidInput);
	if (request.entry.knowledge?.semanticRelations !== undefined) {
		return Effect.fail({
			_tag: "DumdictRejection",
			code: "invalidRequest",
			message:
				"ensureReadingEntry does not accept Semantic Relations; use a relation-aware Dumdict workflow.",
		});
	}
	return traceStage(
		"dumdict.prepareEnsureReadingEntry",
		loadReadingEntryContext(options, {
			intent: "ensureReadingEntry",
			request,
		}).pipe(
			Effect.flatMap((slice) =>
				prepared(options, planEnsureReadingEntry(slice, request)),
			),
		),
		request,
	);
}

export function ensureReadingEntry<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: EnsureReadingEntryRequest<L>,
): Effect.Effect<
	MutationResult<L>,
	DumdictPreparationFailure | import("../public").DumdictCommitFailure
> {
	return prepareEnsureReadingEntry(options, request).pipe(
		Effect.flatMap((value) => commitPrepared(options, value)),
	);
}
