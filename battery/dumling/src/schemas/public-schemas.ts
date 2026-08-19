import type { Reading, SupportedLanguage } from "dumling/types";
import emojiRegex from "emoji-regex";
import { type ZodType, z } from "zod";
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

const MAX_EMOJI_GRAPHEMES = 4;
const emojiPatternSource = emojiRegex().source;
const compactEmojiSequencePattern = new RegExp(
	`^(?:${emojiPatternSource}){1,${MAX_EMOJI_GRAPHEMES}}$`,
);
const singleEmojiPattern = new RegExp(`^(?:${emojiPatternSource})$`);
const standaloneEmojiModifierPattern = /^\p{Emoji_Modifier}$/u;
const graphemeSegmenter = new Intl.Segmenter(undefined, {
	granularity: "grapheme",
});

function isCompactEmojiSequence(value: string): boolean {
	const graphemes = [...graphemeSegmenter.segment(value)];
	return (
		graphemes.length <= MAX_EMOJI_GRAPHEMES &&
		graphemes.every(
			({ segment }) =>
				singleEmojiPattern.test(segment) &&
				!standaloneEmojiModifierPattern.test(segment),
		)
	);
}

const normalizedEmojiDescriptionSchema = z
	.string()
	.trim()
	.min(1)
	.overwrite((value) => value.normalize("NFC"))
	.regex(compactEmojiSequencePattern)
	.refine(isCompactEmojiSequence);

function normalizeLemmaCanonicalForm(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	const canonicalForm = Reflect.get(value, "canonicalForm");
	if (typeof canonicalForm !== "string") return value;
	return {
		...value,
		canonicalForm: canonicalForm.trim().normalize("NFC"),
	};
}

/** Canonical runtime schema for supported-language Reading values. */
export const readingSchema = z.lazy(() =>
	z.strictObject({
		lemma: z.preprocess(
			normalizeLemmaCanonicalForm,
			buildUnionSchema(concreteLemmaSchemas()),
		),
		emojiDescription: normalizedEmojiDescriptionSchema,
	}),
) as z.ZodType<Reading>;
