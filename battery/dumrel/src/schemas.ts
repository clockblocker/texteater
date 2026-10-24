/**
 * Canonical structural authoring surface. Compose these concrete schemas with
 * .shape/.pick/.omit; source-dependent invariants belong to the runtime
 * operations. Dumgen and Dumdict compose shared structures, so no language or
 * Family subpaths are needed. Import domain values from dumling/types and
 * source-correlated Knowledge/Change types from dumrel/types.
 */
import { normalizeForm } from "dumling";
import { z } from "zod";
import { hebrewParadigmSchema } from "./hebrew-paradigm-schema.js";

export { hebrewParadigmSchema };

import {
	adpositionLemmaSchemas,
	knowledgeRouteSchema,
	lemmaSchema,
	readingSchema,
	unitShadowSchema,
} from "./generated/dumling-schemas.js";
import {
	adverbialStandInValues,
	clauseCorrelateValues,
	clauseFormValues,
	conjugationClassValues,
	dimensionIdValues,
	directSemanticRelationValues,
	formulaRoleValues,
	germanComplementCaseValues,
	governedCaseValues,
	locutionTypeValues,
	paradigmProvenanceValues,
	participleMeaningValues,
	pluralPatternValues,
	predicativeMarkerValues,
	predicativeOfValues,
	sayingTypeValues,
	translationLanguageValues,
	valencyReferentValues,
	valencySlotStatusValues,
} from "./vocabulary.js";

const normalizedTextSchema = z.string().overwrite(normalizeForm).min(1);
const nonEmptyStringsSchema = z.array(normalizedTextSchema).min(1);

export const directSemanticRelationSchema = z.enum(
	directSemanticRelationValues,
);
export const translationLanguageSchema = z.enum(translationLanguageValues);

export { unitShadowSchema };

export const governedCaseSchema = z.enum(governedCaseValues);
export const valencySlotStatusSchema = z.enum(valencySlotStatusValues);
export const valencyReferentSchema = z.enum(valencyReferentValues);

/**
 * German complements, after E-VALBU (ADR 0034): a bare case (`jemandem`, Dat);
 * a governed preposition with the ADP Lemma it selects and the case it governs
 * in this construction (`warten auf` + Acc, `bestehen auf` + Dat); an
 * Adverbial named by its stand-in (`wohnen` irgendwo); a Predicative of the
 * subject or object with its free marker (`jN für dumm halten`); or a Clause
 * of one form, with the correlate it may need (`sich freuen auf`: Dass,
 * Required `darauf`). Only Case and Preposition name a referent.
 */
export const germanValencyComplementSchema = z.union([
	z.strictObject({
		kind: z.literal("Case"),
		governedCase: z.enum(germanComplementCaseValues),
		referent: valencyReferentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: adpositionLemmaSchemas.de,
		governedCase: governedCaseSchema,
		referent: valencyReferentSchema,
	}),
	z.strictObject({
		kind: z.literal("Adverbial"),
		standIn: z.enum(adverbialStandInValues),
	}),
	z.strictObject({
		kind: z.literal("Predicative"),
		of: z.enum(predicativeOfValues),
		marker: z.enum(predicativeMarkerValues),
	}),
	z.strictObject({
		kind: z.literal("Clause"),
		form: z.enum(clauseFormValues),
		correlate: z.enum(clauseCorrelateValues).optional(),
	}),
]);
/**
 * Hebrew complements, marked by function and preposition with no case: the
 * subject, the direct object, or a governed preposition with the ADP Lemma it
 * selects (`סמך על`).
 */
export const hebrewValencyComplementSchema = z.union([
	z.strictObject({
		kind: z.literal("Subject"),
		referent: valencyReferentSchema,
	}),
	z.strictObject({
		kind: z.literal("DirectObject"),
		referent: valencyReferentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: adpositionLemmaSchemas.he,
		referent: valencyReferentSchema,
	}),
]);
/**
 * English complements, marked by position and preposition with no case: the
 * subject, the direct object, the indirect object (the first object of `give
 * him a book`), or a governed preposition with the ADP Lemma it selects
 * (`depend on`).
 */
export const englishValencyComplementSchema = z.union([
	z.strictObject({
		kind: z.literal("Subject"),
		referent: valencyReferentSchema,
	}),
	z.strictObject({
		kind: z.literal("DirectObject"),
		referent: valencyReferentSchema,
	}),
	z.strictObject({
		kind: z.literal("IndirectObject"),
		referent: valencyReferentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: adpositionLemmaSchemas.en,
		referent: valencyReferentSchema,
	}),
]);
/**
 * The Slot skeleton is shared; each language brings its own complement
 * vocabulary, and another language joins by spreading its options here and
 * keying its routes in `valency-policy.ts`. The vocabularies overlap: Hebrew
 * and English share the Subject and DirectObject shapes, and the three
 * Preposition shapes differ only in their ADP Lemma's language. The
 * source-aware check keeps each Reading to its route's kinds and to
 * prepositions of its own language.
 */
export const valencyComplementSchema = z.union([
	...germanValencyComplementSchema.options,
	...hebrewValencyComplementSchema.options,
	...englishValencyComplementSchema.options,
]);
/**
 * One position of a Valency Frame: one status for the Reading's valency, and
 * its complements in order, usually one. Several complements are
 * alternatives, E-VALBU's `/` (`reden` Optional `über` + Acc | `von` + Dat);
 * complements that can appear together take separate Slots (ADR 0034).
 */
export const valencySlotSchema = z.strictObject({
	status: valencySlotStatusSchema,
	complements: z.array(valencyComplementSchema).min(1),
});
/**
 * The owning Reading's Valency Frame: its Slots in order. A Case or
 * Preposition complement sits in at most one of them; an Adverbial,
 * Predicative or Clause may recur in another Slot (ADR 0034). The governor
 * owns every claim; a preposition's side is a read-time projection. Fixed
 * parts (a separable prefix, a lexical reflexive, a Locution's wording) come
 * from Lemma identity and are never Slots.
 */
export const valencyFrameSchema = z.array(valencySlotSchema).min(1);

/**
 * Where a Breakdown piece or a Source links (ADR 0050): the part's Unit
 * Shadow while it is pending, its Lemma once resolved, never a Reading.
 */
export const linkTargetSchema = z.union([lemmaSchema, unitShadowSchema]);
/**
 * One piece of a Breakdown (ADR 0050): the letters it shows of the owning
 * Reading's Canonical Form or cited wording, and the part they link to. A
 * piece with no target is filler: a citation ending, a hyphen, a space, a
 * placeholder. A zero ending shows no letters (ADR 0051). Pieces store no
 * role, Surface or Reading.
 */
export const breakdownPieceSchema = z.strictObject({
	letters: z.string(),
	target: linkTargetSchema.optional(),
});
/** A Breakdown's pieces in order; their letters spell the wording back. */
export const breakdownPiecesSchema = z.array(breakdownPieceSchema).min(1);
/**
 * A Reading's Breakdown (ADR 0050, ADR 0051): its Constituents, the
 * immediate parts one level down (`Kohle + Kraftwerk`, `[[Faden|den Faden]] +
 * [[verlieren]]`), and its Morphemic Breakdown, every Morpheme flat (`ent ·
 * spann · ung · ∅`). A bottom word has morphemes only, a phraseme
 * constituents only.
 */
export const breakdownSchema = z.strictObject({
	constituents: breakdownPiecesSchema.optional(),
	morphemes: breakdownPiecesSchema.optional(),
});

export const participleMeaningSchema = z.enum(participleMeaningValues);
/**
 * A Reading's Source (ADR 0050): the immediate base of a formation whose
 * letters can't be cut into pieces, linked as a Breakdown piece is. A
 * conversion (`Lauf` ← `laufen`), an acronym (`Kita`) or a clipping (`Uni`)
 * stores its target only. A participle's Source also stores its Participle
 * Meaning (ADR 0036): `gekocht` stores `kochen`, Verbal, and `gelassen` 😌
 * stores `lassen`, Drifted. The owning Reading holds the claim; the base's
 * side is a read-time projection.
 */
export const sourceSchema = z.strictObject({
	target: linkTargetSchema,
	meaning: participleMeaningSchema.optional(),
});

/**
 * A Plural Pattern, derived from each plural form in a NOUN Lemma's Paradigm,
 * never stored itself (ADR 0038).
 */
export const pluralPatternSchema = z.enum(pluralPatternValues);
/**
 * A Conjugation Class, derived from each Präteritum form in a VERB Lemma's
 * Paradigm, never stored itself (ADR 0038).
 */
export const conjugationClassSchema = z.enum(conjugationClassValues);

/**
 * A Variation Dimension (ADR 0048): one part of a route's paradigm that may
 * take alternatives. Its route's Paradigm Policy says whether a Lemma has it.
 */
export const dimensionIdSchema = z.enum(dimensionIdValues);
export const paradigmProvenanceSchema = z.enum(paradigmProvenanceValues);
/**
 * One Paradigm Variant: one form or marker of one dimension (`Bänke`,
 * `NoPlural`, `stand auf`), its content id, and where it came from.
 */
export const paradigmVariantSchema = z.strictObject({
	id: z.string().min(1),
	value: normalizedTextSchema,
	provenance: paradigmProvenanceSchema,
});
/**
 * One dimension of a Lemma Paradigm: its variants, sorted by id, and the
 * Licence of each Reading that states one, keyed by the Reading's identity
 * key. A Reading with no Licence is Unstated and takes every variant.
 */
export const paradigmDimensionSchema = z.strictObject({
	variants: z.array(paradigmVariantSchema).min(1),
	licences: z.record(z.string().min(1), z.array(z.string().min(1)).min(1)),
});
/**
 * A Lemma's Paradigm (ADR 0048): per Variation Dimension, the alternatives its
 * forms take and its Readings' Licences. It is grammatical, not Knowledge,
 * and no part of the Lemma's identity. A Lemma with no variants has no
 * dimensions.
 */
export const lemmaParadigmSchema = z.strictObject({
	dimensions: z.partialRecord(dimensionIdSchema, paradigmDimensionSchema),
});
/**
 * A Paradigm Change. Contribute adds a variant, Correct replaces a variant's
 * value and re-keys it, License and Unlicense add variants to and take them
 * from one Reading's Licence, and Retract removes a variant.
 */
export const paradigmChangeSchema = z.union([
	z.strictObject({
		kind: z.literal("Contribute"),
		dimension: dimensionIdSchema,
		value: normalizedTextSchema,
		provenance: paradigmProvenanceSchema,
	}),
	z.strictObject({
		kind: z.literal("Correct"),
		dimension: dimensionIdSchema,
		variant: z.string().min(1),
		value: normalizedTextSchema,
	}),
	z.strictObject({
		kind: z.enum(["License", "Unlicense"]),
		dimension: dimensionIdSchema,
		reading: readingSchema,
		variants: z.array(z.string().min(1)).min(1),
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		dimension: dimensionIdSchema,
		variant: z.string().min(1),
	}),
]);

/** A Locution Reading's Idiom or Collocation type; never a Lemma split (ADR 0039). */
export const locutionTypeSchema = z.enum(locutionTypeValues);
/**
 * A Saying Reading's type, with its attribution where that is known: the
 * author, and the work where known (`Sein oder Nichtsein`: WingedWord,
 * "Shakespeare, Hamlet"; `Wissen ist Macht`: "Francis Bacon, Meditationes
 * Sacrae"). Never a Lemma split (ADR 0039).
 */
export const sayingTypeSchema = z.strictObject({
	type: z.enum(sayingTypeValues),
	attribution: normalizedTextSchema.optional(),
});
/** What an INTJ Reading does as a routine formula (ADR 0039). */
export const formulaRoleSchema = z.enum(formulaRoleValues);

const lemmaRelationsSchema = z.strictObject({
	targetKind: z.literal("lemma").optional(),
	synonym: z.array(lemmaSchema).optional(),
	nearSynonym: z.array(lemmaSchema).optional(),
	antonym: z.array(lemmaSchema).optional(),
	nearAntonym: z.array(lemmaSchema).optional(),
	hypernym: z.array(lemmaSchema).optional(),
	holonym: z.array(lemmaSchema).optional(),
	/**
	 * The local names of the place a PROPN Reading names from outside
	 * (`Pressburg`: `Bratislava`), each a PROPN Lemma of the source's
	 * language. The local name's `exonym` is projected, never stored.
	 */
	endonym: z.array(lemmaSchema).optional(),
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
	breakdown: breakdownSchema.optional(),
	semanticRelations: semanticRelationsSchema.optional(),
	valency: valencyFrameSchema.optional(),
	source: sourceSchema.optional(),
	locutionType: locutionTypeSchema.optional(),
	sayingType: sayingTypeSchema.optional(),
	formulaRole: formulaRoleSchema.optional(),
	hebrewParadigm: hebrewParadigmSchema.optional(),
});

const setKinds = z.enum(["Contribute", "Correct"]);
export const breakdownPartSchema = z.enum(["constituents", "morphemes"]);
const atomicAspectSchema = z.enum(["transcription", "definition"]);
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
		aspect: z.literal("hebrewParadigm"),
		value: hebrewParadigmSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("hebrewParadigm"),
	}),
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
		/**
		 * Retracts only this complement from its Slot, and the Slot once it is
		 * empty; without it, the frame.
		 */
		complement: valencyComplementSchema.optional(),
	}),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("source"),
		value: sourceSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("source"),
	}),
	/**
	 * Each half of a Breakdown changes on its own, since different producers
	 * give them (`segment.inConstituents`, `segment.inMorphemes`).
	 */
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("breakdown"),
		part: breakdownPartSchema,
		value: breakdownPiecesSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("breakdown"),
		part: breakdownPartSchema,
	}),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("locutionType"),
		value: locutionTypeSchema,
	}),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("sayingType"),
		value: sayingTypeSchema,
	}),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("formulaRole"),
		value: formulaRoleSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.enum(["locutionType", "sayingType", "formulaRole"]),
	}),
]);

export const pendingSemanticRelationSchema = z.strictObject({
	relation: directSemanticRelationSchema,
	target: unitShadowSchema,
});

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
	"endonym",
	"exonym",
]);
/**
 * The Knowledge aspects a source route can enable or request, keyed once
 * and parameterized by the schema each aspect holds.
 */
function knowledgeAspectsSchema<Leaf extends z.ZodType>(leaf: Leaf) {
	return z.strictObject({
		transcription: leaf,
		definition: leaf,
		valency: leaf,
		source: leaf,
		locutionType: leaf,
		sayingType: leaf,
		formulaRole: leaf,
		hebrewParadigm: leaf,
		translations: z.strictObject({ en: leaf, ru: leaf }).optional(),
		semanticRelations: z
			.strictObject({
				synonym: leaf,
				nearSynonym: leaf,
				antonym: leaf,
				nearAntonym: leaf,
				hypernym: leaf,
				hyponym: leaf,
				meronym: leaf,
				holonym: leaf,
				endonym: leaf,
				exonym: leaf,
			})
			.optional(),
	});
}
export const knowledgeSettingsSchema = knowledgeAspectsSchema(
	z.boolean().optional(),
);
export const knowledgeRequestMaskSchema = knowledgeAspectsSchema(
	z.null().optional(),
);

export const knowledgeSelectionInputSchema = z.strictObject({
	route: knowledgeRouteSchema,
	settings: knowledgeSettingsSchema.optional(),
});

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
 * Reading to the ADP Lemma of a Preposition complement in its Valency Frame,
 * alternatives included; `governedBy` is the inferred inverse from each
 * supplied Reading of that ADP Lemma back to the exact governor Reading.
 * `governedCase` is the case the complement governs, and null in a language
 * whose complements mark none (Hebrew, English).
 */
export const governmentProjectionSchema = z.strictObject({
	source: readingSchema,
	relation: governmentRelationSchema,
	target: z.union([lemmaSchema, readingSchema]),
	governedCase: governedCaseSchema.nullable(),
	provenance: z.enum(["direct", "inferred"]),
});

/**
 * One edge of a Source. `source` runs from the owning Reading to the Lemma or
 * Unit Shadow it stores, with its Participle Meaning if it is a participle's;
 * `participialAdjective` is the inferred inverse from a VERB Lemma back to an
 * ADJ Reading, for a Verbal meaning only.
 */
export const sourceProjectionSchema = z.union([
	z.strictObject({
		source: readingSchema,
		relation: z.literal("source"),
		target: linkTargetSchema,
		meaning: participleMeaningSchema.optional(),
		provenance: z.literal("direct"),
	}),
	z.strictObject({
		source: lemmaSchema,
		relation: z.literal("participialAdjective"),
		target: readingSchema,
		provenance: z.literal("inferred"),
	}),
]);
