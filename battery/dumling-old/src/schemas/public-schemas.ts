import { type ZodType, z } from "zod";
import type { Reading, SupportedLanguage } from "../types.js";
import {
	compactEmojiSequencePattern,
	isCompactEmojiSequence,
	normalizeNfc,
	normalizeReadingLemma,
	trimString,
} from "../validation-semantics.js";
import { deSubtree } from "./concrete-language/features/de/de-subtree.js";
import { enSubtree } from "./concrete-language/features/en/en-subtree.js";
import { heSubtree } from "./concrete-language/features/he/he-subtree.js";
import { buildDescriptorSchemas } from "./descriptor-schemas.js";
import { buildUnionSchema } from "./shared/builders.js";
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

type LemmaSchemaRegistry = Record<string, Record<string, () => ZodType>>;

function concreteLemmaSchemas(): [ZodType, ...ZodType[]] {
	const leaves: ZodType[] = [];
	for (const language of Object.keys(schemasFor) as SupportedLanguage[]) {
		const registry = schemasFor[language].entity
			.Lemma as LemmaSchemaRegistry;
		for (const kinds of Object.values(registry)) {
			for (const schema of Object.values(kinds)) leaves.push(schema());
		}
	}

	const [first, ...rest] = leaves;
	if (first === undefined) {
		throw new Error(
			"Dumling exposes no Lemma routes for Reading validation.",
		);
	}
	return [first, ...rest];
}

/** Broad supported-language Lemma schema for Zod composition. */
export const anyLemmaSchema = z.preprocess(
	normalizeReadingLemma,
	z.lazy(() => buildUnionSchema(concreteLemmaSchemas())),
) as z.ZodType<Reading["lemma"]>;

const normalizedEmojiDescriptionSchema = z
	.string()
	.overwrite(trimString)
	.min(1)
	.overwrite(normalizeNfc)
	.regex(compactEmojiSequencePattern)
	.refine(isCompactEmojiSequence);

export function buildReadingSchemaFor<TLemma>(
	lemmaSchema: z.ZodType<TLemma>,
): z.ZodType<{ emojiDescription: string; lemma: TLemma }> {
	return z.strictObject({
		lemma: z.preprocess(normalizeReadingLemma, lemmaSchema),
		emojiDescription: normalizedEmojiDescriptionSchema,
	});
}

/** Canonical runtime schema for supported-language Reading values. */
export const readingSchema = z.lazy(() =>
	z.strictObject({
		lemma: anyLemmaSchema,
		emojiDescription: normalizedEmojiDescriptionSchema,
	}),
) as z.ZodType<Reading>;
