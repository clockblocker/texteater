import {
	lexemeUnitShadowSchema,
	lexicalUnitShadowSchema,
	unitShadowSchema,
} from "dumrel/schema";
import { z } from "zod";

import type { PromptInputSchema, PromptOutputSchema } from "../../assembly";

/** Model-facing context only; this is not a resolved Dumrel Reading value. */
const readingSketchSchema = z.strictObject({
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

const knowledgeOwnerInputSchema = z.strictObject({
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
const resolvedMorphologicalNodeSchema: z.ZodType = z.lazy(() =>
	z.discriminatedUnion("nodeKind", [
		z.strictObject({
			nodeKind: z.literal("morphemeReading"),
			reading: morphemeReadingDraftSchema,
		}),
		z.strictObject({
			nodeKind: z.literal("unitShadow"),
			unitShadow: lexicalUnitShadowSchema,
		}),
		z.strictObject({
			nodeKind: z.literal("structure"),
			children: z.array(resolvedMorphologicalNodeSchema).min(1),
		}),
	]),
);
export const morphologicalResolutionOutputSchema = z.strictObject({
	root: z.strictObject({
		nodeKind: z.literal("structure"),
		children: z.array(resolvedMorphologicalNodeSchema).min(1),
	}),
}) satisfies PromptOutputSchema;

export const lexicalSegmentationInputSchema =
	knowledgeOwnerInputSchema satisfies PromptInputSchema;
export const lexicalSegmentationOutputSchema = z.strictObject({
	components: z.array(componentTextSchema).min(2),
}) satisfies PromptOutputSchema;

export const lexicalResolutionInputSchema = z.strictObject({
	...knowledgeOwnerInputSchema.shape,
	segmentation: lexicalSegmentationOutputSchema,
});
export const lexicalResolutionOutputSchema = z
	.array(lexemeUnitShadowSchema)
	.min(2) satisfies PromptOutputSchema;

const privateTranslationSchema = z.string().trim().normalize("NFC").min(1);

/** Private model input. The source Reading remains a sketch, never an owner DTO. */
export const translationAnalysisInputSchema = z.strictObject({
	markedContext: z.string().trim().normalize("NFC").min(1),
	sourceReading: readingSketchSchema,
	targetLanguage: z.string().trim().normalize("NFC").min(1),
	existingTranslations: z.array(privateTranslationSchema),
});

/** Private match-versus-add candidate; Dumrel never exports this DTO. */
export const translationAnalysisOutputSchema = z.discriminatedUnion(
	"decision",
	[
		z.strictObject({
			decision: z.literal("Covered"),
			existingIndex: z.number().int().nonnegative(),
		}),
		z.strictObject({
			decision: z.literal("Add"),
			translation: privateTranslationSchema,
		}),
	],
) satisfies PromptOutputSchema;
