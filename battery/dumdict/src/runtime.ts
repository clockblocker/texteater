export { applyDumdictKnowledgeChange } from "./core/apply-reading-knowledge-change";
export type { DumdictPlan } from "./domain-types";
export { makeSurfaceId } from "./dumling-id";
export { createDumdictService } from "./service/create-dumdict-service";
export type {
	CleanupRelationsSlice,
	DumdictStoragePort,
	ReadingEntryContext,
	ReadingPatchSlice,
	RelationsCleanupInfoSlice,
	StoredReadingsSlice,
} from "./storage";
