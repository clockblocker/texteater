import {
	defineLocalDemonstrations,
	definePromptSource,
} from "../../../../../assembly";
import { productionDemonstrationSelection } from "./corpus/selections";
import { productionDemonstrationGuidance } from "./demonstrations";
import { promptPart } from "./prompt-part";
import {
	additionalIndicesOutputSchema,
	classificationInputSchema,
	materializeRepresentation,
} from "./representation";

const membershipInstructions =
	"For Resolved, the semantic target contains the click implicitly. additionalMemberIndices lists every other member by its segments[].i value in strictly increasing source order. i is an opaque occurrence ID, not an array position. Use [] when the click is the only member. Never include clickedIndex or a value absent from segments[].i. For Unresolved, use additionalMemberIndices: null.";

const demonstrations = defineLocalDemonstrations({
	inputSchema: classificationInputSchema,
	outputSchema: additionalIndicesOutputSchema,
	cases: productionDemonstrationSelection.ids.map((caseId, index) => {
		const goldenCase = productionDemonstrationSelection.cases[index];
		if (goldenCase === undefined) {
			throw new Error(`Production demonstration ${caseId} is missing.`);
		}
		const explanation = productionDemonstrationGuidance[caseId];
		if (explanation === undefined) {
			throw new Error(
				`Production demonstration ${caseId} has no prompt guidance.`,
			);
		}
		return {
			...materializeRepresentation(
				"additional-compact-indices",
				goldenCase,
			),
			explanation,
			...(goldenCase.contaminationKeys === undefined
				? {}
				: { contaminationKeys: goldenCase.contaminationKeys }),
		};
	}),
});

export const promptSource = definePromptSource({
	route: "target-classification/de/high-level-whole-unit",
	inputSchema: classificationInputSchema,
	outputSchema: additionalIndicesOutputSchema,
	body: `${promptPart}\n\n${membershipInstructions}`,
	demonstrations,
});
