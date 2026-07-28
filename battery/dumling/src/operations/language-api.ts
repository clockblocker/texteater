import type { z } from "zod";
import { buildUnionSchema } from "../schemas/shared/builders.js";
import type {
	Lemma,
	Selection,
	SupportedLanguage,
	Surface,
} from "../types/public-types.js";
import type { LanguageApi } from "./api-shape.js";
import { buildConvertOperations } from "./shared/convert/convert.js";
import { buildCreateOperations } from "./shared/create/create.js";
import { buildDescribeOperations } from "./shared/describe/describe.js";
import { buildExtractOperations } from "./shared/extract/extract.js";
import { buildIdOperations } from "./shared/id/id.js";
import { buildParseOperations } from "./shared/parse/parse.js";

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

type SchemaGetter = () => z.ZodType;

function collectSchemaGetters(value: unknown): SchemaGetter[] {
	if (typeof value === "function") {
		return [value as SchemaGetter];
	}

	if (typeof value !== "object" || value === null) {
		return [];
	}

	return Object.values(value).flatMap(collectSchemaGetters);
}

function buildRuntimeUnion(value: unknown): z.ZodType {
	const schemas = collectSchemaGetters(value).map((getSchema) => getSchema());
	if (schemas.length === 0) {
		throw new Error("Cannot build runtime schema union from an empty tree");
	}

	return buildUnionSchema(schemas as [z.ZodType, ...z.ZodType[]]);
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
		extract: buildExtractOperations<L>(),
		id: buildIdOperations(language, parse),
		parse,
	};
}
