/**
 * Transaction-side dictionary planning without Effect.
 *
 * Hosts that plan and commit inside one database transaction import this
 * entry point instead of `dumdict/runtime`: it exposes the same planners the
 * Effect service runs, plus the identity helpers a transaction needs, and
 * loads none of the Effect-based service wrappers.
 */
export type { DumdictPlan } from "./domain-types";
export { makeSurfaceId } from "./dumling-id";
export {
	ParsingError,
	parseAsCommitChangesRequest,
	parseAsDumdictPlan,
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
export type {
	AddNewNoteContext,
	ApplyGeneratedKnowledgeContext,
	CleanupRelationsSlice,
	EnsureOwnedSurfaceContext,
	EnsureReadingEntryContext,
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
} from "./storage/slices";
