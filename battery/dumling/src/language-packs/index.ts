import type { z } from "zod/v3";
import { buildDeCreateOperations } from "../operations/lang/de/create";
import { buildDeParseOperations } from "../operations/lang/de/parse";
import { buildEnCreateOperations } from "../operations/lang/en/create";
import { buildEnParseOperations } from "../operations/lang/en/parse";
import { buildHeCreateOperations } from "../operations/lang/he/create";
import { buildHeParseOperations } from "../operations/lang/he/parse";
import { schemasFor } from "../schema";
import { buildUnionSchema } from "../schemas/shared/builders";
import type { LanguageApi } from "../types/public-types";
import type {
	ImplementedLanguagePackDescriptor,
	RuntimeSchemaSet,
} from "./contracts";
import type { LanguageTypePackMap } from "./type-packs";

type LanguagePackSchemaTreeMap = {
	de: (typeof schemasFor)["de"];
	en: (typeof schemasFor)["en"];
	he: (typeof schemasFor)["he"];
};

type SchemaGetter = () => z.ZodTypeAny;

function collectSchemaGetters(value: unknown): SchemaGetter[] {
	if (typeof value === "function") {
		return [value as SchemaGetter];
	}

	if (typeof value !== "object" || value === null) {
		return [];
	}

	return Object.values(value).flatMap(collectSchemaGetters);
}

function buildRuntimeUnion(value: unknown): z.ZodTypeAny {
	const schemas = collectSchemaGetters(value).map((getSchema) => getSchema());
	if (schemas.length === 0) {
		throw new Error("Cannot build runtime schema union from an empty tree");
	}

	return buildUnionSchema(schemas as [z.ZodTypeAny, ...z.ZodTypeAny[]]);
}

function buildRuntimeSchemas<
	TPack extends LanguageTypePackMap[keyof LanguageTypePackMap],
>(schemaTree: {
	entity: {
		Lemma: unknown;
		Selection: unknown;
		Surface: unknown;
	};
}): RuntimeSchemaSet<TPack> {
	return {
		lemma: buildRuntimeUnion(schemaTree.entity.Lemma),
		surface: buildRuntimeUnion(schemaTree.entity.Surface),
		selection: buildRuntimeUnion(schemaTree.entity.Selection),
	} as RuntimeSchemaSet<TPack>;
}

const deRuntimeSchemas = buildRuntimeSchemas<LanguageTypePackMap["de"]>(
	schemasFor.de,
);

const enRuntimeSchemas = buildRuntimeSchemas<LanguageTypePackMap["en"]>(
	schemasFor.en,
);

const heRuntimeSchemas = buildRuntimeSchemas<LanguageTypePackMap["he"]>(
	schemasFor.he,
);

const deLanguagePack: ImplementedLanguagePackDescriptor<
	"de",
	LanguageTypePackMap["de"],
	LanguagePackSchemaTreeMap["de"],
	LanguageApi<"de">["create"],
	LanguageApi<"de">["parse"]
> = {
	create: buildDeCreateOperations(),
	language: "de",
	parse: buildDeParseOperations(
		deRuntimeSchemas,
	) as LanguageApi<"de">["parse"],
	runtimeSchemas: deRuntimeSchemas,
	schema: schemasFor.de,
	status: "implemented",
};

const enLanguagePack: ImplementedLanguagePackDescriptor<
	"en",
	LanguageTypePackMap["en"],
	LanguagePackSchemaTreeMap["en"],
	LanguageApi<"en">["create"],
	LanguageApi<"en">["parse"]
> = {
	create: buildEnCreateOperations(),
	language: "en",
	parse: buildEnParseOperations(
		enRuntimeSchemas,
	) as LanguageApi<"en">["parse"],
	runtimeSchemas: enRuntimeSchemas,
	schema: schemasFor.en,
	status: "implemented",
};

const heLanguagePack: ImplementedLanguagePackDescriptor<
	"he",
	LanguageTypePackMap["he"],
	LanguagePackSchemaTreeMap["he"],
	LanguageApi<"he">["create"],
	LanguageApi<"he">["parse"]
> = {
	create: buildHeCreateOperations(),
	language: "he",
	parse: buildHeParseOperations(
		heRuntimeSchemas,
	) as LanguageApi<"he">["parse"],
	runtimeSchemas: heRuntimeSchemas,
	schema: schemasFor.he,
	status: "implemented",
};

type ImplementedLanguagePacks = {
	de: typeof deLanguagePack;
	en: typeof enLanguagePack;
	he: typeof heLanguagePack;
};

const languagePacksInternal: ImplementedLanguagePacks = {
	de: deLanguagePack,
	en: enLanguagePack,
	he: heLanguagePack,
};

export const languagePacks: typeof languagePacksInternal =
	languagePacksInternal;
