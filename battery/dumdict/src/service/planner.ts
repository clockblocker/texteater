import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";

import { sameLemma } from "../core/identity";
import { pendingSemanticRelationLocatorKey } from "../core/pending";
import {
	type PlanMutationResult,
	planAddNewNote,
	planApplyGeneratedKnowledge,
	planCleanupRelations,
	planEnsureOwnedSurface,
	planEnsureReadingEntry,
} from "../core/plan-mutation";
import type { PlanMutationRejected } from "../core/plan-mutation/result";
import {
	validateCleanupRelationsSlice,
	validateReadingEntryContext,
} from "../core/validate-slice";
import {
	parseAsDumdictPlan,
	parseKnowledgeChangeForDumdictRuntime,
	parsePendingSemanticRelationForDumdictRuntime,
	unwrapDumdictParse,
} from "../parsing/lightweight-parsers";
import type {
	AddNewNoteRequest,
	AffectedDictionaryEntities,
	ApplyGeneratedKnowledgeRequest,
	CleanupRelationsRequest,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
	MutationRejectedCode,
	MutationSummary,
} from "../public";
import type {
	AddNewNoteContext,
	ApplyGeneratedKnowledgeContext,
	CleanupRelationsSlice,
	DumdictPlan,
	EnsureOwnedSurfaceContext,
	EnsureReadingEntryContext,
	LoadReadingEntryContextRequest,
} from "../storage";
import {
	type ReadingEntryContextLoad,
	storageRequestFor,
} from "./context-request";

export type DumdictPlanned<L extends Dumling.Language> = Readonly<{
	status: "planned";
	plan: DumdictPlan<L>;
	affected: AffectedDictionaryEntities<L>;
	summary: MutationSummary;
}>;

export type DumdictPlanRejected = Readonly<{
	status: "rejected";
	code: MutationRejectedCode;
	message?: string;
}>;

export type DumdictPlanOutcome<L extends Dumling.Language> =
	| DumdictPlanned<L>
	| DumdictPlanRejected;

/**
 * Synchronous dictionary planning over a host-loaded storage slice.
 *
 * @remarks The Effect-based `DumdictService` reads its slice through a storage
 * port and commits through the same port. A host that already sits inside a
 * database transaction can instead load the slice itself, plan here, and apply
 * the plan in the same transaction. The planner validates the slice against
 * the request that produced it, runs the same planners as the service, and
 * returns a validated plan; it never reads or writes storage.
 */
export type DumdictPlanner<L extends Dumling.Language> = {
	readonly language: L;
	/** The storage read a workflow request needs; hosts load exactly this slice. */
	contextRequest(
		load: ReadingEntryContextLoad<L>,
	): LoadReadingEntryContextRequest<L>;
	addNewNote(
		context: AddNewNoteContext<L>,
		request: AddNewNoteRequest<L>,
	): DumdictPlanOutcome<L>;
	applyGeneratedKnowledge(
		context: ApplyGeneratedKnowledgeContext<L>,
		request: ApplyGeneratedKnowledgeRequest<L>,
	): DumdictPlanOutcome<L>;
	ensureOwnedSurface(
		context: EnsureOwnedSurfaceContext<L>,
		request: EnsureOwnedSurfaceRequest<L>,
	): DumdictPlanOutcome<L>;
	ensureReadingEntry(
		context: EnsureReadingEntryContext<L>,
		request: EnsureReadingEntryRequest<L>,
	): DumdictPlanOutcome<L>;
	cleanupRelations(
		slice: CleanupRelationsSlice<L>,
		request: CleanupRelationsRequest<L>,
	): DumdictPlanOutcome<L>;
};

function rejected(
	code: MutationRejectedCode,
	message: string,
): DumdictPlanRejected {
	return { status: "rejected", code, message };
}

function outcome<L extends Dumling.Language>(
	language: L,
	plan: PlanMutationResult<L> | PlanMutationRejected,
): DumdictPlanOutcome<L> {
	if (plan.status === "rejected")
		return {
			status: "rejected",
			code: plan.code,
			...(plan.message === undefined ? {} : { message: plan.message }),
		};
	const parsed = unwrapDumdictParse(
		parseAsDumdictPlan(
			{ baseRevision: plan.baseRevision, changes: plan.changes },
			language,
		),
	);
	return structuredClone({
		status: "planned",
		plan: parsed,
		affected: plan.affected,
		summary: plan.summary,
	});
}

export function createDumdictPlanner<L extends Dumling.Language>(
	language: L,
): DumdictPlanner<L> {
	return {
		language,
		contextRequest: storageRequestFor,
		addNewNote(context, request) {
			const draftLanguage = request.draft.reading.lemma.language;
			if (draftLanguage !== language)
				return rejected(
					"invalidDraft",
					"Draft Reading language does not match the dictionary.",
				);
			for (const owned of request.draft.ownedSurfaces ?? []) {
				if (
					owned.surface.lemma.language !== language ||
					!sameLemma(owned.surface.lemma, request.draft.reading.lemma)
				)
					return rejected(
						"invalidDraft",
						"Owned Surfaces must belong to the draft Reading's Lemma and dictionary language.",
					);
			}
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "addNewNote", request }),
			);
			return outcome(language, planAddNewNote(context, request));
		},
		applyGeneratedKnowledge(context, request) {
			if (request.reading.lemma.language !== language)
				return rejected(
					"invalidRequest",
					"Reading language does not match the dictionary.",
				);
			const changes = request.changes.map((change) =>
				unwrapDumdictParse(
					parseKnowledgeChangeForDumdictRuntime(change),
				),
			);
			const pendingRelations = request.pendingRelations.map((pending) =>
				unwrapDumdictParse(
					parsePendingSemanticRelationForDumdictRuntime(pending),
				),
			) as unknown as ApplyGeneratedKnowledgeRequest<L>["pendingRelations"];
			if (
				pendingRelations.some(
					(pending) => pending.target.language !== language,
				)
			)
				return rejected(
					"invalidRequest",
					"Pending Relation target language does not match the dictionary.",
				);
			const normalized = {
				reading: request.reading,
				changes,
				pendingRelations,
			} as ApplyGeneratedKnowledgeRequest<L>;
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({
					intent: "applyGeneratedKnowledge",
					request: normalized,
				}),
			);
			return outcome(
				language,
				planApplyGeneratedKnowledge(context, normalized),
			);
		},
		ensureOwnedSurface(context, request) {
			if (
				request.reading.lemma.language !== language ||
				request.ownedSurface.surface.lemma.language !== language
			)
				return rejected(
					"invalidRequest",
					"Reading and owned Surface language must match the dictionary.",
				);
			if (
				!sameLemma(
					request.ownedSurface.surface.lemma,
					request.reading.lemma,
				)
			)
				return rejected(
					"invalidDraft",
					"The owned Surface must realize the Reading's Lemma.",
				);
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "ensureOwnedSurface", request }),
			);
			return outcome(language, planEnsureOwnedSurface(context, request));
		},
		ensureReadingEntry(context, request) {
			if (request.entry.reading.lemma.language !== language)
				return rejected(
					"invalidRequest",
					"Reading language does not match the dictionary.",
				);
			if (request.entry.knowledge?.semanticRelations !== undefined)
				return rejected(
					"invalidRequest",
					"ensureReadingEntry does not accept Semantic Relations; use a relation-aware Dumdict workflow.",
				);
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "ensureReadingEntry", request }),
			);
			return outcome(language, planEnsureReadingEntry(context, request));
		},
		cleanupRelations(slice, request) {
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
				return rejected(
					"invalidRequest",
					"Cleanup resolution is invalid or duplicated.",
				);
			validateCleanupRelationsSlice(language, slice);
			const pendingKeys = new Set(
				slice.pendingRelations.map(({ locator }) =>
					pendingSemanticRelationLocatorKey(locator),
				),
			);
			if (keys.some((key) => !pendingKeys.has(key)))
				return rejected(
					"relationTargetMissing",
					"Cleanup pending relation no longer exists.",
				);
			return outcome(language, planCleanupRelations(slice, request));
		},
	};
}
