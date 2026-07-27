import type { PendingLemmaId, StoreRevision, LexicalRelation, MorphologicalRelation, DumdictEntryDraft } from "../dto";
import type { DumlingId, SupportedLanguage } from "../dumling";

export type AppendLemmaAttestationIntent<L extends SupportedLanguage> = {
	type: "appendLemmaAttestation";
	lemmaId: DumlingId<"Lemma", L>;
	attestation: string;
};

export type AddNewNoteIntent<L extends SupportedLanguage> = {
	type: "addNewNote";
	draft: DumdictEntryDraft<L>;
};

export type CleanupRelationResolutionIntent<
	L extends SupportedLanguage,
> = {
	sourceLemmaId: DumlingId<"Lemma", L>;
	relation: LexicalRelation | MorphologicalRelation;
	targetPendingId: PendingLemmaId<L>;
	targetLemmaId?: DumlingId<"Lemma", L>;
};

export type CleanupRelationsIntent<L extends SupportedLanguage> = {
	type: "cleanupRelations";
	baseRevision: StoreRevision;
	resolutions: CleanupRelationResolutionIntent<L>[];
};

export type DictionaryIntent<L extends SupportedLanguage> =
	| AppendLemmaAttestationIntent<L>
	| AddNewNoteIntent<L>
	| CleanupRelationsIntent<L>;
