import { supportedLanguages } from "dumling";
import { schemasFor } from "dumling/schema";
import { type ZodType, z } from "zod";

import type {
	KnowledgeChange,
	LemmaKnowledge,
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
	SemanticRelationGraphEdge,
	SemanticRelations,
	UnitShadow,
} from "./types.js";
import { semanticRelationValues } from "./vocabulary.js";

export { semanticRelationValues } from "./vocabulary.js";

const normalizedNonEmptyStringSchema = z
	.string()
	.trim()
	.min(1)
	.overwrite((value) => value.normalize("NFC"));

export const semanticRelationSchema = z.enum(semanticRelationValues);

export const nonEmptyStringsSchema = z
	.array(normalizedNonEmptyStringSchema)
	.min(1) as unknown as z.ZodType<NonEmptyStrings>;

type LemmaRegistry = Record<string, Record<string, () => ZodType>>;

function concreteLemmaSchemas(family?: string): [ZodType, ...ZodType[]] {
	const leaves: ZodType[] = [];
	for (const language of supportedLanguages) {
		const registry = schemasFor[language].entity.Lemma as LemmaRegistry;
		for (const [routeFamily, kinds] of Object.entries(registry)) {
			if (family !== undefined && routeFamily !== family) continue;
			for (const schema of Object.values(kinds)) leaves.push(schema());
		}
	}
	const [first, ...rest] = leaves;
	if (first === undefined) {
		throw new Error(`Dumling exposes no ${family ?? "Lemma"} routes.`);
	}
	return [first, ...rest];
}

function unionOf(schemas: [ZodType, ...ZodType[]]): ZodType {
	if (schemas.length === 1) return schemas[0];
	return z.union(schemas as [ZodType, ZodType, ...ZodType[]]);
}

function normalizeLemmaCanonicalForm(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	const canonicalForm = Reflect.get(value, "canonicalForm");
	if (typeof canonicalForm !== "string") return value;
	return {
		...value,
		canonicalForm: canonicalForm.trim().normalize("NFC"),
	};
}

const concreteLemmaSchema = z.preprocess(
	normalizeLemmaCanonicalForm,
	unionOf(concreteLemmaSchemas()),
);
const concreteMorphemeLemmaSchema = z.preprocess(
	normalizeLemmaCanonicalForm,
	unionOf(concreteLemmaSchemas("Morpheme")),
);

export const readingReferenceSchema = z.strictObject({
	lemma: concreteLemmaSchema,
	emojiDescription: normalizedNonEmptyStringSchema,
}) as z.ZodType<ReadingReference>;

export const morphemeReadingReferenceSchema = z.strictObject({
	lemma: concreteMorphemeLemmaSchema,
	emojiDescription: normalizedNonEmptyStringSchema,
}) as z.ZodType<MorphemeReadingReference>;

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
	semanticRelationSchema,
	z.array(readingReferenceSchema),
) as z.ZodType<SemanticRelations>;

export const semanticRelationGraphEdgeSchema = z.strictObject({
	source: normalizedNonEmptyStringSchema,
	relation: semanticRelationSchema,
	target: normalizedNonEmptyStringSchema,
}) as z.ZodType<SemanticRelationGraphEdge>;

export const pendingSemanticRelationSchema = z.strictObject({
	relation: semanticRelationSchema,
	target: unitShadowSchema,
}) as z.ZodType<PendingSemanticRelation>;

const languageBucketsSchema = z.record(
	normalizedNonEmptyStringSchema,
	nonEmptyStringsSchema,
);

export const lemmaKnowledgeSchema = z.strictObject({
	transcriptions: languageBucketsSchema.optional(),
}) as z.ZodType<LemmaKnowledge>;

export const readingKnowledgeSchema = z.strictObject({
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
		aspect: z.literal("transcriptions"),
		language: normalizedNonEmptyStringSchema,
		value: nonEmptyStringsSchema,
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("transcriptions"),
		language: normalizedNonEmptyStringSchema,
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
		relation: semanticRelationSchema,
		value: z.array(readingReferenceSchema),
	}),
	z.strictObject({
		kind: z.literal("Retract"),
		aspect: z.literal("semanticRelations"),
		relation: semanticRelationSchema,
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
