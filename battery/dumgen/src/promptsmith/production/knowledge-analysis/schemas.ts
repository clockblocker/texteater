import {
	lexicalBreakdownSchemasFor,
	morphologicalTreeSchemasFor,
	unitShadowSchema,
} from "dumrel";
import { z } from "zod";

import type { PromptInputSchema, PromptOutputSchema } from "../../assembly";

/** Model-facing context only; this is not a resolved Dumrel Reading value. */
export const readingSketchSchema = z.strictObject({
	lemmaDescriptor: unitShadowSchema,
	emojiDescription: z.string().trim().min(1),
});

export const morphemeReadingDraftSchema = readingSketchSchema.superRefine(
	(readingDraft, context) => {
		if (readingDraft.lemmaDescriptor.family !== "Morpheme") {
			context.addIssue({
				code: "custom",
				path: ["lemmaDescriptor", "family"],
				message:
					"A Morphological Tree Reading draft must describe a Morpheme.",
			});
		}
	},
);

export const knowledgeOwnerInputSchema = z.strictObject({
	source: z.string().min(1),
	markedContext: z.string().min(1),
	owner: readingSketchSchema,
});

const componentTextSchema = z.string().trim().min(1);

const proposedMorphologicalNodeSchema: z.ZodType = z.lazy(() =>
	z.discriminatedUnion("nodeKind", [
		z.strictObject({
			nodeKind: z.literal("morpheme"),
			sourceText: componentTextSchema,
		}),
		z.strictObject({
			nodeKind: z.literal("lexicalUnit"),
			sourceText: componentTextSchema,
		}),
		z.strictObject({
			nodeKind: z.literal("structure"),
			children: z.array(proposedMorphologicalNodeSchema).min(1),
		}),
	]),
);

const proposedMorphologicalStructureSchema = z.strictObject({
	nodeKind: z.literal("structure"),
	children: z.array(proposedMorphologicalNodeSchema).min(1),
});

export const morphologicalSegmentationInputSchema =
	knowledgeOwnerInputSchema satisfies PromptInputSchema;
export const morphologicalSegmentationOutputSchema = z.strictObject({
	root: proposedMorphologicalStructureSchema,
}) satisfies PromptOutputSchema;

export const morphologicalResolutionInputSchema = z.strictObject({
	...knowledgeOwnerInputSchema.shape,
	segmentation: morphologicalSegmentationOutputSchema,
});
const morphology = morphologicalTreeSchemasFor({
	morphemeReading: morphemeReadingDraftSchema,
	unitShadow: unitShadowSchema,
});
export const morphologicalResolutionOutputSchema =
	morphology.contributionSchema satisfies PromptOutputSchema;

export const lexicalSegmentationInputSchema =
	knowledgeOwnerInputSchema satisfies PromptInputSchema;
export const lexicalSegmentationOutputSchema = z.strictObject({
	components: z.array(componentTextSchema).min(2),
}) satisfies PromptOutputSchema;

export const lexicalResolutionInputSchema = z.strictObject({
	...knowledgeOwnerInputSchema.shape,
	segmentation: lexicalSegmentationOutputSchema,
});
const lexicalBreakdown = lexicalBreakdownSchemasFor(unitShadowSchema);
export const lexicalResolutionOutputSchema =
	lexicalBreakdown.contributionSchema satisfies PromptOutputSchema;
