import { describe, expect, test } from "bun:test";
import { assertCaseSelectionsUncontaminated } from "../../src/promptsmith/assembly";
import { systemPromptForRepresentation } from "../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/contract-prototype";
import {
	evaluateGermanHighLevelClickInvariance,
	evaluateGermanHighLevelTargetClassification,
} from "../../src/promptsmith/laboratory/experiments/target-classification-german-high-level/evaluator";
import {
	adaptiveCarryoverSelection,
	adaptiveDevelopmentSelection,
	adaptiveNovelSelection,
	corpus,
	demonstrationSelection,
	diagnosticSelection,
	evaluationSelection,
	productionDemonstrationGuidance,
	productionDemonstrationSelection,
	semanticTargetFingerprint,
	validateOriginalIndexMembership,
} from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit";
import {
	GERMAN_HIGH_LEVEL_ROUTES,
	GERMAN_REACHABLE_HIGH_LEVEL_ROUTES,
} from "../../src/schema/german-high-level-routes";

describe("German High-Level Target Classification Canonical Classification Corpus", () => {
	test("assembles the lean positional model contract", () => {
		const systemPrompt = systemPromptForRepresentation(
			"additional-compact-indices",
		);

		expect(systemPrompt).toContain("clickedIndex");
		expect(systemPrompt).toContain("additionalMemberIndices");
		expect(systemPrompt).toContain('"additionalMemberIndices":[]');
		expect(systemPrompt).not.toContain('"membership"');
		expect(systemPrompt).not.toContain("clickedCompactIndex");
		expect(systemPrompt).not.toContain("additionalMemberCompactIndices");
		expect(systemPrompt).not.toContain("compactIndex");
		expect(systemPrompt).not.toContain('"clicked":');
		expect(systemPrompt).not.toContain('"kind":"ResolvableText"');
		expect(systemPrompt).not.toContain("Collocation");
	});

	test("keeps adaptive iteration one immutable and gives iteration two generic boundary reasoning", () => {
		const iterationOne = systemPromptForRepresentation(
			"additional-compact-indices",
			"adaptive-1",
		);
		const iterationTwo = systemPromptForRepresentation(
			"additional-compact-indices",
			"adaptive-2",
		);
		expect(iterationOne).not.toContain("<membership_decision_order>");
		expect(iterationTwo).toContain("<membership_decision_order>");
		expect(iterationTwo).toContain(
			"If the mark is payload, stop with its singleton Lexeme.",
		);
		expect(iterationTwo).toContain(
			"Only an objectless occurrence can be the separable particle.",
		);
		expect(iterationTwo).toContain(
			"All fixed-member clicks must produce identical membership.",
		);
		for (const heldOutWord of [
			"früher",
			"besser",
			"Wölfen",
			"Zahn",
			"Publikum",
		]) {
			expect(iterationTwo).not.toContain(heldOutWord);
		}
	});

	test("retains iteration-two reasoning while iteration three swaps only click-contrast demonstrations", () => {
		const iterationTwo = systemPromptForRepresentation(
			"additional-compact-indices",
			"adaptive-2",
		);
		const iterationThree = systemPromptForRepresentation(
			"additional-compact-indices",
			"adaptive-3",
		);
		expect(iterationThree).toContain("<membership_decision_order>");
		expect(iterationThree).toContain("<target>lokal</target>");
		expect(iterationThree).toContain("<target>an</target> der Kreuzung");
		expect(iterationThree).toContain("<target>aus</target> dem Sack");
		expect(iterationThree).not.toContain("<target>Einerseits</target>");
		expect(iterationThree).not.toContain("Kreuzung an<target>");
		expect(iterationThree).not.toContain("<target>verdammte</target>");
		expect(iterationThree.length).not.toBe(iterationTwo.length);
	});

	test("iteration four restores the free-modifier contrast and teaches fixed articles plus reflexive particles", () => {
		const iterationFour = systemPromptForRepresentation(
			"additional-compact-indices",
			"adaptive-4",
		);
		expect(iterationFour).toContain("<target>verdammte</target>");
		expect(iterationFour).toContain("<target>der</target>");
		expect(iterationFour).toContain(
			"Its function-word click selects the whole Idiom.",
		);
		expect(iterationFour).toContain("<target>ins</target>");
		expect(iterationFour).toContain(
			"The marked function token is a fixed realized member of the Idiom.",
		);
		expect(iterationFour).toContain(
			"inserted descriptive modifier remains outside membership",
		);
		expect(iterationFour).toContain("<reflexive_separable_membership>");
		expect(iterationFour).toContain(
			"finite verb, required reflexive pronoun, and objectless separable particle",
		);
		expect(iterationFour).toContain("<target>lokal</target>");
		expect(iterationFour).toContain("<target>an</target> der Kreuzung");
		for (const heldOutWord of ["Wölfen", "Zahn", "gründlich", "Publikum"]) {
			expect(iterationFour).not.toContain(heldOutWord);
		}
	});

	test("iteration five fixes scalar ADJ routing and adds function-word and final-particle contrasts", () => {
		const iterationFive = systemPromptForRepresentation(
			"additional-compact-indices",
			"adaptive-5",
		);
		expect(iterationFive).toContain("<final_boundary_rules>");
		expect(iterationFive).toContain(
			"A comparative form of an adjective remains Lexeme/ADJ when used adverbially",
		);
		expect(iterationFive).toContain(
			"adverbial grammatical function does not turn that adjectival lexeme into ADV",
		);
		expect(iterationFive).not.toContain(
			"scalar or comparative payload word",
		);
		expect(iterationFive).toContain(
			"preposition followed by a fixed article, both function words remain members",
		);
		expect(iterationFive).toContain(
			"delete every earlier same-spelled occurrence that heads a nominal phrase",
		);
		expect(iterationFive).toContain("<target>dem</target> Sack");
		expect(iterationFive).toContain("<target>an</target>");
		expect(iterationFive).toContain("an der Haltestelle");
		expect(iterationFive).not.toContain("<target>verdammte</target>");
		expect(iterationFive).not.toContain("<target>statt</target>");
		for (const heldOutWord of [
			"früher",
			"besser",
			"Wölfen",
			"Zahn",
			"Publikum",
		]) {
			expect(iterationFive).not.toContain(heldOutWord);
		}
	});

	test("teaches a frame-disjoint PairedFrame filler through the assembled prompt", () => {
		const caseId = "target-de-demo-paired-einerseits-click-einerseits";
		const systemPrompt = systemPromptForRepresentation(
			"additional-compact-indices",
			"adaptive-1",
		);

		expect(demonstrationSelection.ids).toContain(caseId);
		expect(corpus.cases[caseId]?.idealOutput).toEqual({
			decision: "Resolved",
			target: {
				family: "Construction",
				kind: "PairedFrame",
				memberSegmentIndices: [0, 5],
			},
		});
		expect(systemPrompt).toContain("<target>Einerseits</target>");
		expect(systemPrompt).toContain(
			"einerseits + andererseits are the two anchors. lokal and digital are adjective fillers. Take the anchors only.",
		);
	});

	test("teaches an inserted free modifier without absorbing it into an idiom", () => {
		const caseId = "target-de-demo-idiom-kragen-click-kragen";
		const systemPrompt = systemPromptForRepresentation(
			"additional-compact-indices",
			"adaptive-1",
		);

		expect(demonstrationSelection.ids).toContain(caseId);
		expect(corpus.cases[caseId]?.idealOutput).toEqual({
			decision: "Resolved",
			target: {
				family: "Phraseme",
				kind: "Idiom",
				memberSegmentIndices: [17, 21, 25],
			},
		});
		expect(systemPrompt).toContain('"sprichwörtliche"');
		expect(systemPrompt).toContain(
			"platzte + der + Kragen are fixed. Take those three. ihm and sprichwörtliche are free; leave them out.",
		);
	});

	test("pins a diagnostic pool of observed failures plus controlled analogues", () => {
		expect(diagnosticSelection.ids).toEqual([
			"target-de-route-construction-fusion",
			"target-de-diagnostic-fusion-am",
			"target-de-route-construction-paired-near-frueher",
			"target-de-route-construction-paired-near-besser",
			"target-de-diagnostic-paired-je-near-waermer",
			"target-de-diagnostic-paired-je-near-schoener",
			"target-de-diagnostic-paired-entweder-near-kaffee",
			"target-de-diagnostic-paired-entweder-near-tee",
			"target-de-boundary-idiom-near-endlich",
			"target-de-boundary-fixed-function-click-heult",
			"target-de-boundary-fixed-function-click-mit",
			"target-de-boundary-fixed-function-click-woelfen",
			"target-de-boundary-fixed-function-near-hungrigen",
			"target-de-diagnostic-idiom-oel-click-goss",
			"target-de-diagnostic-idiom-oel-click-oel",
			"target-de-diagnostic-idiom-oel-click-ins",
			"target-de-diagnostic-idiom-oel-click-feuer",
			"target-de-diagnostic-idiom-oel-near-zusaetzliches",
			"target-de-boundary-optional-reflexive-click-sich",
			"target-de-diagnostic-optional-reflexive-click-rasiert",
			"target-de-diagnostic-optional-reflexive-click-sich",
			"target-de-boundary-copula-click-ist",
			"target-de-diagnostic-copula-click-bleibt",
			"target-de-robust-overlap-separable-click-stellt",
			"target-de-robust-punctuation-click-auf",
			"target-de-robust-repeated-click-steht",
			"target-de-robust-repeated-near-first-auf",
			"target-de-diagnostic-repeated-click-kommt",
			"target-de-diagnostic-repeated-click-final-an",
			"target-de-diagnostic-repeated-near-first-an",
			"target-de-diagnostic-punctuation-click-hoert",
			"target-de-diagnostic-punctuation-click-auf",
			"target-de-diagnostic-overlap-click-second-schaltet",
			"target-de-diagnostic-overlap-click-aus",
		]);
		expect(diagnosticSelection.ids).toHaveLength(34);
		expect(evaluationSelection.ids).toHaveLength(94);
		expect(demonstrationSelection.isDisjointFrom(diagnosticSelection)).toBe(
			true,
		);
		expect(
			diagnosticSelection.intersection(evaluationSelection).ids,
		).toHaveLength(14);
		expect(
			diagnosticSelection.difference(evaluationSelection).ids,
		).toHaveLength(20);
		assertCaseSelectionsUncontaminated({
			route: corpus.route,
			demonstrations: demonstrationSelection,
			evaluation: diagnosticSelection,
		});
	});

	test("pins named collections and explicit published selections", () => {
		expect(corpus.all().ids).toHaveLength(227);
		expect(Object.keys(corpus.collections)).toEqual([
			"routes",
			"boundaries",
			"robustness",
			"adaptiveDevelopment",
		]);
		expect(demonstrationSelection.ids).toEqual([
			"target-de-demo-perfect-arbeiten-click-habe",
			"target-de-demo-governed-rechnen-click-rechnet",
			"target-de-demo-adjunct-rechnen-click-mit",
			"target-de-demo-idiom-faden-click-den",
			"target-de-demo-aphorism-zeit-click-ist",
			"target-de-demo-literal-gras-click-biss",
			"target-de-demo-idiom-katze-click-verdammte",
			"target-de-demo-paired-einerseits-click-einerseits",
			"target-de-demo-inherent-reflexive-click-beeile",
			"target-de-demo-optional-reflexive-click-dich",
			"target-de-demo-modal-arbeiten-click-kann",
			"target-de-demo-passive-briefe-click-werden",
			"target-de-demo-repeated-anfangen-click-final-an",
			"target-de-demo-question-stattfinden-click-statt",
			"target-de-demo-typo-mitmachen-click-mit",
			"target-de-demo-predicative-cringe-click-cringe",
			"target-de-demo-paired-sowohl-click-robust",
			"target-de-demo-idiom-kragen-click-kragen",
			"target-de-demo-symbol-percent",
			"target-de-core-unresolved-qzxv",
		]);
		expect(demonstrationSelection.ids).toHaveLength(20);
		expect(demonstrationSelection.ids.length).toBeLessThanOrEqual(35);
		expect(evaluationSelection.ids).toHaveLength(94);
		expect(demonstrationSelection.isDisjointFrom(evaluationSelection)).toBe(
			true,
		);
		expect(
			demonstrationSelection.union(evaluationSelection).ids,
		).toHaveLength(114);
		const demonstrationSentences = demonstrationSelection.cases.map(
			(testCase) => JSON.stringify(testCase.input.segments),
		);
		expect(new Set(demonstrationSentences).size).toBe(
			demonstrationSentences.length,
		);
	});

	test("derives production demonstrations and frozen evaluation from one corpus", () => {
		expect(productionDemonstrationSelection.ids).toHaveLength(21);
		expect(evaluationSelection.ids).toHaveLength(94);
		expect(
			productionDemonstrationSelection.isDisjointFrom(
				evaluationSelection,
			),
		).toBe(true);
		expect(
			productionDemonstrationSelection.intersection(evaluationSelection)
				.isEmpty,
		).toBe(true);
		expect(
			corpus
				.select([
					...productionDemonstrationSelection.ids,
					...evaluationSelection.ids,
				])
				.difference(productionDemonstrationSelection).ids,
		).toEqual(evaluationSelection.ids);
		expect(Object.keys(productionDemonstrationGuidance)).toEqual([
			...productionDemonstrationSelection.ids,
		]);
		assertCaseSelectionsUncontaminated({
			route: corpus.route,
			demonstrations: productionDemonstrationSelection,
			evaluation: evaluationSelection,
		});
	});

	test("freezes the 7 v16 misses plus 23 novel adaptive probes", () => {
		expect(adaptiveDevelopmentSelection.ids).toHaveLength(30);
		expect(adaptiveCarryoverSelection.ids).toEqual([
			"target-de-route-construction-fusion",
			"target-de-route-construction-paired-near-frueher",
			"target-de-route-construction-paired-near-besser",
			"target-de-boundary-perfect-near-laut",
			"target-de-boundary-fixed-function-click-mit",
			"target-de-boundary-fixed-function-click-den",
			"target-de-robust-repeated-near-first-auf",
		]);
		expect(adaptiveNovelSelection.ids).toHaveLength(23);
		expect(adaptiveDevelopmentSelection.ids.slice(0, 7)).toEqual([
			...adaptiveCarryoverSelection.ids,
		]);
		expect(adaptiveDevelopmentSelection.ids.slice(7)).toEqual([
			...adaptiveNovelSelection.ids,
		]);
		const additions = adaptiveNovelSelection;
		expect(
			additions.ids.every((id) => id.startsWith("target-de-adaptive-")),
		).toBe(true);
		expect(
			demonstrationSelection.isDisjointFrom(adaptiveDevelopmentSelection),
		).toBe(true);
		assertCaseSelectionsUncontaminated({
			route: corpus.route,
			demonstrations: demonstrationSelection,
			evaluation: adaptiveDevelopmentSelection,
		});
		assertCaseSelectionsUncontaminated({
			route: corpus.route,
			demonstrations: evaluationSelection,
			evaluation: adaptiveNovelSelection,
		});
		for (const goldenCase of additions.cases) {
			expect(goldenCase.explanation).toContain("Source: https://");
			expect(goldenCase.contaminationKeys).toHaveLength(1);
		}
		expect(
			additions.ids.filter((id) => id.includes("-fusion-")),
		).toHaveLength(4);
		expect(
			additions.ids.filter((id) => id.includes("-paired-")),
		).toHaveLength(6);
		expect(
			additions.ids.filter((id) =>
				/[/-](perfect|future|passive|separable)-/u.test(id),
			),
		).toHaveLength(4);
		expect(
			additions.ids.filter((id) => id.includes("-idiom-")),
		).toHaveLength(5);
		expect(
			additions.ids.filter((id) => id.includes("-repeated-")),
		).toHaveLength(4);
	});

	test("covers every classifier route except deliberately omitted Collocation", () => {
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
		const reachable = Object.entries(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES)
			.flatMap(([family, kinds]) =>
				kinds.map((kind) => `${family}/${kind}`),
			)
			.filter((route) => route !== "Phraseme/Collocation");
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
		expect(GERMAN_REACHABLE_HIGH_LEVEL_ROUTES.Phraseme).toContain(
			"Collocation",
		);
		expect(covered.has("Phraseme/Collocation")).toBe(false);
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

	test("pins the suspended-compound target boundary matrix", () => {
		const cases = corpus.cases;
		expect(
			cases["target-de-suspended-compound-and-left"]?.idealOutput,
		).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [4],
			},
		});
		expect(
			cases["target-de-suspended-compound-and-right"]?.idealOutput,
		).toMatchObject({ target: { memberSegmentIndices: [8] } });
		expect(
			cases["target-de-suspended-compound-or-left"]?.idealOutput,
		).toMatchObject({ target: { memberSegmentIndices: [4] } });
		expect(
			cases["target-de-suspended-compound-context-free"]?.idealOutput,
		).toEqual({ decision: "Unresolved" });
		expect(
			cases["target-de-suspended-compound-en-dash-lookalike"]?.input
				.segments[5],
		).toEqual({ kind: "Punctuation", text: "–" });
		expect(
			cases["target-de-suspended-compound-malformed-double-hyphen"]
				?.idealOutput,
		).toEqual({ decision: "Unresolved" });
		expect(
			cases[
				"target-de-suspended-compound-malformed-double-hyphen"
			]?.input.segments.slice(4, 6),
		).toEqual([
			{ kind: "ResolvableText", text: "Kinder-" },
			{ kind: "Punctuation", text: "-" },
		]);
	});

	test("classifies former Collocation members as standalone Lexemes", () => {
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

	test("routes former Collocation stimuli by the clicked occurrence", () => {
		const expected = {
			"target-de-route-phraseme-collocation-massnahmen-click-ergriff": [
				"VERB",
				6,
			],
			"target-de-route-phraseme-collocation-kritik-click-kritik": [
				"NOUN",
				12,
			],
			"target-de-route-phraseme-collocation-ruecksicht-click-nahm": [
				"VERB",
				6,
			],
			"target-de-route-phraseme-collocation-verfuegung-click-verfuegung":
				["NOUN", 18],
			"target-de-route-phraseme-collocation-antrag-click-antrag": [
				"NOUN",
				14,
			],
		} as const;

		for (const [caseId, [kind, memberSegmentIndex]] of Object.entries(
			expected,
		)) {
			expect(corpus.cases[caseId]?.idealOutput).toEqual({
				decision: "Resolved",
				target: {
					family: "Lexeme",
					kind,
					memberSegmentIndices: [memberSegmentIndex],
				},
			});
		}
		expect(
			corpus.cases[
				"target-de-route-phraseme-collocation-verfuegung-click-zur"
			]?.idealOutput,
		).toEqual({
			decision: "Resolved",
			target: {
				family: "Construction",
				kind: "Fusion",
				memberSegmentIndices: [16],
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
