import type {
	InflectionalFeaturesFor,
	InherentFeaturesFor,
	LemmaKindFor,
	LemmaSubKindFor,
} from "dumling/types";
import { z } from "zod";
import type { ConcreteLanguage } from "../../types/concrete-language/features/feature-registry.js";
import {
	normalizedLowercaseStringSchema,
	normalizedStringSchema,
} from "./normalization.js";
import type { RawLanguageEntitySchemaTree } from "./schema-helper-types.js";

type SchemaOutput<TSchema extends z.ZodType> = z.output<TSchema>;
type SchemaTuple = readonly [z.ZodType, ...z.ZodType[]];

function nullableNonEmptyObjectSchema<TShape extends z.ZodRawShape>(
	shape: TShape,
) {
	return z
		.strictObject(shape)
		.refine(
			(value) => Object.values(value).some((entry) => entry !== null),
			"Feature bag must contain at least one marked value",
		)
		.nullable();
}

export function buildLemmaSchema<
	TLanguage extends string,
	TLemmaKind extends string,
	TLemmaSubKind extends string,
	TInherentFeatures extends object,
>(options: {
	inherentFeaturesSchema: z.ZodType<TInherentFeatures>;
	languageSchema: z.ZodType<TLanguage>;
	lemmaKind: TLemmaKind;
	lemmaSubKind: TLemmaSubKind;
}): z.ZodType<{
	canonicalLemma: string;
	inherentFeatures: TInherentFeatures;
	language: TLanguage;
	lemmaKind: TLemmaKind;
	lemmaSubKind: TLemmaSubKind;
	meaningInEmojis: string;
}> {
	return z.strictObject({
		language: options.languageSchema,
		canonicalLemma: normalizedLowercaseStringSchema(),
		lemmaKind: z.literal(options.lemmaKind),
		lemmaSubKind: z.literal(options.lemmaSubKind),
		inherentFeatures: options.inherentFeaturesSchema,
		meaningInEmojis: normalizedStringSchema(),
	}) as unknown as z.ZodType<{
		canonicalLemma: string;
		inherentFeatures: TInherentFeatures;
		language: TLanguage;
		lemmaKind: TLemmaKind;
		lemmaSubKind: TLemmaSubKind;
		meaningInEmojis: string;
	}>;
}

export function buildCitationSurfaceSchema<
	TLanguage extends string,
	TLemma extends { language: TLanguage },
>(options: {
	languageSchema: z.ZodType<TLanguage>;
	lemmaSchema: z.ZodType<TLemma>;
}): z.ZodType<{
	language: TLanguage;
	lemma: TLemma;
	normalizedFullSurface: string;
	surfaceKind: "Citation";
	surfaceFeatures: {
		historicalStatus: "Archaic" | null;
	} | null;
}> {
	return z.strictObject({
		language: options.languageSchema,
		normalizedFullSurface: normalizedLowercaseStringSchema(),
		surfaceKind: z.literal("Citation"),
		surfaceFeatures: nullableNonEmptyObjectSchema({
			historicalStatus: z.literal("Archaic").nullable(),
		}),
		lemma: options.lemmaSchema,
	}) as unknown as z.ZodType<{
		language: TLanguage;
		lemma: TLemma;
		normalizedFullSurface: string;
		surfaceKind: "Citation";
		surfaceFeatures: {
			historicalStatus: "Archaic" | null;
		} | null;
	}>;
}

export function buildInflectionSurfaceSchema<
	TLanguage extends string,
	TLemma extends { language: TLanguage },
	TInflectionalFeatures extends object,
>(options: {
	inflectionalFeaturesSchema: z.ZodType<TInflectionalFeatures>;
	languageSchema: z.ZodType<TLanguage>;
	lemmaSchema: z.ZodType<TLemma>;
}): z.ZodType<{
	inflectionalFeatures: TInflectionalFeatures;
	language: TLanguage;
	lemma: TLemma;
	normalizedFullSurface: string;
	surfaceKind: "Inflection";
	surfaceFeatures: {
		historicalStatus: "Archaic" | null;
	} | null;
}> {
	return z.strictObject({
		language: options.languageSchema,
		normalizedFullSurface: normalizedLowercaseStringSchema(),
		surfaceKind: z.literal("Inflection"),
		surfaceFeatures: nullableNonEmptyObjectSchema({
			historicalStatus: z.literal("Archaic").nullable(),
		}),
		lemma: options.lemmaSchema,
		inflectionalFeatures: options.inflectionalFeaturesSchema,
	}) as unknown as z.ZodType<{
		inflectionalFeatures: TInflectionalFeatures;
		language: TLanguage;
		lemma: TLemma;
		normalizedFullSurface: string;
		surfaceKind: "Inflection";
		surfaceFeatures: {
			historicalStatus: "Archaic" | null;
		} | null;
	}>;
}

export function buildSelectionSchema<
	TLanguage extends string,
	TSurface extends { language: TLanguage },
>(options: {
	languageSchema: z.ZodType<TLanguage>;
	surfaceSchema: z.ZodType<TSurface>;
}): z.ZodType<{
	language: TLanguage;
	selectionFeatures: {
		coverage: "Partial" | null;
		orthography: "Typo" | null;
		spelling: "Variant" | null;
	} | null;
	spelledSelection: string;
	surface: TSurface;
}> {
	return z.strictObject({
		language: options.languageSchema,
		selectionFeatures: nullableNonEmptyObjectSchema({
			coverage: z.literal("Partial").nullable(),
			orthography: z.literal("Typo").nullable(),
			spelling: z.literal("Variant").nullable(),
		}),
		spelledSelection: normalizedStringSchema(),
		surface: options.surfaceSchema,
	}) as unknown as z.ZodType<{
		language: TLanguage;
		selectionFeatures: {
			coverage: "Partial" | null;
			orthography: "Typo" | null;
			spelling: "Variant" | null;
		} | null;
		spelledSelection: string;
		surface: TSurface;
	}>;
}

export function buildUnionSchema<TSchemas extends SchemaTuple>(
	schemas: TSchemas,
): z.ZodType<SchemaOutput<TSchemas[number]>> {
	if (schemas.length === 1) {
		return schemas[0] as z.ZodType<SchemaOutput<TSchemas[number]>>;
	}

	return z.union(
		schemas as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]],
	) as unknown as z.ZodType<SchemaOutput<TSchemas[number]>>;
}

type FeatureSchemaFor<
	L extends ConcreteLanguage,
	LK extends LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK>,
> = z.ZodObject<{
	inherent: z.ZodType<InherentFeaturesFor<L, LK, LSK>>;
	inflectional: z.ZodType<InflectionalFeaturesFor<L, LK, LSK>>;
}>;

type FeatureSchemaTree<L extends ConcreteLanguage> = {
	[LK in LemmaKindFor<L>]: {
		[LSK in LemmaSubKindFor<L, LK>]: FeatureSchemaFor<L, LK, LSK>;
	};
};

type LeafSchemas = {
	lemma: z.ZodType;
	citationSelection: z.ZodType;
	citationSurface: z.ZodType;
	inflectionSelection?: z.ZodType;
	inflectionSurface?: z.ZodType;
};

type MutableSchemaTree = {
	Lemma: Record<string, Record<string, z.ZodType>>;
	Selection: Record<string, Record<string, Record<string, z.ZodType>>>;
	Surface: Record<string, Record<string, Record<string, z.ZodType>>>;
};

function hasInflectionSurface(inflectionalFeaturesSchema: z.ZodType) {
	return (
		inflectionalFeaturesSchema.meta()?.dumlingHasInflectionSurface === true
	);
}

function buildLeafSchemas<
	const L extends ConcreteLanguage,
	const LK extends LemmaKindFor<L>,
	const LSK extends LemmaSubKindFor<L, LK>,
>(
	language: L,
	lemmaKind: LK,
	lemmaSubKind: LSK,
	featuresSchema: FeatureSchemaFor<L, LK, LSK>,
): LeafSchemas {
	const languageSchema = z.literal(language);
	const lemmaSchema = buildLemmaSchema({
		languageSchema,
		lemmaKind,
		lemmaSubKind,
		inherentFeaturesSchema: featuresSchema.shape.inherent,
	});

	const citationSurfaceSchema = buildCitationSurfaceSchema({
		languageSchema,
		lemmaSchema,
	});

	const citationSelectionSchema = buildSelectionSchema({
		languageSchema,
		surfaceSchema: citationSurfaceSchema,
	});

	const leaf = {
		lemma: lemmaSchema,
		citationSurface: citationSurfaceSchema,
		citationSelection: citationSelectionSchema,
	};

	if (!hasInflectionSurface(featuresSchema.shape.inflectional)) {
		return leaf;
	}

	const inflectionSurfaceSchema = buildInflectionSurfaceSchema({
		languageSchema,
		lemmaSchema,
		inflectionalFeaturesSchema: featuresSchema.shape.inflectional,
	});

	const inflectionSelectionSchema = buildSelectionSchema({
		languageSchema,
		surfaceSchema: inflectionSurfaceSchema,
	});

	return {
		...leaf,
		inflectionSurface: inflectionSurfaceSchema,
		inflectionSelection: inflectionSelectionSchema,
	};
}

function ensureFamily<TValue>(
	tree: Record<string, Record<string, TValue>>,
	kind: string,
): Record<string, TValue> {
	tree[kind] ??= {};
	return tree[kind];
}

export function buildLanguageSchema<L extends ConcreteLanguage>(
	language: L,
	featureSchemas: FeatureSchemaTree<L>,
): RawLanguageEntitySchemaTree<L> {
	const schemaTree = {
		Lemma: {},
		Surface: {
			Citation: {},
			Inflection: {},
		},
		Selection: {
			Citation: {},
			Inflection: {},
		},
	} satisfies MutableSchemaTree;

	for (const [lemmaKind, subKindSchemas] of Object.entries(
		featureSchemas,
	) as [
		LemmaKindFor<L>,
		Record<
			LemmaSubKindFor<L, LemmaKindFor<L>>,
			FeatureSchemaFor<
				L,
				LemmaKindFor<L>,
				LemmaSubKindFor<L, LemmaKindFor<L>>
			>
		>,
	][]) {
		const lemmaFamily = ensureFamily(schemaTree.Lemma, lemmaKind);
		const citationSurfaceFamily = ensureFamily(
			schemaTree.Surface.Citation,
			lemmaKind,
		);
		const citationSelectionFamily = ensureFamily(
			schemaTree.Selection.Citation,
			lemmaKind,
		);

		for (const [lemmaSubKind, featuresSchema] of Object.entries(
			subKindSchemas,
		) as [
			LemmaSubKindFor<L, typeof lemmaKind>,
			FeatureSchemaFor<
				L,
				typeof lemmaKind,
				LemmaSubKindFor<L, typeof lemmaKind>
			>,
		][]) {
			const leaf = buildLeafSchemas(
				language,
				lemmaKind,
				lemmaSubKind,
				featuresSchema,
			);

			lemmaFamily[lemmaSubKind] = leaf.lemma;
			citationSurfaceFamily[lemmaSubKind] = leaf.citationSurface;
			citationSelectionFamily[lemmaSubKind] = leaf.citationSelection;

			if (!leaf.inflectionSurface || !leaf.inflectionSelection) {
				continue;
			}

			const inflectionSurfaceFamily = ensureFamily(
				schemaTree.Surface.Inflection,
				lemmaKind,
			);
			const inflectionSelectionFamily = ensureFamily(
				schemaTree.Selection.Inflection,
				lemmaKind,
			);

			inflectionSurfaceFamily[lemmaSubKind] = leaf.inflectionSurface;
			inflectionSelectionFamily[lemmaSubKind] = leaf.inflectionSelection;
		}
	}

	return schemaTree as unknown as RawLanguageEntitySchemaTree<L>;
}
