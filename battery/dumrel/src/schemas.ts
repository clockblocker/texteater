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
	verbLemmaSchema,
} from "./generated/dumling-schemas.js";
import { semanticRelationSchema } from "./selection-schemas.js";
import { normalizeText } from "./semantics.js";
import {
	directSemanticRelationValues,
	germanComplementCaseValues,
	governedCaseValues,
	translationLanguageValues,
	valencyReferentValues,
	valencySlotStatusValues,
} from "./vocabulary.js";

const normalizedTextSchema = z.string().overwrite(normalizeText).min(1);
const nonEmptyStringsSchema = z.array(normalizedTextSchema).min(1);

export const directSemanticRelationSchema = z.enum(
	directSemanticRelationValues,
);
export const translationLanguageSchema = z.enum(translationLanguageValues);

export { lexemeUnitShadowSchema, unitShadowSchema };

export const governedCaseSchema = z.enum(governedCaseValues);
export const valencySlotStatusSchema = z.enum(valencySlotStatusValues);
export const valencyReferentSchema = z.enum(valencyReferentValues);

/**
 * German complements, marked by case as in E-VALBU: a bare case (`jemandem`,
 * Dat) or a governed preposition with the ADP Lemma it selects and the case it
 * assigns in this construction (`warten auf` + Acc, `bestehen auf` + Dat).
 */
const germanValencyComplementSchema = z.union([
	z.strictObject({
		kind: z.literal("Case"),
		case: z.enum(germanComplementCaseValues),
		referent: valencyReferentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: adpositionLemmaSchema,
		case: governedCaseSchema,
		referent: valencyReferentSchema,
	}),
]);
/**
 * The Slot skeleton is shared; each language brings its own complement
 * vocabulary. Only German defines one so far; another language joins this
 * union with its own complements, and the source-aware check keeps each
 * Reading to its language's.
 */
export const valencyComplementSchema = germanValencyComplementSchema;
export const valencySlotSchema = z.strictObject({
	status: valencySlotStatusSchema,
	complement: valencyComplementSchema,
});
/**
 * The owning Reading's Valency Frame: its governed complements in order. The
 * governor owns every claim; a preposition's side is a read-time projection.
 * Fixed parts (a separable prefix, a lexical reflexive, a Phraseme's wording)
 * come from Lemma identity and are never Slots.
 */
export const valencyFrameSchema = z.array(valencySlotSchema).min(1);

/**
 * The Participle Source of an adjectival participle Reading: the VERB Lemma
 * whose participle it is (`gekocht` stores `kochen`). The ADJ Reading owns the
 * claim; the verb's side is a read-time projection.
 */
export const participleSourceSchema = verbLemmaSchema;

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
	valency: valencyFrameSchema.optional(),
	participleSource: participleSourceSchema.optional(),
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
		aspect: z.literal("valency"),
		value: valencyFrameSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("valency"),
		/** Retracts only the Slot with this complement; without it, the frame. */
		complement: valencyComplementSchema.optional(),
	}),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("participleSource"),
		value: participleSourceSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("participleSource"),
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
 * Reading to the ADP Lemma of a Preposition Slot in its Valency Frame;
 * `governedBy` is the inferred inverse from each supplied Reading of that ADP
 * Lemma back to the exact governor Reading.
 */
export const governmentProjectionSchema = z.strictObject({
	source: readingSchema,
	relation: governmentRelationSchema,
	target: z.union([lemmaSchema, readingSchema]),
	case: governedCaseSchema,
	provenance: z.enum(["direct", "inferred"]),
});

export const participleRelationSchema = z.enum([
	"participleSource",
	"participialAdjective",
]);
/**
 * One edge of a Participle Source. `participleSource` runs from the ADJ
 * Reading to the VERB Lemma it stores; `participialAdjective` is the inferred
 * inverse from each supplied Reading of that VERB Lemma back to the ADJ Reading.
 */
export const participleProjectionSchema = z.strictObject({
	source: readingSchema,
	relation: participleRelationSchema,
	target: z.union([lemmaSchema, readingSchema]),
	provenance: z.enum(["direct", "inferred"]),
});
