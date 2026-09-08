import { traceStage } from "common-utils/workflow";
import { readingFingerprint } from "dumling/id";
import type { Reading, SupportedLanguage } from "dumling/types";
import { fixedKnowledgeFor } from "dumrel/fixed";
import type { KnowledgeChange } from "dumrel/types";
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
	DumdictRejection,
	MutationResult,
	PreparedMutation,
} from "../public";
import { commitPrepared, prepared } from "./effect-mutation";
import { loadReadingEntryContext } from "./load-reading-entry-context";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

export function prepareApplyGeneratedKnowledge<L extends SupportedLanguage>(
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
	return traceStage(
		"dumdict.prepareApplyGeneratedKnowledge",
		Effect.gen(function* () {
			const changes = yield* Effect.sync(() =>
				request.changes.map((change) =>
					unwrapDumdictParse(
						parseKnowledgeChangeForDumdictRuntime(change),
					),
				),
			);
			const semanticChanges = changes.filter(
				(
					change,
				): change is Extract<
					KnowledgeChange,
					{ aspect: "semanticRelations" }
				> => change.aspect === "semanticRelations",
			);
			if (
				semanticChanges.length > 0 &&
				!approvedFixedReadingTargetChanges(
					request.reading,
					semanticChanges,
				)
			)
				yield* Effect.fail({
					_tag: "DumdictRejection",
					code: "invalidRequest",
					message:
						"Generated direct relations must enter as pending Unit Shadows unless they exactly match a reviewed fixed Reading-targeted set.",
				} satisfies DumdictRejection);
			const pendingRelations = yield* Effect.sync(
				() =>
					request.pendingRelations.map((pending) =>
						unwrapDumdictParse(
							parsePendingSemanticRelationForDumdictRuntime(
								pending,
							),
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
		}),
		request,
	);
}

export function applyGeneratedKnowledge<L extends SupportedLanguage>(
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

function approvedFixedReadingTargetChanges<L extends SupportedLanguage>(
	reading: Reading<L>,
	changes: readonly Extract<
		KnowledgeChange,
		{ aspect: "semanticRelations" }
	>[],
): boolean {
	const fixed = fixedKnowledgeFor(reading as unknown as Reading);
	if (
		fixed.decision !== "Found" ||
		fixed.coverage.semanticRelationTargetKind !== "reading" ||
		fixed.knowledge.semanticRelations?.targetKind !== "reading"
	)
		return false;
	const approved = fixed.knowledge.semanticRelations.synonym ?? [];
	const approvedKeys = approved.map(readingFingerprint).toSorted();
	return changes.every(
		(change) =>
			change.kind !== "Retract" &&
			change.targetKind === "reading" &&
			change.relation === "synonym" &&
			change.value.map(readingFingerprint).toSorted().join("\0") ===
				approvedKeys.join("\0"),
	);
}
