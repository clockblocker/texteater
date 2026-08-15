import { supportedLanguages } from "dumling";
import { schemasFor } from "dumling/schema";
import type { SupportedLanguage } from "dumling/types";
import { type ZodType, z } from "zod";

import type { UnitShadow } from "./knowledge.js";
import { assertReadingKnowledgeForOwner } from "./knowledge.js";
import { semanticRelationsSchemaFor } from "./schema.js";

const unitShadowObjectSchema = z
	.strictObject({
		language: z.enum(supportedLanguages),
		canonicalForm: z.string().trim().min(1),
		family: z.string().trim().min(1),
		kind: z.string().trim().min(1),
	})
	.superRefine((shadow, context) => {
		const result = supportedUnitShadowDescriptorSchema(shadow).safeParse({
			language: shadow.language,
			family: shadow.family,
			kind: shadow.kind,
		});
		if (!result.success) {
			context.addIssue({
				code: "custom",
				path: ["kind"],
				message: `${shadow.language}/${shadow.family}/${shadow.kind} is not a supported Dumling Lemma route.`,
			});
		}
	});

/** The accepted Family/Kind routes come solely from Dumling's registry. */
export const unitShadowSchema = unitShadowObjectSchema as z.ZodType<UnitShadow>;

export function isSupportedUnitShadow(shadow: {
	readonly language: SupportedLanguage;
	readonly family: string;
	readonly kind: string;
}): boolean {
	return supportedUnitShadowDescriptorSchema(shadow).safeParse({
		language: shadow.language,
		family: shadow.family,
		kind: shadow.kind,
	}).success;
}

export function assertSupportedUnitShadow(shadow: {
	readonly language: SupportedLanguage;
	readonly family: string;
	readonly kind: string;
}): void {
	if (!isSupportedUnitShadow(shadow)) {
		throw new Error(
			`${shadow.language}/${shadow.family}/${shadow.kind} is not a supported Dumling Lemma route.`,
		);
	}
}

function supportedUnitShadowDescriptorSchema(shadow: {
	readonly language: SupportedLanguage;
	readonly family: string;
	readonly kind: string;
}): ZodType {
	const registry = schemasFor[shadow.language].descriptor
		.Lemma as unknown as Record<string, Record<string, ZodType>>;
	return registry[shadow.family]?.[shadow.kind] ?? z.never();
}

export function morphologicalTreeSchemasFor<
	ReadingSchema extends z.ZodType,
	ShadowSchema extends z.ZodType,
>(targets: { morphemeReading: ReadingSchema; unitShadow: ShadowSchema }) {
	const structureSchema: z.ZodType = z.lazy(() =>
		z.strictObject({
			nodeKind: z.literal("structure"),
			children: z.array(nodeSchema).min(1),
		}),
	);
	const nodeSchema: z.ZodType = z.lazy(() =>
		z.union([
			z.strictObject({
				nodeKind: z.literal("morphemeReading"),
				reading: targets.morphemeReading,
			}),
			z
				.strictObject({
					nodeKind: z.literal("unitShadow"),
					unitShadow: targets.unitShadow,
				})
				.superRefine((value, context) => {
					const unitShadow = Reflect.get(value, "unitShadow");
					if (!isLexicalUnitShadow(unitShadow)) {
						context.addIssue({
							code: "custom",
							path: ["unitShadow", "family"],
							message:
								"Morphological Unit Shadows must be lexical (Lexeme or Phraseme); Morphemes point to Readings.",
						});
					}
				}),
			structureSchema,
		]),
	);
	const valueSchema = z.strictObject({ root: structureSchema });

	return {
		nodeSchema,
		valueSchema,
		contributionSchema: valueSchema,
	};
}

export function lexicalBreakdownSchemasFor<ShadowSchema extends z.ZodType>(
	unitShadow: ShadowSchema,
) {
	const valueSchema = z
		.array(unitShadow)
		.min(2)
		.superRefine((components, context) => {
			for (const [index, component] of components.entries()) {
				if (!isLexemeUnitShadow(component)) {
					context.addIssue({
						code: "custom",
						path: [index, "family"],
						message:
							"Lexical Breakdown components must be Lexeme Unit Shadows.",
					});
				}
			}
		});

	return { valueSchema, contributionSchema: valueSchema };
}

export function readingKnowledgeSchemasFor<
	MorphemeReadingSchema extends z.ZodType,
	SemanticReadingSchema extends z.ZodType,
	ShadowSchema extends z.ZodType,
>(targets: {
	morphemeReading: MorphemeReadingSchema;
	semanticReading: SemanticReadingSchema;
	unitShadow: ShadowSchema;
}) {
	const morphology = morphologicalTreeSchemasFor(targets);
	const lexicalBreakdown = lexicalBreakdownSchemasFor(targets.unitShadow);
	const translationSchema = z.strictObject({
		targetLanguage: z.string().trim().min(1),
		text: z.string().trim().min(1),
	});
	const valueSchema = z.strictObject({
		definition: z.string().trim().min(1).optional(),
		translations: z.array(translationSchema).optional(),
		morphologicalTree: morphology.valueSchema.optional(),
		lexicalBreakdown: lexicalBreakdown.valueSchema.optional(),
		semanticRelations: semanticRelationsSchemaFor(
			targets.semanticReading,
		).optional(),
	});
	const contributionSchema = z.strictObject({
		definition: z.string().trim().min(1).optional(),
		translations: z.array(translationSchema).optional(),
		morphologicalTree: morphology.contributionSchema.optional(),
		lexicalBreakdown: lexicalBreakdown.contributionSchema.optional(),
		semanticRelations: semanticRelationsSchemaFor(
			targets.semanticReading,
		).optional(),
	});
	return {
		valueSchema,
		contributionSchema,
		ownedValueSchemaFor<OwnerSchema extends z.ZodType>(owner: OwnerSchema) {
			return ownedReadingKnowledgeSchemaFor(owner, valueSchema);
		},
		ownedContributionSchemaFor<OwnerSchema extends z.ZodType>(
			owner: OwnerSchema,
		) {
			return ownedReadingKnowledgeSchemaFor(owner, contributionSchema);
		},
	};
}

function ownedReadingKnowledgeSchemaFor<
	OwnerSchema extends z.ZodType,
	KnowledgeSchema extends z.ZodType,
>(ownerSchema: OwnerSchema, knowledgeSchema: KnowledgeSchema) {
	return z
		.strictObject({ owner: ownerSchema, knowledge: knowledgeSchema })
		.superRefine((value, context) => {
			const owner = Reflect.get(value as object, "owner");
			const knowledge = Reflect.get(value as object, "knowledge");
			try {
				assertReadingKnowledgeForOwner(
					owner as
						| { family: string; kind: string }
						| { lemma: { family: string; kind: string } },
					knowledge,
				);
			} catch (error) {
				context.addIssue({
					code: "custom",
					path: ["knowledge", "lexicalBreakdown"],
					message:
						error instanceof Error
							? error.message
							: "Owner does not admit a Lexical Breakdown.",
				});
			}
		});
}

function isLexicalUnitShadow(value: unknown): boolean {
	if (value === null || typeof value !== "object") return false;
	const family = Reflect.get(value, "family");
	return family === "Lexeme" || family === "Phraseme";
}

function isLexemeUnitShadow(value: unknown): boolean {
	return (
		value !== null &&
		typeof value === "object" &&
		Reflect.get(value, "family") === "Lexeme"
	);
}
