import { traceStage } from "common-utils/workflow";
import type { SupportedLanguage } from "dumling/types";
import * as Effect from "effect/Effect";
import { sameLemma } from "../core/identity";
import { planEnsureOwnedSurface } from "../core/plan-mutation";
import type {
	DumdictInvalidInput,
	DumdictPreparationFailure,
	EnsureOwnedSurfaceRequest,
	MutationResult,
	PreparedMutation,
} from "../public";
import { commitPrepared, prepared } from "./effect-mutation";
import { loadReadingEntryContext } from "./load-reading-entry-context";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

function invalidInput(message: string): DumdictInvalidInput {
	return { _tag: "DumdictInvalidInput", message };
}

export function prepareEnsureOwnedSurface<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: EnsureOwnedSurfaceRequest<L>,
): Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure> {
	if (
		request.reading.lemma.language !== options.language ||
		request.ownedSurface.surface.language !== options.language ||
		request.ownedSurface.surface.lemma.language !== options.language
	)
		return Effect.fail(
			invalidInput(
				"Reading and owned Surface language must match the dictionary.",
			),
		);
	if (!sameLemma(request.ownedSurface.surface.lemma, request.reading.lemma)) {
		return Effect.fail({
			_tag: "DumdictRejection",
			code: "invalidDraft",
			message: "The owned Surface must realize the Reading's Lemma.",
		});
	}
	return traceStage(
		"dumdict.prepareEnsureOwnedSurface",
		loadReadingEntryContext(options, {
			intent: "ensureOwnedSurface",
			request,
		}).pipe(
			Effect.flatMap((slice) =>
				prepared(options, planEnsureOwnedSurface(slice, request)),
			),
		),
		request,
	);
}

export function ensureOwnedSurface<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: EnsureOwnedSurfaceRequest<L>,
): Effect.Effect<
	MutationResult<L>,
	DumdictPreparationFailure | import("../public").DumdictCommitFailure
> {
	return prepareEnsureOwnedSurface(options, request).pipe(
		Effect.flatMap((value) => commitPrepared(options, value)),
	);
}
