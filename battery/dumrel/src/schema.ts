import { supportedLanguages } from "dumling";
import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import { readingSchema } from "dumling/schema";
import { type ZodType, z } from "zod";

import type {
	LexemeUnitShadow,
	LexicalUnitShadow,
	MorphemeReadingReference,
	MorphologicalTreeNode,
	MorphologicalTreeStructure,
	UnitShadow,
} from "./types.js";
import {
	bindLemmaReference,
	bindLexemeUnitShadow,
	bindLexicalUnitShadow,
	bindMorphemeReadingReference,
	bindSupportedUnitShadow,
	dumrelNormalizeNfc,
	dumrelTrimString,
	hasSemanticRelationSelection,
	hasTranslationSelection,
	isLexemeUnitShadow,
	isLexicalUnitShadow,
	isMorphemeReading,
	normalizeLemmaCanonicalForm,
	retainAtLeastTwo,
	retainNonEmptyArray,
	semanticRelationGraphIssues,
} from "./validation-semantics.js";
import {
	directSemanticRelationValues,
	semanticRelationValues,
} from "./vocabulary.js";

export {
	/**
	 * Schema-authoring identity hooks consumed by Dumgen's provider-schema and
	 * runtime-prompt codegen. They intentionally live only on `dumrel/schema`.
	 */
	bindLexicalUnitShadow,
	bindSupportedUnitShadow,
} from "./validation-semantics.js";
export {
	directSemanticRelationValues,
	semanticRelationValues,
} from "./vocabulary.js";

const normalizedNonEmptyStringSchema = z
	.string()
	.overwrite(dumrelTrimString)
	.min(1)
	.overwrite(dumrelNormalizeNfc);

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
	.refine(hasSemanticRelationSelection, {
		message:
			"A Semantic Relation request must select at least one relation.",
	});

const translationRequestSchema = z
	.strictObject({ en: z.null().optional() })
	.refine(hasTranslationSelection, {
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
});

/** Sparse recursive request mask whose selected leaves are null. */
export const knowledgeRequestMaskSchema = z.strictObject({
	transcription: z.null().optional(),
	definition: z.null().optional(),
	translations: translationRequestSchema.optional(),
	morphologicalTree: z.null().optional(),
	lexicalBreakdown: z.null().optional(),
	semanticRelations: semanticRelationRequestSchema.optional(),
});

export const nonEmptyStringsSchema = z
	.array(normalizedNonEmptyStringSchema)
	.min(1)
	.transform(retainNonEmptyArray);

/** @deprecated Import `readingSchema` from `dumling/schema`. */
export const readingReferenceSchema = readingSchema;

type LemmaSchemaRegistry = Record<string, Record<string, () => ZodType>>;

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
export const lemmaReferenceSchema = z
	.preprocess(
		normalizeLemmaCanonicalForm,
		z.lazy(() => z.union(concreteLemmaSchemas())),
	)
	.transform(bindLemmaReference);

export const morphemeReadingReferenceSchema = readingSchema
	.refine(isMorphemeReading, {
		path: ["lemma", "family"],
		message: "A Morpheme Reading must use the Morpheme Family.",
	})
	.transform(bindMorphemeReadingReference);

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

export const unitShadowSchema: z.ZodType<UnitShadow> =
	unitShadowObjectSchema.transform(bindSupportedUnitShadow);

export const lexicalUnitShadowSchema: z.ZodType<LexicalUnitShadow> =
	unitShadowObjectSchema
		.refine(isLexicalUnitShadow, {
			path: ["family"],
			message: "A lexical Unit Shadow must be a Lexeme or Phraseme.",
		})
		.transform(bindSupportedUnitShadow)
		.transform(bindLexicalUnitShadow);

export const lexemeUnitShadowSchema: z.ZodType<LexemeUnitShadow> =
	unitShadowObjectSchema
		.refine(isLexemeUnitShadow, {
			path: ["family"],
			message: "A Lexeme Unit Shadow must use the Lexeme Family.",
		})
		.transform(bindSupportedUnitShadow)
		.transform(bindLexemeUnitShadow);

type RecursiveMorphologicalTreeNode =
	| { nodeKind: "morphemeReading"; reading: MorphemeReadingReference }
	| { nodeKind: "unitShadow"; unitShadow: LexicalUnitShadow }
	| RecursiveMorphologicalTreeStructure;
export type RecursiveMorphologicalTreeStructure = {
	nodeKind: "structure";
	children: [
		RecursiveMorphologicalTreeNode,
		...RecursiveMorphologicalTreeNode[],
	];
};

export const morphologicalTreeNodeSchema: z.ZodType<RecursiveMorphologicalTreeNode> =
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

export const morphologicalTreeStructureSchema: z.ZodType<RecursiveMorphologicalTreeStructure> =
	z.lazy(() =>
		z.strictObject({
			nodeKind: z.literal("structure"),
			children: z
				.array(morphologicalTreeNodeSchema)
				.min(1)
				.transform(retainNonEmptyArray),
		}),
	);

export const morphologicalTreeSchema = z.strictObject({
	root: morphologicalTreeStructureSchema,
});

export const lexicalBreakdownSchema = z
	.array(lexemeUnitShadowSchema)
	.min(2)
	.transform(retainAtLeastTwo);

export const semanticRelationsSchema = z.partialRecord(
	directSemanticRelationSchema,
	z.array(lemmaReferenceSchema),
);

export const directSemanticRelationGraphEdgeSchema = z.strictObject({
	sourceReading: normalizedNonEmptyStringSchema,
	relation: directSemanticRelationSchema,
	targetLemma: normalizedNonEmptyStringSchema,
});

export const semanticRelationGraphReadingSchema = z.strictObject({
	reading: normalizedNonEmptyStringSchema,
	lemma: normalizedNonEmptyStringSchema,
});

export const semanticRelationGraphSchema = z
	.strictObject({
		readings: z.array(semanticRelationGraphReadingSchema),
		edges: z.array(directSemanticRelationGraphEdgeSchema),
	})
	.superRefine((graph, context) => {
		for (const issue of semanticRelationGraphIssues(graph)) {
			context.addIssue(issue);
		}
	});

export const pendingSemanticRelationSchema = z.strictObject({
	relation: directSemanticRelationSchema,
	target: unitShadowSchema,
});

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
});

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
]);

type Assert<Value extends true> = Value;
type _RecursiveNodeMatchesDomain = Assert<
	RecursiveMorphologicalTreeNode extends MorphologicalTreeNode ? true : false
>;
type _DomainNodeMatchesRecursiveSchema = Assert<
	MorphologicalTreeNode extends RecursiveMorphologicalTreeNode ? true : false
>;
type _RecursiveStructureMatchesDomain = Assert<
	RecursiveMorphologicalTreeStructure extends MorphologicalTreeStructure
		? true
		: false
>;
type _DomainStructureMatchesRecursiveSchema = Assert<
	MorphologicalTreeStructure extends RecursiveMorphologicalTreeStructure
		? true
		: false
>;
