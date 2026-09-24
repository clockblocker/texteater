/**
 * Canonical structural authoring surface. Compose these concrete schemas with
 * .shape/.pick/.omit; source-dependent invariants belong to the runtime
 * operations. Dumgen and Dumdict compose shared structures, so no language or
 * Family subpaths are needed. Import domain values from dumling/types and
 * source-correlated Knowledge/Change types from dumrel/types.
 */
import { z } from "zod";
import {
	adpositionLemmaSchema,
	lemmaSchema,
	lexemeUnitShadowSchema,
	lexicalUnitShadowSchema,
	morphemeReadingSchema,
	readingSchema,
	unitShadowSchema,
} from "./generated/dumling-schemas.js";
import { semanticRelationSchema } from "./selection-schemas.js";
import { normalizeText } from "./semantics.js";
import {
	directSemanticRelationValues,
	governedCaseValues,
	translationLanguageValues,
} from "./vocabulary.js";

const normalizedTextSchema = z.string().overwrite(normalizeText).min(1);
const nonEmptyStringsSchema = z.array(normalizedTextSchema).min(1);

export const directSemanticRelationSchema = z.enum(
	directSemanticRelationValues,
);
export const translationLanguageSchema = z.enum(translationLanguageValues);

export { lexemeUnitShadowSchema, unitShadowSchema };

export const governedCaseSchema = z.enum(governedCaseValues);
/**
 * One lexically governed preposition of the owning Reading: the ADP Lemma it
 * selects and the case that preposition assigns in this construction
 * (`warten auf` + Acc, `bestehen auf` + Dat). The governor owns the claim; the
 * preposition's side is a read-time projection.
 */
export const governedPrepositionSchema = z.strictObject({
	preposition: adpositionLemmaSchema,
	case: governedCaseSchema,
});
export const governedPrepositionsSchema = z
	.array(governedPrepositionSchema)
	.min(1);

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

export const morphologicalTreeNodeSchema: z.ZodType<MorphologicalNode> = z.lazy(
	() =>
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
	governedPrepositions: governedPrepositionsSchema.optional(),
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
		aspect: z.literal("governedPrepositions"),
		value: governedPrepositionsSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("governedPrepositions"),
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

export const readingWithKnowledgeSchema = z.strictObject({
	reading: readingSchema,
	knowledge: readingKnowledgeSchema,
});
export const semanticProjectionInputSchema = z.array(
	readingWithKnowledgeSchema,
);
export const semanticRelationProjectionSchema = z.strictObject({
	source: readingSchema,
	relation: semanticRelationSchema,
	target: z.union([lemmaSchema, readingSchema]),
	provenance: z.enum(["direct", "inferred"]),
});

export const governmentRelationSchema = z.enum(["governs", "governedBy"]);
/**
 * One edge of Prepositional Government. `governs` runs from the governor
 * Reading to the ADP Lemma it stores; `governedBy` is the inferred inverse from
 * each supplied Reading of that ADP Lemma back to the exact governor Reading.
 */
export const governmentProjectionSchema = z.strictObject({
	source: readingSchema,
	relation: governmentRelationSchema,
	target: z.union([lemmaSchema, readingSchema]),
	case: governedCaseSchema,
	provenance: z.enum(["direct", "inferred"]),
});
