/**
 * `knowledge.accumulateValency` (ADR 0034): the concrete Valency Pattern one
 * occurrence realizes and adds to a Reading's accumulated patterns. The
 * Reading's language module checks and extracts it.
 */
import * as Effect from "effect/Effect";
import type { CallLog } from "../call.js";
import type { Jev } from "../jev-call.js";
import { languageModuleOf } from "../language-module.js";
import { Languages } from "../languages.js";
import type { Luna } from "../luna-call.js";
import type { SegmentLanguage } from "../segment/segmented-sentence.js";
import type { AccumulateValencyInput, ValencyAccumulation } from "./types.js";

/**
 * Accumulates the valency pattern realized in `input`. A language with no
 * module, or a Reading of another language than the input's, is bad input,
 * a Defect raised before anything is asked; the module checks the rest.
 */
export const accumulateValency = <L extends SegmentLanguage>(
	input: AccumulateValencyInput<L>,
): Effect.Effect<ValencyAccumulation<L>, never, Jev | Luna | CallLog> =>
	Effect.flatMap(Languages, (modules) => {
		const language: string = input.reading.lemma.language;
		const module = languageModuleOf(modules, input.language);
		if (module === undefined || language !== input.language)
			return Effect.die(
				Error(
					`knowledge.accumulateValency accumulates German ("de") only, not ${JSON.stringify(language)}`,
				),
			);
		return module.accumulateValency(input);
	});
