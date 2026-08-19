import { DumgenError } from "../../generator/generator-error";
import {
	EMPTY_GENERATED_KNOWLEDGE_UPDATE,
	type GeneratedKnowledgeUpdate,
	generatedKnowledgeUpdateSchema,
} from "./projection";
import {
	type GermanKnowledgeGenerationInput,
	germanKnowledgeGenerationInputSchema,
	isEmptyGermanKnowledgeRequest,
} from "./schemas";

export type CombinedGermanKnowledgeGenerator = (
	input: GermanKnowledgeGenerationInput,
) => Promise<GeneratedKnowledgeUpdate>;

/** Validates and executes the German combined Knowledge generation workflow. */
export function createGermanKnowledgeGeneration(
	generateCombined: CombinedGermanKnowledgeGenerator,
) {
	return async function generateGermanKnowledge(
		rawInput: GermanKnowledgeGenerationInput,
	): Promise<GeneratedKnowledgeUpdate> {
		let input: GermanKnowledgeGenerationInput;
		try {
			input = germanKnowledgeGenerationInputSchema.parse(rawInput);
		} catch (cause) {
			throw new DumgenError(
				"invalid-input",
				"German Knowledge generation input is invalid.",
				{ cause },
			);
		}

		if (isEmptyGermanKnowledgeRequest(input.request)) {
			return EMPTY_GENERATED_KNOWLEDGE_UPDATE;
		}

		const generated = await generateCombined(input);
		try {
			return generatedKnowledgeUpdateSchema.parse(generated);
		} catch (cause) {
			throw new DumgenError(
				"invalid-output",
				"Combined Knowledge generation produced an invalid update.",
				{ cause },
			);
		}
	};
}
