import type { z } from "zod";
import { z as zod } from "zod";
import type { ConcreteLanguage } from "../types/concrete-language/features/feature-registry.js";
import type { Descriptor } from "../types/descriptor.js";
import type {
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaKindFor,
	SurfaceKindFor,
} from "../types/public-types.js";
import type {
	LanguageDescriptorSchemaTree,
	LemmaKindForSurfaceKind,
	RawEntitySchemaRegistry,
} from "./shared/schema-helper-types.js";

type DescriptorSchema<TDescriptor> = z.ZodType<TDescriptor>;

type DescriptorSchemaTree = {
	[L in ConcreteLanguage]: LanguageDescriptorSchemaTree<L>;
};

type MutableLanguageDescriptorSchemaTree = {
	Lemma: Record<string, Record<string, z.ZodType>>;
	Surface: Record<string, Record<string, Record<string, z.ZodType>>>;
	Selection: Record<string, Record<string, Record<string, z.ZodType>>>;
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
	const LK extends LemmaFamilyFor<L>,
	const LSK extends LemmaKindFor<L, LK>,
>(
	language: L,
	family: LK,
	kind: LSK,
): DescriptorSchema<Descriptor<"Lemma", L, LK, LSK>> {
	return zod.strictObject({
		language: zod.literal(language),
		family: zod.literal(family),
		kind: zod.literal(kind),
	}) as DescriptorSchema<Descriptor<"Lemma", L, LK, LSK>>;
}

function buildSurfaceDescriptorSchema<
	L extends ConcreteLanguage,
	const SK extends SurfaceKindFor<L>,
	const LK extends LemmaFamilyForSurfaceKind<L, SK>,
	const LSK extends LemmaKindForSurfaceKind<L, SK, LK>,
>(
	language: L,
	surfaceKind: SK,
	family: LK,
	kind: LSK,
): DescriptorSchema<Descriptor<"Surface", L, LK, LSK, SK>> {
	return zod.strictObject({
		language: zod.literal(language),
		surfaceKind: zod.literal(surfaceKind),
		family: zod.literal(family),
		kind: zod.literal(kind),
	}) as DescriptorSchema<Descriptor<"Surface", L, LK, LSK, SK>>;
}

function buildSelectionDescriptorSchema<
	L extends ConcreteLanguage,
	const SK extends SurfaceKindFor<L>,
	const LK extends LemmaFamilyForSurfaceKind<L, SK>,
	const LSK extends LemmaKindForSurfaceKind<L, SK, LK>,
>(
	language: L,
	surfaceKind: SK,
	family: LK,
	kind: LSK,
): DescriptorSchema<Descriptor<"Selection", L, LK, LSK, SK>> {
	return zod.strictObject({
		language: zod.literal(language),
		surfaceKind: zod.literal(surfaceKind),
		family: zod.literal(family),
		kind: zod.literal(kind),
	}) as DescriptorSchema<Descriptor<"Selection", L, LK, LSK, SK>>;
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

	for (const [family, subKindSchemas] of Object.entries(
		iterableSchemaTree.Lemma,
	)) {
		const lemmaFamily = ensureFamily(descriptorTree.Lemma, family);

		for (const kind of Object.keys(subKindSchemas)) {
			lemmaFamily[kind] = buildLemmaDescriptorSchema(
				language,
				family as LemmaFamilyFor<L>,
				kind as LemmaKindFor<L, LemmaFamilyFor<L>>,
			);
		}
	}

	for (const [surfaceKind, familySchemas] of Object.entries(
		iterableSchemaTree.Surface,
	)) {
		descriptorTree.Surface[surfaceKind] ??= {};
		const surfaceKindTree = descriptorTree.Surface[surfaceKind];

		for (const [family, subKindSchemas] of Object.entries(familySchemas)) {
			const surfaceFamily = ensureFamily(surfaceKindTree, family);

			for (const kind of Object.keys(subKindSchemas)) {
				surfaceFamily[kind] = buildSurfaceDescriptorSchema(
					language,
					surfaceKind as SurfaceKindFor<L>,
					family as LemmaFamilyForSurfaceKind<L, SurfaceKindFor<L>>,
					kind as LemmaKindForSurfaceKind<
						L,
						SurfaceKindFor<L>,
						LemmaFamilyForSurfaceKind<L, SurfaceKindFor<L>>
					>,
				);
			}
		}
	}

	for (const [surfaceKind, familySchemas] of Object.entries(
		iterableSchemaTree.Selection,
	)) {
		descriptorTree.Selection[surfaceKind] ??= {};
		const surfaceKindTree = descriptorTree.Selection[surfaceKind];

		for (const [family, subKindSchemas] of Object.entries(familySchemas)) {
			const selectionFamily = ensureFamily(surfaceKindTree, family);

			for (const kind of Object.keys(subKindSchemas)) {
				selectionFamily[kind] = buildSelectionDescriptorSchema(
					language,
					surfaceKind as SurfaceKindFor<L>,
					family as LemmaFamilyForSurfaceKind<L, SurfaceKindFor<L>>,
					kind as LemmaKindForSurfaceKind<
						L,
						SurfaceKindFor<L>,
						LemmaFamilyForSurfaceKind<L, SurfaceKindFor<L>>
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
