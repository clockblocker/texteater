import { segmentedSentenceSchema } from "../../../universal/schemas.js";
import { defineLinguisticPrompt } from "../authoring.js";
import {
	compactTargetInputSchema as inputSchema,
	targetOutputSchema as outputSchema,
} from "../model-schemas.js";
import { productionDemonstrationGuidance } from "./guidance.js";
import type { GermanHighLevelTargetClassificationTarget } from "./projection.js";
import { createGermanHighLevelTargetClassificationProjection } from "./projection.js";
import data from "./source-data.json";

export { inputSchema, outputSchema };

const cases = Object.fromEntries(
	Object.entries(data.cases).map(([id, golden]) => {
		const segments = segmentedSentenceSchema.shape.segments.parse(
			golden.input.segments,
		);
		const projection = createGermanHighLevelTargetClassificationProjection({
			...golden.input,
			segments,
		});
		return [
			id,
			{
				...golden,
				explanation:
					productionDemonstrationGuidance[id] ??
					("explanation" in golden ? golden.explanation : undefined),
				input: projection.modelInput,
				idealOutput: projection.materialize(
					golden.idealOutput as
						| GermanHighLevelTargetClassificationTarget
						| { decision: "Unresolved" },
				),
			},
		];
	}),
);
export const promptSource = defineLinguisticPrompt({
	route: data.route,
	inputSchema,
	outputSchema,
	body: data.body,
	cases,
	demonstrationIds: data.demonstrationIds,
	source: import.meta.url,
});
