import type { z } from "zod/v3";
import type { SupportedLanguage } from "../types/core/enums";

export type LanguageTypePack<L extends SupportedLanguage = SupportedLanguage> =
	{
		lemma: { language: L };
		surface: { language: L };
		selection: { language: L };
	};

export type RuntimeSchemaSet<TPack extends LanguageTypePack> = {
	lemma: z.ZodType<TPack["lemma"]>;
	surface: z.ZodType<TPack["surface"]>;
	selection: z.ZodType<TPack["selection"]>;
};

export type ImplementedLanguagePackDescriptor<
	L extends SupportedLanguage,
	TPack extends LanguageTypePack<L>,
	TSchemaTree = unknown,
	TCreate = unknown,
	TParse = unknown,
> = {
	create: TCreate;
	language: L;
	parse: TParse;
	runtimeSchemas: RuntimeSchemaSet<TPack>;
	schema: TSchemaTree;
	status: "implemented";
};
