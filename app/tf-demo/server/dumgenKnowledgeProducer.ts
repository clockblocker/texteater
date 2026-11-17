import { type Jev, type Luna, operations } from "dumgen";
import * as Effect from "effect/Effect";
import { type Segmenters, withBreakdown } from "./knowledgeBreakdown";
import type { KnowledgeProducer } from "./knowledgeProduction";

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
export function dumgenKnowledgeProducer(
	ready: () => void,
): KnowledgeProducer<Jev | Luna> {
	return (input, options) =>
		Effect.suspend(() => {
			ready();
			const segments = input.encounter.sentence.segments;
			return withBreakdown(
				dumgenSegmenters,
				operations.knowledge.produce({
					language: "de",
					reading: input.reading,
					attestation: input.attestation,
					sentence: {
						segments: segments.map(({ kind, text }) => ({
							kind,
							text,
						})),
						target: [
							...input.encounter.target.memberSegmentIndices,
						],
					},
					origin: input.origin,
					request: input.request,
					onContribution: options.onContribution,
				}),
				{
					reading: input.reading,
					breakdown: input.breakdown,
					sentence: segments.map(({ text }) => text).join(""),
				},
				options.sourcePointsBack,
			);
		});
}
