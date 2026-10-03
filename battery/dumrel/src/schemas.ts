/**
 * Canonical structural authoring surface. Compose these concrete schemas with
 * .shape/.pick/.omit; source-dependent invariants belong to the runtime
 * operations. Dumgen and Dumdict compose shared structures, so no language or
 * Family subpaths are needed. Import domain values from dumling/types and
 * source-correlated Knowledge/Change types from dumrel/types.
 */
import { z } from "zod";
import {
	adpositionLemmaSchemas,
	knowledgeRouteSchema,
	lemmaSchema,
	lexemeUnitShadowSchema,
	lexicalUnitShadowSchema,
	morphemeReadingSchema,
	readingSchema,
	unitShadowSchema,
	verbLemmaSchema,
} from "./generated/dumling-schemas.js";
import { normalizeText } from "./semantics.js";
import {
	adverbialStandInValues,
	clauseCorrelateValues,
	clauseFormValues,
	conjugationClassValues,
	directSemanticRelationValues,
	formulaRoleValues,
	germanComplementCaseValues,
	governedCaseValues,
	locutionTypeValues,
	participleMeaningValues,
	pluralMarkerValues,
	pluralPatternValues,
	predicativeMarkerValues,
	predicativeOfValues,
	sayingTypeValues,
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

export const participleMeaningSchema = z.enum(participleMeaningValues);
/**
 * The Participle Source of an adjectival participle Reading: the VERB Lemma
 * whose participle its form is (`gekocht` stores `kochen`), and whether this
 * Reading's meaning is a sense of that verb (`gelassen` 😌 stores `lassen`,
 * Drifted). The ADJ Reading owns the claim; the verb's side is a read-time
 * projection.
 */
export const participleSourceSchema = z.strictObject({
	verb: verbLemmaSchema,
	meaning: participleMeaningSchema,
});

/** A Plural Pattern, derived from a stored plural form, never stored itself (#657). */
export const pluralPatternSchema = z.enum(pluralPatternValues);
/**
 * A German noun Reading's plural (#657): the nominative plural forms of its
 * sense, each listed once (`Pizza`: `Pizzen`, `Pizzas`), or a marker for a
 * noun with no plural (`Milch`) or no singular (`Leute`). Each form's Plural
 * Pattern is derived by `germanPluralPattern`. Homonyms that differ only in
 * plural (`Mütter`, `Muttern`) share one Lemma and differ here, per Reading.
 */
export const nounPluralSchema = z.union([
	nonEmptyStringsSchema,
	z.enum(pluralMarkerValues),
]);

export const conjugationClassSchema = z.enum(conjugationClassValues);
/**
 * A German verb Reading's conjugation classes (ADR 0038): every class its
 * Präteritum forms attest, each listed once (`senden`: `sandte`, `sendete`,
 * Weak and Mixed). Homonyms that differ only in conjugation (`wiegen`: `wog`,
 * `wiegte`) share one Lemma and differ here, per Reading.
 */
export const conjugationClassesSchema = z.array(conjugationClassSchema).min(1);

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
	morphologicalTree: morphologicalTreeSchema.optional(),
	semanticRelations: semanticRelationsSchema.optional(),
	valency: valencyFrameSchema.optional(),
	participleSource: participleSourceSchema.optional(),
	plural: nounPluralSchema.optional(),
	conjugationClass: conjugationClassesSchema.optional(),
	locutionType: locutionTypeSchema.optional(),
	sayingType: sayingTypeSchema.optional(),
	formulaRole: formulaRoleSchema.optional(),
});

const setKinds = z.enum(["Contribute", "Correct"]);
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
		aspect: z.literal("participleSource"),
		value: participleSourceSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("participleSource"),
	}),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("plural"),
		value: nounPluralSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("plural"),
	}),
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("conjugationClass"),
		value: conjugationClassesSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("conjugationClass"),
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
	z.strictObject({
		kind: setKinds,
		aspect: z.literal("morphologicalTree"),
		value: morphologicalTreeSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("morphologicalTree"),
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
const settingsLeaf = z.boolean().optional();
const maskLeaf = z.null().optional();
export const knowledgeSettingsSchema = z.strictObject({
	transcription: settingsLeaf,
	definition: settingsLeaf,
	morphologicalTree: settingsLeaf,
	valency: settingsLeaf,
	participleSource: settingsLeaf,
	plural: settingsLeaf,
	conjugationClass: settingsLeaf,
	locutionType: settingsLeaf,
	sayingType: settingsLeaf,
	formulaRole: settingsLeaf,
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
			endonym: settingsLeaf,
			exonym: settingsLeaf,
		})
		.optional(),
});
export const knowledgeRequestMaskSchema = z.strictObject({
	transcription: maskLeaf,
	definition: maskLeaf,
	morphologicalTree: maskLeaf,
	valency: maskLeaf,
	participleSource: maskLeaf,
	plural: maskLeaf,
	conjugationClass: maskLeaf,
	locutionType: maskLeaf,
	sayingType: maskLeaf,
	formulaRole: maskLeaf,
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
			endonym: maskLeaf,
			exonym: maskLeaf,
		})
		.optional(),
});

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

export const participleRelationSchema = z.enum([
	"participleSource",
	"participialAdjective",
]);
/**
 * One edge of a Participle Source. `participleSource` runs from the ADJ
 * Reading to the VERB Lemma it stores, with its Participle Meaning;
 * `participialAdjective` is the inferred inverse from that VERB Lemma back to
 * the ADJ Reading, for a Verbal meaning only.
 */
export const participleProjectionSchema = z.union([
	z.strictObject({
		source: readingSchema,
		relation: z.literal("participleSource"),
		target: lemmaSchema,
		meaning: participleMeaningSchema,
		provenance: z.literal("direct"),
	}),
	z.strictObject({
		source: lemmaSchema,
		relation: z.literal("participialAdjective"),
		target: readingSchema,
		provenance: z.literal("inferred"),
	}),
]);
