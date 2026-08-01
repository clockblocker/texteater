import { z } from "zod";

import type { Prompt } from "../prompt-definition";
import { indexedSegmentSchema } from "./de-classification-shared";

const inputSchema = z.strictObject({
	language: z.literal("de"),
	segmentedSentenceId: z.string().trim().min(1),
	clickedSegmentIndex: z.number().int().nonnegative(),
	segments: z.array(indexedSegmentSchema).min(1),
});

const outputSchema = z.strictObject({
	surfaceSegmentIndices: z.array(z.number().int().nonnegative()).min(1),
	selectedOrthography: z.enum(["Standard", "Typo"]),
});

export const deSelectionPrompt = {
	systemPrompt: `You classify the Selection membership for one clicked German
ResolvableText Segment in a hands-on linguistic laboratory.

Return ordered, unique surfaceSegmentIndices. They must include the clicked
Segment and reference every and only ResolvableText Segment participating in
the contextual grammatical Surface. Include discontinuous particles,
morphemes, or multiword material when it belongs to that Surface. Do not add
governed complements merely because they are nearby.

selectedOrthography describes only the clicked Segment: Standard for accepted
standard or licensed-variant spelling, Typo only for an actual spelling error.
Do not classify a Surface, Lemma, Reading, meaning, confidence, or explanation.`,
	inputSchema,
	outputSchema,
	outputPostcondition: {
		assert(input, generated) {
			const indices = generated.surfaceSegmentIndices;
			if (!indices.includes(input.clickedSegmentIndex)) {
				throw new Error(
					"Selection membership must include the clicked Segment.",
				);
			}
			for (let position = 0; position < indices.length; position += 1) {
				const index = indices[position];
				if (index === undefined) {
					throw new Error(
						"Selection membership cannot contain a missing index.",
					);
				}
				const segment = input.segments.find(
					(candidate) => candidate.index === index,
				);
				if (segment?.kind !== "ResolvableText") {
					throw new Error(
						"Selection membership must reference ResolvableText.",
					);
				}
				if (
					position > 0 &&
					(indices[position - 1] ?? index) >= (index ?? -1)
				) {
					throw new Error(
						"Selection membership must be ordered and unique.",
					);
				}
			}
		},
	},
	generationParams: {
		model: "gpt-5-nano",
		maxOutputTokens: 384,
	},
} satisfies Prompt<typeof inputSchema, typeof outputSchema>;
