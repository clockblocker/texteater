import { z } from "zod";
import {
	lemmaSchema,
	lexemeUnitShadowSchema,
	lexicalUnitShadowSchema,
	morphemeReadingSchema,
	readingSchema,
	unitShadowSchema,
} from "./generated/dumling-schemas.js";
import { normalizeText } from "./semantics.js";
import {
	directSemanticRelationValues,
	translationLanguageValues,
} from "./vocabulary.js";

const normalizedTextSchema = z.string().overwrite(normalizeText).min(1);
const nonEmptyStringsSchema = z.array(normalizedTextSchema).min(1);

export const directSemanticRelationSchema = z.enum(
	directSemanticRelationValues,
);
export const translationLanguageSchema = z.enum(translationLanguageValues);

export { unitShadowSchema };

type MorphologicalNode =
	| {
			nodeKind: "morphemeReading";
			reading: z.output<typeof morphemeReadingSchema>;
	  }
	| {
			nodeKind: "unitShadow";
			unitShadow: z.output<typeof lexicalUnitShadowSchema>;
	  }
	| { nodeKind: "structure"; children: MorphologicalNode[] };

const morphologicalTreeNodeSchema: z.ZodType<MorphologicalNode> = z.lazy(() =>
	z.union([
		z.strictObject({
			nodeKind: z.literal("morphemeReading"),
			reading: morphemeReadingSchema,
		}),
		z.strictObject({
			nodeKind: z.literal("unitShadow"),
			unitShadow: lexicalUnitShadowSchema,
		}),
		z.strictObject({
			nodeKind: z.literal("structure"),
			children: z.array(morphologicalTreeNodeSchema).min(1),
		}),
	]),
);

export const morphologicalTreeSchema = z.strictObject({
	root: z.strictObject({
		nodeKind: z.literal("structure"),
		children: z.array(morphologicalTreeNodeSchema).min(1),
	}),
});
export const lexicalBreakdownSchema = z.tuple(
	[lexemeUnitShadowSchema, lexemeUnitShadowSchema],
	lexemeUnitShadowSchema,
);

const lemmaRelationsSchema = z.strictObject({
	targetKind: z.literal("lemma").optional(),
	synonym: z.array(lemmaSchema).optional(),
	nearSynonym: z.array(lemmaSchema).optional(),
	antonym: z.array(lemmaSchema).optional(),
	nearAntonym: z.array(lemmaSchema).optional(),
	hypernym: z.array(lemmaSchema).optional(),
	holonym: z.array(lemmaSchema).optional(),
});
const readingRelationsSchema = z.strictObject({
	targetKind: z.literal("reading"),
	synonym: z.array(readingSchema).optional(),
});
export const semanticRelationsSchema = z.union([
	readingRelationsSchema,
	lemmaRelationsSchema,
]);

export const readingKnowledgeSchema = z.strictObject({
	transcription: normalizedTextSchema.optional(),
	definition: normalizedTextSchema.optional(),
	translations: z
		.strictObject({
			en: nonEmptyStringsSchema.optional(),
			ru: nonEmptyStringsSchema.optional(),
		})
		.optional(),
	morphologicalTree: morphologicalTreeSchema.optional(),
	lexicalBreakdown: lexicalBreakdownSchema.optional(),
	semanticRelations: semanticRelationsSchema.optional(),
});

const setKinds = z.enum(["Contribute", "Correct"]);
const atomicAspectSchema = z.enum(["transcription", "definition"]);
const structuredAspectSchema = z.enum([
	"morphologicalTree",
	"lexicalBreakdown",
]);
const readingRelationSetSchema = z.strictObject({
	kind: setKinds,
	aspect: z.literal("semanticRelations"),
	relation: z.literal("synonym"),
	targetKind: z.literal("reading"),
	value: z.array(readingSchema),
});
const lemmaRelationSetSchema = z.strictObject({
	kind: setKinds,
	aspect: z.literal("semanticRelations"),
	relation: directSemanticRelationSchema,
	targetKind: z.literal("lemma").optional(),
	value: z.array(lemmaSchema),
});

export const knowledgeChangeSchema = z.union([
	z.strictObject({
		kind: setKinds,
		aspect: atomicAspectSchema,
		value: normalizedTextSchema,
	}),
	z.strictObject({ kind: z.literal("Retract"), aspect: atomicAspectSchema }),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("translations"),
		language: translationLanguageSchema,
		value: nonEmptyStringsSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("translations"),
		language: translationLanguageSchema,
	}),
	readingRelationSetSchema,
	lemmaRelationSetSchema,
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("semanticRelations"),
		relation: z.literal("synonym"),
		targetKind: z.literal("reading"),
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("semanticRelations"),
		relation: directSemanticRelationSchema,
		targetKind: z.literal("lemma").optional(),
	}),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("morphologicalTree"),
		value: morphologicalTreeSchema,
	}),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("lexicalBreakdown"),
		value: lexicalBreakdownSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: structuredAspectSchema,
	}),
]);

export const pendingSemanticRelationSchema = z.strictObject({
	relation: directSemanticRelationSchema,
	target: unitShadowSchema,
});

export {
	knowledgeRequestMaskSchema,
	knowledgeRouteSchema,
	knowledgeSelectionInputSchema,
	knowledgeSettingsSchema,
	semanticRelationSchema,
} from "./selection-schemas.js";
