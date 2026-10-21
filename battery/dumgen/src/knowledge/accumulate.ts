/**
 * `knowledge.accumulateTranslations` (ADR 0047): the translations one
 * occurrence adds to a Reading that already has some. The Reading's
 * language module checks and writes them.
 */
import * as Effect from "effect/Effect";
import type { OperationScope } from "../call.js";
import type { JevSettings } from "../jev-call.js";
import { type LanguageModules, languageModuleOf } from "../language-module.js";
import type { LunaSettings } from "../luna-call.js";
import type {
	AccumulateTranslationsInput,
	TranslationAccumulation,
} from "./types.js";

/**
 * Accumulates the translations `input` checks. A language with no module,
 * or a Reading of another language than the input's, is bad input, a
 * Defect raised before anything is asked; the module checks the rest.
 */
export const accumulateTranslations = (
	scope: OperationScope,
	models: { readonly jev: JevSettings; readonly luna: LunaSettings },
	modules: LanguageModules,
	input: AccumulateTranslationsInput,
): Effect.Effect<TranslationAccumulation> =>
	Effect.suspend(() => {
		const language: string = input.reading.lemma.language;
		const module = languageModuleOf(modules, input.language);
		if (module === undefined || language !== input.language)
			return Effect.die(
				Error(
					`knowledge.accumulateTranslations accumulates German ("de") only, not ${JSON.stringify(language)}`,
				),
			);
		return module.accumulateTranslations(scope, models, input);
	});
