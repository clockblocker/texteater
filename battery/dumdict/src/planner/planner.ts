import { sameLemma } from "dumling";
import type * as Dumling from "dumling/types";
import { directSemanticRelationValues } from "dumrel";

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
import type { DumdictPlan } from "../domain-types";
import {
	parseAsDumdictPlan,
	parseKnowledgeChangeForDumdictRuntime,
	parsePendingSemanticRelationForDumdictRuntime,
	pendingTargetsLanguage,
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
	EnsureOwnedSurfaceContext,
	EnsureReadingEntryContext,
	LoadReadingEntryContextRequest,
} from "../storage";
import { knowledgeChangeUsesLanguage } from "../validation-semantics";
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

/** The loaded slice no longer supports the request, so planning stopped. */
export type DumdictPlanConflict = Readonly<{
	status: "conflict";
	code: "revisionConflict" | "semanticPreconditionFailed";
	message?: string;
}>;

export type DumdictPlanOutcome<L extends Dumling.Language> =
	| DumdictPlanned<L>
	| DumdictPlanRejected
	| DumdictPlanConflict;

/**
 * Synchronous dictionary planning over a host-loaded storage slice.
 *
 * @remarks The host asks `contextRequest` which slice a request needs, loads
 * it from its own store (inside the transaction that will commit the plan),
 * and passes it here. Each workflow checks the request, validates the slice
 * against it, and returns a parsed plan with its preconditions, a rejection,
 * or a conflict; the planner never reads or writes storage. It throws only
 * for malformed input or a slice that breaks the storage contract.
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
	/**
	 * Retries exact pending locators against the loaded inventory. A Unit
	 * Shadow resolves only when exactly one Lemma matches; zero or multiple
	 * matches stay pending.
	 */
	cleanupRelations(
		slice: CleanupRelationsSlice<L>,
		request: CleanupRelationsRequest<L>,
	): DumdictPlanOutcome<L>;
};

type Refusal = DumdictPlanRejected | DumdictPlanConflict;

/** A request check passes the request to plan with, or refuses it. */
type Checked<Request> =
	| { readonly status: "ok"; readonly request: Request }
	| Refusal;

/**
 * One dictionary workflow. `check` runs on the request alone; `plan` validates
 * the host-loaded slice against the checked request and plans over it.
 */
type Workflow<L extends Dumling.Language, Request, Slice> = {
	readonly check: (request: Request) => Checked<Request>;
	readonly plan: (slice: Slice, request: Request) => DumdictPlanOutcome<L>;
};

function ok<Request>(request: Request): Checked<Request> {
	return { status: "ok", request };
}

function rejected(
	code: MutationRejectedCode,
	message: string | undefined,
): DumdictPlanRejected {
	return {
		status: "rejected",
		code,
		...(message === undefined ? {} : { message }),
	};
}

function invalidRequest(message: string): DumdictPlanRejected {
	return rejected("invalidRequest", message);
}

function planned<L extends Dumling.Language>(
	language: L,
	plan: PlanMutationResult<L> | PlanMutationRejected,
): DumdictPlanOutcome<L> {
	if (plan.status === "rejected") return rejected(plan.code, plan.message);
	const parsed = unwrapDumdictParse(
		parseAsDumdictPlan(
			{ baseRevision: plan.baseRevision, changes: plan.changes },
			language,
		),
	);
	return {
		status: "planned",
		...structuredClone({
			plan: parsed,
			affected: plan.affected,
			summary: plan.summary,
		}),
	};
}

function run<L extends Dumling.Language, Request, Slice>(
	workflow: Workflow<L, Request, Slice>,
	slice: Slice,
	request: Request,
): DumdictPlanOutcome<L> {
	const checked = workflow.check(request);
	return checked.status === "ok"
		? workflow.plan(slice, checked.request)
		: checked;
}

function addNewNote<L extends Dumling.Language>(
	language: L,
): Workflow<L, AddNewNoteRequest<L>, AddNewNoteContext<L>> {
	return {
		check(request) {
			if (request.draft.reading.lemma.language !== language)
				return invalidRequest(
					"Draft Reading language does not match the dictionary.",
				);
			for (const owned of request.draft.ownedSurfaces ?? []) {
				if (
					owned.surface.lemma.language !== language ||
					!sameLemma(owned.surface.lemma, request.draft.reading.lemma)
				)
					return invalidRequest(
						"Owned Surfaces must belong to the draft Reading's Lemma and dictionary language.",
					);
			}
			return ok(request);
		},
		plan(context, request) {
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "addNewNote", request }),
			);
			return planned(language, planAddNewNote(context, request));
		},
	};
}

/** A generated-Knowledge request whose changes and pending relations are not yet parsed. */
export type UncheckedApplyGeneratedKnowledgeRequest<
	L extends Dumling.Language,
> = {
	readonly reading: Dumling.Reading<L>;
	readonly changes: readonly unknown[];
	readonly pendingRelations: readonly unknown[];
};

/**
 * Checks a generated-Knowledge request the way `applyGeneratedKnowledge`
 * does, so a host whose changes arrive untyped can parse them once at its
 * edge. It parses every change and pending relation, throwing `ParsingError`
 * for a malformed one, and refuses a Reading, change or pending target in
 * another language as `invalidRequest`.
 */
export function checkApplyGeneratedKnowledgeRequest<L extends Dumling.Language>(
	language: L,
	request: UncheckedApplyGeneratedKnowledgeRequest<L>,
):
	| {
			readonly status: "ok";
			readonly request: ApplyGeneratedKnowledgeRequest<L>;
	  }
	| DumdictPlanRejected {
	if (request.reading.lemma.language !== language)
		return invalidRequest(
			"Reading language does not match the dictionary.",
		);
	const changes = request.changes.map((change) =>
		unwrapDumdictParse(parseKnowledgeChangeForDumdictRuntime(change)),
	);
	const pendingRelations = request.pendingRelations.map((pending) =>
		unwrapDumdictParse(
			parsePendingSemanticRelationForDumdictRuntime(pending),
		),
	);
	if (
		!changes.every((change) =>
			knowledgeChangeUsesLanguage(change, language),
		)
	)
		return invalidRequest(
			"Knowledge Change language does not match the dictionary.",
		);
	if (
		!pendingRelations.every((pending) =>
			pendingTargetsLanguage(pending, language),
		)
	)
		return invalidRequest(
			"Pending Relation target language does not match the dictionary.",
		);
	return {
		status: "ok",
		request: { reading: request.reading, changes, pendingRelations },
	};
}

function applyGeneratedKnowledge<L extends Dumling.Language>(
	language: L,
): Workflow<
	L,
	ApplyGeneratedKnowledgeRequest<L>,
	ApplyGeneratedKnowledgeContext<L>
> {
	return {
		check: (request) =>
			checkApplyGeneratedKnowledgeRequest(language, request),
		plan(context, request) {
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({
					intent: "applyGeneratedKnowledge",
					request,
				}),
			);
			return planned(
				language,
				planApplyGeneratedKnowledge(context, request),
			);
		},
	};
}

function ensureOwnedSurface<L extends Dumling.Language>(
	language: L,
): Workflow<L, EnsureOwnedSurfaceRequest<L>, EnsureOwnedSurfaceContext<L>> {
	return {
		check(request) {
			if (
				request.reading.lemma.language !== language ||
				request.ownedSurface.surface.lemma.language !== language
			)
				return invalidRequest(
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
			return ok(request);
		},
		plan(context, request) {
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "ensureOwnedSurface", request }),
			);
			return planned(language, planEnsureOwnedSurface(context, request));
		},
	};
}

function ensureReadingEntry<L extends Dumling.Language>(
	language: L,
): Workflow<L, EnsureReadingEntryRequest<L>, EnsureReadingEntryContext<L>> {
	return {
		check(request) {
			if (request.entry.reading.lemma.language !== language)
				return invalidRequest(
					"Reading language does not match the dictionary.",
				);
			if (request.entry.knowledge?.semanticRelations !== undefined)
				return invalidRequest(
					"ensureReadingEntry does not accept Semantic Relations; use a relation-aware Dumdict workflow.",
				);
			return ok(request);
		},
		plan(context, request) {
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "ensureReadingEntry", request }),
			);
			return planned(language, planEnsureReadingEntry(context, request));
		},
	};
}

function cleanupRelations<L extends Dumling.Language>(
	language: L,
): Workflow<L, CleanupRelationsRequest<L>, CleanupRelationsSlice<L>> {
	return {
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
				return invalidRequest(
					"Cleanup resolution is invalid or duplicated.",
				);
			return ok(request);
		},
		plan(slice, request) {
			validateCleanupRelationsSlice(language, slice);
			if (slice.revision !== request.baseRevision)
				return {
					status: "conflict",
					code: "revisionConflict",
					message: "Cleanup workset is stale.",
				};
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
				return {
					status: "conflict",
					code: "semanticPreconditionFailed",
					message: "Cleanup pending relation no longer exists.",
				};
			return planned(language, planCleanupRelations(slice, request));
		},
	};
}

export function createDumdictPlanner<L extends Dumling.Language>(
	language: L,
): DumdictPlanner<L> {
	const workflows = {
		addNewNote: addNewNote(language),
		applyGeneratedKnowledge: applyGeneratedKnowledge(language),
		ensureOwnedSurface: ensureOwnedSurface(language),
		ensureReadingEntry: ensureReadingEntry(language),
		cleanupRelations: cleanupRelations(language),
	};
	return {
		language,
		contextRequest: storageRequestFor,
		addNewNote: (context, request) =>
			run(workflows.addNewNote, context, request),
		applyGeneratedKnowledge: (context, request) =>
			run(workflows.applyGeneratedKnowledge, context, request),
		ensureOwnedSurface: (context, request) =>
			run(workflows.ensureOwnedSurface, context, request),
		ensureReadingEntry: (context, request) =>
			run(workflows.ensureReadingEntry, context, request),
		cleanupRelations: (slice, request) =>
			run(workflows.cleanupRelations, slice, request),
	};
}
