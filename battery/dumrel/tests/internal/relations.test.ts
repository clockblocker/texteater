import { describe, expect, test } from "bun:test";
import {
	directSemanticRelationValues,
	inverseRelationFor,
	ParsingError,
	projectRelations,
	propagateRelations,
	semanticRelationValues,
} from "../../src";
import type { SemanticRelationGraph } from "../../src/types";

const readings = [
	{ reading: "a", lemma: "la" },
	{ reading: "a2", lemma: "la2" },
	{ reading: "b", lemma: "lb" },
	{ reading: "b2", lemma: "lb2" },
	{ reading: "c", lemma: "lc" },
] satisfies SemanticRelationGraph["readings"];

describe("inverseRelationFor", () => {
	test("covers all eight Semantic Relations", () => {
		const expected = {
			synonym: "synonym",
			nearSynonym: "nearSynonym",
			antonym: "antonym",
			nearAntonym: "nearAntonym",
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

test("the compatibility root retains structured validation failures", () => {
	expect(() =>
		projectRelations({ readings: [], edges: [], extra: true } as never),
	).toThrow(ParsingError);
});

describe("propagateRelations", () => {
	test("projects stable deduplicated direct and inferred provenance", () => {
		const graph = {
			readings: [
				{ reading: "a", lemma: "la" },
				{ reading: "b", lemma: "lb" },
			],
			edges: [
				{ sourceReading: "a", relation: "hypernym", targetLemma: "lb" },
				{ sourceReading: "a", relation: "hypernym", targetLemma: "lb" },
			],
		} satisfies SemanticRelationGraph;
		expect(projectRelations(graph)).toEqual([
			{
				sourceReading: "a",
				relation: "hypernym",
				targetLemma: "lb",
				provenance: "direct",
			},
			{
				sourceReading: "b",
				relation: "hyponym",
				targetLemma: "la",
				provenance: "inferred",
			},
		]);
		expect(projectRelations(graph)).toEqual(projectRelations(graph));
		expect(projectRelations({ ...graph, edges: [] })).toEqual([]);
	});

	test("fans each direct edge out to current target-Lemma Readings with its inverse kind", () => {
		expect(
			propagateRelations({
				readings: [
					{ reading: "a", lemma: "la" },
					{ reading: "b2", lemma: "lb" },
					{ reading: "b1", lemma: "lb" },
				],
				edges: [
					{
						sourceReading: " a ",
						relation: "hypernym",
						targetLemma: " lb ",
					},
				],
			}),
		).toEqual([
			{ sourceReading: "b1", relation: "hyponym", targetLemma: "la" },
			{ sourceReading: "b2", relation: "hyponym", targetLemma: "la" },
		]);
	});

	test("closes exact Synonym chains transitively and symmetrically", () => {
		const inferred = propagateRelations({
			readings,
			edges: [
				{ sourceReading: "a", relation: "synonym", targetLemma: "lb" },
				{ sourceReading: "b", relation: "synonym", targetLemma: "lc" },
			],
		});
		expect(inferred).toContainEqual({
			sourceReading: "a",
			relation: "synonym",
			targetLemma: "lc",
		});
		expect(inferred).toContainEqual({
			sourceReading: "c",
			relation: "synonym",
			targetLemma: "la",
		});
	});

	test("keeps Reading-targeted Synonyms exact", () => {
		const projected = projectRelations({
			readings: [
				{ reading: "a", lemma: "la", relationTargetKind: "reading" },
				{ reading: "b", lemma: "lb", relationTargetKind: "reading" },
				{ reading: "b2", lemma: "lb" },
			],
			edges: [
				{
					sourceReading: "a",
					relation: "synonym",
					targetKind: "reading",
					targetReading: "b",
				},
			],
		});
		expect(projected).toContainEqual({
			sourceReading: "a",
			relation: "synonym",
			targetKind: "reading",
			targetReading: "b",
			provenance: "direct",
		});
		expect(projected).toContainEqual({
			sourceReading: "b",
			relation: "synonym",
			targetKind: "reading",
			targetReading: "a",
			provenance: "inferred",
		});
		expect(
			projected.some(
				(edge) =>
					edge.targetKind === "reading" &&
					edge.targetReading === "b2",
			),
		).toBe(false);
	});

	test("substitutes exact Synonyms at both endpoints for substitutive relation kinds", () => {
		for (const relation of directSemanticRelationValues.filter(
			(relation) => relation !== "nearAntonym",
		)) {
			const inferred = propagateRelations({
				readings,
				edges: [
					{
						sourceReading: "a",
						relation: "synonym",
						targetLemma: "la2",
					},
					{
						sourceReading: "b",
						relation: "synonym",
						targetLemma: "lb2",
					},
					{ sourceReading: "a", relation, targetLemma: "lb" },
				],
			});
			expect(inferred).toContainEqual({
				sourceReading: "a2",
				relation,
				targetLemma: "lb2",
			});
		}
	});

	test("keeps Near Antonym symmetric, non-transitive, and non-substitutive", () => {
		const inferred = propagateRelations({
			readings,
			edges: [
				{ sourceReading: "a", relation: "synonym", targetLemma: "la2" },
				{
					sourceReading: "a",
					relation: "nearAntonym",
					targetLemma: "lb",
				},
				{
					sourceReading: "b",
					relation: "nearAntonym",
					targetLemma: "lc",
				},
			],
		});
		expect(inferred).toContainEqual({
			sourceReading: "b",
			relation: "nearAntonym",
			targetLemma: "la",
		});
		expect(inferred).not.toContainEqual({
			sourceReading: "a2",
			relation: "nearAntonym",
			targetLemma: "lb",
		});
		expect(inferred).not.toContainEqual({
			sourceReading: "a",
			relation: "nearAntonym",
			targetLemma: "lc",
		});
	});

	test("does not make hierarchy or other non-Synonym kinds transitive", () => {
		for (const relation of [
			"nearSynonym",
			"antonym",
			"nearAntonym",
			"hypernym",
			"holonym",
		] as const) {
			const inferred = propagateRelations({
				readings,
				edges: [
					{ sourceReading: "a", relation, targetLemma: "lb" },
					{ sourceReading: "b", relation, targetLemma: "lc" },
				],
			});
			expect(inferred).not.toContainEqual({
				sourceReading: "a",
				relation,
				targetLemma: "lc",
			});
		}
	});

	test("infers only one inverse level for non-Synonym kinds", () => {
		const inferred = propagateRelations({
			readings: [
				{ reading: "a1", lemma: "la" },
				{ reading: "a2", lemma: "la" },
				{ reading: "b", lemma: "lb" },
			],
			edges: [
				{
					sourceReading: "a1",
					relation: "nearSynonym",
					targetLemma: "lb",
				},
			],
		});
		expect(inferred).toEqual([
			{
				sourceReading: "b",
				relation: "nearSynonym",
				targetLemma: "la",
			},
		]);
		expect(inferred).not.toContainEqual({
			sourceReading: "a2",
			relation: "nearSynonym",
			targetLemma: "lb",
		});
	});

	test("rejects undeclared or duplicate Reading identities", () => {
		expect(() =>
			propagateRelations({
				readings: [{ reading: "a", lemma: "la" }],
				edges: [
					{
						sourceReading: "missing",
						relation: "synonym",
						targetLemma: "lb",
					},
				],
			}),
		).toThrow();
		expect(() =>
			propagateRelations({
				readings: [
					{ reading: "a", lemma: "la" },
					{ reading: "a", lemma: "other" },
				],
				edges: [],
			}),
		).toThrow();
	});
});
