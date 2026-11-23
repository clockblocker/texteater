import { type Jev, type Luna, operations } from "dumgen";
import * as Effect from "effect/Effect";
import { type Segmenters, withBreakdown } from "./knowledgeBreakdown";
import type { KnowledgeProducer } from "./knowledgeProduction";
import {
	parseAttestation,
	parseGermanReading,
	parseReading,
} from "./operationalParsing";

/** Dumgen's two segmenters (Dumgen ADR 0007), reaching jev alone. */
const dumgenSegmenters: Segmenters<Jev> = {
	inConstituents: operations.segment.inConstituents,
	inMorphemes: operations.segment.inMorphemes,
};

/**
 * The KnowledgeProducer whose model work is Dumgen's `knowledge.produce`
 * (#883, #887), needing `Jev | Luna`. The Encounter's stored Segments and
 * member indices are the Sentence with its target; the Attestation carries
 * the attested government (`valencyEvidence`), which Dumgen appends only
 * on a `New` occurrence (#677). A run that asks for the Breakdown runs the
 * segmenters alongside `knowledge.produce` and keeps their Breakdown only
 * when the Source leaves it standing (`knowledgeBreakdown.ts`); a Source
 * publication would drop for pointing back leaves it. Every failure comes
 * back as a value, a Catalog Miss among them; the only error is
 * `onContribution`'s. `ready` runs when a run first needs the model, and
 * throws when the deployment can't produce Knowledge.
 */
export function dumgenKnowledgeProducer<E>(
	ready: Effect.Effect<void, E>,
): KnowledgeProducer<Jev | Luna> {
	return Effect.fn("DumgenKnowledgeProducer.produce")(
		function* (input, options) {
			yield* Effect.orDie(ready);
			const segments = input.encounter.sentence.segments;
			const production = operations.knowledge.produce({
				language: input.encounter.sentence.language,
				reading: parseReading(
					input.reading,
					input.encounter.sentence.language,
				),
				attestation: parseAttestation(
					input.attestation,
					input.encounter.sentence.language,
				),
				sentence: {
					segments: segments.map(({ kind, text }) => ({
						kind,
						text,
					})),
					target: [...input.encounter.target.memberSegmentIndices],
				},
				origin: input.origin,
				request: input.request,
				onContribution: options.onContribution,
			});
			if (input.reading.lemma.language !== "de") return yield* production;
			return yield* withBreakdown(
				dumgenSegmenters,
				production,
				{
					reading: parseGermanReading(input.reading),
					breakdown: input.breakdown,
					sentence: segments.map(({ text }) => text).join(""),
				},
				options.sourcePointsBack,
			);
		},
	);
}
