import { describe, expect, test } from "bun:test";
import { readingSchema } from "dumling/schema";

import {
	knowledgeChangeSchema,
	lexemeUnitShadowSchema,
	lexicalBreakdownSchema,
	lexicalUnitShadowSchema,
	morphemeReadingReferenceSchema,
	morphologicalTreeSchema,
	pendingSemanticRelationSchema,
	readingReferenceSchema,
	semanticRelationGraphEdgeSchema,
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
			semanticRelationGraphEdgeSchema.parse({
				source: " cafe\u0301 ",
				relation: "synonym",
				target: " b ",
			}),
		).toEqual({ source: "café", relation: "synonym", target: "b" });
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
