import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type { Effect } from "effect";
import type { Questions, TypeSafeExecutor } from "promptsmith/typesafe";
import type { SentenceAnalysis } from "./concrete-lang/de/sentence-analysis/analysis.js";
import type * as Generated from "./generated/types.js";
import type {
	Segment,
	SegmentationDecision,
	SegmentedSentence as Sentence,
} from "./generated/types.js";
import type { DumgenFailure } from "./universal/failure.js";

export type { GovernedPrepositionDraft } from "./concrete-lang/de/governable-prepositions.js";
export type { KnowledgeDraft } from "./concrete-lang/de/knowledge-production/draft.js";
export type {
	AnalyzedSegment,
	Fusion,
	FusionComponent,
	Government,
	IdentityCandidate,
	IdentityMass,
	IdentityState,
	LargestUnit,
	LexemeTarget,
	Member,
	MemberRole,
	PhrasemeTarget,
	SelectedPhrasemeKind,
	SelectedRoute,
	SentenceAnalysis,
} from "./concrete-lang/de/sentence-analysis/analysis.js";
export type { Segment, SegmentationDecision } from "./generated/types.js";
export type DumgenLanguage = Dumling.Language;
export type SegmentKind = Segment["kind"];
export type SegmentedSentence<L extends DumgenLanguage = DumgenLanguage> =
	Immutable<Omit<Sentence, "language">> & { readonly language: L };
type Immutable<T> = T extends object
	? { readonly [K in keyof T]: Immutable<T[K]> }
	: T;
export type Encounter<L extends DumgenLanguage = DumgenLanguage> =
	L extends DumgenLanguage
		? {
				readonly sentence: SegmentedSentence<L>;
				readonly target: Immutable<
					Extract<
						Generated.Encounter,
						{ sentence: { language: L } }
					>["target"]
				>;
			}
		: never;
export type AnalysisTarget<L extends DumgenLanguage = DumgenLanguage> =
	Encounter<L>["target"];
// Map each complete schema branch independently so Encounter and unit routes
// remain correlated. Domain units retain Dumling's own mutability contract.
type OperationInput<T> = T extends { encounter: unknown }
	? {
			readonly [K in keyof T]: K extends "encounter"
				? Immutable<T[K]>
				: K extends "candidates"
					? Readonly<T[K]>
					: T[K];
		}
	: never;
export type ComparisonInput<L extends DumgenLanguage = DumgenLanguage> =
	OperationInput<
		Extract<
			Generated.ComparisonInput,
			{ encounter: { sentence: { language: L } } }
		>
	>;
export type KnowledgeInput<L extends DumgenLanguage = DumgenLanguage> =
	OperationInput<
		Extract<
			Generated.KnowledgeInput,
			{ encounter: { sentence: { language: L } } }
		>
	>;
/**
 * A stored Lemma and the Sentence texts a host looked it up under. Each text is
 * one Segment's text or several joined with single spaces; the Lemma's
 * headword or one of its stored Surfaces matched it. Measured: jev takes an
 * offered candidate almost always, so resolveGrammar offers a Lemma only when
 * it was found under the target's own members.
 */
export type LemmaCandidate<L extends DumgenLanguage = DumgenLanguage> = {
	readonly lemma: Dumling.Lemma<L>;
	readonly foundUnder: readonly string[];
};
export type EmojiDescription = Dumling.Reading["emojiDescription"];
export type ReadingEmojiDescriptionResolution = {
	readonly decision: "Reuse" | "New";
	readonly emojiDescription: EmojiDescription;
};
export type KnowledgeRequest = Dumrel.KnowledgeRequestMask;
export type KnowledgeFailure =
	Generated.KnowledgeProduction["failures"][number];
export type KnowledgeProduction<L extends DumgenLanguage = DumgenLanguage> = {
	readonly failures: readonly KnowledgeFailure[];
	readonly changes: readonly Dumrel.KnowledgeChange<Dumling.Reading<L>>[];
	readonly pendingRelations: readonly (Dumrel.PendingSemanticRelation & {
		target: {
			language: L;
		};
	})[];
};
export type Task<T> = Effect.Effect<T, DumgenFailure>;
/**
 * The event `segment` records for every input sentence before its trace is
 * emitted. Failed carries its DumgenFailure tag or Defect; Interrupted work
 * had begun, NotStarted work never did.
 */
export type SentenceOutcome = {
	readonly index: number;
	readonly outcome:
		| "Accepted"
		| "UnsupportedLanguage"
		| "Unintelligible"
		| "Failed"
		| "Interrupted"
		| "NotStarted";
	/** Present for Accepted. */
	readonly language?: DumgenLanguage;
	/** Present for Failed. */
	readonly tag?: string;
};
export interface Dumgen {
	segment(input: {
		readonly sourceSentences: readonly [string, ...string[]];
	}): Task<readonly SegmentationDecision[]>;
	/**
	 * Segments one sentence whose language the caller already trusts, such as
	 * authored dictionary prose. Intake, language detection, and stitching are
	 * skipped; only the per-language Source Segmentation runs. Kept as a Task
	 * so a language whose segmentation needs a model call fits unchanged.
	 */
	segmentSentence<L extends "de" | "en" | "he">(input: {
		readonly language: L;
		readonly stitchedText: string;
	}): Task<SegmentedSentence<L>>;
	/**
	 * Intake-time analysis of one accepted German sentence in two layers:
	 * the Lexeme Targets its Segments realize and the Phraseme Targets made of
	 * those words, with fused words split into offset-keyed Segments (Dumgen
	 * ADR 0006). A host stores it beside the sentence and reads it at click
	 * time; classifyTarget stays the fallback for an Unresolved unit.
	 */
	analyzeSentence(input: {
		readonly sentence: SegmentedSentence<"de">;
	}): Task<SentenceAnalysis>;
	classifyTarget<L extends DumgenLanguage>(input: {
		readonly sentence: SegmentedSentence<L>;
		readonly clickedSegmentIndex: number;
	}): Task<AnalysisTarget<L>>;
	resolveGrammar<L extends DumgenLanguage>(
		input: Encounter<L>,
		/**
		 * Stored Lemmas the host found in the Encounter's Sentence. Only those
		 * found under the target's own text become Canonical Form candidates.
		 */
		lemmaCandidates?: readonly LemmaCandidate<L>[],
	): Task<Dumling.Attestation<L>>;
	resolveOrGenerateReadingEmojiDescription<L extends DumgenLanguage>(
		input: ComparisonInput<L>,
	): Task<ReadingEmojiDescriptionResolution>;
	produceKnowledge<I extends KnowledgeInput>(
		input: I,
	): Task<KnowledgeProduction<I["reading"]["lemma"]["language"]>>;
}
export type ModelConfiguration = {
	readonly model: string;
	readonly settings: Readonly<Record<string, unknown>>;
};
export type ModelRequest = (
	| { readonly outputFormat: "text"; readonly outputSchema?: never }
	| {
			readonly outputFormat?: "json";
			readonly outputSchema: Readonly<Record<string, unknown>>;
	  }
) & {
	readonly stage: string;
	readonly route: string;
	readonly systemPrompt: string;
	readonly input: unknown;
	readonly cachePrompt?: boolean;
	readonly configuration: ModelConfiguration;
	readonly signal: AbortSignal;
};
export type ModelExecutor = (request: ModelRequest) => Promise<{
	readonly output: unknown;
	readonly metadata?: unknown;
}>;
export type JudgmentRequest = {
	readonly stage: string;
	readonly route: string;
	readonly input: unknown;
	readonly questions: Questions;
	readonly configuration: ModelConfiguration;
	readonly signal: AbortSignal;
};
export type ModelExchange = {
	/** Epoch milliseconds; durationMs uses the monotonic clock. */
	readonly startedAt?: number;
	readonly request: ModelRequest | JudgmentRequest;
	readonly output?: unknown;
	readonly metadata?: unknown;
	readonly failure?: string;
	readonly durationMs: number;
};
export type CallTrace = ModelExchange & {
	readonly id: string;
	readonly operationId: string;
	readonly executor: "TypeSafe" | "Luna";
	readonly dependsOn: readonly string[];
	readonly fingerprint: string;
	readonly transport: "Success" | "Failure" | "Interrupted";
	readonly validation: "Valid" | "Invalid" | "NotRun";
};
export type OperationTrace = {
	readonly startedAt?: number;
	readonly version: 2;
	readonly id: string;
	readonly operation: string;
	readonly input: unknown;
	readonly generationConfiguration: ModelConfiguration;
	readonly judgmentConfiguration: ModelConfiguration;
	readonly calls: readonly CallTrace[];
	readonly events: readonly {
		readonly kind: string;
		readonly data: unknown;
	}[];
	readonly output?: unknown;
	readonly failure?: { readonly tag: string; readonly message: string };
	readonly outcome: "Success" | "Partial" | "Failure" | "Interrupted";
	readonly durationMs: number;
};
export type DumgenOptions = {
	/** Generated text awaiting a Reading owner; source and shape checks are local only. */
	readonly knowledgeDraft?: unknown;
	/**
	 * The transport for generation. Interrupting an operation aborts the
	 * request's signal and waits for this promise, so an executor must settle
	 * promptly once its signal aborts.
	 */
	readonly execute: ModelExecutor;
	/** The transport for judgments; like `execute`, it must settle promptly once its signal aborts. */
	readonly judge: TypeSafeExecutor;
	readonly configuration?: Partial<ModelConfiguration>;
	readonly judgmentConfiguration?: {
		readonly model?: string;
		readonly timeoutMs?: number;
	};
	/**
	 * Model and judgment requests one Dumgen instance keeps in flight; each
	 * holds a permit for its transport only. Defaults to 16.
	 */
	readonly requestBudget?: number;
	readonly routeOverrides?: Readonly<
		Record<string, Partial<ModelConfiguration>>
	>;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
	readonly onOperation?: (trace: OperationTrace) => void;
	/** Validated text contributions as they finish. The caller owns publication. */
	readonly onKnowledgeContribution?: (
		changes: KnowledgeProduction["changes"],
	) => void;
};
