import type { z } from "zod/v3";
import { buildUnionSchema } from "../schemas/shared/builders.js";
import type {
	Lemma,
	Selection,
	SupportedLanguage,
	Surface,
} from "../types/public-types.js";
import type { LanguageApi } from "./api-shape.js";
import { buildConvertOperations } from "./shared/convert.js";
import { buildDescribeOperations } from "./shared/describe.js";
import { extractLemma } from "./shared/entity-accessors.js";
import { requireNonEmptyFeatureBag } from "./shared/feature-bags.js";
import { buildIdOperations } from "./shared/id.js";
import { parseWithSchema } from "./shared/parse-result.js";

type EntitySchemaTree = {
	Lemma: unknown;
	Selection: unknown;
	Surface: unknown;
};

type RuntimeSchemaSet<L extends SupportedLanguage> = {
	lemma: z.ZodType<Lemma<L>>;
	selection: z.ZodType<Selection<L>>;
	surface: z.ZodType<Surface<L>>;
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

function buildRuntimeSchemas<L extends SupportedLanguage>(
	schemaTree: EntitySchemaTree,
): RuntimeSchemaSet<L> {
	return {
		lemma: buildRuntimeUnion(schemaTree.Lemma),
		selection: buildRuntimeUnion(schemaTree.Selection),
		surface: buildRuntimeUnion(schemaTree.Surface),
	} as RuntimeSchemaSet<L>;
}

function buildCreateOperations<L extends SupportedLanguage>(
	language: L,
): LanguageApi<L>["create"] {
	type CreateOperations = LanguageApi<L>["create"];

	const createLemma: CreateOperations["lemma"] = (input) =>
		({
			language,
			canonicalLemma: input.canonicalLemma,
			lemmaKind: input.lemmaKind,
			lemmaSubKind: input.lemmaSubKind,
			inherentFeatures: input.inherentFeatures ?? {},
			meaningInEmojis: input.meaningInEmojis,
		}) as never;

	const createCitationSurface: CreateOperations["surface"]["citation"] = (
		input,
	) =>
		({
			language: input.lemma.language,
			normalizedFullSurface: input.normalizedFullSurface,
			surfaceKind: "Citation",
			surfaceFeatures: requireNonEmptyFeatureBag(
				input.surfaceFeatures,
				"surfaceFeatures",
			),
			lemma: input.lemma,
		}) as never;

	const createInflectionSurface: CreateOperations["surface"]["inflection"] = (
		input,
	) =>
		({
			language: input.lemma.language,
			normalizedFullSurface: input.normalizedFullSurface,
			surfaceKind: "Inflection",
			surfaceFeatures: requireNonEmptyFeatureBag(
				input.surfaceFeatures,
				"surfaceFeatures",
			),
			lemma: input.lemma,
			inflectionalFeatures: (
				input as typeof input & { inflectionalFeatures: unknown }
			).inflectionalFeatures,
		}) as never;

	const createSelection: CreateOperations["selection"] = (input) =>
		({
			language: input.surface.language,
			selectionFeatures: requireNonEmptyFeatureBag(
				input.selectionFeatures,
				"selectionFeatures",
			),
			spelledSelection: input.spelledSelection,
			surface: input.surface,
		}) as never;

	return {
		lemma: createLemma,
		surface: {
			citation: createCitationSurface,
			inflection: createInflectionSurface,
		},
		selection: createSelection,
	};
}

function buildParseOperations<L extends SupportedLanguage>(
	language: L,
	runtimeSchemas: RuntimeSchemaSet<L>,
): LanguageApi<L>["parse"] {
	return {
		lemma(input: unknown) {
			return parseWithSchema(language, runtimeSchemas.lemma, input);
		},
		surface(input: unknown) {
			return parseWithSchema(language, runtimeSchemas.surface, input);
		},
		selection(input: unknown) {
			return parseWithSchema(language, runtimeSchemas.selection, input);
		},
	};
}

export function buildLanguageApi<L extends SupportedLanguage>(
	language: L,
	schemaTree: { entity: EntitySchemaTree },
): LanguageApi<L> {
	const runtimeSchemas = buildRuntimeSchemas<L>(schemaTree.entity);
	const parse = buildParseOperations(language, runtimeSchemas);

	return {
		create: buildCreateOperations(language),
		convert: buildConvertOperations<L>(),
		describe: buildDescribeOperations<L>(),
		extract: {
			lemma: extractLemma as LanguageApi<L>["extract"]["lemma"],
		},
		id: buildIdOperations(language, parse),
		parse,
	};
}
