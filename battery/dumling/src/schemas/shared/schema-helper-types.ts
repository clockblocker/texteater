import type {
	Lemma,
	LemmaKindFor,
	LemmaKindForSurfaceKind,
	LemmaSubKindFor,
	Selection,
	SupportedLanguage,
	Surface,
	SurfaceKindFor,
} from "dumling/types";
import type { z } from "zod/v3";
import type { Descriptor } from "../../types/descriptor";

type SchemaGetter<T> = () => z.ZodType<T>;

export type LemmaSubKindForSurfaceKind<
	L extends SupportedLanguage,
	SK extends SurfaceKindFor<L>,
	LK extends LemmaKindForSurfaceKind<L, SK>,
> = Extract<
	Surface<L>,
	{
		lemma: {
			lemmaKind: LK;
		};
		surfaceKind: SK;
	}
> extends infer TSurface
	? TSurface extends {
			lemma: {
				lemmaSubKind: infer LSK;
			};
		}
		? Extract<LSK, LemmaSubKindFor<L, LK>>
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

export type LanguageSchemaTree<L extends SupportedLanguage> = {
	descriptor: LanguageDescriptorSchemaTree<L>;
	entity: LanguageEntitySchemaTree<L>;
};

export type SchemaRegistry = {
	[L in SupportedLanguage]: LanguageSchemaTree<L>;
};

export type RawLemmaSchemaSubtree<L extends SupportedLanguage> = {
	[LK in LemmaKindFor<L>]: {
		[LSK in LemmaSubKindFor<L, LK>]: z.ZodType<Lemma<L, LK, LSK>>;
	};
};

export type RawSurfaceSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaKindForSurfaceKind<L, SK>]: {
			[LSK in LemmaSubKindForSurfaceKind<L, SK, LK>]: z.ZodType<
				Surface<L, SK, LK, LSK>
			>;
		};
	};
};

export type RawSelectionSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaKindForSurfaceKind<L, SK>]: {
			[LSK in LemmaSubKindForSurfaceKind<L, SK, LK>]: z.ZodType<
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

export type LemmaSchemaSubtree<L extends SupportedLanguage> = {
	[LK in LemmaKindFor<L>]: {
		[LSK in LemmaSubKindFor<L, LK>]: SchemaGetter<Lemma<L, LK, LSK>>;
	};
};

export type SurfaceSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaKindForSurfaceKind<L, SK>]: {
			[LSK in LemmaSubKindForSurfaceKind<L, SK, LK>]: SchemaGetter<
				Surface<L, SK, LK, LSK>
			>;
		};
	};
};

export type SelectionSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaKindForSurfaceKind<L, SK>]: {
			[LSK in LemmaSubKindForSurfaceKind<L, SK, LK>]: SchemaGetter<
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

export type LemmaDescriptorSchemaSubtree<L extends SupportedLanguage> = {
	[LK in LemmaKindFor<L>]: {
		[LSK in LemmaSubKindFor<L, LK>]: DescriptorSchema<
			Descriptor<"Lemma", L, LK, LSK>
		>;
	};
};

export type SurfaceDescriptorSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaKindForSurfaceKind<L, SK>]: {
			[LSK in LemmaSubKindForSurfaceKind<L, SK, LK>]: DescriptorSchema<
				Descriptor<"Surface", L, LK, LSK, SK>
			>;
		};
	};
};

export type SelectionDescriptorSchemaSubtree<L extends SupportedLanguage> = {
	[SK in SurfaceKindFor<L>]: {
		[LK in LemmaKindForSurfaceKind<L, SK>]: {
			[LSK in LemmaSubKindForSurfaceKind<L, SK, LK>]: DescriptorSchema<
				Descriptor<"Selection", L, LK, LSK, SK>
			>;
		};
	};
};
