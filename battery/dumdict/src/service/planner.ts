import type * as Dumling from "dumling/types";

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
import {
	createDumdictWorkflows,
	type DumdictWorkflow,
	type DumdictWorkflowFailure,
} from "./workflows";

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
 * @remarks The Effect-based `DumdictService` reads its slice through a storage
 * port and commits through the same port. A host that already sits inside a
 * database transaction can instead load the slice itself, plan here, and apply
 * the plan in the same transaction. The planner runs the same workflows as the
 * service, so it checks the request, validates the slice against it, and
 * returns a validated plan or the failure the service would raise; it never
 * reads or writes storage.
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

function outcomeFor(
	failure: DumdictWorkflowFailure,
): DumdictPlanRejected | DumdictPlanConflict {
	switch (failure._tag) {
		case "DumdictRejection":
			return {
				status: "rejected",
				code: failure.code,
				...(failure.message === undefined
					? {}
					: { message: failure.message }),
			};
		case "DumdictInvalidInput":
			return {
				status: "rejected",
				code: "invalidRequest",
				message: failure.message,
			};
		case "DumdictRevisionConflict":
		case "DumdictSemanticPreconditionFailure":
			return {
				status: "conflict",
				code:
					failure._tag === "DumdictRevisionConflict"
						? "revisionConflict"
						: "semanticPreconditionFailed",
				...(failure.message === undefined
					? {}
					: { message: failure.message }),
			};
	}
}

function run<L extends Dumling.Language, Request, Slice>(
	workflow: DumdictWorkflow<L, Request, Slice>,
	slice: Slice,
	request: Request,
): DumdictPlanOutcome<L> {
	const checked = workflow.check(request);
	if (checked.status === "failed") return outcomeFor(checked.failure);
	const planned = workflow.plan(slice, checked.value);
	return planned.status === "failed"
		? outcomeFor(planned.failure)
		: { status: "planned", ...planned.value };
}

export function createDumdictPlanner<L extends Dumling.Language>(
	language: L,
): DumdictPlanner<L> {
	const workflows = createDumdictWorkflows(language);
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
