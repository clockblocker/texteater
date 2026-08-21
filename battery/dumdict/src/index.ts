export { applyDumdictKnowledgeChange } from "./core/apply-reading-knowledge-change";
export type * from "./domain-types";
export * from "./dto";
export * from "./dumling";
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
export {
	type ProjectSemanticRelationsInput,
	projectSemanticRelations,
	type SemanticRelationProjection,
} from "./relations";
export { createDumdictService } from "./service/create-dumdict-service";
export type * from "./storage";
