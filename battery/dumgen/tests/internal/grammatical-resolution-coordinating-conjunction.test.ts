import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	coordinatingConjunctionGrammaticalResolutionAcceptanceExperiment,
	coordinatingConjunctionGrammaticalResolutionExperiment,
	developmentEvaluation,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-coordinating-conjunction/evaluation-suite";
import { evaluateCoordinatingConjunctionGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-coordinating-conjunction/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/prompt-source";
import {
	deCoordinatingConjunctionLemmaCodec,
	deCoordinatingConjunctionModelCitationSurfaceSchema,
	deCoordinatingConjunctionModelLemmaSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/schemas";

const expectedDemonstrationIds = [
	"grammar-de-cconj-demo-ordinary-und",
	"grammar-de-cconj-demo-comparative-als",
	"grammar-de-cconj-demo-causal-denn",
	"grammar-de-cconj-demo-typo-udn",
	"grammar-de-cconj-demo-variant-bzw",
	"grammar-de-cconj-demo-archaic-allein",
] as const;

const expectedDevelopmentIds = [
	"grammar-de-cconj-dev-ordinary-oder-nouns",
	"grammar-de-cconj-dev-adversative-aber-clauses",
	"grammar-de-cconj-dev-adversative-doch-clauses",
	"grammar-de-cconj-dev-corrective-sondern",
	"grammar-de-cconj-dev-additive-sowie",
	"grammar-de-cconj-dev-beziehungsweise-full",
	"grammar-de-cconj-dev-sentence-initial-und",
	"grammar-de-cconj-dev-repeated-second-und",
	"grammar-de-cconj-dev-comparative-wie",
	"grammar-de-cconj-dev-comparative-als-mehr",
	"grammar-de-cconj-dev-jedoch-null-position",
	"grammar-de-cconj-dev-aber-not-particle",
	"grammar-de-cconj-dev-doch-not-particle",
	"grammar-de-cconj-dev-denn-verb-second-anchor",
	"grammar-de-cconj-dev-oder-without-paired-frame",
	"grammar-de-cconj-dev-typo-odre",
	"grammar-de-cconj-dev-typo-sonedrn",
	"grammar-de-cconj-dev-variant-bzw-initial",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-cconj-accept-und-list",
	"grammar-de-cconj-accept-oder-clauses",
	"grammar-de-cconj-accept-aber-adjectives",
	"grammar-de-cconj-accept-sowie-subjects",
	"grammar-de-cconj-accept-variant-u",
	"grammar-de-cconj-accept-comparative-als-tiefer",
	"grammar-de-cconj-accept-comparative-wie-ebenso",
	"grammar-de-cconj-accept-denn-causal",
	"grammar-de-cconj-accept-doch-sentence-initial",
	"grammar-de-cconj-accept-jedoch-null-position",
	"grammar-de-cconj-accept-typo-jedcoh",
	"grammar-de-cconj-accept-archaic-allein",
] as const;

describe("Lexeme/CCONJ route-local schemas and corpus", () => {
	test("uses the canonical input and smallest total flat codec-derived DTO", () => {
		expect(
			inputSchema.parse({
				markedContext: "Tee <TARGET>und</TARGET> Kaffee.",
				members: ["und"],
			}),
		).toEqual({
			markedContext: "Tee <TARGET>und</TARGET> Kaffee.",
			members: ["und"],
		});
		expect(() =>
			inputSchema.parse({
				markedContext: "Tee <TARGET>und</TARGET> Kaffee.",
				members: ["oder"],
			}),
		).toThrow(/members must exactly match/);

		const modelOutput = outputSchema.parse({
			memberOrthographies: ["Standard"],
			normalizedMembers: ["und"],
			surface: { spelling: "Canonical", surfaceFeatures: null },
			lemma: {
				canonicalForm: "und",
				coreFeatures: { conjType: null },
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

		expect(
			deCoordinatingConjunctionModelCitationSurfaceSchema.parse({
				spelling: "Canonical",
				surfaceFeatures: null,
			}),
		).toEqual({ spelling: "Canonical", surfaceFeatures: null });
		expect(() =>
			deCoordinatingConjunctionModelCitationSurfaceSchema.parse({
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}),
		).toThrow();
		expect(() =>
			deCoordinatingConjunctionModelLemmaSchema.parse({
				language: "de",
				canonicalForm: "und",
				coreFeatures: { conjType: null },
			}),
		).toThrow();
		expect(
			deCoordinatingConjunctionLemmaCodec.decode(modelOutput.lemma),
		).toMatchObject({
			language: "de",
			family: "Lexeme",
			kind: "CCONJ",
		});
	});

	test("freezes 36 realistic total cases into disjoint grammatical partitions", () => {
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
			coordinatingConjunctionGrammaticalResolutionExperiment.evaluation,
		);
		expect(untouchedAcceptanceEvaluation).toBe(
			coordinatingConjunctionGrammaticalResolutionAcceptanceExperiment.evaluation,
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
			expect("surfaceKind" in testCase.idealOutput.surface).toBe(false);
		}
	});

	test("covers comparison, route anchors, casing, variants, typos, and history", () => {
		const cases = corpus.all().cases;
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.lemma.coreFeatures.conjType === "Comp",
			),
		).toHaveLength(5);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.memberOrthographies[0] === "Typo",
			),
		).toHaveLength(4);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.spelling === "Variant",
			),
		).toHaveLength(3);
		expect(
			cases.filter(
				(testCase) =>
					testCase.idealOutput.surface.surfaceFeatures !== null,
			),
		).toHaveLength(2);
		for (const form of ["aber", "denn", "doch", "jedoch", "als", "wie"]) {
			expect(
				cases.some(
					(testCase) =>
						testCase.idealOutput.lemma.canonicalForm === form,
				),
			).toBe(true);
		}
		expect(
			cases.some((testCase) =>
				testCase.explanation
					?.toLocaleLowerCase("de")
					.includes("not sconj"),
			),
		).toBe(true);
		expect(
			cases.some((testCase) =>
				testCase.explanation
					?.toLocaleLowerCase("de")
					.includes("not modal part"),
			),
		).toBe(true);
		expect(
			cases.some((testCase) =>
				testCase.explanation
					?.toLocaleLowerCase("de")
					.includes("not integrated adv"),
			),
		).toBe(true);
		expect(
			cases.some((testCase) =>
				testCase.explanation?.includes("PairedFrame"),
			),
		).toBe(true);
	});

	test("assembles only the classified-target flat contract and demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("already-classified German Lexeme/CCONJ");
		expect(prompt).toContain("members: string[]");
		expect(prompt).toContain('conjType: "Comp" | null');
		expect(prompt).toContain(
			"Never return decision, resolution, Unresolved",
		);
		expect(prompt).toContain("<TARGET>udn</TARGET>");
		expect(prompt).toContain("<TARGET>bzw</TARGET>.");
		expect(prompt).not.toContain("<TARGET>odre</TARGET>");
		expect(prompt).not.toContain("<TARGET>jedcoh</TARGET>");
	});
});

describe("Lexeme/CCONJ pure diagnostic evaluator", () => {
	test("passes every frozen development and acceptance ideal output", () => {
		for (const experiment of [
			coordinatingConjunctionGrammaticalResolutionExperiment,
			coordinatingConjunctionGrammaticalResolutionAcceptanceExperiment,
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

	test("reports Core Feature, normalization, and member-count misses independently", () => {
		const testCase = corpus.cases["grammar-de-cconj-dev-comparative-wie"];
		if (testCase === undefined)
			throw new Error("Missing comparison fixture.");
		const output = outputSchema.parse({
			...testCase.idealOutput,
			memberOrthographies: ["Standard", "Standard"],
			normalizedMembers: ["als", "wie"],
			lemma: {
				...testCase.idealOutput.lemma,
				coreFeatures: { conjType: null },
			},
		});
		const result = evaluateCoordinatingConjunctionGrammaticalResolution({
			caseId: "grammar-de-cconj-dev-comparative-wie",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(false);
		expect(result.memberCountPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.spellingPass).toBe(true);
	});

	test("canonicalizes an all-null model feature bag like the codec", () => {
		const testCase =
			corpus.cases["grammar-de-cconj-dev-ordinary-oder-nouns"];
		if (testCase === undefined)
			throw new Error("Missing ordinary fixture.");
		const output = outputSchema.parse({
			...testCase.idealOutput,
			surface: {
				...testCase.idealOutput.surface,
				surfaceFeatures: { historicalStatus: null },
			},
		});
		const result = evaluateCoordinatingConjunctionGrammaticalResolution({
			caseId: "grammar-de-cconj-dev-ordinary-oder-nouns",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
