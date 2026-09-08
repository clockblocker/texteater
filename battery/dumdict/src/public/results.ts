import type { Lemma, SupportedLanguage } from "dumling/types";
import type {
	PendingSemanticRelationRecord,
	Reading,
	ReadingNoteForDisambiguation,
	StoreRevision,
} from "../dto";
import type { SurfaceId } from "../dumling";
import type { DumdictDiagnostic } from "./diagnostics";

export type AffectedDictionaryEntities<L extends SupportedLanguage> = {
	lemmas?: Lemma<L>[];
	readings?: Reading<L>[];
	surfaceIds?: SurfaceId<L>[];
	pendingIds?: string[];
};

export type MutationSummary = {
	message: string;
};

export type ReadingCandidate<L extends SupportedLanguage> = {
	reading: Reading<L>;
	note: ReadingNoteForDisambiguation<L>;
};

export type FindStoredReadingsResult<L extends SupportedLanguage> = {
	revision: StoreRevision;
	candidates: ReadingCandidate<L>[];
	diagnostics?: DumdictDiagnostic[];
};

export type CleanupPendingRelation<L extends SupportedLanguage> =
	PendingSemanticRelationRecord<L>;

export type GetInfoForRelationsCleanupResult<L extends SupportedLanguage> = {
	revision: StoreRevision;
	canonicalForm: string;
	candidateLemmas: Lemma<L>[];
	pendingRelations: CleanupPendingRelation<L>[];
	diagnostics?: DumdictDiagnostic[];
};

export type MutationResult<L extends SupportedLanguage> = {
	status: "applied";
	baseRevision: StoreRevision;
	nextRevision: StoreRevision;
	affected: AffectedDictionaryEntities<L>;
	summary: MutationSummary;
	diagnostics?: readonly DumdictDiagnostic[];
};

export type PreparedMutation<L extends SupportedLanguage> = Readonly<{
	plan: import("../storage").DumdictPlan<L>;
	affected: AffectedDictionaryEntities<L>;
	summary: MutationSummary;
	diagnostics?: readonly DumdictDiagnostic[];
}>;

export type DumdictInvalidInput = Readonly<{
	_tag: "DumdictInvalidInput";
	expectedLanguage?: SupportedLanguage;
	actualLanguage?: SupportedLanguage;
	message: string;
}>;

export type DumdictRejection = Readonly<{
	_tag: "DumdictRejection";
	code: MutationRejectedCode;
	message?: string;
}>;

export type DumdictRevisionConflict = Readonly<{
	_tag: "DumdictRevisionConflict";
	baseRevision: StoreRevision;
	latestRevision?: StoreRevision;
	message?: string;
}>;

export type DumdictSemanticPreconditionFailure = Readonly<{
	_tag: "DumdictSemanticPreconditionFailure";
	baseRevision: StoreRevision;
	latestRevision?: StoreRevision;
	message?: string;
}>;

export type DumdictStorageFailure = Readonly<{
	_tag: "DumdictStorageFailure";
	operation: string;
	cause: unknown;
}>;

export type DumdictCommitFailure =
	| DumdictRevisionConflict
	| DumdictSemanticPreconditionFailure
	| DumdictStorageFailure;

export type MutationConflictCode =
	| "revisionConflict"
	| "semanticPreconditionFailed";

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
