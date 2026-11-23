import {
	type AccumulateValencyInput,
	type Jev,
	type Luna,
	operations,
	type ValencyAccumulation,
} from "dumgen";
import type * as Dumling from "dumling/types";
import type * as Effect from "effect/Effect";
import type { ClickEncounter } from "./clickResolution";
import { parseAttestation, parseReading } from "./operationalParsing";

/**
 * The valency accumulation port (ADR 0034): the model work that extracts or
 * matches the concrete Valency Pattern one occurrence realizes and adds it
 * to its Reading's accumulated patterns if new. tf-demo owns when it runs
 * and what it publishes; Dumgen's `knowledge.accumulateValency` does the
 * model work. `R` is what it needs: Dumgen's `Jev | Luna` in production,
 * which the run provides; nothing for a test's fake.
 */
export type ValencyAccumulator<R = never> = (input: {
	readonly encounter: ClickEncounter;
	readonly reading: Dumling.Reading<Dumling.Language>;
	readonly attestation: Dumling.Attestation<Dumling.Language>;
	/** The Reading's stored concrete Valency Patterns, possibly empty. */
	readonly valency: AccumulateValencyInput["valency"];
}) => Effect.Effect<ValencyAccumulation<"de" | "he">, never, R>;

/**
 * The ValencyAccumulator whose model work is Dumgen's: the Encounter's
 * stored Segments and member indices are the Sentence with its target.
 * Every failure comes back as a value.
 */
export const dumgenValencyAccumulator: ValencyAccumulator<Jev | Luna> = (
	input,
) =>
	operations.knowledge.accumulateValency({
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
		valency: input.valency,
	});
