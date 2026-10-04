/**
 * Transaction-side dictionary planning without Effect.
 *
 * Hosts that plan and commit inside one database transaction import this
 * entry point instead of `dumdict/runtime`: it exposes the same planners the
 * Effect service runs, plus the identity helpers a transaction needs, and
 * loads none of the Effect-based service wrappers. A host that applies plans
 * in its own store parses each change once with `parseAsPlannedChangeOp`,
 * checks `impliedChangePreconditions` beside the change's own, and proves
 * the result with the `dumdict/testing` storage conformance suite.
 */
export { applyDumdictKnowledgeChange } from "./core/apply-reading-knowledge-change";
export { impliedChangePreconditions } from "./core/implied-preconditions";
export type {
	ChangePrecondition,
	CommitChangesRequest,
	CommitChangesResult,
	DumdictPlan,
	LemmaRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingKnowledgeChange,
	ReadingPatchOp,
	SurfaceEntry,
} from "./domain-types";
export { makeSurfaceId } from "./dumling-id";
export {
	ParsingError,
	parseAsCommitChangesRequest,
	parseAsDumdictPlan,
	parseAsPlannedChangeOp,
} from "./parsing/lightweight-parsers";
export type {
	AddNewNoteRequest,
	ApplyGeneratedKnowledgeRequest,
	CleanupRelationsRequest,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
	MutationRejectedCode,
} from "./public";
export type { ReadingEntryContextLoad } from "./service/context-request";
export {
	createDumdictPlanner,
	type DumdictPlanConflict,
	type DumdictPlanned,
	type DumdictPlanner,
	type DumdictPlanOutcome,
	type DumdictPlanRejected,
} from "./service/planner";
/** Type-only: the port's Effect signatures load no Effect code from here. */
export type { DumdictStoragePort } from "./storage/port";
export type {
	AddNewNoteContext,
	ApplyGeneratedKnowledgeContext,
	CleanupRelationsSlice,
	EnsureOwnedSurfaceContext,
	EnsureReadingEntryContext,
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
} from "./storage/slices";
