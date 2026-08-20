import type { SupportedLanguage } from "dumling/types";
import type { LemmaRecord, ReadingEntry, SurfaceEntry } from "./entries";
import type { PendingSemanticRelationRecord } from "./pending";

export type SerializedDictionaryNote<L extends SupportedLanguage> = {
	schemaVersion: 1;
	lemmaRecord: LemmaRecord<L>;
	readingEntries: ReadingEntry<L>[];
	ownedSurfaceEntries: SurfaceEntry<L>[];
	pendingRelations: PendingSemanticRelationRecord<L>[];
};
