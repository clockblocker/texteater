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
			NumberCounterpart: {
				symmetric: true,
				transitive: false,
				substitutive: false,
			},
		});
	});

	test("compiles exact Reading Series without self-edges", () => {
		const series = allFixedGrammaticalSeries();
		const claims = allFixedGrammaticalRelationClaims();
		expect(
			series.every(({ endpointKind }) => endpointKind === "reading"),
		).toBe(true);
		expect(
			series
				.filter(
					({ relation, fixedCoordinates }) =>
						relation === "CaseCounterpart" &&
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
					claim.relation !== "NumberCounterpart" &&
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

	test("authors the exact total-pronoun Readings as singular and plural number peers", () => {
		const series = allFixedGrammaticalSeries().find(
			(candidate) => candidate.relation === "NumberCounterpart",
		);
		if (!series) throw new Error("Expected a NumberCounterpart Series.");

		expect(series).toMatchObject({
			endpointKind: "reading",
			relation: "NumberCounterpart",
			axis: "number",
			fixedCoordinates: {
				language: "de",
				family: "Lexeme",
				kind: "PRON",
				pronType: "Tot",
			},
		});
		expect(
			series.members.map(({ axisValue, endpoint }) => [
				axisValue,
				canonicalFormOf(endpoint),
			]),
		).toEqual([
			["Sing", "alles"],
			["Plur", "alle"],
		]);

		const projections = projectGrammaticalRelations(
			compileGrammaticalSeries(series),
		);
		expect(
			projections.map(({ source, target, provenance }) => [
				canonicalFormOf(source),
				canonicalFormOf(target),
				provenance,
			]),
		).toEqual([
			["alle", "alles", "direct"],
			["alles", "alle", "inferred"],
		]);
	});

	test("authors only the three exact formal-address number pairs", () => {
		const series = allFixedGrammaticalSeries().filter(
			({ relation, fixedCoordinates }) =>
				relation === "NumberCounterpart" &&
				fixedCoordinates.person === "2" &&
				fixedCoordinates.polite === "Form",
		);

		expect(
			series.map(({ fixedCoordinates, members }) => ({
				canonicalForm: fixedCoordinates.canonicalForm,
				members: members.map(({ axisValue, endpoint }) => ({
					axisValue,
					canonicalForm: endpoint.lemma.canonicalForm,
					referenceNumber:
						endpoint.lemma.coreFeatures.referenceNumber,
				})),
			})),
		).toEqual([
			{
				canonicalForm: "Sie",
				members: [
					{
						axisValue: "Sing",
						canonicalForm: "Sie",
						referenceNumber: "Sing",
					},
					{
						axisValue: "Plur",
						canonicalForm: "Sie",
						referenceNumber: "Plur",
					},
				],
			},
			{
				canonicalForm: "Ihnen",
				members: [
					{
						axisValue: "Sing",
						canonicalForm: "Ihnen",
						referenceNumber: "Sing",
					},
					{
						axisValue: "Plur",
						canonicalForm: "Ihnen",
						referenceNumber: "Plur",
					},
				],
			},
			{
				canonicalForm: "Ihrer",
				members: [
					{
						axisValue: "Sing",
						canonicalForm: "Ihrer",
						referenceNumber: "Sing",
					},
					{
						axisValue: "Plur",
						canonicalForm: "Ihrer",
						referenceNumber: "Plur",
					},
				],
			},
		]);

		const formalClaims = series.flatMap((candidate) =>
			compileGrammaticalSeries(candidate),
		);
		expect(
			formalClaims.map((claim) => {
				if (claim.endpointKind !== "reading") {
					throw new Error("Expected exact Reading endpoints.");
				}
				return {
					canonicalForm: canonicalFormOf(claim.source),
					sourceNumber: referenceNumberOf(claim.source),
					targetNumber: referenceNumberOf(claim.target),
				};
			}),
		).toEqual([
			{
				canonicalForm: "Sie",
				sourceNumber: "Plur",
				targetNumber: "Sing",
			},
			{
				canonicalForm: "Ihnen",
				sourceNumber: "Plur",
				targetNumber: "Sing",
			},
			{
				canonicalForm: "Ihrer",
				sourceNumber: "Plur",
				targetNumber: "Sing",
			},
		]);

		const numberClaims = allFixedGrammaticalRelationClaims().filter(
			({ relation, source }) => {
				if (!("lemma" in source)) return false;
				const core = source.lemma.coreFeatures as Readonly<
					Record<string, unknown>
				>;
				return (
					relation === "NumberCounterpart" &&
					(core.polite === "Form" || core.pronType === "Tot")
				);
			},
		);
		expect(
			numberClaims.map(({ source, target }) => [
				canonicalFormOf(source),
				canonicalFormOf(target),
			]),
		).toEqual([
			["alle", "alles"],
			["Sie", "Sie"],
			["Ihnen", "Ihnen"],
			["Ihrer", "Ihrer"],
		]);
	});

	test("authors independent demonstrative and relative Case and Number Series", () => {
		const allSeries = allFixedGrammaticalSeries();
		const allClaims = allFixedGrammaticalRelationClaims();
		const expectedNumberPairs = [
			["der", "die"],
			["den", "die"],
			["dem", "denen"],
			["deren", "dessen"],
			["denen", "der"],
			["das", "die"],
		].map((pair) => pair.toSorted());

		for (const pronType of ["Dem", "Rel"] as const) {
			const series = allSeries.filter(
				({ fixedCoordinates }) =>
					fixedCoordinates.pronType === pronType,
			);
			expect(
				series.filter(({ relation }) => relation === "CaseCounterpart"),
			).toHaveLength(4);
			expect(
				series.filter(
					({ relation }) => relation === "NumberCounterpart",
				),
			).toHaveLength(12);

			const claims = allClaims.filter(({ source, target }) => {
				if (!("lemma" in source) || !("lemma" in target)) return false;
				return (
					coreFeatureOf(source, "pronType") === pronType &&
					coreFeatureOf(target, "pronType") === pronType
				);
			});
			const numberClaims = claims.filter(
				({ relation }) => relation === "NumberCounterpart",
			);
			expect(numberClaims).toHaveLength(6);
			expect(
				numberClaims
					.map(({ source, target }) =>
						[
							canonicalFormOf(source),
							canonicalFormOf(target),
						].toSorted(),
					)
					.toSorted((left, right) =>
						left.join("/").localeCompare(right.join("/")),
					),
			).toEqual(
				expectedNumberPairs.toSorted((left, right) =>
					left.join("/").localeCompare(right.join("/")),
				),
			);
			expect(
				claims.every(
					({ source, target }) =>
						readingKey(source) !== readingKey(target),
				),
			).toBe(true);
		}

		const derParadigmClaims = allClaims.filter(({ source, target }) => {
			if (!("lemma" in source) || !("lemma" in target)) return false;
			return ["Dem", "Rel"].includes(
				(coreFeatureOf(source, "pronType") as string) ?? "",
			);
		});
		expect(
			derParadigmClaims.every(({ source, target }) => {
				if (!("lemma" in source) || !("lemma" in target)) return false;
				return (
					coreFeatureOf(source, "pronType") ===
					coreFeatureOf(target, "pronType")
				);
			}),
		).toBe(true);
	});

	test("authors no Case or Number relation for plural-only mehrere Surfaces", () => {
		expect(
			allFixedGrammaticalSeries().filter(({ members }) =>
				members.some(
					({ endpoint }) =>
						endpoint.lemma.canonicalForm === "mehrere" &&
						endpoint.lemma.kind === "PRON",
				),
			),
		).toEqual([]);
		expect(
			allFixedGrammaticalRelationClaims().filter(
				({ source, target }) =>
					canonicalFormOf(source) === "mehrere" ||
					canonicalFormOf(target) === "mehrere",
			),
		).toEqual([]);
	});

	test("authors one exact wer CaseCounterpart Series in Nom/Acc/Dat/Gen order", () => {
		const series = allFixedGrammaticalSeries().filter(
			({ fixedCoordinates }) => fixedCoordinates.pronType === "Int",
		);
		expect(series).toHaveLength(1);
		expect(
			series[0]?.members.map(({ axisValue, endpoint }) => ({
				axisValue,
				canonicalForm: endpoint.lemma.canonicalForm,
			})),
		).toEqual([
			{ axisValue: "Nom", canonicalForm: "wer" },
			{ axisValue: "Acc", canonicalForm: "wen" },
			{ axisValue: "Dat", canonicalForm: "wem" },
			{ axisValue: "Gen", canonicalForm: "wessen" },
		]);
	});

	test("does not author a case Series or self-edge for jemand Surfaces", () => {
		expect(
			allFixedGrammaticalSeries().filter(({ members }) =>
				members.some(
					({ endpoint }) => endpoint.lemma.canonicalForm === "jemand",
				),
			),
		).toEqual([]);
		expect(
			allFixedGrammaticalRelationClaims().filter(
				({ source, target }) =>
					canonicalFormOf(source) === "jemand" ||
					canonicalFormOf(target) === "jemand",
			),
		).toEqual([]);
	});

	test("does not author a case Series or self-edge for niemand Surfaces", () => {
		expect(
			allFixedGrammaticalSeries().filter(({ members }) =>
				members.some(
					({ endpoint }) =>
						endpoint.lemma.canonicalForm === "niemand",
				),
			),
		).toEqual([]);
		expect(
			allFixedGrammaticalRelationClaims().filter(
				({ source, target }) =>
					canonicalFormOf(source) === "niemand" ||
					canonicalFormOf(target) === "niemand",
			),
		).toEqual([]);
	});

	test("does not author a Series or claim between jedermann Surfaces and jeder", () => {
		expect(
			allFixedGrammaticalSeries().filter(({ members }) =>
				members.some(({ endpoint }) =>
					["jedermann", "jedermanns"].includes(
						endpoint.lemma.canonicalForm,
					),
				),
			),
		).toEqual([]);
		expect(
			allFixedGrammaticalRelationClaims().filter(({ source, target }) => {
				const pair = [canonicalFormOf(source), canonicalFormOf(target)];
				return pair.includes("jedermann") && pair.includes("jeder");
			}),
		).toEqual([]);
	});

	test("does not author grammatical relations for the mancher Surface paradigm", () => {
		expect(
			allFixedGrammaticalSeries().filter(({ members }) =>
				members.some(
					({ endpoint }) =>
						endpoint.lemma.canonicalForm === "mancher",
				),
			),
		).toEqual([]);
		expect(
			allFixedGrammaticalRelationClaims().filter(
				({ source, target }) =>
					canonicalFormOf(source) === "mancher" ||
					canonicalFormOf(target) === "mancher",
			),
		).toEqual([]);
	});

	test("does not author grammatical relations for nichts and nix Surface spelling", () => {
		expect(
			allFixedGrammaticalSeries().filter(({ members }) =>
				members.some(
					({ endpoint }) => endpoint.lemma.canonicalForm === "nichts",
				),
			),
		).toEqual([]);
		expect(
			allFixedGrammaticalRelationClaims().filter(
				({ source, target }) =>
					canonicalFormOf(source) === "nichts" ||
					canonicalFormOf(target) === "nichts",
			),
		).toEqual([]);
	});

	test("does not author internal or plural-counterpart relations for jeder", () => {
		expect(
			allFixedGrammaticalSeries().filter(({ members }) =>
				members.some(
					({ endpoint }) => endpoint.lemma.canonicalForm === "jeder",
				),
			),
		).toEqual([]);
		expect(
			allFixedGrammaticalRelationClaims().filter(
				({ source, target }) =>
					canonicalFormOf(source) === "jeder" ||
					canonicalFormOf(target) === "jeder",
			),
		).toEqual([]);
	});

	test("does not misrepresent jedweder synonymy as a grammatical relation", () => {
		expect(
			allFixedGrammaticalSeries().filter(({ members }) =>
				members.some(
					({ endpoint }) =>
						endpoint.lemma.canonicalForm === "jedweder",
				),
			),
		).toEqual([]);
		expect(
			allFixedGrammaticalRelationClaims().filter(
				({ source, target }) =>
					canonicalFormOf(source) === "jedweder" ||
					canonicalFormOf(target) === "jedweder",
			),
		).toEqual([]);
	});

	test("does not author grammatical relations inside jeglicher or to its synonyms", () => {
		expect(
			allFixedGrammaticalSeries().filter(({ members }) =>
				members.some(
					({ endpoint }) =>
						endpoint.lemma.canonicalForm === "jeglicher",
				),
			),
		).toEqual([]);
		expect(
			allFixedGrammaticalRelationClaims().filter(
				({ source, target }) =>
					canonicalFormOf(source) === "jeglicher" ||
					canonicalFormOf(target) === "jeglicher",
			),
		).toEqual([]);
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

function canonicalFormOf(
	endpoint: ReturnType<
		typeof allFixedGrammaticalRelationClaims
	>[number]["source"],
): string {
	return "lemma" in endpoint
		? endpoint.lemma.canonicalForm
		: endpoint.canonicalForm;
}

function referenceNumberOf(
	endpoint: ReturnType<
		typeof allFixedGrammaticalRelationClaims
	>[number]["source"],
): unknown {
	if (!("lemma" in endpoint)) {
		throw new Error("Expected an exact Reading endpoint.");
	}
	return (endpoint.lemma.coreFeatures as Readonly<Record<string, unknown>>)
		.referenceNumber;
}

function coreFeatureOf(
	endpoint: ReturnType<
		typeof allFixedGrammaticalRelationClaims
	>[number]["source"],
	key: string,
): unknown {
	if (!("lemma" in endpoint)) {
		throw new Error("Expected an exact Reading endpoint.");
	}
	return (endpoint.lemma.coreFeatures as Readonly<Record<string, unknown>>)[
		key
	];
}

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
