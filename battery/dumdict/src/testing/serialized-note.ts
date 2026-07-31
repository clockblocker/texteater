import type {
	LemmaRecord,
	PendingEntryRef,
	PendingEntryRelation,
	ReadingEntry,
	SurfaceEntry,
} from "../dto";
import type { SupportedLanguage } from "../dumling";

export type SerializedDictionaryNote<L extends SupportedLanguage> = {
	lemmaRecord: LemmaRecord<L>;
	readingEntries: ReadingEntry<L>[];
	ownedSurfaceEntries: SurfaceEntry<L>[];
	pendingRefs?: PendingEntryRef<L>[];
	pendingRelations: PendingEntryRelation<L>[];
};
