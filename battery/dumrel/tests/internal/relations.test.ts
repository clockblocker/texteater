import { describe, expect, test } from "bun:test";

import {
	inverseRelationFor,
	propagateRelations,
	semanticRelationValues,
} from "../../src";

describe("inverseRelationFor", () => {
	test("covers all seven Semantic Relations", () => {
		const expected = {
			synonym: "synonym",
			nearSynonym: "nearSynonym",
			antonym: "antonym",
			hypernym: "hyponym",
			hyponym: "hypernym",
			meronym: "holonym",
			holonym: "meronym",
		} as const;
		for (const relation of semanticRelationValues) {
			expect(inverseRelationFor(relation)).toBe(expected[relation]);
		}
	});
});

describe("propagateRelations", () => {
	test("returns only sorted newly inferred symmetric edges", () => {
		expect(
			propagateRelations([
				{ source: " b ", relation: "antonym", target: "a" },
				{ source: "b", relation: "antonym", target: "a" },
				{ source: "d", relation: "nearSynonym", target: "c" },
			]),
		).toEqual([
			{ source: "a", relation: "antonym", target: "b" },
			{ source: "c", relation: "nearSynonym", target: "d" },
		]);
	});

	test("computes Hypernym and Hyponym transitivity without inferring inverses", () => {
		for (const relation of ["hypernym", "hyponym"] as const) {
			expect(
				propagateRelations([
					{ source: "a", relation, target: "b" },
					{ source: "b", relation, target: "c" },
				]),
			).toEqual([{ source: "a", relation, target: "c" }]);
		}
	});

	test("substitutes exact Synonyms at both endpoints for all relation kinds", () => {
		for (const relation of semanticRelationValues) {
			const inferred = propagateRelations([
				{ source: "a", relation: "synonym", target: "a2" },
				{ source: "b", relation: "synonym", target: "b2" },
				{ source: "a", relation, target: "b" },
			]);
			expect(inferred).toContainEqual({
				source: "a2",
				relation,
				target: "b2",
			});
		}
		const meronymOnly = propagateRelations([
			{ source: "a", relation: "meronym", target: "b" },
		]);
		expect(meronymOnly).not.toContainEqual({
			source: "b",
			relation: "holonym",
			target: "a",
		});
	});

	test("terminates cycles, deduplicates, and filters derived self-edges", () => {
		const inferred = propagateRelations([
			{ source: "a", relation: "synonym", target: "b" },
			{ source: "b", relation: "synonym", target: "c" },
			{ source: "c", relation: "synonym", target: "a" },
			{ source: "a", relation: "synonym", target: "b" },
		]);
		expect(inferred.every((edge) => edge.source !== edge.target)).toBe(
			true,
		);
		expect(new Set(inferred.map((edge) => JSON.stringify(edge))).size).toBe(
			inferred.length,
		);
		expect(inferred).toContainEqual({
			source: "b",
			relation: "synonym",
			target: "a",
		});
	});

	test("does not treat Near Synonym, Antonym, Meronym, or Holonym as transitive", () => {
		for (const relation of [
			"nearSynonym",
			"antonym",
			"meronym",
			"holonym",
		] as const) {
			const inferred = propagateRelations([
				{ source: "a", relation, target: "b" },
				{ source: "b", relation, target: "c" },
			]);
			expect(inferred).not.toContainEqual({
				source: "a",
				relation,
				target: "c",
			});
		}
	});
});
