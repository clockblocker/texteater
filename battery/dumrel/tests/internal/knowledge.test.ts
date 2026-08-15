import { describe, expect, test } from "bun:test";

import {
	applyKnowledgeChange,
	lemmaKnowledgeSchema,
	readingKnowledgeSchema,
} from "../../src";
import type {
	LemmaKnowledge,
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
	test("accept owner-specific values and each empty owner value", () => {
		expect(lemmaKnowledgeSchema.parse({})).toEqual({});
		expect(readingKnowledgeSchema.parse({})).toEqual({});
		expect(
			lemmaKnowledgeSchema.parse({ transcriptions: { en: [" house "] } }),
		).toEqual({ transcriptions: { en: ["house"] } });
		expect(
			readingKnowledgeSchema.parse({
				definition: " building ",
				translations: { de: [" Haus "] },
			}),
		).toEqual({ definition: "building", translations: { de: ["Haus"] } });
	});

	test("strict owner schemas reject aspects from the other owner", () => {
		expect(
			lemmaKnowledgeSchema.safeParse({
				transcriptions: { en: ["house"] },
				definition: "building",
			}).success,
		).toBe(false);
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

	test("corrects and retracts complete language buckets", () => {
		const existing: LemmaKnowledge<"en" | "de"> = {
			transcriptions: { en: ["house"], de: ["Haus"] },
		};
		const corrected = applyKnowledgeChange(existing, {
			kind: "Correct",
			aspect: "transcriptions",
			language: "en",
			value: ["haʊs", "haʊs"],
		});
		expect(corrected).toEqual({
			transcriptions: { en: ["haʊs"], de: ["Haus"] },
		});
		expect(
			applyKnowledgeChange(corrected, {
				kind: "Retract",
				aspect: "transcriptions",
				language: "en",
			}),
		).toEqual({ transcriptions: { de: ["Haus"] } });
		expect(
			applyKnowledgeChange(
				{ transcriptions: { en: ["haʊs"] } },
				{
					kind: "Retract",
					aspect: "transcriptions",
					language: "en",
				},
			),
		).toEqual({});
	});

	test("requires Correct for a conflicting atomic contribution", () => {
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
		const contributed = applyKnowledgeChange(undefined, {
			kind: "Contribute",
			aspect: "semanticRelations",
			relation: "synonym",
			value: [nounReading, { ...nounReading }, secondNounReading],
		});
		expect(contributed.semanticRelations?.synonym).toHaveLength(2);
		const corrected = applyKnowledgeChange(contributed, {
			kind: "Correct",
			aspect: "semanticRelations",
			relation: "synonym",
			value: [secondNounReading, secondNounReading],
		});
		expect(corrected.semanticRelations?.synonym).toEqual([
			secondNounReading,
		]);
		expect(
			applyKnowledgeChange(corrected, {
				kind: "Retract",
				aspect: "semanticRelations",
				relation: "synonym",
			}),
		).toEqual({});
	});
});
