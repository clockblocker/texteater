import { describe, expect, test } from "bun:test";
import { assertCaseSelectionsUncontaminated } from "../../src/promptsmith/assembly";
import { corpus } from "../../src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/corpus";
import { semanticTargetFingerprint } from "../../src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/fingerprints";
import {
	demonstrationSelection,
	evaluationSelection,
} from "../../src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/selections";
import { validateOriginalIndexMembership } from "../../src/promptsmith/laboratory/canonical-classification-corpus/target-classification/de/high-level-whole-unit/validators";
import {
	evaluateGermanHighLevelClickInvariance,
	evaluateGermanHighLevelTargetClassification,
} from "../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/evaluator";
import { GERMAN_REACHABLE_HIGH_LEVEL_ROUTES } from "../../src/schema/german-high-level-routes";

describe("German High-Level Target Classification Canonical Classification Corpus", () => {
	test("pins named collections and explicit published selections", () => {
		expect(corpus.all().ids).toHaveLength(130);
		expect(Object.keys(corpus.collections)).toEqual([
			"routes",
			"boundaries",
			"robustness",
		]);
		expect(demonstrationSelection.ids).toEqual([
			"target-de-core-guten-morgen-click-guten",
			"target-de-boundary-multi-verb-click-gehen",
			"target-de-core-kakao",
			"target-de-route-lexeme-x",
			"target-de-core-unresolved-qzxv",
			"target-de-demo-default-modal-kann",
			"target-de-demo-default-particle-nicht",
			"target-de-demo-default-interjection-oh",
			"target-de-demo-default-copula-ist",
			"target-de-demo-aphorism-zeit-click-ist",
			"target-de-demo-paired-entweder-click-oder",
			"target-de-demo-idiom-faden-click-den",
			"target-de-demo-literal-faden-click-faden",
			"target-de-demo-governed-rechnen-click-mit",
			"target-de-demo-adjunct-rechnen-click-mit",
			"target-de-demo-inherent-reflexive-click-sich",
			"target-de-demo-optional-reflexive-click-sich",
			"target-de-demo-perfect-arbeiten-click-hat",
			"target-de-demo-passive-brief-click-wird",
			"target-de-demo-collocation-kenntnis-click-zur",
		]);
		expect(evaluationSelection.ids).toHaveLength(94);
		expect(demonstrationSelection.isDisjointFrom(evaluationSelection)).toBe(
			true,
		);
		expect(
			demonstrationSelection.union(evaluationSelection).ids,
		).toHaveLength(114);
	});

	test("covers every reachable route and records PUNCT as a clickability gap", () => {
		const covered = new Set(
			corpus
				.all()
				.cases.flatMap(({ idealOutput }) =>
					idealOutput.decision === "Resolved"
						? [
								`${idealOutput.target.family}/${idealOutput.target.kind}`,
							]
						: [],
				),
		);
		const reachable = Object.entries(
			GERMAN_REACHABLE_HIGH_LEVEL_ROUTES,
		).flatMap(([family, kinds]) =>
			kinds.map((kind) => `${family}/${kind}`),
		);
		expect([...covered].toSorted()).toEqual(reachable.toSorted());
		const heldOutRoutes = new Set(
			evaluationSelection.cases.flatMap(({ idealOutput }) =>
				idealOutput.decision === "Resolved"
					? [
							`${idealOutput.target.family}/${idealOutput.target.kind}`,
						]
					: [],
			),
		);
		expect([...heldOutRoutes].toSorted()).toEqual(reachable.toSorted());
		expect(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Lexeme).not.toContain(
			"PUNCT" as never,
		);
		expect(covered.has("Lexeme/PUNCT")).toBe(false);
		expect(
			corpus.outputSchema.safeParse({
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "PUNCT",
					memberSegmentIndices: [0],
				},
			}).success,
		).toBe(false);
		expect(
			corpus
				.all()
				.cases.some(({ input }) =>
					input.segments.some(
						(segment) =>
							segment.kind === "ResolvableText" &&
							segment.text === "—",
					),
				),
		).toBe(false);
	});

	test("uses complete disambiguating sentences and case-level evidence", () => {
		for (const goldenCase of corpus.all().cases) {
			expect(
				goldenCase.input.segments.filter(
					({ kind }) => kind === "ResolvableText",
				).length,
			).toBeGreaterThan(1);
		}
		for (const goldenCase of [
			...corpus.collections.routes.cases,
			...corpus.collections.boundaries.cases,
		]) {
			expect(goldenCase.explanation).toMatch(
				/https:\/\/(?:grammis\.ids-mannheim\.de|ids-pub\.bsz-bw\.de)\//u,
			);
		}
	});

	test("separates authoritative facts from issue #82 classification policy", () => {
		for (const goldenCase of corpus
			.all()
			.cases.filter(
				({ idealOutput }) => idealOutput.decision === "Unresolved",
			)) {
			expect(goldenCase.explanation).not.toMatch(/classifiable/iu);
			expect(goldenCase.explanation).toMatch(/issue #82/iu);
			expect(goldenCase.explanation).toMatch(/no defensible route/iu);
		}

		for (const caseId of corpus
			.all()
			.ids.filter(
				(id) =>
					id === "target-de-route-construction-fusion" ||
					id.includes("boundary-governed") ||
					id.includes("boundary-adjunct") ||
					id.includes("boundary-multi-verb") ||
					id.includes("boundary-perfect") ||
					id.includes("boundary-future") ||
					id.includes("boundary-passive") ||
					id.includes("boundary-modal") ||
					id.includes("boundary-copula") ||
					id.includes("robust-overlap") ||
					id.includes("robust-partial") ||
					id.includes("robust-long"),
			)) {
			expect(corpus.cases[caseId]?.explanation).toMatch(/issue #82/iu);
		}
	});

	test("clicks every member of each multi-member oracle target", () => {
		const units = new Map<
			string,
			{ members: readonly number[]; clicks: Set<number> }
		>();
		for (const goldenCase of corpus.all().cases) {
			if (goldenCase.idealOutput.decision !== "Resolved") {
				continue;
			}
			const key = semanticTargetFingerprint({
				input: goldenCase.input,
				output: goldenCase.idealOutput,
			});
			const unit = units.get(key) ?? {
				members: goldenCase.idealOutput.target.memberSegmentIndices,
				clicks: new Set<number>(),
			};
			unit.clicks.add(goldenCase.input.clickedSegmentIndex);
			units.set(key, unit);
		}
		for (const { members, clicks } of units.values()) {
			if (members.length > 1) {
				expect([...clicks].toSorted((a, b) => a - b)).toEqual([
					...members,
				]);
			}
		}
	});

	test("keeps corpus oracles valid in original source-index space", () => {
		for (const goldenCase of corpus.all().cases) {
			if (goldenCase.idealOutput.decision === "Resolved") {
				expect(
					validateOriginalIndexMembership(
						goldenCase.input,
						goldenCase.idealOutput.target.memberSegmentIndices,
					).pass,
				).toBe(true);
			}
		}
	});

	test("uses shared Prompt Assembly contamination validation", () => {
		expect(() =>
			assertCaseSelectionsUncontaminated({
				route: corpus.route,
				demonstrations: corpus.select([
					"target-de-core-guten-morgen-click-guten",
				]),
				evaluation: corpus.select([
					"target-de-core-guten-morgen-click-morgen",
				]),
			}),
		).toThrow(/route-specific fingerprint/u);
		for (const caseId of corpus
			.all()
			.ids.filter((id) =>
				id.startsWith("target-de-boundary-collocation-"),
			)) {
			expect(() =>
				assertCaseSelectionsUncontaminated({
					route: corpus.route,
					demonstrations: corpus.select([
						"target-de-core-entscheidung-click-entscheidung",
					]),
					evaluation: corpus.select([caseId]),
				}),
			).toThrow(/contamination key/u);
		}
		for (const caseId of corpus
			.all()
			.ids.filter(
				(id) =>
					id.startsWith("target-de-boundary-separable-") ||
					id.startsWith("target-de-robust-repeated-") ||
					id.startsWith("target-de-robust-typo-") ||
					id.startsWith("target-de-robust-punctuation-"),
			)) {
			expect(() =>
				assertCaseSelectionsUncontaminated({
					route: corpus.route,
					demonstrations: corpus.select([
						"target-de-core-aufstehen-click-steht",
					]),
					evaluation: corpus.select([caseId]),
				}),
			).toThrow(/contamination key/u);
		}
	});

	test("diagnoses every invalid original-index membership dimension", () => {
		const goldenCase = corpus.cases["target-de-route-lexeme-adj"];
		if (goldenCase === undefined) {
			throw new Error("Missing adjective fixture.");
		}
		const input = goldenCase.input;
		expect(validateOriginalIndexMembership(input, []).nonEmptyPass).toBe(
			false,
		);
		expect(validateOriginalIndexMembership(input, [2.5]).integerPass).toBe(
			false,
		);
		expect(validateOriginalIndexMembership(input, [-1]).boundsPass).toBe(
			false,
		);
		expect(
			validateOriginalIndexMembership(input, [1]).resolvableTextPass,
		).toBe(false);
		expect(validateOriginalIndexMembership(input, [2, 0]).orderPass).toBe(
			false,
		);
		expect(
			validateOriginalIndexMembership(input, [2, 2]).uniquenessPass,
		).toBe(false);
		expect(
			validateOriginalIndexMembership(input, [0]).clickInclusionPass,
		).toBe(false);
	});
});

describe("German High-Level Target Classification evaluator", () => {
	const governed = corpus.cases["target-de-boundary-governed-click-wartet"];
	if (governed === undefined) {
		throw new Error("Missing governed-preposition fixture.");
	}

	test("scores the semantic oracle without private DTO equality", () => {
		expect(
			evaluateGermanHighLevelTargetClassification({
				caseId: "governed",
				...governed,
				output: governed.idealOutput,
			}),
		).toMatchObject({
			contractPass: true,
			routePass: true,
			exactMembershipPass: true,
			falseGroupingPass: true,
			falseSplittingPass: true,
		});
	});

	test("separates wrong route, grouping, splitting, and membership failures", () => {
		const wrongRoute = evaluateGermanHighLevelTargetClassification({
			caseId: "wrong-route",
			...governed,
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "NOUN",
					memberSegmentIndices: [2, 4],
				},
			},
		});
		expect(wrongRoute.routePass).toBe(false);
		expect(wrongRoute.exactMembershipPass).toBe(true);

		const grouped = evaluateGermanHighLevelTargetClassification({
			caseId: "grouped",
			...governed,
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [2, 4, 8],
				},
			},
		});
		expect(grouped.falseGroupingPass).toBe(false);
		expect(grouped.falseSplittingPass).toBe(true);

		const split = evaluateGermanHighLevelTargetClassification({
			caseId: "split",
			...governed,
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [2],
				},
			},
		});
		expect(split.falseGroupingPass).toBe(true);
		expect(split.falseSplittingPass).toBe(false);

		const invalid = evaluateGermanHighLevelTargetClassification({
			caseId: "invalid",
			...governed,
			output: {
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "VERB",
					memberSegmentIndices: [4, 3, 3, 99],
				},
			},
		});
		expect(invalid.validMembershipPass).toBe(false);
		expect(invalid.nonResolvableMembershipPass).toBe(false);
		expect(invalid.orderPass).toBe(false);
		expect(invalid.uniquenessPass).toBe(false);
		expect(invalid.clickInclusionPass).toBe(false);
	});

	test("scores correct Unresolved and cross-click invariance", () => {
		const unresolved = corpus.cases["target-de-robust-unresolved"];
		if (unresolved === undefined) {
			throw new Error("Missing Unresolved fixture.");
		}
		expect(
			evaluateGermanHighLevelTargetClassification({
				caseId: "unresolved",
				...unresolved,
				output: { decision: "Unresolved" },
			}),
		).toMatchObject({ contractPass: true, correctUnresolvedPass: true });

		const expectations = evaluationSelection.ids.map((caseId, index) => {
			const goldenCase = evaluationSelection.cases[index];
			if (goldenCase === undefined) {
				throw new Error(`Missing selected case ${caseId}.`);
			}
			return { caseId, ...goldenCase };
		});
		const observations = expectations.map((expectation) => ({
			caseId: expectation.caseId,
			output: expectation.idealOutput,
		}));
		const invariant = evaluateGermanHighLevelClickInvariance({
			expectations,
			observations,
		});
		expect(invariant.contractPass).toBe(true);
		expect(invariant.exercisedUnitCount).toBeGreaterThan(10);
		expect(invariant.invariantUnitCount).toBe(invariant.exercisedUnitCount);

		const missingCaseId = "target-de-route-phraseme-aphorism-click-wissen";
		const missing = evaluateGermanHighLevelClickInvariance({
			expectations,
			observations: observations.filter(
				({ caseId }) => caseId !== missingCaseId,
			),
		});
		expect(missing.contractPass).toBe(false);
		expect(missing.missingObservationCaseIds).toContain(missingCaseId);

		const missingSingletonCaseId = "target-de-route-lexeme-adj";
		const missingSingleton = evaluateGermanHighLevelClickInvariance({
			expectations,
			observations: observations.filter(
				({ caseId }) => caseId !== missingSingletonCaseId,
			),
		});
		expect(missingSingleton.contractPass).toBe(false);
		expect(missingSingleton.missingObservationCaseIds).toContain(
			missingSingletonCaseId,
		);

		const missingExpectationCaseId =
			"target-de-route-phraseme-aphorism-click-wissen";
		const incompleteExpectations = expectations.filter(
			({ caseId }) => caseId !== missingExpectationCaseId,
		);
		const missingMemberClick = evaluateGermanHighLevelClickInvariance({
			expectations: incompleteExpectations,
			observations: observations.filter(
				({ caseId }) => caseId !== missingExpectationCaseId,
			),
		});
		expect(missingMemberClick.contractPass).toBe(false);
		expect(missingMemberClick.missingExpectedMemberClicks).toHaveLength(1);
	});
});
