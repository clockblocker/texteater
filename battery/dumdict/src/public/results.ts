import type * as Dumling from "dumling/types";
import type { SurfaceId } from "../dumling-id";

export type AffectedDictionaryEntities<L extends Dumling.Language> = {
	lemmas?: Dumling.Lemma<L>[];
	readings?: Dumling.Reading<L>[];
	surfaceIds?: SurfaceId<L>[];
	pendingIds?: string[];
};

export type MutationSummary = {
	message: string;
};

export type MutationRejectedCode =
	| "readingAlreadyExists"
	| "readingEntryConflict"
	| "ownedSurfaceAlreadyExists"
	| "readingMissing"
	| "invalidDraft"
	| "invalidRequest"
	| "selfRelation"
	| "relationConflict"
	| "relationTargetMissing";
