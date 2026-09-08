import { traceStage } from "common-utils/workflow";
import type { SupportedLanguage } from "dumling/types";
import { semanticRelationValues } from "dumrel/relations";
import * as Effect from "effect/Effect";
import { pendingSemanticRelationLocatorKey } from "../core/pending";
import { planCleanupRelations } from "../core/plan-mutation";
import type {
	CleanupRelationsRequest,
	DumdictPreparationFailure,
	DumdictRevisionConflict,
	DumdictSemanticPreconditionFailure,
	MutationResult,
	PreparedMutation,
} from "../public";
import { commitPrepared, prepared } from "./effect-mutation";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export function prepareCleanupRelations<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: CleanupRelationsRequest<L>,
): Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure> {
	const keys = request.resolutions.map(({ locator }) =>
		pendingSemanticRelationLocatorKey(locator),
	);
	if (
		new Set(keys).size !== keys.length ||
		request.resolutions.some(
			({ locator }) => !semanticRelationValues.includes(locator.relation),
		)
	) {
		return Effect.fail({
			_tag: "DumdictRejection",
			code: "invalidRequest",
			message: "Cleanup resolution is invalid or duplicated.",
		});
	}
	return traceStage(
		"dumdict.prepareCleanupRelations",
		Effect.gen(function* () {
			const slice = yield* options.storage.loadCleanupRelationsContext({
				resolutions: request.resolutions,
			});
			options.sliceValidation.cleanupRelations(slice);
			if (slice.revision !== request.baseRevision)
				yield* Effect.fail({
					_tag: "DumdictRevisionConflict",
					baseRevision: request.baseRevision,
					latestRevision: slice.revision,
					message: "Cleanup workset is stale.",
				} satisfies DumdictRevisionConflict);
			const pendingKeys = new Set(
				slice.pendingRelations.map(({ locator }) =>
					pendingSemanticRelationLocatorKey(locator),
				),
			);
			if (
				request.resolutions.some(
					({ locator }) =>
						!pendingKeys.has(
							pendingSemanticRelationLocatorKey(locator),
						),
				)
			)
				yield* Effect.fail({
					_tag: "DumdictSemanticPreconditionFailure",
					baseRevision: request.baseRevision,
					latestRevision: slice.revision,
					message: "Cleanup pending relation no longer exists.",
				} satisfies DumdictSemanticPreconditionFailure);
			return yield* prepared(
				options,
				planCleanupRelations(slice, request),
			);
		}),
		request,
	);
}

export function cleanupRelations<L extends SupportedLanguage>(
	options: DumdictServiceRuntimeOptions<L>,
	request: CleanupRelationsRequest<L>,
): Effect.Effect<
	MutationResult<L>,
	DumdictPreparationFailure | import("../public").DumdictCommitFailure
> {
	return prepareCleanupRelations(options, request).pipe(
		Effect.flatMap((value) => commitPrepared(options, value)),
	);
}
