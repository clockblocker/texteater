import type { SupportedLanguage } from "dumling/types";
import { deSubtree } from "./concrete-language/features/de/de-subtree.js";
import { enSubtree } from "./concrete-language/features/en/en-subtree.js";
import { heSubtree } from "./concrete-language/features/he/he-subtree.js";
import { buildDescriptorSchemas } from "./descriptor-schemas.js";
import type {
	RawEntitySchemaRegistry,
	SchemaRegistry,
} from "./shared/schema-helper-types.js";
import { wrapEntitySchemaTree } from "./shared/wrap-entity-schema-tree.js";

const entitySchemasByLanguage = {
	de: deSubtree,
	en: enSubtree,
	he: heSubtree,
} satisfies RawEntitySchemaRegistry;

const descriptorSchemasByLanguage = buildDescriptorSchemas(
	entitySchemasByLanguage,
);

export const schemasFor = {
	de: {
		descriptor: descriptorSchemasByLanguage.de,
		entity: wrapEntitySchemaTree(entitySchemasByLanguage.de),
	},
	en: {
		descriptor: descriptorSchemasByLanguage.en,
		entity: wrapEntitySchemaTree(entitySchemasByLanguage.en),
	},
	he: {
		descriptor: descriptorSchemasByLanguage.he,
		entity: wrapEntitySchemaTree(entitySchemasByLanguage.he),
	},
} satisfies SchemaRegistry;

export function getSchemaTreeFor<L extends SupportedLanguage>(
	language: L,
): SchemaRegistry[L] {
	return schemasFor[language];
}
