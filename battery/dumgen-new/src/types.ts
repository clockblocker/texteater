import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type { Effect } from "effect";
import type * as Generated from "./generated/types.js";
import type {
	Segment,
	SegmentationDecision,
	SegmentedSentence as Sentence,
} from "./generated/types.js";
import type { DumgenFailure } from "./universal/failure.js";

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
export type GenerationInput<L extends DumgenLanguage = DumgenLanguage> =
	OperationInput<
		Extract<
			Generated.GenerationInput,
			{ encounter: { sentence: { language: L } } }
		>
	>;
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
export type EmojiDescription = Dumling.Reading["emojiDescription"];
export type ReadingEmojiDescriptionResolution = {
	readonly decision: "Reuse" | "New";
	readonly emojiDescription: EmojiDescription;
};
export type KnowledgeRequest = Dumrel.KnowledgeRequestMask;
export type KnowledgeProduction = {
	readonly changes: readonly Dumrel.KnowledgeChange[];
	readonly pendingRelations: readonly Dumrel.PendingSemanticRelation[];
};
export type Task<T> = Effect.Effect<T, DumgenFailure>;
export interface Dumgen {
	segment(input: {
		readonly sourceSentences: readonly [string, ...string[]];
	}): Task<readonly SegmentationDecision[]>;
	classifyTarget<L extends DumgenLanguage>(input: {
		readonly sentence: SegmentedSentence<L>;
		readonly clickedSegmentIndex: number;
	}): Task<AnalysisTarget<L>>;
	resolveGrammar<L extends DumgenLanguage>(
		input: Encounter<L>,
	): Task<Dumling.Attestation<L>>;
	resolveOrGenerateReadingEmojiDescription<L extends DumgenLanguage>(
		input: ComparisonInput<L>,
	): Task<ReadingEmojiDescriptionResolution>;
	generateReadingEmojiDescription<L extends DumgenLanguage>(
		input: GenerationInput<L>,
	): Task<EmojiDescription>;
	produceKnowledge<L extends DumgenLanguage>(
		input: KnowledgeInput<L>,
	): Task<KnowledgeProduction>;
}
export type ModelConfiguration = {
	readonly model: string;
	readonly settings: Readonly<Record<string, unknown>>;
};
export type ModelRequest = {
	readonly stage: string;
	readonly route: string;
	readonly systemPrompt: string;
	readonly input: unknown;
	readonly outputSchema: Readonly<Record<string, unknown>>;
	readonly configuration: ModelConfiguration;
	readonly signal: AbortSignal;
};
export type ModelExecutor = (request: ModelRequest) => Promise<unknown>;
export type ModelExchange = {
	readonly request: ModelRequest;
	readonly output?: unknown;
	readonly failure?: string;
	readonly durationMs: number;
};
export type DumgenOptions = {
	readonly execute: ModelExecutor;
	readonly configuration?: Partial<ModelConfiguration>;
	readonly routeOverrides?: Readonly<
		Record<string, Partial<ModelConfiguration>>
	>;
	readonly onModelExchange?: (exchange: ModelExchange) => void;
};
