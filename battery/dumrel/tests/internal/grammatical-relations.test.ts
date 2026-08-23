import { describe, expect, test } from "bun:test";
import { readingFingerprint } from "dumling/reading";
import type { Reading } from "dumling/types";
import {
	allFixedGrammaticalRelationClaims,
	allFixedGrammaticalSeries,
} from "../../src/fixed";
import {
	compileGrammaticalSeries,
	grammaticalRelationAlgebra,
	projectGrammaticalRelations,
} from "../../src/grammatical-relations";
import { grammaticalRelationClaimSchema } from "../../src/schema";

describe("Grammatical Relations", () => {
	test("are symmetric without transitive or substitutive closure", () => {
		expect(grammaticalRelationAlgebra).toEqual({
			CaseCounterpart: {
				symmetric: true,
				transitive: false,
				substitutive: false,
			},
			PersonCounterpart: {
				symmetric: true,
				transitive: false,
				substitutive: false,
			},
		});
	});

	test("compiles exact Reading Series without self-edges", () => {
		const series = allFixedGrammaticalSeries();
		const claims = allFixedGrammaticalRelationClaims();
		expect(series).toHaveLength(19);
		expect(
			series.every(({ endpointKind }) => endpointKind === "reading"),
		).toBe(true);
		expect(
			series
				.filter(
					({ fixedCoordinates }) =>
						fixedCoordinates.polite === "Form",
				)
				.map(({ fixedCoordinates }) => fixedCoordinates.referenceNumber)
				.sort(),
		).toEqual(["Plur", "Sing"]);
		expect(claims.length).toBeGreaterThan(0);
		for (const claim of claims) {
			expect(
				grammaticalRelationClaimSchema.safeParse(claim).success,
			).toBe(true);
			expect(readingKey(claim.source)).not.toBe(readingKey(claim.target));
			if (claim.endpointKind === "reading") {
				const sourceCore = claim.source.lemma.coreFeatures as Readonly<
					Record<string, unknown>
				>;
				const targetCore = claim.target.lemma.coreFeatures as Readonly<
					Record<string, unknown>
				>;
				if (
					sourceCore.polite === "Form" &&
					targetCore.polite === "Form"
				) {
					expect(sourceCore.referenceNumber).toBe(
						targetCore.referenceNumber,
					);
				}
			}
		}
	});

	test("accepts homogeneous Lemma claims and rejects mixed endpoints", () => {
		const [first, second] = allFixedGrammaticalSeries()[0]?.members ?? [];
		if (!first || !second) throw new Error("Case Series is incomplete.");
		const lemmaClaim = {
			endpointKind: "lemma",
			relation: "CaseCounterpart",
			source: first.endpoint.lemma,
			target: second.endpoint.lemma,
		} as const;
		expect(
			grammaticalRelationClaimSchema.safeParse(lemmaClaim).success,
		).toBe(true);
		expect(
			grammaticalRelationClaimSchema.safeParse({
				...lemmaClaim,
				target: second.endpoint,
			}).success,
		).toBe(false);
	});

	test("does not close overlapping Series", () => {
		const [first, second, third] =
			allFixedGrammaticalSeries()[0]?.members ?? [];
		if (!first || !second || !third)
			throw new Error("Case Series is incomplete.");
		const claims = [
			...compileGrammaticalSeries({
				endpointKind: "reading",
				relation: "CaseCounterpart",
				axis: "case",
				fixedCoordinates: {},
				members: [first, second],
			}),
			...compileGrammaticalSeries({
				endpointKind: "reading",
				relation: "CaseCounterpart",
				axis: "case",
				fixedCoordinates: {},
				members: [second, third],
			}),
		];
		const projections = projectGrammaticalRelations(claims);
		const firstKey = readingKey(first.endpoint);
		const thirdKey = readingKey(third.endpoint);
		expect(
			projections.some(
				({ source, target }) =>
					readingKey(source) === firstKey &&
					readingKey(target) === thirdKey,
			),
		).toBe(false);
	});
});

function readingKey(endpoint: unknown): string {
	if (
		endpoint === null ||
		typeof endpoint !== "object" ||
		!("lemma" in endpoint)
	) {
		throw new Error("Expected an exact Reading endpoint.");
	}
	return readingFingerprint(endpoint as Reading);
}
