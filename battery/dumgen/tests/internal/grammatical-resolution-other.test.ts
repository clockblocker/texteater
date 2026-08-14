import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	acceptanceEvaluation,
	developmentEvaluation,
	otherGrammaticalResolutionAcceptanceExperiment,
	otherGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-other/evaluation-suite";
import { evaluateOtherGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-other/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/other/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/other/prompt-source";
import {
	buildDeOtherCitationSurfaceCodec,
	buildDeOtherInflectionSurfaceCodec,
	deOtherLemmaCodec,
	deOtherModelCitationSurfaceSchema,
	deOtherModelInflectionalFeaturesSchema,
	deOtherModelInflectionSurfaceSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/other/schemas";

describe("Lexeme/X canonical total contract", () => {
	test("freezes 36 cases into disjoint 8/18/10 partitions", () => {
		expect(corpus.all().ids).toHaveLength(36);
		expect(demonstrations.ids).toHaveLength(8);
		expect(developmentEvaluation.ids).toHaveLength(18);
		expect(acceptanceEvaluation.ids).toHaveLength(10);
		expect(demonstrations.isDisjointFrom(developmentEvaluation)).toBe(true);
		expect(demonstrations.isDisjointFrom(acceptanceEvaluation)).toBe(true);
		expect(developmentEvaluation.isDisjointFrom(acceptanceEvaluation)).toBe(
			true,
		);
		expect(
			new Set(
				demonstrations
					.union(developmentEvaluation)
					.union(acceptanceEvaluation).ids,
			),
		).toEqual(new Set(corpus.all().ids));
		expect(developmentEvaluation).toBe(
			otherGrammaticalResolutionExperiment.evaluation,
		);
		expect(acceptanceEvaluation).toBe(
			otherGrammaticalResolutionAcceptanceExperiment.evaluation,
		);
	});

	test("uses aligned canonical input and the strict flat C|I codec DTO", () => {
		for (const testCase of corpus.all().cases) {
			const markedMembers = [
				...testCase.input.markedContext.matchAll(
					/<TARGET>([^<>]+)<\/TARGET>/gu,
				),
			].map((match) => match[1] ?? "");
			expect(inputSchema.parse(testCase.input).members).toEqual(
				markedMembers,
			);
			expect(outputSchema.parse(testCase.idealOutput)).toEqual(
				testCase.idealOutput,
			);
			expect(testCase.idealOutput.memberOrthographies).toHaveLength(
				testCase.input.members.length,
			);
			expect(testCase.idealOutput.normalizedMembers).toHaveLength(
				testCase.input.members.length,
			);
			expect("decision" in testCase.idealOutput).toBe(false);
			expect("realizationCoverage" in testCase.idealOutput).toBe(false);
		}

		const fixture = corpus.cases["grammar-de-x-dev-foreign-anyway"];
		if (fixture === undefined) throw new Error("Missing X fixture.");
		for (const extra of [
			{ decision: "Resolved" },
			{ realizationCoverage: "Full" },
			{ language: "de" },
		]) {
			expect(
				outputSchema.safeParse({ ...fixture.idealOutput, ...extra })
					.success,
			).toBe(false);
		}
		expect(
			inputSchema.safeParse({
				markedContext: "Im Feld stand <TARGET>zorp</TARGET>.",
				members: ["Zorp"],
			}).success,
		).toBe(false);
		expect(
			deOtherModelInflectionalFeaturesSchema.safeParse({
				case: null,
				gender: null,
				mood: null,
				number: null,
				verbForm: null,
			}).success,
		).toBe(false);
	});

	test("covers X identities, route controls, codec features, and orthography", () => {
		const cases = corpus.all().cases;
		for (const key of ["abbr", "foreign", "hyph", "numType"] as const) {
			expect(
				cases.some(
					(testCase) =>
						testCase.idealOutput.lemma.coreFeatures[key] !== null,
				),
			).toBe(true);
		}
		for (const value of ["Acc", "Dat", "Gen", "Nom"] as const) {
			expect(
				cases.some(
					(testCase) =>
						"inflectionalFeatures" in
							testCase.idealOutput.surface &&
						testCase.idealOutput.surface.inflectionalFeatures
							.case === value,
				),
			).toBe(true);
		}
		for (const value of ["Imp", "Ind", "Sub"] as const) {
			expect(
				cases.some(
					(testCase) =>
						"inflectionalFeatures" in
							testCase.idealOutput.surface &&
						testCase.idealOutput.surface.inflectionalFeatures
							.mood === value,
				),
			).toBe(true);
		}
		for (const value of ["Fin", "Inf", "Part"] as const) {
			expect(
				cases.some(
					(testCase) =>
						"inflectionalFeatures" in
							testCase.idealOutput.surface &&
						testCase.idealOutput.surface.inflectionalFeatures
							.verbForm === value,
				),
			).toBe(true);
		}
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
		expect(
			cases.some(
				(testCase) =>
					"inflectionalFeatures" in testCase.idealOutput.surface,
			),
		).toBe(true);
		expect(
			cases.some(
				(testCase) =>
					!("inflectionalFeatures" in testCase.idealOutput.surface),
			),
		).toBe(true);
		expect(
			corpus.cases["grammar-de-x-dev-near-opaque-foobar"]?.input
				.markedContext,
		).toContain("????");
		expect(
			corpus.cases["grammar-de-x-dev-near-known-routes-yeet"]?.input
				.markedContext,
		).toContain("Paris");
	});

	test("restores fixed X identity and linked Citation or Inflection codecs", () => {
		const citation = corpus.cases["grammar-de-x-dev-foreign-anyway"];
		const inflection = corpus.cases["grammar-de-x-dev-unknown-glorpt-fin"];
		if (citation === undefined || inflection === undefined)
			throw new Error("Missing X fixtures.");

		const citationLemma = deOtherLemmaCodec.decode(
			citation.idealOutput.lemma,
		);
		expect(citationLemma).toMatchObject({
			language: "de",
			family: "Lexeme",
			kind: "X",
		});
		expect(
			buildDeOtherCitationSurfaceCodec(citationLemma).decode({
				...citation.idealOutput.surface,
				surfaceKind: "Citation",
				normalizedSurface:
					citation.idealOutput.normalizedMembers.join(" "),
			}),
		).toMatchObject({
			language: "de",
			surfaceKind: "Citation",
			lemma: citationLemma,
		});

		const inflectionLemma = deOtherLemmaCodec.decode(
			inflection.idealOutput.lemma,
		);
		const inflectionSurface = inflection.idealOutput.surface;
		if (!("inflectionalFeatures" in inflectionSurface))
			throw new Error("Expected Inflection X fixture.");
		expect(
			buildDeOtherInflectionSurfaceCodec(inflectionLemma).decode({
				...inflectionSurface,
				normalizedSurface:
					inflection.idealOutput.normalizedMembers.join(" "),
			}),
		).toMatchObject({
			language: "de",
			surfaceKind: "Inflection",
			lemma: inflectionLemma,
		});
		expect(
			deOtherModelCitationSurfaceSchema.safeParse(
				citation.idealOutput.surface,
			).success,
		).toBe(true);
		expect(
			deOtherModelInflectionSurfaceSchema.safeParse(
				inflection.idealOutput.surface,
			).success,
		).toBe(true);
	});

	test("assembles fixed-route policy and exact diagnostics", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("already-classified German Lexeme/X");
		expect(prompt).toContain("Always resolve the supplied X");
		expect(prompt).toContain(
			"Never turn X back into a diagnostic Unresolved",
		);
		expect(prompt).toContain(
			"Use Citation when the occurrence expresses no",
		);
		expect(prompt).toContain("at least one non-null feature");
		expect(prompt).toContain("Full realization coverage");
		expect(prompt).toContain("<TARGET>zorp</TARGET>");
		expect(prompt).not.toContain("<TARGET>flob</TARGET>");

		const testCase = corpus.cases["grammar-de-x-dev-unknown-glorpt-fin"];
		if (testCase === undefined) throw new Error("Missing X fixture.");
		expect(
			evaluateOtherGrammaticalResolution({
				caseId: "grammar-de-x-dev-unknown-glorpt-fin",
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
