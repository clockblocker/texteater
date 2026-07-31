import type {
	Lemma,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaKindFor,
	Selection,
	SupportedLanguage,
	Surface,
	SurfaceKindFor,
} from "dumling/types";
import type { z } from "zod";
import type { Descriptor } from "../../types/descriptor.js";

type SchemaGetter<T> = () => z.ZodType<T>;

export type LemmaKindForSurfaceKind<
	L extends SupportedLanguage,
	SK extends SurfaceKindFor<L>,
	LK extends LemmaFamilyForSurfaceKind<L, SK>,
> =
	Extract<
		Surface<L>,
		{
			lemma: {
				family: LK;
			};
			surfaceKind: SK;
		}
	> extends infer TSurface
		? TSurface extends {
				lemma: {
					kind: infer LSK;
				};
			}
			? Extract<LSK, LemmaKindFor<L, LK>>
			: never
		: never;

export type RawLanguageEntitySchemaTree<L extends SupportedLanguage> = {
	Lemma: RawLemmaSchemaSubtree<L>;
	Surface: RawSurfaceSchemaSubtree<L>;
	Selection: RawSelectionSchemaSubtree<L>;
};

export type RawEntitySchemaRegistry = {
	[L in SupportedLanguage]: RawLanguageEntitySchemaTree<L>;
};

type LanguageSchemaTree<L extends SupportedLanguage> = {
	descriptor: LanguageDescriptorSchemaTree<L>;
	entity: LanguageEntitySchemaTree<L>;
};

export type SchemaRegistry = {
	[L in SupportedLanguage]: LanguageSchemaTree<L>;
};

type RawLemmaSchemaSubtree<L extends SupportedLanguage> = {
	[LK in LemmaFamilyFor<L>]: {
		[LSK in LemmaKindFor<L, LK>]: z.ZodType<Lemma<L, LK, LSK>>;
	};
};

type RawSurfaceSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaFamilyForSurfaceKind<L, SK>]: {
			[LSK in LemmaKindForSurfaceKind<L, SK, LK>]: z.ZodType<
				Surface<L, SK, LK, LSK>
			>;
		};
	};
};

type RawSelectionSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaFamilyForSurfaceKind<L, SK>]: {
			[LSK in LemmaKindForSurfaceKind<L, SK, LK>]: z.ZodType<
				Selection<L, SK, LK, LSK>
			>;
		};
	};
};

export type LanguageEntitySchemaTree<L extends SupportedLanguage> = {
	Lemma: LemmaSchemaSubtree<L>;
	Surface: SurfaceSchemaSubtree<L>;
	Selection: SelectionSchemaSubtree<L>;
};

type LemmaSchemaSubtree<L extends SupportedLanguage> = {
	[LK in LemmaFamilyFor<L>]: {
		[LSK in LemmaKindFor<L, LK>]: SchemaGetter<Lemma<L, LK, LSK>>;
	};
};

type SurfaceSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaFamilyForSurfaceKind<L, SK>]: {
			[LSK in LemmaKindForSurfaceKind<L, SK, LK>]: SchemaGetter<
				Surface<L, SK, LK, LSK>
			>;
		};
	};
};

type SelectionSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaFamilyForSurfaceKind<L, SK>]: {
			[LSK in LemmaKindForSurfaceKind<L, SK, LK>]: SchemaGetter<
				Selection<L, SK, LK, LSK>
			>;
		};
	};
};

type DescriptorSchema<TDescriptor> = z.ZodType<TDescriptor>;

export type LanguageDescriptorSchemaTree<L extends SupportedLanguage> = {
	Lemma: LemmaDescriptorSchemaSubtree<L>;
	Surface: SurfaceDescriptorSchemaSubtree<L>;
	Selection: SelectionDescriptorSchemaSubtree<L>;
};

type LemmaDescriptorSchemaSubtree<L extends SupportedLanguage> = {
	[LK in LemmaFamilyFor<L>]: {
		[LSK in LemmaKindFor<L, LK>]: DescriptorSchema<
			Descriptor<"Lemma", L, LK, LSK>
		>;
	};
};

type SurfaceDescriptorSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaFamilyForSurfaceKind<L, SK>]: {
			[LSK in LemmaKindForSurfaceKind<L, SK, LK>]: DescriptorSchema<
				Descriptor<"Surface", L, LK, LSK, SK>
			>;
		};
	};
};

type SelectionDescriptorSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaFamilyForSurfaceKind<L, SK>]: {
			[LSK in LemmaKindForSurfaceKind<L, SK, LK>]: DescriptorSchema<
				Descriptor<"Selection", L, LK, LSK, SK>
			>;
		};
	};
};
