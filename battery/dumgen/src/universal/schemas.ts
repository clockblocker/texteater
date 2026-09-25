import {
	knowledgeChangeSchema,
	knowledgeRequestMaskSchema,
	pendingSemanticRelationSchema,
} from "dumrel/schema";
import { z } from "zod";

export const segmentSchema = z.strictObject({
	kind: z.enum(["ResolvableText", "OpaqueText", "Whitespace", "Punctuation"]),
	text: z.string().min(1),
});
export const segmentedSentenceSchema = z.strictObject({
	id: z.string().min(1),
	language: z.enum(["de", "en", "he"]),
	segments: z.array(segmentSchema).min(1),
});
const sourceSentenceSchema = z.string().min(1);
export const segmentInputSchema = z.strictObject({
	sourceSentences: z.tuple([sourceSentenceSchema], sourceSentenceSchema),
});
export const classifyInputSchema = z.strictObject({
	sentence: segmentedSentenceSchema,
	clickedSegmentIndex: z.number().int().nonnegative(),
});
const indexSchema = z.number().int().nonnegative();
export const analyzeInputSchema = z.strictObject({
	sentence: segmentedSentenceSchema.extend({ language: z.literal("de") }),
});
const offsetSchema = z.number().int().nonnegative();
const massSchema = z.record(z.string().min(1), z.number().min(0).max(1));
const memberRoleSchema = z.enum([
	"Head",
	"SeparableParticle",
	"GovernedPreposition",
	"Reflexive",
	"Expletive",
	"Article",
	"Auxiliary",
	"Unresolved",
]);
/** The Sentence Analysis intake produces for one German sentence (Dumgen ADR 0006). */
export const sentenceAnalysisSchema = z.strictObject({
	sentenceId: z.string().min(1),
	language: z.literal("de"),
	stitchedText: z.string().min(1),
	segments: z
		.array(
			z.strictObject({
				offset: offsetSchema,
				kind: segmentSchema.shape.kind,
				text: z.string().min(1),
				surface: z.string().min(1),
			}),
		)
		.min(1),
	targets: z.array(
		z.strictObject({
			id: z.string().min(1),
			members: z
				.array(
					z.strictObject({
						offset: offsetSchema,
						role: memberRoleSchema,
					}),
				)
				.min(1),
			routeMass: massSchema,
			identity: z
				.strictObject({
					candidates: z.array(
						z.strictObject({
							key: z.string().min(1),
							kind: z.enum(["DET", "PRON", "AUX"]),
							headword: z.string().min(1),
							pronType: z.string().min(1).nullable(),
							cells: z.array(z.string()),
							definition: z.string(),
						}),
					),
					mass: massSchema,
				})
				.nullable(),
			provenance: z.string().min(1),
		}),
	),
	phrasemes: z.array(
		z.strictObject({
			id: z.string().min(1),
			members: z.array(z.string().min(1)).min(2),
			kindMass: massSchema,
			fixedness: z.number().min(0).max(3),
			provenance: z.string().min(1),
		}),
	),
	fusions: z.array(
		z.strictObject({
			offset: offsetSchema,
			form: z.string().min(1),
			components: z
				.array(
					z.strictObject({
						offset: offsetSchema,
						span: z.string().min(1),
						surface: z.string().min(1),
						role: z.string().min(1),
					}),
				)
				.min(2),
		}),
	),
	government: z.array(
		z.strictObject({
			offset: offsetSchema,
			preposition: z.string().min(1),
			case: z.enum(["Acc", "Dat", "Gen"]),
			governor: z.string().min(1),
		}),
	),
});
export const memberIndicesSchema = z.tuple([indexSchema], indexSchema);
export const knowledgeFailureSchema = z.strictObject({
	aspect: z.enum([
		"transcription",
		"definition",
		"translations",
		"semanticRelations",
		"valency",
		"participleSource",
		"morphologicalTree",
		"lexicalBreakdown",
	]),
	leaf: z.string().optional(),
	candidate: z.string().optional(),
	code: z.enum([
		"InvalidInput",
		"ProviderFailure",
		"InvalidModelOutput",
		"Unresolved",
		"NotImplemented",
		"CatalogMiss",
	]),
	message: z.string(),
});
export const knowledgeProductionSchema = z.strictObject({
	changes: z.array(knowledgeChangeSchema),
	pendingRelations: z.array(pendingSemanticRelationSchema),
	failures: z.array(knowledgeFailureSchema),
});
export { knowledgeRequestMaskSchema };
export const segmentationDecisionSchema = z.union([
	z.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("en"),
		sentence: segmentedSentenceSchema.extend({ language: z.literal("en") }),
	}),
	z.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("de"),
		sentence: segmentedSentenceSchema.extend({ language: z.literal("de") }),
	}),
	z.strictObject({
		decision: z.literal("Accepted"),
		language: z.literal("he"),
		sentence: segmentedSentenceSchema.extend({ language: z.literal("he") }),
	}),
	z.strictObject({ decision: z.literal("UnsupportedLanguage") }),
	z.strictObject({ decision: z.literal("Unintelligible") }),
]);
