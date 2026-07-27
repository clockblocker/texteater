import type {
	LemmaEntry,
	PendingLemmaRef,
	PendingLemmaRelation,
	SurfaceEntry,
} from "../dto";
import type { SupportedLanguage } from "../dumling";

export type SerializedDictionaryNote<L extends SupportedLanguage> = {
	lemmaEntry: LemmaEntry<L>;
	ownedSurfaceEntries: SurfaceEntry<L>[];
	pendingRefs?: PendingLemmaRef<L>[];
	pendingRelations: PendingLemmaRelation<L>[];
};
