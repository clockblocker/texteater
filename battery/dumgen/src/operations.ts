/**
 * Dumgen's operations (Dumgen ADR 0009). Each is an Effect whose error
 * channel holds only `ProviderFailure` and `InvalidModelOutput` (#552), and
 * whose requirements name the models it reaches: `Jev`, `Luna`, or both.
 * `segment.inUnits` needs `Jev` alone, so its type shows that segmentation
 * never reaches Luna. `DumgenLive` provides them; `runOperation` gives each
 * its own `CallLog` and trace.
 */
import type * as Effect from "effect/Effect";
import { runOperation } from "./call.js";
import type { InvalidModelOutput, ProviderFailure } from "./errors.js";
import type { Jev } from "./jev-call.js";
import { accumulateTranslations } from "./knowledge/accumulate.js";
import { produceKnowledge } from "./knowledge/produce.js";
import type {
	AccumulateTranslationsInput,
	KnowledgeProduction,
	ProduceKnowledgeInput,
	TranslationAccumulation,
} from "./knowledge/types.js";
import {
	type DetectLanguagesInput,
	detectLanguages,
	type LanguagedText,
} from "./language/detect.js";
import type { Luna } from "./luna-call.js";
import { resolveGrammar } from "./resolve/grammar.js";
import { resolveReading } from "./resolve/reading.js";
import type {
	GrammarResolution,
	ReadingResolution,
	ResolveGrammarInput,
	ResolveReadingInput,
} from "./resolve/types.js";
import { type InUnitsInput, segmentText } from "./segment/in-units.js";
import type { SegmentedText } from "./segment/segmented-sentence.js";
import { translateSentence } from "./translate/sentence.js";
import type { TranslateSentenceInput } from "./translate/types.js";

type ModelFailure = ProviderFailure | InvalidModelOutput;

export const operations = {
	language: {
		/**
		 * Each Sentence's Detected Language, or none when it stays
		 * undetermined (Dumgen ADR 0001): code settles what script decides,
		 * jev judges the rest in windows, and surroundings fill what neither
		 * placed. A failed window fails the operation; nothing is retried.
		 */
		detect: (
			input: DetectLanguagesInput,
		): Effect.Effect<LanguagedText, ModelFailure, Jev> =>
			runOperation("language.detect", detectLanguages(input)),
	},
	segment: {
		/**
		 * Segments every Sentence and groups its Segments into biggest
		 * units. A Sentence whose model calls fail comes back marked
		 * `failed`, and the others are kept. Another language than German
		 * or a blank Sentence is a Defect, raised before anything is asked.
		 */
		inUnits: (
			input: InUnitsInput,
		): Effect.Effect<SegmentedText, never, Jev> =>
			runOperation("segment.inUnits", segmentText(input)),
	},
	resolve: {
		/**
		 * The grammar of the stored unit a click landed on (#859): its
		 * Attestation, or Unresolved, or a Catalog Miss, all as answers. A
		 * click is all-or-nothing: any failed call fails it and interrupts
		 * its other calls. Another language than German, a failed Sentence
		 * or a unit that is no unit of its Sentence is a Defect.
		 */
		grammar: (
			input: ResolveGrammarInput,
		): Effect.Effect<GrammarResolution, ModelFailure, Jev | Luna> =>
			runOperation("resolve.grammar", resolveGrammar(input)),
		/**
		 * The Reading a resolved click lands on (#859, ADR 0031): a stored
		 * Emoji Description it reuses, or a New one, or a Catalog Miss, all
		 * as answers. jev judges the stored candidates first; Luna writes
		 * only after NoMatch or when nothing is stored. Authored Lemmas take
		 * their authored Reading. A click is all-or-nothing, as in grammar.
		 * Bad input, a Foreign Attestation among it, is a Defect.
		 */
		reading: (
			input: ResolveReadingInput,
		): Effect.Effect<ReadingResolution, ModelFailure, Jev | Luna> =>
			runOperation("resolve.reading", resolveReading(input)),
	},
	translate: {
		/**
		 * One Sentence's translation into a Dumrel translation language
		 * (#1210), Luna's text in one call, with the neighbouring Sentences
		 * as context only. Interrupting it aborts the call. Another language
		 * than German, a blank Sentence or another translation language is
		 * a Defect, raised before anything is asked.
		 */
		sentence: (
			input: TranslateSentenceInput,
		): Effect.Effect<string, ModelFailure, Luna> =>
			runOperation("translate.sentence", translateSentence(input)),
	},
	knowledge: {
		/**
		 * The Knowledge one occurrence asks for its resolved Reading (#883):
		 * changes, Pending Semantic Relations and per-aspect failures, all
		 * values. Each aspect's changes reach `onContribution` as soon as it
		 * has them; its failure is the only error, and it interrupts the
		 * rest. Bad input is a Defect.
		 */
		produce: <E = never>(
			input: ProduceKnowledgeInput<E>,
		): Effect.Effect<KnowledgeProduction, E, Jev | Luna> =>
			runOperation("knowledge.produce", produceKnowledge(input)),
		/**
		 * The translations one occurrence adds to a Reading that already
		 * has some (ADR 0047): per language, jev judges whether a stored
		 * one covers the occurrence, and only after NoMatch does Luna write
		 * the occurrence's equivalents, without seeing the stored ones.
		 * Out comes a Contribute of those not stored yet per language, and
		 * per-language failures, all values. Bad input is a Defect.
		 */
		accumulateTranslations: (
			input: AccumulateTranslationsInput,
		): Effect.Effect<TranslationAccumulation, never, Jev | Luna> =>
			runOperation(
				"knowledge.accumulateTranslations",
				accumulateTranslations(input),
			),
	},
};
