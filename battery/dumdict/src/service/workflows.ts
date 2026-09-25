import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";

import { sameLemma } from "../core/identity";
import { pendingSemanticRelationLocatorKey } from "../core/pending";
import {
	type PlanMutationResult,
	planAddNewNote,
	planAppendReadingAttestation,
	planApplyGeneratedKnowledge,
	planCleanupRelations,
	planEnsureOwnedSurface,
	planEnsureReadingEntry,
} from "../core/plan-mutation";
import type { PlanMutationRejected } from "../core/plan-mutation/result";
import {
	validateCleanupRelationsSlice,
	validateReadingEntryContext,
	validateReadingPatchSlice,
} from "../core/validate-slice";
import {
	parseAsDumdictPlan,
	parseKnowledgeChangeForDumdictRuntime,
	parsePendingSemanticRelationForDumdictRuntime,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type {
	AddAttestationRequest,
	AddNewNoteRequest,
	ApplyGeneratedKnowledgeRequest,
	CleanupRelationsRequest,
	DumdictInvalidInput,
	DumdictRejection,
	DumdictRevisionConflict,
	DumdictSemanticPreconditionFailure,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
	PreparedMutation,
} from "../public";
import type {
	AddNewNoteContext,
	ApplyGeneratedKnowledgeContext,
	CleanupRelationsSlice,
	EnsureOwnedSurfaceContext,
	EnsureReadingEntryContext,
	ReadingPatchSlice,
} from "../storage";
import { storageRequestFor } from "./context-request";

/** Every way a workflow can refuse a request or the slice loaded for it. */
export type DumdictWorkflowFailure =
	| DumdictInvalidInput
	| DumdictRejection
	| DumdictRevisionConflict
	| DumdictSemanticPreconditionFailure;

type DumdictWorkflowStep<T> =
	| { readonly status: "ok"; readonly value: T }
	| { readonly status: "failed"; readonly failure: DumdictWorkflowFailure };

/**
 * One dictionary workflow, shared by the Effect service and the planner so
 * both entry points check, validate, and plan a request the same way.
 *
 * @remarks `check` runs before any storage read and returns the request to
 * plan with. `plan` validates the host-loaded slice against that request,
 * applies the workflow's slice-level checks, and returns a parsed plan. Both
 * throw only for malformed input or a slice that breaks the storage contract.
 */
export type DumdictWorkflow<L extends Dumling.Language, Request, Slice> = {
	readonly check: (request: Request) => DumdictWorkflowStep<Request>;
	readonly plan: (
		slice: Slice,
		request: Request,
	) => DumdictWorkflowStep<PreparedMutation<L>>;
};

export type DumdictWorkflows<L extends Dumling.Language> = {
	readonly addAttestation: DumdictWorkflow<
		L,
		AddAttestationRequest<L>,
		ReadingPatchSlice<L>
	>;
	readonly addNewNote: DumdictWorkflow<
		L,
		AddNewNoteRequest<L>,
		AddNewNoteContext<L>
	>;
	readonly applyGeneratedKnowledge: DumdictWorkflow<
		L,
		ApplyGeneratedKnowledgeRequest<L>,
		ApplyGeneratedKnowledgeContext<L>
	>;
	readonly ensureOwnedSurface: DumdictWorkflow<
		L,
		EnsureOwnedSurfaceRequest<L>,
		EnsureOwnedSurfaceContext<L>
	>;
	readonly ensureReadingEntry: DumdictWorkflow<
		L,
		EnsureReadingEntryRequest<L>,
		EnsureReadingEntryContext<L>
	>;
	readonly cleanupRelations: DumdictWorkflow<
		L,
		CleanupRelationsRequest<L>,
		CleanupRelationsSlice<L>
	>;
};

function ok<T>(value: T): DumdictWorkflowStep<T> {
	return { status: "ok", value };
}

function failed(failure: DumdictWorkflowFailure): DumdictWorkflowStep<never> {
	return { status: "failed", failure };
}

function languageMismatch<L extends Dumling.Language>(
	expectedLanguage: L,
	actualLanguage: Dumling.Language,
	message: string,
): DumdictWorkflowStep<never> {
	return failed({
		_tag: "DumdictInvalidInput",
		expectedLanguage,
		actualLanguage,
		message,
	});
}

function rejection(
	code: DumdictRejection["code"],
	message: string,
): DumdictWorkflowStep<never> {
	return failed({ _tag: "DumdictRejection", code, message });
}

function prepared<L extends Dumling.Language>(
	language: L,
	plan: PlanMutationResult<L> | PlanMutationRejected,
): DumdictWorkflowStep<PreparedMutation<L>> {
	if (plan.status === "rejected")
		return failed({
			_tag: "DumdictRejection",
			code: plan.code,
			...(plan.message === undefined ? {} : { message: plan.message }),
		});
	const parsed = unwrapDumdictParse(
		parseAsDumdictPlan(
			{ baseRevision: plan.baseRevision, changes: plan.changes },
			language,
		),
	);
	return ok(
		structuredClone({
			plan: parsed,
			affected: plan.affected,
			summary: plan.summary,
		}),
	);
}

export function createDumdictWorkflows<L extends Dumling.Language>(
	language: L,
): DumdictWorkflows<L> {
	return {
		addAttestation: {
			check(request) {
				const actual = request.reading.lemma.language;
				return actual === language
					? ok(request)
					: languageMismatch(
							language,
							actual,
							`Expected dumdict language ${language}, got ${actual}`,
						);
			},
			plan(slice, request) {
				validateReadingPatchSlice(language, slice, request.reading);
				return prepared(
					language,
					planAppendReadingAttestation(slice, request),
				);
			},
		},
		addNewNote: {
			check(request) {
				const actual = request.draft.reading.lemma.language;
				if (actual !== language)
					return languageMismatch(
						language,
						actual,
						"Draft Reading language does not match the dictionary.",
					);
				for (const owned of request.draft.ownedSurfaces ?? []) {
					if (
						owned.surface.lemma.language !== language ||
						!sameLemma(
							owned.surface.lemma,
							request.draft.reading.lemma,
						)
					)
						return failed({
							_tag: "DumdictInvalidInput",
							message:
								"Owned Surfaces must belong to the draft Reading's Lemma and dictionary language.",
						});
				}
				return ok(request);
			},
			plan(context, request) {
				validateReadingEntryContext(
					language,
					context,
					storageRequestFor({ intent: "addNewNote", request }),
				);
				return prepared(language, planAddNewNote(context, request));
			},
		},
		applyGeneratedKnowledge: {
			check(request) {
				const actual = request.reading.lemma.language;
				if (actual !== language)
					return languageMismatch(
						language,
						actual,
						"Reading language does not match the dictionary.",
					);
				const changes = request.changes.map((change) =>
					unwrapDumdictParse(
						parseKnowledgeChangeForDumdictRuntime(change),
					),
				);
				const pendingRelations = request.pendingRelations.map(
					(pending) =>
						unwrapDumdictParse(
							parsePendingSemanticRelationForDumdictRuntime(
								pending,
							),
						),
				) as unknown as ApplyGeneratedKnowledgeRequest<L>["pendingRelations"];
				if (
					pendingRelations.some(
						(pending) => pending.target.language !== language,
					)
				)
					return failed({
						_tag: "DumdictInvalidInput",
						expectedLanguage: language,
						message:
							"Pending Relation target language does not match the dictionary.",
					});
				return ok({
					reading: request.reading,
					changes,
					pendingRelations,
				} as ApplyGeneratedKnowledgeRequest<L>);
			},
			plan(context, request) {
				validateReadingEntryContext(
					language,
					context,
					storageRequestFor({
						intent: "applyGeneratedKnowledge",
						request,
					}),
				);
				return prepared(
					language,
					planApplyGeneratedKnowledge(context, request),
				);
			},
		},
		ensureOwnedSurface: {
			check(request) {
				if (
					request.reading.lemma.language !== language ||
					request.ownedSurface.surface.lemma.language !== language
				)
					return failed({
						_tag: "DumdictInvalidInput",
						message:
							"Reading and owned Surface language must match the dictionary.",
					});
				if (
					!sameLemma(
						request.ownedSurface.surface.lemma,
						request.reading.lemma,
					)
				)
					return rejection(
						"invalidDraft",
						"The owned Surface must realize the Reading's Lemma.",
					);
				return ok(request);
			},
			plan(context, request) {
				validateReadingEntryContext(
					language,
					context,
					storageRequestFor({
						intent: "ensureOwnedSurface",
						request,
					}),
				);
				return prepared(
					language,
					planEnsureOwnedSurface(context, request),
				);
			},
		},
		ensureReadingEntry: {
			check(request) {
				const actual = request.entry.reading.lemma.language;
				if (actual !== language)
					return languageMismatch(
						language,
						actual,
						"Reading language does not match the dictionary.",
					);
				if (request.entry.knowledge?.semanticRelations !== undefined)
					return rejection(
						"invalidRequest",
						"ensureReadingEntry does not accept Semantic Relations; use a relation-aware Dumdict workflow.",
					);
				return ok(request);
			},
			plan(context, request) {
				validateReadingEntryContext(
					language,
					context,
					storageRequestFor({
						intent: "ensureReadingEntry",
						request,
					}),
				);
				return prepared(
					language,
					planEnsureReadingEntry(context, request),
				);
			},
		},
		cleanupRelations: {
			check(request) {
				const keys = request.resolutions.map(({ locator }) =>
					pendingSemanticRelationLocatorKey(locator),
				);
				if (
					new Set(keys).size !== keys.length ||
					request.resolutions.some(
						({ locator }) =>
							!directSemanticRelationValues.includes(
								locator.relation,
							),
					)
				)
					return rejection(
						"invalidRequest",
						"Cleanup resolution is invalid or duplicated.",
					);
				return ok(request);
			},
			plan(slice, request) {
				validateCleanupRelationsSlice(language, slice);
				if (slice.revision !== request.baseRevision)
					return failed({
						_tag: "DumdictRevisionConflict",
						baseRevision: request.baseRevision,
						latestRevision: slice.revision,
						message: "Cleanup workset is stale.",
					});
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
					return failed({
						_tag: "DumdictSemanticPreconditionFailure",
						baseRevision: request.baseRevision,
						latestRevision: slice.revision,
						message: "Cleanup pending relation no longer exists.",
					});
				return prepared(language, planCleanupRelations(slice, request));
			},
		},
	};
}
