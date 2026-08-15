import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
	admitsLexicalBreakdown,
	lexicalBreakdownSchemasFor,
	mergeReadingKnowledge,
	morphologicalTreeSchemasFor,
	readingKnowledgeSchemasFor,
	unitShadowSchema,
} from "../../src";

const readingSchema = z.strictObject({
	lemma: z.strictObject({
		language: z.literal("de"),
		canonicalForm: z.string().min(1),
		family: z.literal("Morpheme"),
		kind: z.string().min(1),
		coreFeatures: z.record(z.string(), z.unknown()),
	}),
	emojiDescription: z.string().min(1),
});

const morphology = morphologicalTreeSchemasFor({
	morphemeReading: readingSchema,
	unitShadow: unitShadowSchema,
});
const lexical = lexicalBreakdownSchemasFor(unitShadowSchema);

const lexicalShadow = (
	canonicalForm: string,
	kind: "ADV" | "CCONJ" | "NOUN" | "PRON" | "VERB" = "NOUN",
) => ({
	language: "de" as const,
	canonicalForm,
	family: "Lexeme" as const,
	kind,
});
const morphemeReading = (canonicalForm: string, kind: string) => ({
	lemma: {
		language: "de" as const,
		canonicalForm,
		family: "Morpheme" as const,
		kind,
		coreFeatures: {},
	},
	emojiDescription: "🧩",
});
const unitShadowNode = (
	canonicalForm: string,
	kind: "NOUN" | "VERB" = "NOUN",
) => ({
	nodeKind: "unitShadow" as const,
	unitShadow: lexicalShadow(canonicalForm, kind),
});

describe("Morphological Tree contract", () => {
	test("stores only hierarchy, lexical shadows, and Morpheme Readings", () => {
		const value = {
			root: {
				nodeKind: "structure" as const,
				children: [
					{
						nodeKind: "morphemeReading" as const,
						reading: morphemeReading("ent-", "Prefix"),
					},
					unitShadowNode("spannen", "VERB"),
				],
			},
		};

		expect(morphology.valueSchema.parse(value)).toEqual(value);
	});

	test("preserves composition through ordered nesting only", () => {
		const value = {
			root: {
				nodeKind: "structure" as const,
				children: [
					unitShadowNode("Kohle"),
					{
						nodeKind: "structure" as const,
						children: [
							unitShadowNode("Kraft"),
							unitShadowNode("Werk"),
						],
					},
				],
			},
		};

		expect(morphology.valueSchema.parse(value)).toEqual(value);
	});

	test("rejects redundant analysis labels and unresolved Morpheme shadows", () => {
		const labelled = {
			root: {
				nodeKind: "structure",
				operation: "compound",
				children: [
					{
						role: "head",
						node: unitShadowNode("Kraftwerk"),
					},
				],
			},
		};
		const unresolvedMorpheme = {
			root: {
				nodeKind: "structure",
				children: [
					{
						nodeKind: "unitShadow",
						unitShadow: {
							language: "de",
							canonicalForm: "ent-",
							family: "Morpheme",
							kind: "Prefix",
						},
					},
				],
			},
		};

		expect(morphology.valueSchema.safeParse(labelled).success).toBe(false);
		expect(
			morphology.valueSchema.safeParse(unresolvedMorpheme).success,
		).toBe(false);
	});
});

describe("Lexical Breakdown contract", () => {
	test("is only an ordered list of Lexeme Unit Shadows", () => {
		const so = lexicalShadow("so", "ADV");
		const value = [so, lexicalShadow("oder", "CCONJ"), so];

		expect(lexical.valueSchema.parse(value)).toEqual(value);
	});

	test("rejects component metadata, Readings, and non-Lexeme shadows", () => {
		expect(
			lexical.valueSchema.safeParse([
				{ role: "content", unitShadow: lexicalShadow("so", "ADV") },
				lexicalShadow("oder", "CCONJ"),
			]).success,
		).toBe(false);
		expect(
			lexical.valueSchema.safeParse([
				morphemeReading("so", "Root"),
				lexicalShadow("oder", "CCONJ"),
			]).success,
		).toBe(false);
		expect(
			lexical.valueSchema.safeParse([
				{
					language: "de",
					canonicalForm: "in Betracht ziehen",
					family: "Phraseme",
					kind: "Collocation",
				},
				lexicalShadow("ziehen", "VERB"),
			]).success,
		).toBe(false);
	});

	test("admits every Phraseme and only selected Lexeme VERB owners", () => {
		expect(
			admitsLexicalBreakdown({ family: "Phraseme", kind: "Idiom" }),
		).toBe(true);
		expect(admitsLexicalBreakdown({ family: "Lexeme", kind: "VERB" })).toBe(
			true,
		);
		expect(admitsLexicalBreakdown({ family: "Lexeme", kind: "NOUN" })).toBe(
			false,
		);
	});

	test("validates admission against the supplied Reading owner", () => {
		const schemas = readingKnowledgeSchemasFor({
			morphemeReading: readingSchema,
			semanticReading: readingSchema,
			unitShadow: unitShadowSchema,
		});
		const ownerSchema = z.strictObject({
			lemma: z.strictObject({ family: z.string(), kind: z.string() }),
		});
		const breakdown = [
			lexicalShadow("sich", "PRON"),
			lexicalShadow("erinnern", "VERB"),
		];
		const ownedSchema = schemas.ownedValueSchemaFor(ownerSchema);

		expect(
			ownedSchema.safeParse({
				owner: { lemma: { family: "Lexeme", kind: "NOUN" } },
				knowledge: { lexicalBreakdown: breakdown },
			}).success,
		).toBe(false);
		expect(
			ownedSchema.safeParse({
				owner: { lemma: { family: "Lexeme", kind: "VERB" } },
				knowledge: { lexicalBreakdown: breakdown },
			}).success,
		).toBe(true);
	});
});

describe("Unit Shadow grammar", () => {
	test("derives language-specific Family/Kind validity from Dumling", () => {
		expect(
			unitShadowSchema.safeParse({
				language: "de",
				canonicalForm: "eine Rolle spielen",
				family: "Phraseme",
				kind: "Collocation",
			}).success,
		).toBe(true);
		expect(
			unitShadowSchema.safeParse({
				language: "en",
				canonicalForm: "play a role",
				family: "Phraseme",
				kind: "Collocation",
			}).success,
		).toBe(false);
	});
});

describe("Knowledge Contribution merge", () => {
	test("preserves omitted pointer aspects and accepts identical contributions", () => {
		const tree = {
			root: {
				nodeKind: "structure" as const,
				children: [
					unitShadowNode("Kohle"),
					unitShadowNode("Kraftwerk"),
				],
			},
		};
		const existing = mergeReadingKnowledge(undefined, {
			morphologicalTree: tree,
		});
		const merged = mergeReadingKnowledge(existing, {
			morphologicalTree: tree,
			translations: [{ targetLanguage: "en", text: "coal power plant" }],
		});

		expect(merged.morphologicalTree).toEqual(tree);
		expect(merged.translations).toHaveLength(1);
		expect(Object.isFrozen(merged)).toBe(true);
	});

	test("requires explicit correction for a different pointer value", () => {
		const first = [
			lexicalShadow("sich", "PRON"),
			lexicalShadow("erinnern", "VERB"),
		];
		const existing = mergeReadingKnowledge(undefined, {
			lexicalBreakdown: first,
		});

		expect(() =>
			mergeReadingKnowledge(existing, {
				lexicalBreakdown: [
					lexicalShadow("mich", "PRON"),
					lexicalShadow("erinnern", "VERB"),
				],
			}),
		).toThrow("explicit correction");
	});

	test("accumulates the complete Reading Knowledge aggregate", () => {
		const target = morphemeReading("-bar", "Suffix");
		const first = mergeReadingKnowledge(undefined, {
			definition: "capable of being acted upon",
			translations: [{ targetLanguage: "de", text: "-bar" }],
			semanticRelations: { synonym: [target] },
		});
		const merged = mergeReadingKnowledge(first, {
			translations: [
				{ targetLanguage: "de", text: "-bar" },
				{ targetLanguage: "he", text: "ניתן ל־" },
			],
			semanticRelations: { synonym: [target], nearSynonym: [target] },
		});

		expect(merged.definition).toBe("capable of being acted upon");
		expect(merged.translations).toHaveLength(2);
		expect(merged.semanticRelations?.synonym).toHaveLength(1);
		expect(merged.semanticRelations?.nearSynonym).toHaveLength(1);
	});
});
