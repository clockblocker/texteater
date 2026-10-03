import type { Dumgen, DumgenOptions } from "dumgen";
import * as Effect from "effect/Effect";
import type { KnowledgeProducer } from "./knowledgeProduction";

/**
 * The KnowledgeProducer whose model work is Dumgen's `knowledge.produce`
 * (#883, #887). The Encounter's stored Segments and member indices are the
 * Sentence with its target; the Attestation carries the attested
 * government (`valencyEvidence`), which Dumgen appends only on a `New`
 * occurrence (#677). Every failure comes back as a value, a Catalog Miss
 * among them; the only error is `onContribution`'s. `dumgen` builds the
 * instance when a run first needs it, with the run's trace options.
 */
export function dumgenKnowledgeProducer(
	dumgen: (
		tracing: Pick<DumgenOptions, "onOperation" | "tracePayloads">,
	) => Pick<Dumgen, "knowledge">,
): KnowledgeProducer {
	return (input, options) =>
		Effect.suspend(() =>
			dumgen({
				...(options.onOperation
					? { onOperation: options.onOperation }
					: {}),
				tracePayloads: options.tracePayloads ?? false,
			}).knowledge.produce({
				language: "de",
				reading: input.reading,
				attestation: input.attestation,
				sentence: {
					segments: input.encounter.sentence.segments.map(
						({ text }) => ({
							text,
						}),
					),
					target: [...input.encounter.target.memberSegmentIndices],
				},
				origin: input.origin,
				request: input.request,
				onContribution: options.onContribution,
			}),
		);
}
