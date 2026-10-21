import type {
	AccumulateTranslationsInput,
	Dumgen,
	DumgenOptions,
	TranslationAccumulation,
} from "dumgen";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type { ClickEncounter } from "./clickResolution";

/**
 * The translation accumulation port (ADR 0047): the model work that adds
 * the translations one occurrence needs to its Reading's stored ones.
 * tf-demo owns when it runs and what it publishes; Dumgen's
 * `knowledge.accumulateTranslations` does the model work.
 */
export type TranslationAccumulator = (input: {
	readonly encounter: ClickEncounter;
	readonly reading: Dumling.Reading<"de">;
	readonly attestation: Dumling.Attestation<"de">;
	/** The Reading's stored translations, by language, as the note holds them. */
	readonly translations: AccumulateTranslationsInput["translations"];
}) => Effect.Effect<TranslationAccumulation>;

/**
 * The TranslationAccumulator whose model work is Dumgen's: the Encounter's
 * stored Segments and member indices are the Sentence with its target.
 * Every failure comes back as a value. `dumgen` builds the instance when a
 * run first needs it.
 */
export function dumgenTranslationAccumulator(
	dumgen: (
		tracing: Pick<DumgenOptions, "onOperation">,
	) => Pick<Dumgen, "knowledge">,
	onOperation?: DumgenOptions["onOperation"],
): TranslationAccumulator {
	return (input) =>
		Effect.suspend(() =>
			dumgen(
				onOperation ? { onOperation } : {},
			).knowledge.accumulateTranslations({
				language: "de",
				reading: input.reading,
				attestation: input.attestation,
				sentence: {
					segments: input.encounter.sentence.segments.map(
						({ kind, text }) => ({ kind, text }),
					),
					target: [...input.encounter.target.memberSegmentIndices],
				},
				translations: input.translations,
			}),
		);
}
