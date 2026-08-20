import { describe, expect, test } from "bun:test";
import { readingSchema } from "dumling/schema";

import {
	directSemanticRelationGraphEdgeSchema,
	directSemanticRelationSchema,
	knowledgeChangeSchema,
	lemmaReferenceSchema,
	lexemeUnitShadowSchema,
	lexicalBreakdownSchema,
	lexicalUnitShadowSchema,
	morphemeReadingReferenceSchema,
	morphologicalTreeSchema,
	pendingSemanticRelationSchema,
	readingReferenceSchema,
	semanticRelationGraphSchema,
	semanticRelationSchema,
	unitShadowSchema,
} from "../../src";
import {
	constructionReading,
	morphemeReading,
	morphologicalTree,
	nounReading,
	nounShadow,
	phrasemeReading,
	verbShadow,
} from "./fixtures";

describe("concrete Dumling-backed schemas", () => {
	test("re-exports Dumling's canonical Reading schema", () => {
		expect(readingReferenceSchema).toBe(readingSchema);
	});

	test("validates Reading references through concrete Lemma routes", () => {
		expect(readingReferenceSchema.parse(nounReading)).toEqual(nounReading);
		expect(
			readingReferenceSchema.parse({
				...nounReading,
				lemma: { ...nounReading.lemma, canonicalForm: " Haus " },
			}).lemma.canonicalForm,
		).toBe("Haus");
		expect(morphemeReadingReferenceSchema.parse(morphemeReading)).toEqual(
			morphemeReading,
		);
		for (const invalidEmojiDescription of ["plain prose", "😀😀😀😀😀"]) {
			expect(
				morphemeReadingReferenceSchema.safeParse({
					...morphemeReading,
					emojiDescription: invalidEmojiDescription,
				}).success,
			).toBe(false);
		}
		for (const nonMorpheme of [
			nounReading,
			phrasemeReading,
			constructionReading,
		]) {
			expect(
				morphemeReadingReferenceSchema.safeParse(nonMorpheme).success,
			).toBe(false);
		}
		expect(
			readingReferenceSchema.safeParse({
				...nounReading,
				lemma: { ...nounReading.lemma, kind: "NOT_A_ROUTE" },
			}).success,
		).toBe(false);
	});

	test("validates Lemma relation targets and rejects Reading values", () => {
		expect(lemmaReferenceSchema.parse(nounReading.lemma)).toEqual(
			nounReading.lemma,
		);
		expect(
			lemmaReferenceSchema.parse({
				...nounReading.lemma,
				canonicalForm: " Haus ",
			}).canonicalForm,
		).toBe("Haus");
		expect(lemmaReferenceSchema.safeParse(nounReading).success).toBe(false);
		expect(
			knowledgeChangeSchema.safeParse({
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [nounReading],
			}).success,
		).toBe(false);
	});

	test("validates concrete Unit Shadow Family/Kind combinations", () => {
		expect(unitShadowSchema.parse(nounShadow)).toEqual(nounShadow);
		expect(lexicalUnitShadowSchema.parse(nounShadow)).toEqual(nounShadow);
		expect(lexemeUnitShadowSchema.parse(nounShadow)).toEqual(nounShadow);
		expect(
			unitShadowSchema.safeParse({ ...nounShadow, kind: "Collocation" })
				.success,
		).toBe(false);
		expect(
			lexemeUnitShadowSchema.safeParse({
				language: "de",
				canonicalForm: "auf jeden Fall",
				family: "Phraseme",
				kind: "DiscourseFormula",
			}).success,
		).toBe(false);
	});
});

describe("pointer-only structured Knowledge", () => {
	test("accepts ordered trees with Morpheme Readings and lexical shadows", () => {
		expect(morphologicalTreeSchema.parse(morphologicalTree)).toEqual(
			morphologicalTree,
		);
	});

	test("rejects Lexeme Readings, Morpheme shadows, labels, and empty structures", () => {
		for (const value of [
			{
				root: {
					nodeKind: "structure",
					children: [
						{ nodeKind: "morphemeReading", reading: nounReading },
					],
				},
			},
			{
				root: {
					nodeKind: "structure",
					children: [
						{
							nodeKind: "unitShadow",
							unitShadow: {
								language: "de",
								canonicalForm: "ab",
								family: "Morpheme",
								kind: "Prefix",
							},
						},
					],
				},
			},
			{
				root: {
					nodeKind: "structure",
					operation: "compound",
					children: [
						{ nodeKind: "unitShadow", unitShadow: nounShadow },
					],
				},
			},
			{ root: { nodeKind: "structure", children: [] } },
		]) {
			expect(morphologicalTreeSchema.safeParse(value).success).toBe(
				false,
			);
		}
	});

	test("requires at least two Lexeme shadows and preserves repetition", () => {
		expect(
			lexicalBreakdownSchema.parse([nounShadow, nounShadow, verbShadow]),
		).toEqual([nounShadow, nounShadow, verbShadow]);
		expect(lexicalBreakdownSchema.safeParse([nounShadow]).success).toBe(
			false,
		);
		expect(
			lexicalBreakdownSchema.safeParse([
				nounShadow,
				{
					language: "de",
					canonicalForm: "auf jeden Fall",
					family: "Phraseme",
					kind: "DiscourseFormula",
				},
			]).success,
		).toBe(false);
	});
});

describe("boundary DTO schemas", () => {
	test("exposes the complete ordered Semantic Relation vocabulary", () => {
		expect(semanticRelationSchema.options).toEqual([
			"synonym",
			"nearSynonym",
			"antonym",
			"nearAntonym",
			"hypernym",
			"hyponym",
			"meronym",
			"holonym",
		]);
	});

	test("restricts durable direct claims to canonical direct orientations", () => {
		expect(directSemanticRelationSchema.options).toEqual([
			"synonym",
			"nearSynonym",
			"antonym",
			"nearAntonym",
			"hypernym",
			"holonym",
		]);
		for (const inferredOnly of ["hyponym", "meronym"]) {
			expect(
				pendingSemanticRelationSchema.safeParse({
					relation: inferredOnly,
					target: nounShadow,
				}).success,
			).toBe(false);
			expect(
				knowledgeChangeSchema.safeParse({
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: inferredOnly,
					value: [nounReading.lemma],
				}).success,
			).toBe(false);
		}
	});

	test("validates Pending Semantic Relations separately", () => {
		expect(
			pendingSemanticRelationSchema.parse({
				relation: "synonym",
				target: nounShadow,
			}),
		).toEqual({ relation: "synonym", target: nounShadow });
	});

	test("normalizes graph keys and strict Knowledge Changes", () => {
		expect(
			directSemanticRelationGraphEdgeSchema.parse({
				sourceReading: " cafe\u0301 ",
				relation: "synonym",
				targetLemma: " b ",
			}),
		).toEqual({
			sourceReading: "café",
			relation: "synonym",
			targetLemma: "b",
		});
		expect(
			semanticRelationGraphSchema.parse({
				readings: [{ reading: " a ", lemma: " la " }],
				edges: [
					{
						sourceReading: " a ",
						relation: "synonym",
						targetLemma: " lb ",
					},
				],
			}),
		).toEqual({
			readings: [{ reading: "a", lemma: "la" }],
			edges: [
				{
					sourceReading: "a",
					relation: "synonym",
					targetLemma: "lb",
				},
			],
		});
		expect(
			knowledgeChangeSchema.safeParse({
				kind: "Correct",
				aspect: "definition",
				value: "x",
				owner: nounReading,
			}).success,
		).toBe(false);
	});
});
