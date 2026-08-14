import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	auxiliaryGrammaticalResolutionAcceptanceExperiment,
	auxiliaryGrammaticalResolutionExperiment,
	developmentEvaluation,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-auxiliary/evaluation-suite";
import { evaluateAuxiliaryGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-auxiliary/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/auxiliary/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/auxiliary/prompt-source";
import {
	inputSchema,
	modelCitationSurfaceSchema,
	modelInflectionalFeaturesSchema,
	modelInflectionSurfaceSchema,
	modelLemmaSchema,
	outputSchema,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/auxiliary/schemas";

const expectedDemonstrationIds = [
	"grammar-de-aux-demo-future-wird",
	"grammar-de-aux-demo-modal-kann",
	"grammar-de-aux-demo-copula-ist",
	"grammar-de-aux-demo-citation-duerfen",
	"grammar-de-aux-demo-imperative-sei",
	"grammar-de-aux-demo-typo-sol",
] as const;

const expectedDevelopmentIds = [
	"grammar-de-aux-dev-perfect-hat-gegessen",
	"grammar-de-aux-dev-perfect-waren-gegangen",
	"grammar-de-aux-dev-passive-wird-repariert",
	"grammar-de-aux-dev-passive-wurde-gesperrt",
	"grammar-de-aux-dev-copula-bin-muede",
	"grammar-de-aux-dev-subjunctive-sei-gegangen",
	"grammar-de-aux-dev-subjunctive-waeren-geblieben",
	"grammar-de-aux-dev-modal-darf-bleiben",
	"grammar-de-aux-dev-modal-wolltest-gehen",
	"grammar-de-aux-dev-modal-moechte-bleiben",
	"grammar-de-aux-dev-modal-sollen-syncretic",
	"grammar-de-aux-dev-infinitive-sein",
	"grammar-de-aux-dev-infinitive-passive-werden",
	"grammar-de-aux-dev-participle-gewesen",
	"grammar-de-aux-dev-participle-worden",
	"grammar-de-aux-dev-typo-mus",
	"grammar-de-aux-dev-variant-muss",
	"grammar-de-aux-dev-contrast-modal-mag",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-aux-accept-perfect-ist-gegangen",
	"grammar-de-aux-accept-future-werden-abreisen",
	"grammar-de-aux-accept-passive-wurden-gerufen",
	"grammar-de-aux-accept-copula-war-ruhig",
	"grammar-de-aux-accept-subjunctive-haette",
	"grammar-de-aux-accept-modal-muessen",
	"grammar-de-aux-accept-modal-mag",
	"grammar-de-aux-accept-modal-wollt",
	"grammar-de-aux-accept-citation-sein",
	"grammar-de-aux-accept-infinitive-haben",
	"grammar-de-aux-accept-typo-koenen",
	"grammar-de-aux-accept-archaic-ward",
] as const;

describe("Lexeme/AUX route-local schemas and corpus", () => {
	test("uses canonical input and a total flat AUX codec DTO", () => {
		expect(
			inputSchema.parse({
				markedContext: "Mara <TARGET>wird</TARGET> abreisen.",
				members: ["wird"],
			}),
		).toEqual({
			markedContext: "Mara <TARGET>wird</TARGET> abreisen.",
			members: ["wird"],
		});
		expect(() =>
			inputSchema.parse({
				markedContext: "Mara <TARGET>wird</TARGET> abreisen.",
				members: ["abreisen"],
			}),
		).toThrow(/members must exactly match/);

		const modelOutput = outputSchema.parse({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["wird"],
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
					verbForm: "Fin",
					voice: null,
				},
			},
			lemma: {
				canonicalForm: "werden",
				coreFeatures: { verbType: null },
			},
		});
		expect(Object.keys(modelOutput)).toEqual([
			"memberOrthographies",
			"normalizedMembers",
			"surface",
			"lemma",
		]);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				resolution: modelOutput,
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...modelOutput,
				realizationCoverage: "Full",
			}).success,
		).toBe(false);
		expect(() =>
			modelLemmaSchema.parse({
				...modelOutput.lemma,
				coreFeatures: {
					...modelOutput.lemma.coreFeatures,
					hasGovPrep: null,
				},
			}),
		).toThrow();
		expect(() =>
			modelLemmaSchema.parse({ ...modelOutput.lemma, language: "de" }),
		).toThrow();
		expect(
			modelCitationSurfaceSchema.safeParse({
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}).success,
		).toBe(true);
		expect(
			modelInflectionSurfaceSchema.safeParse(modelOutput.surface).success,
		).toBe(true);
	});

	test("preserves every structural branch of the AUX inflection codec", () => {
		for (const features of [
			{
				number: "Sing",
				tense: null,
				verbForm: null,
				voice: null,
			},
			{
				mood: "Imp",
				number: "Plur",
				person: "2",
				tense: null,
				verbForm: "Fin",
				voice: null,
			},
			{
				mood: null,
				number: "Plur",
				person: "1",
				tense: "Pres",
				verbForm: "Fin",
				voice: null,
			},
			{
				mood: null,
				number: null,
				person: null,
				tense: null,
				verbForm: "Inf",
				voice: "Pass",
			},
			{
				aspect: null,
				gender: null,
				mood: null,
				number: null,
				person: null,
				tense: null,
				verbForm: "Part",
				voice: "Pass",
			},
		] as const) {
			expect(
				modelInflectionalFeaturesSchema.safeParse(features).success,
			).toBe(true);
		}
		expect(
			modelInflectionalFeaturesSchema.safeParse({
				number: null,
				tense: null,
				verbForm: null,
				voice: null,
			}).success,
		).toBe(false);
	});

	test("freezes 36 cases into disjoint grammatical partitions", () => {
		expect(corpus.all().ids).toHaveLength(36);
		expect(demonstrations.ids).toEqual(expectedDemonstrationIds);
		expect(developmentEvaluation.ids).toEqual(expectedDevelopmentIds);
		expect(untouchedAcceptanceEvaluation.ids).toEqual(
			expectedAcceptanceIds,
		);
		expect(demonstrations.ids).toHaveLength(6);
		expect(developmentEvaluation.ids).toHaveLength(18);
		expect(untouchedAcceptanceEvaluation.ids).toHaveLength(12);
		expect(demonstrations.isDisjointFrom(developmentEvaluation)).toBe(true);
		expect(
			demonstrations.isDisjointFrom(untouchedAcceptanceEvaluation),
		).toBe(true);
		expect(
			developmentEvaluation.isDisjointFrom(untouchedAcceptanceEvaluation),
		).toBe(true);
		expect(
			demonstrations
				.union(developmentEvaluation)
				.union(untouchedAcceptanceEvaluation).ids,
		).toHaveLength(36);
		expect(developmentEvaluation).toBe(
			auxiliaryGrammaticalResolutionExperiment.evaluation,
		);
		expect(untouchedAcceptanceEvaluation).toBe(
			auxiliaryGrammaticalResolutionAcceptanceExperiment.evaluation,
		);

		for (const testCase of corpus.all().cases) {
			const markedMembers = [
				...testCase.input.markedContext.matchAll(
					/<TARGET>([^<>]+)<\/TARGET>/gu,
				),
			].map((match) => match[1]);
			expect(markedMembers).toEqual(testCase.input.members);
			expect(testCase.idealOutput.memberOrthographies).toHaveLength(
				testCase.input.members.length,
			);
			expect(testCase.idealOutput.normalizedMembers).toHaveLength(
				testCase.input.members.length,
			);
			expect("decision" in testCase.idealOutput).toBe(false);
			expect("realizationCoverage" in testCase.idealOutput).toBe(false);
		}
	});

	test("covers modal identity, all normal Surface forms, voice, and orthography", () => {
		const cases = corpus.all().cases;
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.lemma.coreFeatures.verbType === "Mod",
			),
		).toHaveLength(14);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.surfaceKind === "Citation",
			),
		).toHaveLength(2);
		const inflectional = cases.flatMap((testCase) =>
			testCase.idealOutput.surface.surfaceKind === "Inflection"
				? [testCase.idealOutput.surface.inflectionalFeatures]
				: [],
		);
		for (const verbForm of ["Fin", "Inf", "Part"] as const) {
			expect(
				inflectional.some((features) => features.verbForm === verbForm),
			).toBe(true);
		}
		expect(
			inflectional.some(
				(features) => "mood" in features && features.mood === "Imp",
			),
		).toBe(true);
		expect(
			inflectional.some(
				(features) => "mood" in features && features.mood === null,
			),
		).toBe(true);
		expect(
			inflectional.filter((features) => features.voice === "Pass"),
		).toHaveLength(6);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.memberOrthographies[0] === "Typo",
			),
		).toHaveLength(3);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.spelling === "Variant",
			),
		).toHaveLength(2);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.surfaceFeatures !== null,
			),
		).toHaveLength(1);
	});

	test("assembles only the total classified AUX contract and demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("already-classified German Lexeme/AUX");
		expect(prompt).toContain("meaning-bearing modal");
		expect(prompt).toContain('voice: "Pass" | null');
		expect(prompt).toContain("Do not return VERB-only hasGovPrep");
		expect(prompt).toContain("<TARGET>wird</TARGET> morgen abreisen");
		expect(prompt).toContain("<TARGET>kann</TARGET> schon schwimmen");
		expect(prompt).toContain("<TARGET>Sei</TARGET> bitte vorsichtig");
		expect(prompt).toContain("<TARGET>sol</TARGET> jetzt warten");
		expect(prompt).not.toContain("<TARGET>wurde</TARGET> gestern gesperrt");
		expect(prompt).not.toContain(
			"<TARGET>ward</TARGET> freundlich empfangen",
		);
	});
});

describe("Lexeme/AUX pure diagnostic evaluator", () => {
	test("passes every frozen development and acceptance ideal output", () => {
		for (const experiment of [
			auxiliaryGrammaticalResolutionExperiment,
			auxiliaryGrammaticalResolutionAcceptanceExperiment,
		]) {
			for (const [index, caseId] of experiment.evaluation.ids.entries()) {
				const testCase = experiment.evaluation.cases[index];
				if (testCase === undefined)
					throw new Error(`Missing ${caseId}.`);
				const result = experiment.evaluator({
					caseId,
					input: testCase.input,
					idealOutput: testCase.idealOutput,
					output: testCase.idealOutput,
				});

				expect(result.contractPass).toBe(true);
				expect(Object.values(result).every(Boolean)).toBe(true);
			}
		}
	});

	test("reports normalization, inflection, and Core Feature misses independently", () => {
		const testCase =
			corpus.cases["grammar-de-aux-dev-passive-wird-repariert"];
		if (
			testCase === undefined ||
			testCase.idealOutput.surface.surfaceKind !== "Inflection"
		) {
			throw new Error("Missing passive AUX fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			normalizedMembers: ["werden"],
			surface: {
				...testCase.idealOutput.surface,
				inflectionalFeatures: {
					...testCase.idealOutput.surface.inflectionalFeatures,
					voice: null,
				},
			},
			lemma: {
				...testCase.idealOutput.lemma,
				coreFeatures: { verbType: "Mod" },
			},
		});
		const result = evaluateAuxiliaryGrammaticalResolution({
			caseId: "grammar-de-aux-dev-passive-wird-repariert",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.surfaceKindPass).toBe(true);
	});

	test("canonicalizes an all-null model feature bag like the route seam", () => {
		const testCase =
			corpus.cases["grammar-de-aux-dev-perfect-hat-gegessen"];
		if (testCase === undefined) throw new Error("Missing AUX fixture.");
		const output = outputSchema.parse({
			...testCase.idealOutput,
			surface: {
				...testCase.idealOutput.surface,
				surfaceFeatures: { historicalStatus: null },
			},
		});
		const result = evaluateAuxiliaryGrammaticalResolution({
			caseId: "grammar-de-aux-dev-perfect-hat-gegessen",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
