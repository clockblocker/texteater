import { supportedLanguages } from "dumling";
import { readingSchema, schemasFor } from "dumling/schema";
import { type ZodType, z } from "zod";

import type {
	DirectSemanticRelationGraphEdge,
	KnowledgeChange,
	KnowledgeRequestMask,
	KnowledgeSettings,
	LemmaReference,
	LexemeUnitShadow,
	LexicalBreakdown,
	LexicalUnitShadow,
	MorphemeReadingReference,
	MorphologicalTree,
	MorphologicalTreeNode,
	MorphologicalTreeStructure,
	NonEmptyStrings,
	PendingSemanticRelation,
	ReadingKnowledge,
	ReadingReference,
	SemanticRelationGraph,
	SemanticRelationGraphReading,
	SemanticRelations,
	UnitShadow,
} from "./types.js";
import {
	directSemanticRelationValues,
	semanticRelationValues,
} from "./vocabulary.js";

export {
	directSemanticRelationValues,
	semanticRelationValues,
} from "./vocabulary.js";

const normalizedNonEmptyStringSchema = z
	.string()
	.trim()
	.min(1)
	.overwrite((value) => value.normalize("NFC"));

export const semanticRelationSchema = z.enum(semanticRelationValues);
export const directSemanticRelationSchema = z.enum(
	directSemanticRelationValues,
);

const semanticRelationSettingsSchema = z.strictObject({
	synonym: z.boolean(),
	nearSynonym: z.boolean(),
	antonym: z.boolean(),
	nearAntonym: z.boolean(),
	hypernym: z.boolean(),
	hyponym: z.boolean(),
	meronym: z.boolean(),
	holonym: z.boolean(),
});

const semanticRelationRequestSchema = z
	.strictObject({
		synonym: z.null().optional(),
		nearSynonym: z.null().optional(),
		antonym: z.null().optional(),
		nearAntonym: z.null().optional(),
		hypernym: z.null().optional(),
		hyponym: z.null().optional(),
		meronym: z.null().optional(),
		holonym: z.null().optional(),
	})
	.refine((relations) => Object.keys(relations).length > 0, {
		message:
			"A Semantic Relation request must select at least one relation.",
	});

const translationRequestSchema = z
	.strictObject({ en: z.null().optional() })
	.refine((translations) => Object.keys(translations).length > 0, {
		message: "A Translation request must select at least one language.",
	});

/** Complete global settings; Family/Kind-specific settings are not valid. */
export const knowledgeSettingsSchema = z.strictObject({
	transcription: z.boolean(),
	definition: z.boolean(),
	translations: z.strictObject({ en: z.boolean() }),
	morphologicalTree: z.boolean(),
	lexicalBreakdown: z.boolean(),
	semanticRelations: semanticRelationSettingsSchema,
}) as z.ZodType<KnowledgeSettings>;

/** Sparse recursive request mask whose selected leaves are null. */
export const knowledgeRequestMaskSchema = z.strictObject({
	transcription: z.null().optional(),
	definition: z.null().optional(),
	translations: translationRequestSchema.optional(),
	morphologicalTree: z.null().optional(),
	lexicalBreakdown: z.null().optional(),
	semanticRelations: semanticRelationRequestSchema.optional(),
}) as z.ZodType<KnowledgeRequestMask>;

export const nonEmptyStringsSchema = z
	.array(normalizedNonEmptyStringSchema)
	.min(1) as unknown as z.ZodType<NonEmptyStrings>;

/** @deprecated Import `readingSchema` from `dumling/schema`. */
export const readingReferenceSchema: z.ZodType<ReadingReference> =
	readingSchema;

type LemmaSchemaRegistry = Record<string, Record<string, () => ZodType>>;

function normalizeLemmaCanonicalForm(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	const canonicalForm = Reflect.get(value, "canonicalForm");
	if (typeof canonicalForm !== "string") return value;
	return {
		...value,
		canonicalForm: canonicalForm.trim().normalize("NFC"),
	};
}

function concreteLemmaSchemas(): [ZodType, ...ZodType[]] {
	const schemas: ZodType[] = [];
	for (const language of supportedLanguages) {
		const registry = schemasFor[language].entity
			.Lemma as LemmaSchemaRegistry;
		for (const kinds of Object.values(registry)) {
			for (const schema of Object.values(kinds)) schemas.push(schema());
		}
	}
	const [first, ...rest] = schemas;
	if (first === undefined) {
		throw new Error("Dumling exposes no Lemma schemas.");
	}
	return [first, ...rest];
}

/** Canonical runtime schema for supported-language Lemma relation targets. */
export const lemmaReferenceSchema = z.preprocess(
	normalizeLemmaCanonicalForm,
	z.lazy(() => z.union(concreteLemmaSchemas())),
) as z.ZodType<LemmaReference>;

export const morphemeReadingReferenceSchema = readingSchema.refine(
	(reading) => reading.lemma.family === "Morpheme",
	{
		path: ["lemma", "family"],
		message: "A Morpheme Reading must use the Morpheme Family.",
	},
) as z.ZodType<MorphemeReadingReference>;

const unitShadowObjectSchema = z
	.strictObject({
		language: z.enum(supportedLanguages),
		canonicalForm: normalizedNonEmptyStringSchema,
		family: normalizedNonEmptyStringSchema,
		kind: normalizedNonEmptyStringSchema,
	})
	.superRefine((shadow, context) => {
		const registry = schemasFor[shadow.language].descriptor
			.Lemma as unknown as Record<string, Record<string, ZodType>>;
		const route = registry[shadow.family]?.[shadow.kind];
		if (
			route?.safeParse({
				language: shadow.language,
				family: shadow.family,
				kind: shadow.kind,
			}).success !== true
		) {
			context.addIssue({
				code: "custom",
				path: ["kind"],
				message: `${shadow.language}/${shadow.family}/${shadow.kind} is not a supported Dumling Lemma route.`,
			});
		}
	});

export const unitShadowSchema = unitShadowObjectSchema as z.ZodType<UnitShadow>;

export const lexicalUnitShadowSchema = unitShadowObjectSchema.refine(
	(shadow) => shadow.family === "Lexeme" || shadow.family === "Phraseme",
	{
		path: ["family"],
		message: "A lexical Unit Shadow must be a Lexeme or Phraseme.",
	},
) as z.ZodType<LexicalUnitShadow>;

export const lexemeUnitShadowSchema = unitShadowObjectSchema.refine(
	(shadow) => shadow.family === "Lexeme",
	{
		path: ["family"],
		message: "A Lexeme Unit Shadow must use the Lexeme Family.",
	},
) as z.ZodType<LexemeUnitShadow>;

export const morphologicalTreeStructureSchema: z.ZodType<MorphologicalTreeStructure> =
	z.lazy(() =>
		z.strictObject({
			nodeKind: z.literal("structure"),
			children: z.array(morphologicalTreeNodeSchema).min(1),
		}),
	) as unknown as z.ZodType<MorphologicalTreeStructure>;

export const morphologicalTreeNodeSchema: z.ZodType<MorphologicalTreeNode> =
	z.lazy(() =>
		z.union([
			z.strictObject({
				nodeKind: z.literal("morphemeReading"),
				reading: morphemeReadingReferenceSchema,
			}),
			z.strictObject({
				nodeKind: z.literal("unitShadow"),
				unitShadow: lexicalUnitShadowSchema,
			}),
			morphologicalTreeStructureSchema,
		]),
	);

export const morphologicalTreeSchema = z.strictObject({
	root: morphologicalTreeStructureSchema,
}) as z.ZodType<MorphologicalTree>;

export const lexicalBreakdownSchema = z
	.array(lexemeUnitShadowSchema)
	.min(2) as unknown as z.ZodType<LexicalBreakdown>;

export const semanticRelationsSchema = z.partialRecord(
	directSemanticRelationSchema,
	z.array(lemmaReferenceSchema),
) as z.ZodType<SemanticRelations>;

export const directSemanticRelationGraphEdgeSchema = z.strictObject({
	sourceReading: normalizedNonEmptyStringSchema,
	relation: directSemanticRelationSchema,
	targetLemma: normalizedNonEmptyStringSchema,
}) as z.ZodType<DirectSemanticRelationGraphEdge>;

export const semanticRelationGraphReadingSchema = z.strictObject({
	reading: normalizedNonEmptyStringSchema,
	lemma: normalizedNonEmptyStringSchema,
}) as z.ZodType<SemanticRelationGraphReading>;

export const semanticRelationGraphSchema = z
	.strictObject({
		readings: z.array(semanticRelationGraphReadingSchema),
		edges: z.array(directSemanticRelationGraphEdgeSchema),
	})
	.superRefine((graph, context) => {
		const readingOwners = new Map<string, string>();
		for (const [index, node] of graph.readings.entries()) {
			const existing = readingOwners.get(node.reading);
			if (existing !== undefined) {
				context.addIssue({
					code: "custom",
					path: ["readings", index, "reading"],
					message:
						existing === node.lemma
							? "Relation graph Reading identities must be unique."
							: "A relation graph Reading cannot belong to two Lemmas.",
				});
			}
			readingOwners.set(node.reading, node.lemma);
		}
		for (const [index, edge] of graph.edges.entries()) {
			if (!readingOwners.has(edge.sourceReading)) {
				context.addIssue({
					code: "custom",
					path: ["edges", index, "sourceReading"],
					message:
						"A relation edge source must be a declared Reading.",
				});
			}
		}
	}) as z.ZodType<SemanticRelationGraph>;

export const pendingSemanticRelationSchema = z.strictObject({
	relation: directSemanticRelationSchema,
	target: unitShadowSchema,
}) as z.ZodType<PendingSemanticRelation>;

const languageBucketsSchema = z.record(
	normalizedNonEmptyStringSchema,
	nonEmptyStringsSchema,
);

export const readingKnowledgeSchema = z.strictObject({
	transcription: normalizedNonEmptyStringSchema.optional(),
	definition: normalizedNonEmptyStringSchema.optional(),
	translations: languageBucketsSchema.optional(),
	morphologicalTree: morphologicalTreeSchema.optional(),
	lexicalBreakdown: lexicalBreakdownSchema.optional(),
	semanticRelations: semanticRelationsSchema.optional(),
}) as z.ZodType<ReadingKnowledge>;

const bucketKinds = z.enum(["Contribute", "Correct"]);

export const knowledgeChangeSchema = z.union([
	z.strictObject({
		kind: bucketKinds,
		aspect: z.literal("transcription"),
		value: normalizedNonEmptyStringSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("transcription"),
	}),
	z.strictObject({
		kind: bucketKinds,
		aspect: z.literal("translations"),
		language: normalizedNonEmptyStringSchema,
		value: nonEmptyStringsSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("translations"),
		language: normalizedNonEmptyStringSchema,
	}),
	z.strictObject({
		kind: bucketKinds,
		aspect: z.literal("semanticRelations"),
		relation: directSemanticRelationSchema,
		value: z.array(lemmaReferenceSchema),
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("semanticRelations"),
		relation: directSemanticRelationSchema,
	}),
	z.strictObject({
		kind: bucketKinds,
		aspect: z.literal("definition"),
		value: normalizedNonEmptyStringSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("definition"),
	}),
	z.strictObject({
		kind: bucketKinds,
		aspect: z.literal("morphologicalTree"),
		value: morphologicalTreeSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("morphologicalTree"),
	}),
	z.strictObject({
		kind: bucketKinds,
		aspect: z.literal("lexicalBreakdown"),
		value: lexicalBreakdownSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("lexicalBreakdown"),
	}),
]) as z.ZodType<KnowledgeChange>;
