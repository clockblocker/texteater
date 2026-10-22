/**
 * `createDumgen`, the interim facade over Dumgen's operations (Dumgen ADR
 * 0009, #1273): it builds `DumgenLive(options)` once and provides it to
 * each operation, so a host's operations need nothing. Its operations are
 * Effects whose error channel holds only `ProviderFailure` and
 * `InvalidModelOutput` (#552); a host `yield*`s them in its own programs.
 * `knowledge.produce`'s error channel holds only the host's own
 * `onContribution` error (#883), and `knowledge.accumulateTranslations`'s
 * failures are all values (ADR 0047). Each operation is documented on
 * `operations`.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { DumgenLive, type DumgenOptions } from "./dumgen-live.js";
import type { InvalidModelOutput, ProviderFailure } from "./errors.js";
import type {
	AccumulateTranslationsInput,
	KnowledgeProduction,
	ProduceKnowledgeInput,
	TranslationAccumulation,
} from "./knowledge/types.js";
import type { DetectLanguagesInput, LanguagedText } from "./language/detect.js";
import { operations } from "./operations.js";
import type {
	GrammarResolution,
	ReadingResolution,
	ResolveGrammarInput,
	ResolveReadingInput,
} from "./resolve/types.js";
import type { InUnitsInput } from "./segment/in-units.js";
import type { SegmentedText } from "./segment/segmented-sentence.js";
import type { TranslateSentenceInput } from "./translate/types.js";

export type { DumgenOptions } from "./dumgen-live.js";

type ModelFailure = ProviderFailure | InvalidModelOutput;

/** `operations` with `DumgenLive` provided. */
export type Dumgen = {
	readonly language: {
		readonly detect: (
			input: DetectLanguagesInput,
		) => Effect.Effect<LanguagedText, ModelFailure>;
	};
	readonly segment: {
		readonly inUnits: (input: InUnitsInput) => Effect.Effect<SegmentedText>;
	};
	readonly resolve: {
		readonly grammar: (
			input: ResolveGrammarInput,
		) => Effect.Effect<GrammarResolution, ModelFailure>;
		readonly reading: (
			input: ResolveReadingInput,
		) => Effect.Effect<ReadingResolution, ModelFailure>;
	};
	readonly translate: {
		readonly sentence: (
			input: TranslateSentenceInput,
		) => Effect.Effect<string, ModelFailure>;
	};
	readonly knowledge: {
		readonly produce: <E = never>(
			input: ProduceKnowledgeInput<E>,
		) => Effect.Effect<KnowledgeProduction, E>;
		readonly accumulateTranslations: (
			input: AccumulateTranslationsInput,
		) => Effect.Effect<TranslationAccumulation>;
	};
};

/**
 * Builds `DumgenLive(options)` once: a floating `jevModel` or a request
 * budget that is no positive integer throws here.
 */
export function createDumgen(options: DumgenOptions): Dumgen {
	const context = Effect.runSync(
		Effect.scoped(Layer.build(DumgenLive(options))),
	);
	const provided = Effect.provideContext(context);
	return {
		language: {
			detect: (input) => provided(operations.language.detect(input)),
		},
		segment: {
			inUnits: (input) => provided(operations.segment.inUnits(input)),
		},
		resolve: {
			grammar: (input) => provided(operations.resolve.grammar(input)),
			reading: (input) => provided(operations.resolve.reading(input)),
		},
		translate: {
			sentence: (input) => provided(operations.translate.sentence(input)),
		},
		knowledge: {
			produce: (input) => provided(operations.knowledge.produce(input)),
			accumulateTranslations: (input) =>
				provided(operations.knowledge.accumulateTranslations(input)),
		},
	};
}
