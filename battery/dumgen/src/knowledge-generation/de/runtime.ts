import * as Effect from "effect/Effect";
import { DumgenError } from "../../generator/generator-error";
import {
	parseAsKnowledgeGenerationInput,
	parseAsKnowledgeGenerationResult,
	unwrapDumgenParse,
} from "../../parsing/lightweight-parsers";
import {
	EMPTY_GENERATED_KNOWLEDGE_UPDATE,
	type GeneratedKnowledgeUpdate,
} from "./projection";
import {
	type GermanKnowledgeGenerationInput,
	isEmptyGermanKnowledgeRequest,
} from "./runtime-schema";

export type CombinedGermanKnowledgeGenerator = (
	input: GermanKnowledgeGenerationInput,
) => Effect.Effect<GeneratedKnowledgeUpdate, DumgenError>;

/** Validates and executes one per-Family German Knowledge generation route. */
export function createGermanKnowledgeGeneration(
	generateForFamily: CombinedGermanKnowledgeGenerator,
) {
	return function generateGermanKnowledge(
		rawInput: GermanKnowledgeGenerationInput,
	): Effect.Effect<GeneratedKnowledgeUpdate, DumgenError> {
		return Effect.gen(function* () {
			const input = yield* Effect.try({
				try: () =>
					unwrapDumgenParse(
						parseAsKnowledgeGenerationInput(rawInput, "de"),
					),
				catch: (cause) =>
					new DumgenError(
						"invalid-input",
						"German Knowledge generation input is invalid.",
						{ cause },
					),
			});
			if (isEmptyGermanKnowledgeRequest(input.request))
				return EMPTY_GENERATED_KNOWLEDGE_UPDATE;
			const generated = yield* generateForFamily(input);
			return yield* Effect.try({
				try: () => {
					const parsed = unwrapDumgenParse(
						parseAsKnowledgeGenerationResult(generated),
					);
					if ("decision" in parsed)
						throw new TypeError(
							"Open Knowledge produced a CatalogMiss.",
						);
					return parsed;
				},
				catch: (cause) =>
					new DumgenError(
						"invalid-output",
						"German Knowledge generation produced an invalid update.",
						{ cause },
					),
			});
		});
	};
}
