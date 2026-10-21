/** Reading resolution dispatches to the Attestation's language module. */
import * as Effect from "effect/Effect";
import type { OperationScope } from "../call.js";
import type { InvalidModelOutput, ProviderFailure } from "../errors.js";
import { type LanguageModules, languageModuleOf } from "../language-module.js";
import type { SegmentLanguage } from "../segment/segmented-sentence.js";
import type { ReadingModels } from "./de/reading.js";
import type { ReadingResolution, ResolveReadingInput } from "./types.js";

// Preserve existing German helper imports; shared dispatch does not use them.
export {
	draftPrompt,
	draftsEmojiDescription,
	emojiDescriptionRequest,
	emojiDescriptionSchema,
	generationPrompt,
	markedSentence,
	parsedDescription,
	type ReadingModels,
} from "./de/reading.js";

export const resolveReading = <L extends SegmentLanguage = "de">(
	scope: OperationScope,
	models: ReadingModels,
	modules: LanguageModules,
	input: ResolveReadingInput<L>,
): Effect.Effect<ReadingResolution<L>, ProviderFailure | InvalidModelOutput> =>
	Effect.gen(function* () {
		const language = input.attestation.surface.lemma.language;
		// Dumling expands the Attestation union, losing the generic L here;
		// the input contract guarantees its Lemma has exactly language L.
		const module = languageModuleOf<L>(modules, language as L);
		if (module === undefined)
			return yield* Effect.die(
				Error(
					`No Reading resolver registered for ${JSON.stringify(language)}`,
				),
			);
		return yield* module.resolveReading(scope, models, input);
	});
