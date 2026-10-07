/**
 * Transaction-side dictionary planning.
 *
 * A host that plans and commits inside one database transaction asks the
 * planner which slice a request needs, loads it, plans, and applies the plan
 * in the same transaction. It parses each change once with
 * `parseAsPlannedChangeOp`, checks `impliedChangePreconditions` beside the
 * change's own, and proves its store with the `dumdict/testing` storage
 * conformance suite.
 */
export { applyDumdictKnowledgeChange } from "./core/apply-reading-knowledge-change";
export { impliedChangePreconditions } from "./core/implied-preconditions";
export type {
	ChangePrecondition,
	DumdictPlan,
	PlannedChangeOp,
	ReadingEntry,
	ReadingKnowledgeChange,
} from "./domain-types";
export { makeSurfaceId } from "./dumling-id";
export {
	ParsingError,
	parseAsCommitChangesRequest,
	parseAsDumdictPlan,
	parseAsPlannedChangeOp,
} from "./parsing/lightweight-parsers";
export type { ReadingEntryContextLoad } from "./planner/context-request";
export {
	createDumdictPlanner,
	type DumdictPlanConflict,
	type DumdictPlanOutcome,
} from "./planner/planner";
export type {
	AddNewNoteRequest,
	ApplyGeneratedKnowledgeRequest,
	CleanupRelationsRequest,
	EnsureOwnedSurfaceRequest,
	EnsureReadingEntryRequest,
	MutationRejectedCode,
} from "./public";
export type {
	CleanupRelationsSlice,
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
} from "./storage/slices";
