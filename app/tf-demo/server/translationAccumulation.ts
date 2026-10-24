import {
	type AccumulateTranslationsInput,
	type Jev,
	type Luna,
	operations,
	type TranslationAccumulation,
} from "dumgen";
import type * as Dumling from "dumling/types";
import type * as Effect from "effect/Effect";
import type { ClickEncounter } from "./clickResolution";
import { parseAttestation, parseReading } from "./operationalParsing";

/**
 * The translation accumulation port (ADR 0047): the model work that adds
 * the translations one occurrence needs to its Reading's stored ones.
 * tf-demo owns when it runs and what it publishes; Dumgen's
 * `knowledge.accumulateTranslations` does the model work. `R` is what it
 * needs: Dumgen's `Jev | Luna` in production, which the run provides;
 * nothing for a test's fake.
 */
export type TranslationAccumulator<R = never> = (input: {
	readonly encounter: ClickEncounter;
	readonly reading: Dumling.Reading<Dumling.Language>;
	readonly attestation: Dumling.Attestation<Dumling.Language>;
	/** The Reading's stored translations, by language, as the note holds them. */
	readonly translations: AccumulateTranslationsInput<Dumling.Language>["translations"];
}) => Effect.Effect<TranslationAccumulation<Dumling.Language>, never, R>;

/**
 * The TranslationAccumulator whose model work is Dumgen's: the Encounter's
 * stored Segments and member indices are the Sentence with its target.
 * Every failure comes back as a value.
 */
export const dumgenTranslationAccumulator: TranslationAccumulator<
	Jev | Luna
> = (input) =>
	operations.knowledge.accumulateTranslations({
		language: input.encounter.sentence.language,
		reading: parseReading(input.reading, input.encounter.sentence.language),
		attestation: parseAttestation(
			input.attestation,
			input.encounter.sentence.language,
		),
		sentence: {
			segments: input.encounter.sentence.segments.map(
				({ kind, text }) => ({ kind, text }),
			),
			target: [...input.encounter.target.memberSegmentIndices],
		},
		translations: input.translations,
	});
