import { z } from "zod";
import { knowledgeRouteSchema } from "./generated/dumling-schemas.js";

export { knowledgeRouteSchema };
export const semanticRelationSchema = z.enum([
	"synonym",
	"nearSynonym",
	"antonym",
	"nearAntonym",
	"hypernym",
	"hyponym",
	"meronym",
	"holonym",
]);
const settingsLeaf = z.boolean().optional();
const maskLeaf = z.null().optional();
export const knowledgeSettingsSchema = z.strictObject({
	transcription: settingsLeaf,
	definition: settingsLeaf,
	morphologicalTree: settingsLeaf,
	lexicalBreakdown: settingsLeaf,
	governedPrepositions: settingsLeaf,
	translations: z
		.strictObject({ en: settingsLeaf, ru: settingsLeaf })
		.optional(),
	semanticRelations: z
		.strictObject({
			synonym: settingsLeaf,
			nearSynonym: settingsLeaf,
			antonym: settingsLeaf,
			nearAntonym: settingsLeaf,
			hypernym: settingsLeaf,
			hyponym: settingsLeaf,
			meronym: settingsLeaf,
			holonym: settingsLeaf,
		})
		.optional(),
});
export const knowledgeRequestMaskSchema = z.strictObject({
	transcription: maskLeaf,
	definition: maskLeaf,
	morphologicalTree: maskLeaf,
	lexicalBreakdown: maskLeaf,
	governedPrepositions: maskLeaf,
	translations: z.strictObject({ en: maskLeaf, ru: maskLeaf }).optional(),
	semanticRelations: z
		.strictObject({
			synonym: maskLeaf,
			nearSynonym: maskLeaf,
			antonym: maskLeaf,
			nearAntonym: maskLeaf,
			hypernym: maskLeaf,
			hyponym: maskLeaf,
			meronym: maskLeaf,
			holonym: maskLeaf,
		})
		.optional(),
});

export const knowledgeSelectionInputSchema = z.strictObject({
	route: knowledgeRouteSchema,
	settings: knowledgeSettingsSchema.optional(),
});
