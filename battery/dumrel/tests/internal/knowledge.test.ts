import { describe, expect, test } from "bun:test";

import { applyKnowledgeChange } from "../../src";
import { readingKnowledgeSchema } from "../../src/schema";
import type {
	LexicalBreakdown,
	MorphologicalTree,
	ReadingKnowledge,
} from "../../src/types";
import {
	morphologicalTree,
	nounReading,
	nounShadow,
	secondNounReading,
	verbShadow,
} from "./fixtures";

describe("Knowledge schemas", () => {
	test("accepts normalized Reading Knowledge and its empty value", () => {
		expect(readingKnowledgeSchema.parse({})).toEqual({});
		expect(
			readingKnowledgeSchema.parse({
				transcription: " haʊs ",
				definition: " building ",
				translations: { de: [" Haus "] },
			}),
		).toEqual({
			transcription: "haʊs",
			definition: "building",
			translations: { de: ["Haus"] },
		});
	});

	test("strict schema rejects the removed transcription shape", () => {
		expect(
			readingKnowledgeSchema.safeParse({
				transcriptions: { en: ["house"] },
				definition: "building",
			}).success,
		).toBe(false);
	});

	test("rejects pending relations and unknown owner data in Reading Knowledge", () => {
		expect(
			readingKnowledgeSchema.safeParse({
				semanticRelations: {
					synonym: [{ relation: "synonym", target: nounShadow }],
				},
			}).success,
		).toBe(false);
		expect(
			readingKnowledgeSchema.safeParse({
				owner: nounReading,
				definition: "x",
			}).success,
		).toBe(false);
	});

	test("accepts explicit Reading targets without weakening the Lemma default", () => {
		expect(
			readingKnowledgeSchema.parse({
				semanticRelations: { synonym: [nounReading.lemma] },
			}),
		).toEqual({
			semanticRelations: { synonym: [nounReading.lemma] },
		});
		expect(
			readingKnowledgeSchema.safeParse({
				semanticRelations: { synonym: [nounReading] },
			}).success,
		).toBe(false);
		expect(
			readingKnowledgeSchema.parse({
				semanticRelations: {
					targetKind: "reading",
					synonym: [nounReading],
				},
			}),
		).toEqual({
			semanticRelations: {
				targetKind: "reading",
				synonym: [nounReading],
			},
		});
		expect(
			readingKnowledgeSchema.safeParse({
				semanticRelations: {
					targetKind: "reading",
					antonym: [nounReading],
				},
			}).success,
		).toBe(false);
	});
});

describe("applyKnowledgeChange", () => {
	test("contributes, normalizes, and exact-deduplicates language buckets", () => {
		const existing: ReadingKnowledge<"en"> = {
			translations: { en: ["café", "home"] },
		};
		const result = applyKnowledgeChange(existing, {
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: [" cafe\u0301 ", "dwelling", "dwelling"],
		});

		expect(result).toEqual({
			translations: { en: ["café", "home", "dwelling"] },
		});
		expect(existing).toEqual({ translations: { en: ["café", "home"] } });
		expect(result).not.toBe(existing);
		expect(result.translations).not.toBe(existing.translations);
		expect(Object.isFrozen(result)).toBe(false);
	});

	test("corrects and retracts the singular transcription", () => {
		const existing: ReadingKnowledge = { transcription: "house" };
		const corrected = applyKnowledgeChange(existing, {
			kind: "Correct",
			aspect: "transcription",
			value: " haʊs ",
		});
		expect(corrected).toEqual({ transcription: "haʊs" });
		expect(
			applyKnowledgeChange(corrected, {
				kind: "Retract",
				aspect: "transcription",
			}),
		).toEqual({});
		expect(
			applyKnowledgeChange(
				{},
				{
					kind: "Retract",
					aspect: "transcription",
				},
			),
		).toEqual({});
	});

	test("requires Correct for a conflicting atomic Contribute change", () => {
		const original: MorphologicalTree = morphologicalTree;
		const alternative: MorphologicalTree = {
			root: {
				nodeKind: "structure",
				children: [{ nodeKind: "unitShadow", unitShadow: verbShadow }],
			},
		};
		const existing = applyKnowledgeChange(undefined, {
			kind: "Contribute",
			aspect: "morphologicalTree",
			value: original,
		});
		expect(
			applyKnowledgeChange(existing, {
				kind: "Contribute",
				aspect: "morphologicalTree",
				value: original,
			}).morphologicalTree,
		).toEqual(original);
		expect(() =>
			applyKnowledgeChange(existing, {
				kind: "Contribute",
				aspect: "morphologicalTree",
				value: alternative,
			}),
		).toThrow("morphologicalTree");
		expect(
			applyKnowledgeChange(existing, {
				kind: "Correct",
				aspect: "morphologicalTree",
				value: alternative,
			}).morphologicalTree,
		).toEqual(alternative);
	});

	test("corrects, retracts, and idempotently retracts singular aspects", () => {
		const corrected = applyKnowledgeChange(
			{ definition: "old", translations: { en: ["house"] } },
			{ kind: "Correct", aspect: "definition", value: " new " },
		);
		expect(corrected).toEqual({
			definition: "new",
			translations: { en: ["house"] },
		});
		const retracted = applyKnowledgeChange(corrected, {
			kind: "Retract",
			aspect: "definition",
		});
		expect(retracted).toEqual({ translations: { en: ["house"] } });
		expect(
			applyKnowledgeChange(retracted, {
				kind: "Retract",
				aspect: "definition",
			}),
		).toEqual(retracted);
	});

	test("preserves Lexical Breakdown order/repetition as one atomic value", () => {
		const breakdown: LexicalBreakdown = [
			nounShadow,
			nounShadow,
			verbShadow,
		];
		const result = applyKnowledgeChange(undefined, {
			kind: "Contribute",
			aspect: "lexicalBreakdown",
			value: breakdown,
		});
		expect(result.lexicalBreakdown).toEqual(breakdown);
		expect(result.lexicalBreakdown).not.toBe(breakdown);
	});

	test("deduplicates Semantic Relation buckets by normalized concrete values", () => {
		const sameDescriptorDifferentIdentity = {
			...nounReading.lemma,
			coreFeatures: { gender: "Masc", hyph: null },
		} as const;
		const contributed = applyKnowledgeChange(undefined, {
			kind: "Contribute",
			aspect: "semanticRelations",
			relation: "synonym",
			value: [
				nounReading.lemma,
				{ ...nounReading.lemma, canonicalForm: " Haus " },
				sameDescriptorDifferentIdentity,
				secondNounReading.lemma,
			],
		});
		expect(contributed.semanticRelations?.synonym).toHaveLength(3);
		expect(contributed.semanticRelations?.synonym).toContainEqual(
			sameDescriptorDifferentIdentity,
		);
		const corrected = applyKnowledgeChange(contributed, {
			kind: "Correct",
			aspect: "semanticRelations",
			relation: "synonym",
			value: [secondNounReading.lemma, secondNounReading.lemma],
		});
		expect(corrected.semanticRelations?.synonym).toEqual([
			secondNounReading.lemma,
		]);
		expect(
			applyKnowledgeChange(corrected, {
				kind: "Retract",
				aspect: "semanticRelations",
				relation: "synonym",
			}),
		).toEqual({});
	});

	test("keeps one target mode for the whole Semantic Relation container", () => {
		const readingTargeted = applyKnowledgeChange(undefined, {
			kind: "Contribute",
			aspect: "semanticRelations",
			relation: "synonym",
			targetKind: "reading",
			value: [nounReading, nounReading],
		});
		expect(readingTargeted.semanticRelations).toEqual({
			targetKind: "reading",
			synonym: [nounReading],
		});
		expect(() =>
			applyKnowledgeChange(readingTargeted, {
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [secondNounReading.lemma],
			}),
		).toThrow("cannot mix");
	});
});
