import type { z } from "zod/v3";
import { z as zod } from "zod/v3";
import type { ConcreteLanguage } from "../types/concrete-language/features/feature-registry";
import type { Descriptor } from "../types/descriptor";
import type {
	LemmaKindFor,
	LemmaKindForSurfaceKind,
	LemmaSubKindFor,
	SurfaceKindFor,
} from "../types/public-types";
import type {
	LanguageDescriptorSchemaTree,
	LemmaSubKindForSurfaceKind,
	RawEntitySchemaRegistry,
} from "./shared/schema-helper-types";

type DescriptorSchema<TDescriptor> = z.ZodType<TDescriptor>;

type DescriptorSchemaTree = {
	[L in ConcreteLanguage]: LanguageDescriptorSchemaTree<L>;
};

type MutableLanguageDescriptorSchemaTree = {
	Lemma: Record<string, Record<string, z.ZodTypeAny>>;
	Surface: Record<string, Record<string, Record<string, z.ZodTypeAny>>>;
	Selection: Record<string, Record<string, Record<string, z.ZodTypeAny>>>;
};

type IterableLanguageSchemaTree = {
	Lemma: Record<string, Record<string, unknown>>;
	Surface: Record<string, Record<string, Record<string, unknown>>>;
	Selection: Record<string, Record<string, Record<string, unknown>>>;
};

function ensureFamily<TValue>(
	tree: Record<string, Record<string, TValue>>,
	kind: string,
): Record<string, TValue> {
	tree[kind] ??= {};
	return tree[kind];
}

function buildLemmaDescriptorSchema<
	L extends ConcreteLanguage,
	const LK extends LemmaKindFor<L>,
	const LSK extends LemmaSubKindFor<L, LK>,
>(
	language: L,
	lemmaKind: LK,
	lemmaSubKind: LSK,
): DescriptorSchema<Descriptor<"Lemma", L, LK, LSK>> {
	return zod
		.object({
			language: zod.literal(language),
			lemmaKind: zod.literal(lemmaKind),
			lemmaSubKind: zod.literal(lemmaSubKind),
		})
		.strict() as DescriptorSchema<Descriptor<"Lemma", L, LK, LSK>>;
}

function buildSurfaceDescriptorSchema<
	L extends ConcreteLanguage,
	const SK extends SurfaceKindFor<L>,
	const LK extends LemmaKindForSurfaceKind<L, SK>,
	const LSK extends LemmaSubKindForSurfaceKind<L, SK, LK>,
>(
	language: L,
	surfaceKind: SK,
	lemmaKind: LK,
	lemmaSubKind: LSK,
): DescriptorSchema<Descriptor<"Surface", L, LK, LSK, SK>> {
	return zod
		.object({
			language: zod.literal(language),
			surfaceKind: zod.literal(surfaceKind),
			lemmaKind: zod.literal(lemmaKind),
			lemmaSubKind: zod.literal(lemmaSubKind),
		})
		.strict() as DescriptorSchema<Descriptor<"Surface", L, LK, LSK, SK>>;
}

function buildSelectionDescriptorSchema<
	L extends ConcreteLanguage,
	const SK extends SurfaceKindFor<L>,
	const LK extends LemmaKindForSurfaceKind<L, SK>,
	const LSK extends LemmaSubKindForSurfaceKind<L, SK, LK>,
>(
	language: L,
	surfaceKind: SK,
	lemmaKind: LK,
	lemmaSubKind: LSK,
): DescriptorSchema<Descriptor<"Selection", L, LK, LSK, SK>> {
	return zod
		.object({
			language: zod.literal(language),
			surfaceKind: zod.literal(surfaceKind),
			lemmaKind: zod.literal(lemmaKind),
			lemmaSubKind: zod.literal(lemmaSubKind),
		})
		.strict() as DescriptorSchema<Descriptor<"Selection", L, LK, LSK, SK>>;
}

function buildLanguageDescriptorSchemas<L extends ConcreteLanguage>(
	language: L,
	schemaTree: IterableLanguageSchemaTree,
): LanguageDescriptorSchemaTree<L> {
	const descriptorTree: MutableLanguageDescriptorSchemaTree = {
		Lemma: {},
		Surface: {
			Citation: {},
			Inflection: {},
		},
		Selection: {
			Citation: {},
			Inflection: {},
		},
	};
	const iterableSchemaTree = schemaTree;

	for (const [lemmaKind, subKindSchemas] of Object.entries(
		iterableSchemaTree.Lemma,
	)) {
		const lemmaFamily = ensureFamily(descriptorTree.Lemma, lemmaKind);

		for (const lemmaSubKind of Object.keys(subKindSchemas)) {
			lemmaFamily[lemmaSubKind] = buildLemmaDescriptorSchema(
				language,
				lemmaKind as LemmaKindFor<L>,
				lemmaSubKind as LemmaSubKindFor<L, LemmaKindFor<L>>,
			);
		}
	}

	for (const [surfaceKind, lemmaKindSchemas] of Object.entries(
		iterableSchemaTree.Surface,
	)) {
		descriptorTree.Surface[surfaceKind] ??= {};
		const surfaceKindTree = descriptorTree.Surface[surfaceKind];

		for (const [lemmaKind, subKindSchemas] of Object.entries(
			lemmaKindSchemas,
		)) {
			const surfaceFamily = ensureFamily(surfaceKindTree, lemmaKind);

			for (const lemmaSubKind of Object.keys(subKindSchemas)) {
				surfaceFamily[lemmaSubKind] = buildSurfaceDescriptorSchema(
					language,
					surfaceKind as SurfaceKindFor<L>,
					lemmaKind as LemmaKindForSurfaceKind<L, SurfaceKindFor<L>>,
					lemmaSubKind as LemmaSubKindForSurfaceKind<
						L,
						SurfaceKindFor<L>,
						LemmaKindForSurfaceKind<L, SurfaceKindFor<L>>
					>,
				);
			}
		}
	}

	for (const [surfaceKind, lemmaKindSchemas] of Object.entries(
		iterableSchemaTree.Selection,
	)) {
		descriptorTree.Selection[surfaceKind] ??= {};
		const surfaceKindTree = descriptorTree.Selection[surfaceKind];

		for (const [lemmaKind, subKindSchemas] of Object.entries(
			lemmaKindSchemas,
		)) {
			const selectionFamily = ensureFamily(surfaceKindTree, lemmaKind);

			for (const lemmaSubKind of Object.keys(subKindSchemas)) {
				selectionFamily[lemmaSubKind] = buildSelectionDescriptorSchema(
					language,
					surfaceKind as SurfaceKindFor<L>,
					lemmaKind as LemmaKindForSurfaceKind<L, SurfaceKindFor<L>>,
					lemmaSubKind as LemmaSubKindForSurfaceKind<
						L,
						SurfaceKindFor<L>,
						LemmaKindForSurfaceKind<L, SurfaceKindFor<L>>
					>,
				);
			}
		}
	}

	return descriptorTree as unknown as LanguageDescriptorSchemaTree<L>;
}

export function buildDescriptorSchemas(
	schemaTree: RawEntitySchemaRegistry,
): DescriptorSchemaTree {
	return Object.fromEntries(
		Object.entries(schemaTree).map(([language, languageSchemaTree]) => [
			language,
			buildLanguageDescriptorSchemas(
				language as ConcreteLanguage,
				languageSchemaTree,
			),
		]),
	) as DescriptorSchemaTree;
}
