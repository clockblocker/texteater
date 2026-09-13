import type * as Dumling from "dumling/types";

import type {
	PendingSemanticRelationRecord,
	ReadingNoteForDisambiguation,
	StoreRevision,
} from "../dto";
import type { SurfaceId } from "../dumling-id";
import type { DumdictDiagnostic } from "./diagnostics";

export type AffectedDictionaryEntities<L extends Dumling.Language> = {
	lemmas?: Dumling.Lemma<L>[];
	readings?: Dumling.Reading<L>[];
	surfaceIds?: SurfaceId<L>[];
	pendingIds?: string[];
};

export type MutationSummary = {
	message: string;
};

export type ReadingCandidate<L extends Dumling.Language> = {
	reading: Dumling.Reading<L>;
	note: ReadingNoteForDisambiguation<L>;
};

export type FindStoredReadingsResult<L extends Dumling.Language> = {
	revision: StoreRevision;
	candidates: ReadingCandidate<L>[];
	diagnostics?: DumdictDiagnostic[];
};

export type CleanupPendingRelation<L extends Dumling.Language> =
	PendingSemanticRelationRecord<L>;

export type GetInfoForRelationsCleanupResult<L extends Dumling.Language> = {
	revision: StoreRevision;
	canonicalForm: string;
	candidateLemmas: Dumling.Lemma<L>[];
	pendingRelations: CleanupPendingRelation<L>[];
	diagnostics?: DumdictDiagnostic[];
};

export type MutationResult<L extends Dumling.Language> = {
	status: "applied";
	baseRevision: StoreRevision;
	nextRevision: StoreRevision;
	affected: AffectedDictionaryEntities<L>;
	summary: MutationSummary;
	diagnostics?: readonly DumdictDiagnostic[];
};

export type PreparedMutation<L extends Dumling.Language> = Readonly<{
	plan: import("../storage").DumdictPlan<L>;
	affected: AffectedDictionaryEntities<L>;
	summary: MutationSummary;
	diagnostics?: readonly DumdictDiagnostic[];
}>;

export type DumdictInvalidInput = Readonly<{
	_tag: "DumdictInvalidInput";
	expectedLanguage?: Dumling.Language;
	actualLanguage?: Dumling.Language;
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
