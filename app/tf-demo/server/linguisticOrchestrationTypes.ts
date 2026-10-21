import type { DetectedLanguage } from "dumgen";
import type * as Dumling from "dumling/types";
import type * as Effect from "effect/Effect";
import type {
	ClickResolution,
	ClickSentence,
	LemmaCandidate,
	NeighbourSentences,
	ReadingResolution,
} from "./clickResolution";
import type {
	GenerationEvent,
	ResolutionGenerationEvent,
} from "./resolutionFailure";
import type { CatalogMissSignal, ResolvedGrammar } from "./resolutionGrammar";
import type { ResolutionPhase } from "./resolutionLifecycle";
import type { StoredSegment, StoredUnit } from "./storedSegments";

export type PersistedSentence = {
	readonly sentenceId: string;
	readonly scrollId: string;
	readonly segmentedSentenceId: string;
	/** The Detected Language; only a German Sentence is clicked. */
	readonly language?: DetectedLanguage;
	readonly stitchedText: string;
	readonly segments: readonly StoredSegment[];
	/** The biggest units intake stored with the Sentence, if it still has them. */
	readonly units?: readonly StoredUnit[];
	/** Present when intake's segmentation failed: a click segments it again (#861). */
	readonly segmentationFailed?: true;
	/** Whether the Sentence belongs to a hidden Definition Text; absent reads as false. */
	readonly definitionText?: boolean;
};

export type ResolvedClickPersistence = {
	readonly requestId: string;
	readonly visitorId: string;
	readonly sentenceId: string;
	readonly clickedSegmentIndex: number;
	readonly occurrence: {
		/** Stored Segment indices, not the Encounter's. */
		readonly memberSegmentIndices: readonly number[];
		readonly attestation: ResolvedGrammar["attestation"];
		readonly surfaceKey: string;
		readonly lemmaKey: string;
	};
	readonly reading: Dumling.Reading<Dumling.Language>;
	readonly readingKey: string;
	/** The dictionary plan is built where it commits: inside the host transaction. */
	readonly readingDecision: ReadingResolution["decision"];
	/**
	 * For a New its judge decided: the stored Emoji Descriptions it saw. The
	 * commit refuses the New once the Lemma has gained a Reading outside
	 * them (ADR 0031).
	 */
	readonly readingCandidates?: readonly string[];
	/** What the commit writes besides the occurrence, in the same transaction. */
	readonly progress?: CommitProgress;
};

/**
 * What the commit of a resolved click writes besides the occurrence, so one
 * mutation replaces three: the ReadingAvailable progress, absent when a
 * checkpoint already holds the Reading, and the run's success record. A
 * commit refused as stale writes the progress and keeps the record for the
 * commit that follows.
 */
type CommitProgress = {
	readonly readingAvailable?: {
		readonly reading: Dumling.Reading<Dumling.Language>;
		readonly readingResolution: ReadingResolution;
	};
	readonly succeeded?: {
		readonly phase: ResolutionPhase;
		readonly generationEvents: readonly ResolutionGenerationEvent[];
	};
};

export type ReusableAttestation = {
	readonly attestationId: string;
	readonly grammatical: ResolvedGrammar;
	readonly reading: Dumling.Reading<Dumling.Language>;
};

export type UnresolvedClickCommit = {
	readonly status: "Unresolved";
	readonly encounterId: string;
	readonly deduplicated: boolean;
};

export type ReusedResolvedClickCommit = {
	readonly status: "Reused";
	readonly encounterId: string;
	readonly attestationId: string;
	readonly readingId: string;
	readonly deduplicated: boolean;
};

export type LateResolvedClickCommit = {
	readonly status: "Reused";
	readonly encounterId: string;
	readonly attestationId: string;
	readonly readingId: string;
	readonly deduplicated: boolean;
	readonly occurrence: ReusableAttestation;
};

export type ResolvedClickCommit =
	| {
			readonly status: "Committed" | "Reused";
			readonly encounterId: string;
			readonly attestationId: string;
			readonly readingId: string;
			readonly deduplicated: boolean;
			readonly occurrence: ReusableAttestation;
	  }
	| {
			readonly status: "MembershipConflict";
			readonly code: "partialOverlap";
			readonly message: string;
			readonly conflictingAttestationIds: readonly string[];
	  }
	| {
			readonly status: "DictionaryConflict";
			readonly code: "semanticPreconditionFailed";
			readonly message: string;
	  }
	| {
			/**
			 * A New refused because the Lemma gained a Reading its judge never
			 * saw; nothing was written, and the click judges again over
			 * `candidates`, the Lemma's stored Emoji Descriptions now (ADR 0031).
			 */
			readonly status: "StaleReading";
			readonly candidates: readonly string[];
	  };

export type ResolvedGrammatical = ResolvedGrammar;

export type NonResolvedGrammatical = {
	readonly decision: "Unresolved";
	readonly language: ClickSentence["language"];
};

export type ResolveSegmentResult =
	| {
			readonly catalogMiss: CatalogMissSignal;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly reading: Dumling.Reading<Dumling.Language>;
			readonly reused: true;
			readonly persisted: ReusedResolvedClickCommit;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly reading: Dumling.Reading<Dumling.Language>;
			readonly reused: true;
			readonly persisted: LateResolvedClickCommit;
	  }
	| {
			readonly grammatical: NonResolvedGrammatical;
			readonly persisted: UnresolvedClickCommit;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly readingResolution: ReadingResolution;
			readonly reading: Dumling.Reading<Dumling.Language>;
			readonly persisted: Extract<
				ResolvedClickCommit,
				{ status: "MembershipConflict" | "DictionaryConflict" }
			>;
	  }
	| {
			readonly grammatical: ResolvedGrammatical;
			readonly readingResolution: ReadingResolution;
			readonly reading: Dumling.Reading<Dumling.Language>;
			readonly reused: boolean;
			readonly persisted: Extract<
				ResolvedClickCommit,
				{ status: "Committed" | "Reused" }
			>;
	  };

/** What a click's re-segmentation of a failed Sentence found (#861). */
type ResegmentedSentence = {
	readonly segments: readonly {
		readonly kind: StoredSegment["kind"];
		readonly text: string;
		readonly surface?: string;
	}[];
	readonly units: readonly StoredUnit[];
};

/**
 * Durable boundary for the linguistic workflow.
 *
 * The implementation must make the first valid resolved occurrence atomic:
 * canonical dictionary records, exclusive Segment memberships, the occurrence
 * Attestation, and the Visitor Encounter commit together. Replays and late
 * competing results return the committed occurrence instead of duplicating it.
 */
export type OrchestrationPersistence = {
	loadResolutionContext(
		input: ResolveSegmentInput,
	): Promise<ResolutionContext>;
	persistResolvedClick(
		input: ResolvedClickPersistence,
	): Promise<ResolvedClickCommit>;
	persistReusedResolvedClick(
		input: ResolveSegmentInput & {
			readonly attestationId: string;
		},
	): Promise<ReusedResolvedClickCommit>;
	/**
	 * Stores a failed Sentence's re-segmentation for the click that ran it,
	 * and returns the clicked Segment's index among the new Segments: the
	 * Segment at the same place, should the Segments have come out
	 * differently.
	 */
	storeResegmentedSentence?(
		input: ResolveSegmentInput & ResegmentedSentence,
	): Promise<{ readonly clickedSegmentIndex: number }>;
	persistUnresolvedClick(input: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly sentenceId: string;
		readonly clickedSegmentIndex: number;
	}): Promise<UnresolvedClickCommit | LateResolvedClickCommit>;
};

export type ResolveSegmentInput = {
	readonly requestId: string;
	readonly visitorId: string;
	readonly sentenceId: string;
	readonly clickedSegmentIndex: number;
};

export type ResolutionProgressObserver = {
	generationEvent?(event: GenerationEvent): void;
	grammarAvailable(input: {
		readonly grammatical: ResolvedGrammatical;
	}): Promise<void>;
	/**
	 * A resolved click is about to commit, with the Reading it resolved
	 * unless a checkpoint already holds it: what that commit writes in its
	 * own transaction besides the occurrence. Called before every commit.
	 */
	committing(input: {
		readonly readingAvailable?: CommitProgress["readingAvailable"];
	}): CommitProgress;
};

export type ResolutionContext = {
	readonly reusable: ReusableAttestation | null;
	readonly sentence: PersistedSentence | null;
	readonly lemmaCandidates: readonly LemmaCandidate[];
	/** The Sentences before and after this one in its Scroll, as far as they exist. */
	readonly neighbours?: NeighbourSentences;
};

export type ResolutionCheckpoints = {
	readonly grammatical?: ResolvedGrammatical;
	readonly reading?: {
		readonly resolution: ReadingResolution;
		readonly reading: Dumling.Reading<Dumling.Language>;
	};
};

export type TfDemoOrchestratorOptions = {
	/** Grammar, then the Reading's Emoji Description; production runs `dumgenClickResolution`. */
	readonly resolution: ClickResolution;
	/** The Readings the Shared Demo Dictionary already stores for a Lemma. */
	readonly findStoredReadings: (
		lemma: Dumling.Lemma<Dumling.Language>,
	) =>
		| Effect.Effect<readonly Dumling.Reading<Dumling.Language>[], unknown>
		| Promise<readonly Dumling.Reading<Dumling.Language>[]>;
	readonly persistence: OrchestrationPersistence;
	readonly observer?: ResolutionProgressObserver;
	/**
	 * Segments a Sentence whose intake segmentation failed again, on the
	 * first click on it (#861): Dumgen's `segment.inUnits` for that one
	 * Sentence. A segmentation that fails again fails the click; the next
	 * click is a fresh attempt.
	 */
	readonly resegment?: (
		stitchedText: string,
	) => Effect.Effect<ResegmentedSentence, unknown>;
};
