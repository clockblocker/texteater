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
import {
	GERMAN_HIGH_LEVEL_ROUTES,
	GERMAN_REACHABLE_HIGH_LEVEL_ROUTES,
} from "../../src/schema/german-high-level-routes";

describe("German High-Level Target Classification Canonical Classification Corpus", () => {
	test("pins named collections and explicit published selections", () => {
		expect(corpus.all().ids).toHaveLength(162);
		expect(Object.keys(corpus.collections)).toEqual([
			"routes",
			"boundaries",
			"robustness",
		]);
		expect(demonstrationSelection.ids).toEqual([
			"target-de-demo-governed-rechnen-click-mit",
			"target-de-demo-adjunct-rechnen-click-mit",
			"target-de-demo-idiom-faden-click-verlor",
			"target-de-demo-idiom-faden-click-den",
			"target-de-demo-aphorism-zeit-click-ist",
			"target-de-demo-literal-gras-click-biss",
			"target-de-demo-literal-gras-click-gras",
			"target-de-demo-idiom-katze-click-die",
			"target-de-demo-idiom-katze-click-verdammte",
			"target-de-demo-idiom-katze-click-katze",
			"target-de-demo-paired-einerseits-click-einerseits",
			"target-de-demo-paired-einerseits-click-lokal",
			"target-de-demo-paired-einerseits-click-andererseits",
			"target-de-demo-paired-einerseits-click-digital",
			"target-de-demo-inherent-reflexive-click-beeile",
			"target-de-demo-inherent-reflexive-click-mich",
			"target-de-demo-optional-reflexive-click-kaemmst",
			"target-de-demo-optional-reflexive-click-dich",
			"target-de-demo-modal-arbeiten-click-kann",
			"target-de-demo-passive-briefe-click-werden",
			"target-de-demo-default-interjection-oh",
			"target-de-demo-repeated-anfangen-click-faengt",
			"target-de-demo-repeated-anfangen-click-final-an",
			"target-de-demo-repeated-anfangen-click-first-an",
			"target-de-demo-question-stattfinden-click-statt",
			"target-de-demo-typo-mitmachen-click-mit",
			"target-de-demo-predicative-cringe-click-cringe",
		]);
		expect(demonstrationSelection.ids).toHaveLength(27);
		expect(demonstrationSelection.ids.length).toBeLessThanOrEqual(35);
		expect(evaluationSelection.ids).toHaveLength(94);
		expect(demonstrationSelection.isDisjointFrom(evaluationSelection)).toBe(
			true,
		);
		expect(
			demonstrationSelection.union(evaluationSelection).ids,
		).toHaveLength(121);
	});

	test("covers every reachable route and records unreachable PUNCT and X gaps", () => {
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
		expect(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Lexeme).not.toContain(
			"X" as never,
		);
		expect(covered.has("Lexeme/PUNCT")).toBe(false);
		expect(covered.has("Lexeme/X")).toBe(false);
		expect(GERMAN_HIGH_LEVEL_ROUTES.Lexeme).toContain("X");
		expect(GERMAN_HIGH_LEVEL_ROUTES.Phraseme).toContain("Collocation");
		expect(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Phraseme).not.toContain(
			"Collocation" as never,
		);
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
			corpus.outputSchema.safeParse({
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind: "X",
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

	test("keeps ordinary non-idiomatic Collocations separate by click", () => {
		expect(
			corpus.cases["target-de-core-entscheidung-click-trifft"]
				?.idealOutput,
		).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "VERB",
				memberSegmentIndices: [4],
			},
		});
		expect(
			corpus.cases["target-de-core-entscheidung-click-eine"]?.idealOutput,
		).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "DET",
				memberSegmentIndices: [6],
			},
		});
		expect(
			corpus.cases["target-de-core-entscheidung-click-entscheidung"]
				?.idealOutput,
		).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [8],
			},
		});
	});

	test("teaches click anchoring through fixed-member and free-neighbor contrasts", () => {
		const target = (caseId: string) => {
			const goldenCase = corpus.cases[caseId];
			if (goldenCase?.idealOutput.decision !== "Resolved") {
				throw new Error(`Expected resolved contrast case ${caseId}.`);
			}
			return goldenCase.idealOutput.target;
		};
		const expectSameMembership = (
			firstCaseId: string,
			secondCaseId: string,
		) => {
			expect(target(secondCaseId)).toEqual(target(firstCaseId));
		};

		expectSameMembership(
			"target-de-demo-perfect-arbeiten-click-habe",
			"target-de-demo-perfect-arbeiten-click-gearbeitet",
		);
		expectSameMembership(
			"target-de-demo-governed-rechnen-click-rechnet",
			"target-de-demo-governed-rechnen-click-mit",
		);
		expectSameMembership(
			"target-de-demo-idiom-faden-click-verlor",
			"target-de-demo-idiom-faden-click-faden",
		);
		expectSameMembership(
			"target-de-demo-paired-entweder-click-entweder",
			"target-de-demo-paired-entweder-click-oder",
		);

		for (const [caseId, memberSegmentIndices] of [
			["target-de-demo-perfect-arbeiten-click-gestern", [4]],
			["target-de-demo-governed-rechnen-click-regen", [8]],
			["target-de-demo-idiom-faden-click-voellig", [10]],
			["target-de-demo-literal-handtuch-click-warf", [6]],
			["target-de-demo-paired-je-click-laenger", [2]],
			["target-de-demo-optional-reflexive-click-kaemmst", [2]],
			["target-de-demo-optional-reflexive-click-dich", [4]],
			["target-de-demo-modal-arbeiten-click-kann", [2]],
			["target-de-demo-modal-arbeiten-click-arbeiten", [6]],
			["target-de-demo-repeated-anfangen-click-first-an", [4]],
		] as const) {
			expect(target(caseId).memberSegmentIndices).toEqual([
				...memberSegmentIndices,
			]);
		}

		expect(
			target("target-de-demo-repeated-anfangen-click-final-an"),
		).toMatchObject({
			family: "Lexeme",
			kind: "VERB",
			memberSegmentIndices: [2, 12],
		});
		expect(target("target-de-demo-fusion-zum")).toMatchObject({
			family: "Construction",
			kind: "Fusion",
		});
		expect(target("target-de-demo-symbol-percent")).toMatchObject({
			family: "Lexeme",
			kind: "SYM",
		});
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
				/https:\/\/(?:grammis\.ids-mannheim\.de|ids-pub\.bsz-bw\.de|universaldependencies\.org)\//u,
			);
		}
		expect(
			corpus
				.all()
				.cases.some(({ explanation }) =>
					(explanation ?? "").includes(
						"grammis.ids-mannheim.de/sgt/2195",
					),
				),
		).toBe(false);
	});

	test("makes figurative and literal idiom-shaped occurrences explicit in context", () => {
		const wordsFor = (caseId: string) =>
			corpus.cases[caseId]?.input.segments
				.filter(({ kind }) => kind === "ResolvableText")
				.map(({ text }) => text);

		expect(wordsFor("target-de-boundary-idiom-click-brach")).toEqual([
			"Im",
			"Workshop",
			"schwieg",
			"jeder",
			"Mit",
			"einem",
			"Witz",
			"brach",
			"sie",
			"endlich",
			"das",
			"Eis",
		]);
		expect(wordsFor("target-de-boundary-literal-eis-click-brach")).toEqual([
			"Vor",
			"ihr",
			"lag",
			"ein",
			"großer",
			"Eisblock",
			"Mit",
			"einem",
			"Hammer",
			"brach",
			"sie",
			"das",
			"Eis",
			"für",
			"die",
			"Getränke",
		]);
		expect(
			wordsFor("target-de-boundary-fixed-function-click-heult"),
		).toEqual([
			"Aus",
			"Opportunismus",
			"folgt",
			"sie",
			"immer",
			"der",
			"Mehrheit",
			"Sie",
			"heult",
			"mit",
			"den",
			"hungrigen",
			"Wölfen",
		]);
	});

	test("routes intelligible predicative slang to an informative word class", () => {
		expect(corpus.cases["target-de-robust-slang"]?.idealOutput).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "ADJ",
				memberSegmentIndices: [4],
			},
		});
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
		for (const caseId of [
			"target-de-route-construction-paired-click-je",
			"target-de-route-construction-paired-click-desto",
			"target-de-route-construction-paired-near-frueher",
			"target-de-route-construction-paired-near-besser",
		]) {
			expect(() =>
				assertCaseSelectionsUncontaminated({
					route: corpus.route,
					demonstrations: corpus.select([
						"target-de-demo-paired-je-click-laenger",
					]),
					evaluation: corpus.select([caseId]),
				}),
			).toThrow(/contamination key/u);
		}
		expect(() =>
			assertCaseSelectionsUncontaminated({
				route: corpus.route,
				demonstrations: corpus.select(["target-de-demo-fusion-zum"]),
				evaluation: corpus.select([
					"target-de-route-construction-fusion",
				]),
			}),
		).toThrow(/contamination key/u);
	});

	test("keeps demonstrated Lexeme clicks lexically distinct from held-outs", () => {
		const lexemeClickKeys = (
			selection: typeof demonstrationSelection,
		): readonly string[] =>
			selection.cases.flatMap((goldenCase) => {
				if (
					goldenCase.idealOutput.decision !== "Resolved" ||
					goldenCase.idealOutput.target.family !== "Lexeme"
				) {
					return [];
				}
				const clicked =
					goldenCase.input.segments[
						goldenCase.input.clickedSegmentIndex
					];
				if (clicked?.kind !== "ResolvableText") {
					throw new Error(
						"Selected Lexeme click is not ResolvableText.",
					);
				}
				return [
					`${goldenCase.idealOutput.target.kind}:${clicked.text.toLocaleLowerCase("de")}`,
				];
			});

		const demonstrated = new Set(lexemeClickKeys(demonstrationSelection));
		expect(
			lexemeClickKeys(evaluationSelection).filter((key) =>
				demonstrated.has(key),
			),
		).toEqual([]);
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
