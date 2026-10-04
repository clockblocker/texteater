export { applyDumdictKnowledgeChange } from "./core/apply-reading-knowledge-change";
export type * from "./domain-types";
export * from "./dto";
export * from "./dumling-id";
export {
	ParsingError,
	parseAsChangePrecondition,
	parseAsCommitChangesRequest,
	parseAsCommitChangesResult,
	parseAsDumdictPlan,
	parseAsLemmaRecord,
	parseAsPendingSemanticRelationLocator,
	parseAsPendingSemanticRelationRecord,
	parseAsPlannedChangeOp,
	parseAsReadingEntry,
	parseAsReadingPatchOp,
	parseAsSurfaceEntry,
} from "./parsing/lightweight-parsers";
export * from "./public";
export type * from "./storage";
