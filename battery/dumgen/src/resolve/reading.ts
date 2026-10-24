/** Reading resolution dispatches through the language-correlated service registry. */
import * as Effect from "effect/Effect";
import type { CallLog } from "../call.js";
import type { InvalidModelOutput, ProviderFailure } from "../errors.js";
import type { Jev } from "../jev-call.js";
import { languageModuleOf } from "../language-module.js";
import { Languages } from "../languages.js";
import type { Luna } from "../luna-call.js";
import type { SegmentLanguage } from "../segment/segmented-sentence.js";
import type { ReadingResolution, ResolveReadingInput } from "./types.js";

export {
	draftPrompt,
	draftsEmojiDescription,
	emojiDescriptionRequest,
	emojiDescriptionSchema,
	generationPrompt,
	markedSentence,
	parsedDescription,
} from "./de/reading.js";
export const resolveReading = <L extends SegmentLanguage>(
	input: ResolveReadingInput<L>,
): Effect.Effect<
	ReadingResolution<L>,
	ProviderFailure | InvalidModelOutput,
	Jev | Luna | CallLog
> =>
	Effect.gen(function* () {
		const language = input.attestation.surface.lemma.language as L;
		const module = languageModuleOf(yield* Languages, language);
		if (!module)
			return yield* Effect.die(
				Error(`No Reading resolver registered for ${language}`),
			);
		return yield* module.resolveReading(input);
	});
