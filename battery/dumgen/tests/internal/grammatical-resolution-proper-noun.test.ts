import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	developmentEvaluation,
	properNounGrammaticalResolutionAcceptanceExperiment,
	properNounGrammaticalResolutionExperiment,
	untouchedAcceptanceEvaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-proper-noun/evaluation-suite";
import { evaluateProperNounGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-proper-noun/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/proper-noun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/proper-noun/prompt-source";
import {
	deProperNounModelCitationSurfaceSchema,
	deProperNounModelInflectionSurfaceSchema,
	deProperNounModelLemmaSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/proper-noun/schemas";

const expectedDemoIds = [
	"grammar-de-propn-demo-person-maria",
	"grammar-de-propn-demo-place-berlin",
	"grammar-de-propn-demo-multi-angela-merkel",
	"grammar-de-propn-demo-genitive-hans",
	"grammar-de-propn-demo-acronym-nato",
	"grammar-de-propn-demo-typo-koelnn",
	"grammar-de-propn-demo-citation-work-tonio-kroeger",
	"grammar-de-propn-demo-org-unesco",
	"grammar-de-propn-demo-vocative-clara",
	"grammar-de-propn-demo-stylized-ebay",
	"grammar-de-propn-demo-org-rotes-kreuz",
	"grammar-de-propn-demo-work-physiker",
	"grammar-de-propn-demo-integrated-lego",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-propn-accept-v3-person-leonie",
	"grammar-de-propn-accept-v3-place-saarland",
	"grammar-de-propn-accept-v3-multi-garmisch-partenkirchen",
	"grammar-de-propn-accept-v3-org-zdf",
	"grammar-de-propn-accept-v3-product-thermomix",
	"grammar-de-propn-accept-v3-work-nibelungenlied",
	"grammar-de-propn-accept-v3-citation-mainz",
	"grammar-de-propn-accept-v3-foreign-rio-de-janeiro",
	"grammar-de-propn-accept-v3-genitive-max",
	"grammar-de-propn-accept-v3-typo-hannnover",
	"grammar-de-propn-accept-v3-variant-preussen",
	"grammar-de-propn-accept-v3-plural-balearen",
] as const;

describe("Lexeme/PROPN route-local migration", () => {
	test("uses exact input and smallest total flat C|I DTO", () => {
		expect(
			inputSchema.parse({
				markedContext:
					"<TARGET>Angela</TARGET> <TARGET>Merkel</TARGET> sprach.",
				members: ["Angela", "Merkel"],
			}),
		).toBeDefined();
		expect(() =>
			inputSchema.parse({
				markedContext:
					"<TARGET>Angela</TARGET> <TARGET>Merkel</TARGET> sprach.",
				members: ["Merkel", "Angela"],
			}),
		).toThrow(/members must exactly match/);

		const inflection = corpus.cases["grammar-de-propn-demo-person-maria"];
		const citation = corpus.cases["grammar-de-propn-dev-citation-hamburg"];
		if (inflection === undefined || citation === undefined)
			throw new Error("Expected PROPN fixtures.");
		expect(outputSchema.parse(inflection.idealOutput)).toEqual(
			inflection.idealOutput,
		);
		expect(Object.keys(inflection.idealOutput)).toEqual([
			"memberOrthographies",
			"normalizedMembers",
			"surface",
			"lemma",
		]);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				resolution: inflection.idealOutput,
			}).success,
		).toBe(false);
		expect(
			deProperNounModelInflectionSurfaceSchema.safeParse(
				inflection.idealOutput.surface,
			).success,
		).toBe(true);
		expect(
			deProperNounModelCitationSurfaceSchema.safeParse(
				citation.idealOutput.surface,
			).success,
		).toBe(true);
		expect(() =>
			deProperNounModelLemmaSchema.parse({
				...inflection.idealOutput.lemma,
				language: "de",
			}),
		).toThrow();
	});

	test("freezes 46 realistic cases into disjoint 13/21/12 partitions", () => {
		expect(corpus.all().ids).toHaveLength(46);
		expect(demonstrations.ids).toEqual(expectedDemoIds);
		expect(developmentEvaluation.ids).toHaveLength(21);
		expect(untouchedAcceptanceEvaluation.ids).toEqual(
			expectedAcceptanceIds,
		);
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
		).toHaveLength(46);
		expect(developmentEvaluation).toBe(
			properNounGrammaticalResolutionExperiment.evaluation,
		);
		expect(untouchedAcceptanceEvaluation).toBe(
			properNounGrammaticalResolutionAcceptanceExperiment.evaluation,
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

	test("covers names, codec fields, multi-members, forms, and fixed neighbors", () => {
		const cases = corpus.all().cases;
		for (const key of ["abbr", "foreign", "gender"] as const) {
			expect(
				cases.some(
					(testCase) =>
						testCase.idealOutput.lemma.coreFeatures[key] !== null,
				),
			).toBe(true);
		}
		for (const caseValue of ["Acc", "Dat", "Gen", "Nom"] as const) {
			expect(
				cases.some(
					(testCase) =>
						"inflectionalFeatures" in
							testCase.idealOutput.surface &&
						testCase.idealOutput.surface.inflectionalFeatures
							.case === caseValue,
				),
			).toBe(true);
		}
		expect(
			cases.some((testCase) => testCase.input.members.length > 1),
		).toBe(true);
		expect(
			cases.some((testCase) =>
				testCase.idealOutput.memberOrthographies.includes("Typo"),
			),
		).toBe(true);
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.surface.spelling === "Variant",
			),
		).toBe(true);
		expect(
			cases.some(
				(testCase) =>
					testCase.idealOutput.surface.surfaceFeatures !== null,
			),
		).toBe(true);
		for (const anchor of ["not reclassified as ADJ", "common NOUN Stadt"])
			expect(
				cases.some((testCase) =>
					testCase.explanation?.includes(anchor),
				),
			).toBe(true);
	});

	test("assembles fixed-route policy and scores exact diagnostics", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("already-classified German Lexeme/PROPN");
		expect(prompt).toContain("Always return one total flat resolution");
		expect(prompt).toContain("members: string[]");
		expect(prompt).toContain(
			"A proper name may have one member or several",
		);
		expect(prompt).toContain("The PROPN route is authoritative");
		expect(prompt).toContain("never import surrounding punctuation from");
		expect(prompt).toContain("outside TARGET into normalizedMembers");
		expect(prompt).toContain("realizationCoverage Full");
		expect(prompt).toContain("<TARGET>Angela</TARGET>");
		expect(prompt).not.toContain("<TARGET>Leonie</TARGET>");

		const testCase = corpus.cases["grammar-de-propn-dev-org-deutsche-bank"];
		if (testCase === undefined) throw new Error("Expected PROPN fixture.");
		expect(
			evaluateProperNounGrammaticalResolution({
				caseId: "grammar-de-propn-dev-org-deutsche-bank",
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			}),
		).toEqual({
			contractPass: true,
			memberCountPass: true,
			memberOrthographiesPass: true,
			surfaceKindPass: true,
			normalizedSurfacePass: true,
			spellingPass: true,
			surfaceFeaturesPass: true,
			inflectionalFeaturesPass: true,
			canonicalFormPass: true,
			coreFeaturesPass: true,
		});
	});
});
