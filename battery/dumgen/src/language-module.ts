/**
 * The seam each language plugs into (#772): what Dumgen's operations need
 * from one language. `segment.inUnits`, `resolve.grammar` and
 * `knowledge.produce` look the module up by `input.language` and treat a
 * language with none as bad input, a Defect; the language's own code stays
 * behind the module. `languages.ts` registers the modules.
 */
import type * as Effect from "effect/Effect";
import type { OperationScope } from "./call.js";
import type { InvalidModelOutput, ProviderFailure } from "./errors.js";
import type { JevSettings } from "./jev-call.js";
import type {
	KnowledgeProduction,
	ProduceKnowledgeInput,
} from "./knowledge/types.js";
import type { LunaSettings } from "./luna-call.js";
import type {
	GrammarResolution,
	ResolveGrammarInput,
} from "./resolve/types.js";
import type { Ask, AskFailure } from "./segment/ask.js";
import type {
	Segment,
	SegmentLanguage,
	Unit,
} from "./segment/segmented-sentence.js";

/** What the operations that write reach their models with. */
type Models = {
	readonly jev: JevSettings;
	readonly luna: LunaSettings;
};

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
	};
	/** The body of `resolve.grammar` for a click on a Sentence that segmented. */
	readonly resolveGrammar: (
		scope: OperationScope,
		models: Models,
		input: ResolveGrammarInput,
	) => Effect.Effect<GrammarResolution, ProviderFailure | InvalidModelOutput>;
	/** The body of `knowledge.produce` for a Reading of the language. */
	readonly produceKnowledge: <E>(
		scope: OperationScope,
		models: Models,
		input: ProduceKnowledgeInput<E>,
	) => Effect.Effect<KnowledgeProduction, E>;
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
