export { applyDumdictKnowledgeChange } from "./core/apply-owned-knowledge-change";
export * from "./dto";
export * from "./dumling";
export type {
	InvalidV0SemanticRelation,
	SerializedDictionaryNoteV0,
	UnresolvedV0Morphology,
} from "./migration/v0-to-v1";
export {
	DumdictV0MigrationError,
	migrateSerializedDictionaryNotesV0ToV1,
} from "./migration/v0-to-v1";
export * from "./public";
export { createDumdictService } from "./service/create-dumdict-service";
export type * from "./storage";
