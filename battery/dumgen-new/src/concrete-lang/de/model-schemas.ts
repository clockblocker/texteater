import {
	directSemanticRelationSchema,
	knowledgeRequestMaskSchema,
} from "dumrel/schema";
import { z } from "zod";
import {
	emojiDescriptionSchema,
	readingSchema,
	targetsByLanguage,
} from "../../generated/schemas.js";
import { segmentSchema } from "../../universal/schemas.js";

export const intakeInputSchema = z.strictObject({
	items: z
		.array(
			z.strictObject({
				id: z.string().min(1),
				sourceText: z.string().min(1),
			}),
		)
		.min(1)
		.max(9),
});
export const intakeOutputSchema = z.strictObject({
	language: z.enum(["de", "he"]).nullable(),
	items: z.array(
		z.strictObject({
			id: z.string(),
			decision: z.enum([
				"Accepted",
				"UnsupportedLanguage",
				"Unintelligible",
			]),
			language: z.enum(["de", "he"]).nullable(),
			stitchedText: z.string().min(1),
		}),
	),
});
export const targetInputSchema = z.strictObject({
	clickedSegmentIndex: z.number().int().nonnegative(),
	segments: z.array(segmentSchema).min(1),
});
const reachable = targetsByLanguage.de.options.filter(
	(schema) =>
		schema.shape.family.value !== "Morpheme" &&
		!(["X", "PUNCT", "Collocation"] as string[]).includes(
			schema.shape.kind.value,
		),
);
const compactRoute = z.union(
	reachable.map((schema) => schema.omit({ memberSegmentIndices: true })),
);
export const targetOutputSchema = z.union([
	z.strictObject({
		decision: z.literal("Resolved"),
		target: compactRoute,
		additionalMemberIndices: z.array(z.number().int().nonnegative()),
	}),
	z.strictObject({
		decision: z.literal("Unresolved"),
		target: z.null(),
		additionalMemberIndices: z.null(),
	}),
]);
export const compactTargetInputSchema = z.strictObject({
	markedSentence: z.string().min(1),
	clickedIndex: z.number().int().nonnegative(),
	segments: z
		.array(
			z.strictObject({
				i: z.number().int().nonnegative(),
				s: z.string().min(1),
			}),
		)
		.min(1),
});
export const emojiInputSchema = z.strictObject({
	markedContext: z.string().min(1),
	lemma: z.string().min(1),
});
export const emojiComparisonInputSchema = emojiInputSchema.extend({
	existingEmojiDescriptions: z.array(emojiDescriptionSchema),
});
export const emojiOutputSchema = z.strictObject({
	emojiDescription: emojiDescriptionSchema,
});
const targetProposalSchema = z.strictObject({
	canonicalForm: z.string().min(1),
	kind: z.string().min(1),
});
export const knowledgeInputSchema = z.strictObject({
	markedContext: z.string().min(1),
	reading: readingSchema,
	request: knowledgeRequestMaskSchema,
});
const targets = z.array(targetProposalSchema).nullable().optional();
export const knowledgeOutputSchema = z.strictObject({
	transcription: z.string().min(1).nullable().optional(),
	definition: z.string().min(1).nullable().optional(),
	translations: z
		.strictObject({ en: z.string().min(1).nullable().optional() })
		.optional(),
	semanticRelations: z
		.strictObject({
			synonym: targets,
			nearSynonym: targets,
			antonym: targets,
			nearAntonym: targets,
			hypernym: targets,
			holonym: targets,
		})
		.optional(),
});
export { directSemanticRelationSchema };
