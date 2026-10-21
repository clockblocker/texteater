import type * as Dumling from "dumling/types";
import type {
	LemmaRecord,
	PendingSemanticRelationRecord,
	ReadingEntry,
	SurfaceEntry,
} from "../domain-types";

/**
 * One Lemma with everything a dictionary holds for it: its record and
 * Paradigm, its Reading Entries with their Attestation Links, the Surface
 * Entries it owns, and the Pending Semantic Relation records its Readings
 * source.
 */
export type LemmaSlice<L extends Dumling.Language> = {
	lemmaRecord: LemmaRecord<L>;
	readingEntries: ReadingEntry<L>[];
	ownedSurfaceEntries: SurfaceEntry<L>[];
	pendingRelations: PendingSemanticRelationRecord<L>[];
};

/**
 * Version 2 dictionary-note wire aggregate: one Lemma Slice. The Lemma Record
 * holds the Lemma Paradigm, and each Reading Entry its Attestation Links
 * (system ADR 0048, ADR 0049). `migrateV1toV2` reads a version 1 note.
 */
export type SerializedDictionaryNote<L extends Dumling.Language> = {
	schemaVersion: 2;
} & LemmaSlice<L>;

/**
 * Version 1 dictionary-note wire aggregate, as `migrateV1toV2` reads it. Its
 * Reading Knowledge may hold the principal parts Dumrel has since moved to
 * the Lemma Paradigm, and its Reading Entries hold plain attestation strings.
 */
export type SerializedDictionaryNoteV1<L extends Dumling.Language> = {
	schemaVersion: 1;
	lemmaRecord: { lemma: Dumling.Lemma<L> };
	readingEntries: {
		reading: Dumling.Reading<L>;
		knowledge?: unknown;
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	}[];
	ownedSurfaceEntries: SurfaceEntry<L>[];
	pendingRelations: PendingSemanticRelationRecord<L>[];
};
