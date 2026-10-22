/**
 * `knowledge.produce` (#883): the Knowledge one occurrence asks for its
 * resolved Reading. The Reading's language module produces it.
 */
import * as Effect from "effect/Effect";
import type { CallLog } from "../call.js";
import type { Jev } from "../jev-call.js";
import { languageModuleOf } from "../language-module.js";
import { Languages } from "../languages.js";
import type { Luna } from "../luna-call.js";
import type { KnowledgeProduction, ProduceKnowledgeInput } from "./types.js";

/**
 * Produces the Knowledge `input` asks for. A language with no module, or a
 * Reading of another language than the input's, is bad input, a Defect
 * raised before anything is asked; the module checks the rest.
 */
export const produceKnowledge = <E>(
	input: ProduceKnowledgeInput<E>,
): Effect.Effect<KnowledgeProduction, E, Jev | Luna | CallLog> =>
	Effect.gen(function* () {
		const language: string = input.reading.lemma.language;
		const module = languageModuleOf(yield* Languages, input.language);
		if (module === undefined || language !== input.language)
			return yield* Effect.die(
				Error(
					`knowledge.produce produces German ("de") only, not ${JSON.stringify(language)}`,
				),
			);
		return yield* module.produceKnowledge(input);
	});
