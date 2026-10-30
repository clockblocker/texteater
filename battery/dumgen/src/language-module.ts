/**
 * The seam each language plugs into (#772): what Dumgen's operations need
 * from one language. `segment.inUnits`, `segment.inConstituents`,
 * `segment.inMorphemes`, `resolve.grammar`,
 * `knowledge.produce` and `knowledge.accumulateTranslations` look the
 * module up by `input.language` and treat a language with none as bad
 * input, a Defect; the language's own code stays behind the module. `languages.ts` registers the modules.
 */
import type * as Effect from "effect/Effect";
import type { CallLog } from "./call.js";
import type { InvalidModelOutput, ProviderFailure } from "./errors.js";
import type { Jev } from "./jev-call.js";
import type {
	AccumulateTranslationsInput,
	KnowledgeProduction,
	ProduceKnowledgeInput,
	TranslationAccumulation,
} from "./knowledge/types.js";
import type { Luna } from "./luna-call.js";
import type {
	GrammarResolution,
	ResolveGrammarInput,
} from "./resolve/types.js";
import type { Ask, AskFailure } from "./segment/ask.js";
import type {
	BreakdownInput,
	Constituents,
	ProducedPiece,
} from "./segment/breakdown-pieces.js";
import type {
	Segment,
	SegmentLanguage,
	Unit,
} from "./segment/segmented-sentence.js";

/** The services the bodies of the operations that write need: jev, Luna and their operation's log. */
type Needs = Jev | Luna | CallLog;

/**
 * One Sentence after the Segment stage: its Stitched Text, its Segments and
 * the Segments whose written run kept its spelling unresolved.
 */
export type SentenceSegmentation = {
	readonly text: string;
	readonly segments: readonly Segment[];
	readonly unresolved: readonly number[];
};

export type LanguageModule = {
	readonly segment: {
		/** The Segment stage: one Sentence's Segments, cut with jev. */
		readonly segments: (
			sentence: string,
			ask: Ask,
		) => Effect.Effect<SentenceSegmentation, AskFailure>;
		/** The Segments code alone cuts, for a Sentence whose Segment stage failed. */
		readonly writtenSegments: (sentence: string) => SentenceSegmentation;
		/** The unit stage: the Sentence's biggest units, each with its route or `Unresolved`. */
		readonly units: (
			segmentation: SentenceSegmentation,
			ask: Ask,
		) => Effect.Effect<readonly Unit[], AskFailure>;
		/** The body of `segment.inConstituents`: a Reading's immediate parts, or none. */
		readonly constituents: (
			input: BreakdownInput,
			ask: Ask,
		) => Effect.Effect<Constituents, AskFailure>;
		/** The body of `segment.inMorphemes`: a single-word Lexeme's morphemes. */
		readonly morphemes: (
			input: BreakdownInput,
			ask: Ask,
		) => Effect.Effect<readonly ProducedPiece[], AskFailure>;
	};
	/** The body of `resolve.grammar` for a click on a Sentence that segmented. */
	readonly resolveGrammar: (
		input: ResolveGrammarInput,
	) => Effect.Effect<
		GrammarResolution,
		ProviderFailure | InvalidModelOutput,
		Needs
	>;
	/** The body of `knowledge.produce` for a Reading of the language. */
	readonly produceKnowledge: <E>(
		input: ProduceKnowledgeInput<E>,
	) => Effect.Effect<KnowledgeProduction, E, Needs>;
	/** The body of `knowledge.accumulateTranslations` for a Reading of the language. */
	readonly accumulateTranslations: (
		input: AccumulateTranslationsInput,
	) => Effect.Effect<TranslationAccumulation, never, Needs>;
};

/** Each registered language's module. */
export type LanguageModules = {
	readonly [L in SegmentLanguage]: LanguageModule;
};

/** The module of `language`, or undefined where none is registered. */
export function languageModuleOf(
	modules: LanguageModules,
	language: string,
): LanguageModule | undefined {
	return Object.entries(modules).find(([key]) => key === language)?.[1];
}
