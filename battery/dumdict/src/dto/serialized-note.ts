import type { SupportedLanguage } from "dumling/types";
import type { LemmaRecord, ReadingEntry, SurfaceEntry } from "./entries";
import type { PendingSemanticRelationRecord } from "./pending";

/**
 * Version 1 dictionary-note wire aggregate.
 *
 * @remarks This is a hard-break format. Dumdict does not migrate the old
 * unversioned Reading-targeted relation shape; hosts must reset or rewrite it.
 */
export type SerializedDictionaryNote<L extends SupportedLanguage> = {
	schemaVersion: 1;
	lemmaRecord: LemmaRecord<L>;
	readingEntries: ReadingEntry<L>[];
	ownedSurfaceEntries: SurfaceEntry<L>[];
	pendingRelations: PendingSemanticRelationRecord<L>[];
};
