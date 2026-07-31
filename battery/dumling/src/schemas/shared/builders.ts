import type {
	CoreFeaturesFor,
	InflectionalFeaturesFor,
	LemmaFamilyFor,
	LemmaKindFor,
} from "dumling/types";
import { z } from "zod";
import type { ConcreteLanguage } from "../../types/concrete-language/features/feature-registry.js";
import { normalizedStringSchema } from "./normalization.js";
import type { RawLanguageEntitySchemaTree } from "./schema-helper-types.js";

type SchemaOutput<TSchema extends z.ZodType> = z.output<TSchema>;
type SchemaTuple = readonly [z.ZodType, ...z.ZodType[]];

function nullableNonEmptyObjectSchema<TShape extends z.ZodRawShape>(
	shape: TShape,
) {
	return z
		.strictObject(shape)
		.refine(
			(value) => Object.values(value).some((lemma) => lemma !== null),
			"Feature bag must contain at least one marked value",
		)
		.nullable();
}

export function buildLemmaSchema<
	TLanguage extends string,
	TLemmaFamily extends string,
	TLemmaKind extends string,
	TCoreFeatures extends object,
>(options: {
	coreFeaturesSchema: z.ZodType<TCoreFeatures>;
	languageSchema: z.ZodType<TLanguage>;
	family: TLemmaFamily;
	kind: TLemmaKind;
}): z.ZodType<{
	canonicalForm: string;
	coreFeatures: TCoreFeatures;
	language: TLanguage;
	family: TLemmaFamily;
	kind: TLemmaKind;
}> {
	return z.strictObject({
		language: options.languageSchema,
		canonicalForm: normalizedStringSchema(),
		family: z.literal(options.family),
		kind: z.literal(options.kind),
		coreFeatures: options.coreFeaturesSchema,
	}) as unknown as z.ZodType<{
		canonicalForm: string;
		coreFeatures: TCoreFeatures;
		language: TLanguage;
		family: TLemmaFamily;
		kind: TLemmaKind;
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
	normalizedSurface: string;
	spelling: "Canonical" | "Variant";
	realizationCoverage: "Full" | "Partial";
	surfaceKind: "Citation";
	surfaceFeatures: {
		historicalStatus: "Archaic" | null;
	} | null;
}> {
	return z.strictObject({
		language: options.languageSchema,
		normalizedSurface: normalizedStringSchema(),
		spelling: z.enum(["Canonical", "Variant"]),
		realizationCoverage: z.enum(["Full", "Partial"]),
		surfaceKind: z.literal("Citation"),
		surfaceFeatures: nullableNonEmptyObjectSchema({
			historicalStatus: z.literal("Archaic").nullable(),
		}),
		lemma: options.lemmaSchema,
	}) as unknown as z.ZodType<{
		language: TLanguage;
		lemma: TLemma;
		normalizedSurface: string;
		spelling: "Canonical" | "Variant";
		realizationCoverage: "Full" | "Partial";
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
	normalizedSurface: string;
	spelling: "Canonical" | "Variant";
	realizationCoverage: "Full" | "Partial";
	surfaceKind: "Inflection";
	surfaceFeatures: {
		historicalStatus: "Archaic" | null;
	} | null;
}> {
	return z.strictObject({
		language: options.languageSchema,
		normalizedSurface: normalizedStringSchema(),
		spelling: z.enum(["Canonical", "Variant"]),
		realizationCoverage: z.enum(["Full", "Partial"]),
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
		normalizedSurface: string;
		spelling: "Canonical" | "Variant";
		realizationCoverage: "Full" | "Partial";
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
	surfaceSchema: z.ZodType<TSurface>;
}): z.ZodType<{
	segmentedSentenceId: string;
	clickedSegmentIndex: number;
	surfaceSegmentIndices: number[];
	attestedSurface: string;
	selectedOrthography: "Standard" | "Typo";
	surface: TSurface;
}> {
	return z
		.strictObject({
			segmentedSentenceId: z
				.string()
				.min(1)
				.refine(
					(value) =>
						value.trim() === value &&
						value.normalize("NFC") === value,
					"SegmentedSentenceId must be a non-empty normalized string",
				),
			clickedSegmentIndex: z.number().int().nonnegative(),
			surfaceSegmentIndices: z
				.array(z.number().int().nonnegative())
				.min(1),
			attestedSurface: z.string().min(1),
			selectedOrthography: z.enum(["Standard", "Typo"]),
			surface: options.surfaceSchema,
		})
		.superRefine((value, context) => {
			const indices = value.surfaceSegmentIndices;
			if (!indices.includes(value.clickedSegmentIndex)) {
				context.addIssue({
					code: "custom",
					path: ["surfaceSegmentIndices"],
					message:
						"Surface segment indices must include the clicked segment",
				});
			}
			if (
				indices.some(
					(index, position) =>
						position > 0 && index <= (indices[position - 1] ?? -1),
				)
			) {
				context.addIssue({
					code: "custom",
					path: ["surfaceSegmentIndices"],
					message:
						"Surface segment indices must be ordered and unique",
				});
			}
		}) as unknown as z.ZodType<{
		segmentedSentenceId: string;
		clickedSegmentIndex: number;
		surfaceSegmentIndices: number[];
		attestedSurface: string;
		selectedOrthography: "Standard" | "Typo";
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
	LK extends LemmaFamilyFor<L>,
	LSK extends LemmaKindFor<L, LK>,
> = z.ZodObject<{
	core: z.ZodType<CoreFeaturesFor<L, LK, LSK>>;
	inflectional: z.ZodType<InflectionalFeaturesFor<L, LK, LSK>>;
}>;

type FeatureSchemaTree<L extends ConcreteLanguage> = {
	[LK in LemmaFamilyFor<L>]: {
		[LSK in LemmaKindFor<L, LK>]: FeatureSchemaFor<L, LK, LSK>;
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
	const LK extends LemmaFamilyFor<L>,
	const LSK extends LemmaKindFor<L, LK>,
>(
	language: L,
	family: LK,
	kind: LSK,
	featuresSchema: FeatureSchemaFor<L, LK, LSK>,
): LeafSchemas {
	const languageSchema = z.literal(language);
	const lemmaSchema = buildLemmaSchema({
		languageSchema,
		family,
		kind,
		coreFeaturesSchema: featuresSchema.shape.core,
	});

	const citationSurfaceSchema = buildCitationSurfaceSchema({
		languageSchema,
		lemmaSchema,
	});

	const citationSelectionSchema = buildSelectionSchema({
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

	for (const [family, subKindSchemas] of Object.entries(featureSchemas) as [
		LemmaFamilyFor<L>,
		Record<
			LemmaKindFor<L, LemmaFamilyFor<L>>,
			FeatureSchemaFor<
				L,
				LemmaFamilyFor<L>,
				LemmaKindFor<L, LemmaFamilyFor<L>>
			>
		>,
	][]) {
		const lemmaFamily = ensureFamily(schemaTree.Lemma, family);
		const citationSurfaceFamily = ensureFamily(
			schemaTree.Surface.Citation,
			family,
		);
		const citationSelectionFamily = ensureFamily(
			schemaTree.Selection.Citation,
			family,
		);

		for (const [kind, featuresSchema] of Object.entries(subKindSchemas) as [
			LemmaKindFor<L, typeof family>,
			FeatureSchemaFor<L, typeof family, LemmaKindFor<L, typeof family>>,
		][]) {
			const leaf = buildLeafSchemas(
				language,
				family,
				kind,
				featuresSchema,
			);

			lemmaFamily[kind] = leaf.lemma;
			citationSurfaceFamily[kind] = leaf.citationSurface;
			citationSelectionFamily[kind] = leaf.citationSelection;

			if (!leaf.inflectionSurface || !leaf.inflectionSelection) {
				continue;
			}

			const inflectionSurfaceFamily = ensureFamily(
				schemaTree.Surface.Inflection,
				family,
			);
			const inflectionSelectionFamily = ensureFamily(
				schemaTree.Selection.Inflection,
				family,
			);

			inflectionSurfaceFamily[kind] = leaf.inflectionSurface;
			inflectionSelectionFamily[kind] = leaf.inflectionSelection;
		}
	}

	return schemaTree as unknown as RawLanguageEntitySchemaTree<L>;
}
