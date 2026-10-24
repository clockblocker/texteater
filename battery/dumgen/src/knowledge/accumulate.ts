/**
 * `knowledge.accumulateTranslations` (ADR 0047): the translations one
 * occurrence adds to a Reading that already has some. The Reading's
 * language module checks and writes them.
 */
import * as Effect from "effect/Effect";
import type { CallLog } from "../call.js";
import type { Jev } from "../jev-call.js";
import { languageModuleOf } from "../language-module.js";
import { Languages } from "../languages.js";
import type { Luna } from "../luna-call.js";
import type { SegmentLanguage } from "../segment/segmented-sentence.js";
import type {
	AccumulateTranslationsInput,
	TranslationAccumulation,
} from "./types.js";

/**
 * Accumulates the translations `input` checks. A language with no module,
 * or a Reading of another language than the input's, is bad input, a
 * Defect raised before anything is asked; the module checks the rest.
 */
export const accumulateTranslations = <L extends SegmentLanguage>(
	input: AccumulateTranslationsInput<L>,
): Effect.Effect<TranslationAccumulation<L>, never, Jev | Luna | CallLog> =>
	Effect.flatMap(Languages, (modules) => {
		const language: string = input.reading.lemma.language;
		const module = languageModuleOf(modules, input.language);
		if (module === undefined || language !== input.language)
			return Effect.die(
				Error(
					`No translation accumulator registered for ${JSON.stringify(input.language)}, or Reading language ${JSON.stringify(language)} does not match`,
				),
			);
		return module.accumulateTranslations(input);
	});
