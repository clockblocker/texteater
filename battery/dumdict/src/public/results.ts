import type {
	PendingSemanticRelationRecord,
	Reading,
	ReadingNoteForDisambiguation,
	StoreRevision,
} from "../dto";
import type { Lemma, SupportedLanguage, SurfaceId } from "../dumling";
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

export type MutationResult<L extends SupportedLanguage> =
	| {
			status: "applied";
			baseRevision: StoreRevision;
			nextRevision: StoreRevision;
			affected: AffectedDictionaryEntities<L>;
			summary: MutationSummary;
			diagnostics?: DumdictDiagnostic[];
	  }
	| {
			status: "conflict";
			code: MutationConflictCode;
			baseRevision: StoreRevision;
			latestRevision?: StoreRevision;
			message?: string;
			diagnostics?: DumdictDiagnostic[];
	  }
	| {
			status: "rejected";
			code: MutationRejectedCode;
			message?: string;
			diagnostics?: DumdictDiagnostic[];
	  };

export type MutationConflictCode =
	| "revisionConflict"
	| "semanticPreconditionFailed";

export type MutationRejectedCode =
	| "readingAlreadyExists"
	| "ownedSurfaceAlreadyExists"
	| "readingMissing"
	| "invalidDraft"
	| "invalidRequest"
	| "selfRelation"
	| "relationConflict"
	| "relationTargetMissing";
