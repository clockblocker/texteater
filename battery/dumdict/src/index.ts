export {
	type LemmaLinkTarget,
	type LinkTarget,
	linkTargetKey,
	pendingRelationTarget,
	resolveShadow,
	type SpellingLinkTarget,
	spellingTarget,
} from "./core/link-target";
export { reconcileAttestationLinks } from "./core/occurrence/links";
export { reconcileLemmaParadigms } from "./core/occurrence/paradigm";
export type {
	AttestationLink,
	ChangePrecondition,
	CommitChangesRequest,
	CommitChangesResult,
	DumdictPlan,
	LemmaRecord,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingPatchOp,
	StoreRevision,
	SurfaceEntry,
} from "./domain-types";
export type { LemmaSlice, SerializedDictionaryNote } from "./dto";
export { makeSurfaceId } from "./dumling-id";
export {
	type DumdictParse,
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
