import type { z } from "zod";
import {
	knowledgeInputSchema,
	knowledgeOutputSchema,
} from "../../model-schemas.js";
import { assertRequestShape } from "../request-shape.js";
export function assertGermanKnowledgeAnalysisMirrorsRequest(
	input: z.output<typeof knowledgeInputSchema>,
	output: z.output<typeof knowledgeOutputSchema>,
): void {
	const parsed = knowledgeInputSchema.parse(input);
	const analysis = knowledgeOutputSchema.parse(output);
	assertRequestShape(parsed.request, analysis);
}
