import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { planApplyGeneratedKnowledge } from "../core/plan-mutation";
import {
	parseKnowledgeChangeForDumdictRuntime,
	parsePendingSemanticRelationForDumdictRuntime,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type {
	ApplyGeneratedKnowledgeRequest,
	DumdictInvalidInput,
	DumdictPreparationFailure,
	MutationResult,
	PreparedMutation,
} from "../public";
import { commitPrepared, prepared } from "./effect-mutation";
import { loadReadingEntryContext } from "./load-reading-entry-context";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export function prepareApplyGeneratedKnowledge<L extends Dumling.Language>(
	options: DumdictServiceRuntimeOptions<L>,
	request: ApplyGeneratedKnowledgeRequest<L>,
): Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure> {
	if (request.reading.lemma.language !== options.language)
		return Effect.fail({
			_tag: "DumdictInvalidInput",
			expectedLanguage: options.language,
			actualLanguage: request.reading.lemma.language,
			message: "Reading language does not match the dictionary.",
		} satisfies DumdictInvalidInput);
	return Effect.gen(function* () {
		const changes = yield* Effect.sync(() =>
			request.changes.map((change) =>
				unwrapDumdictParse(
					parseKnowledgeChangeForDumdictRuntime(change),
				),
			),
		);
		const pendingRelations = yield* Effect.sync(
			() =>
				request.pendingRelations.map((pending) =>
					unwrapDumdictParse(
						parsePendingSemanticRelationForDumdictRuntime(pending),
					),
				) as unknown as ApplyGeneratedKnowledgeRequest<L>["pendingRelations"],
		);
		if (
			pendingRelations.some(
				(pending) => pending.target.language !== options.language,
			)
		)
			yield* Effect.fail({
				_tag: "DumdictInvalidInput",
				expectedLanguage: options.language,
				message:
					"Pending Relation target language does not match the dictionary.",
			} satisfies DumdictInvalidInput);
		const normalizedRequest = {
			reading: request.reading,
			changes,
			pendingRelations,
		} as ApplyGeneratedKnowledgeRequest<L>;
		const slice = yield* loadReadingEntryContext(options, {
			intent: "applyGeneratedKnowledge",
			request: normalizedRequest,
		});
		return yield* prepared(
			options,
			planApplyGeneratedKnowledge(slice, normalizedRequest),
		);
	}).pipe(
		Effect.withSpan("dumdict.prepareApplyGeneratedKnowledge", {
			attributes: { request },
		}),
	);
}

export function applyGeneratedKnowledge<L extends Dumling.Language>(
	options: DumdictServiceRuntimeOptions<L>,
	request: ApplyGeneratedKnowledgeRequest<L>,
): Effect.Effect<
	MutationResult<L>,
	DumdictPreparationFailure | import("../public").DumdictCommitFailure
> {
	return prepareApplyGeneratedKnowledge(options, request).pipe(
		Effect.flatMap((value) => commitPrepared(options, value)),
	);
}
