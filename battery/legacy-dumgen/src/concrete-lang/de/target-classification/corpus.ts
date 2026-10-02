import { segmentedSentenceSchema } from "../../../universal/schemas.js";
import { defineLinguisticCorpus } from "../authoring.js";
import {
	compactTargetInputSchema as inputSchema,
	targetOutputSchema as outputSchema,
} from "../model-schemas.js";
import { demonstrationIds, targetCases, targetRoute } from "./cases.js";
import { demonstrationCaseNotes } from "./demonstration-notes.js";
import { createGermanHighLevelTargetClassificationProjection } from "./projection.js";

export { inputSchema, outputSchema };

const cases = Object.fromEntries(
	Object.entries(targetCases).map(([id, golden]) => {
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
				explanation: demonstrationCaseNotes[id] ?? golden.explanation,
				input: projection.modelInput,
				idealOutput: projection.materialize(golden.idealOutput),
			},
		];
	}),
);
export const corpusSource = defineLinguisticCorpus({
	route: targetRoute,
	inputSchema,
	outputSchema,
	cases,
	demonstrationIds,
	source: import.meta.url,
});
