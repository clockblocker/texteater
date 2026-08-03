import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	determinerGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-determiner/evaluation-suite";
import { evaluateDeterminerGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-determiner/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/determiner/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/determiner/prompt-source";
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/determiner/schemas";

const expectedEvaluationIds = [
	"grammar-de-det-indefinite-article-einen",
	"grammar-de-det-demonstrative-diesem",
	"grammar-de-det-interrogative-welchen",
	"grammar-de-det-negative-kein",
	"grammar-de-det-total-alle",
	"grammar-de-det-total-beide-cardinal",
	"grammar-de-det-possessive-deinen",
	"grammar-de-det-possessive-unserem",
	"grammar-de-det-possessive-seinen",
	"grammar-de-det-formal-possessive-ihrem",
	"grammar-de-det-citation-jeglicher",
	"grammar-de-det-typo-keien",
	"grammar-de-det-repeated-second-einem",
	"grammar-de-det-unresolved-personal-pronoun-er",
	"grammar-de-det-unresolved-interrogative-pronoun-wer",
	"grammar-de-det-unresolved-numeral-eins",
	"grammar-de-det-unresolved-two-unrelated-targets",
	"grammar-de-det-unresolved-repeated-same-lemma-dieser",
	"grammar-de-det-unresolved-fusion-im",
] as const;

describe("Lexeme/DET route-local corpus", () => {
	test("keeps eight necessary demonstrations and 19 explicit held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(29);
		expect(demonstrations.ids).toEqual([
			"grammar-de-det-demo-definite-article-der",
			"grammar-de-det-demo-possessive-meinem",
			"grammar-de-det-demo-possessive-eurem",
			"grammar-de-det-demo-citation-irgendein",
			"grammar-de-det-demo-standalone-jener",
			"grammar-de-det-demo-unresolved-relative-der",
			"grammar-de-det-demo-unresolved-fusion-zum",
			"grammar-de-det-demo-unresolved-overbroad-dieser-alte",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			determinerGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation.ids).toHaveLength(19);
		expect(demonstrations.union(evaluation).ids).toHaveLength(27);

		const demonstrationLemmas = new Set(
			demonstrations.cases.flatMap((goldenCase) =>
				goldenCase.idealOutput.resolution === null
					? []
					: [goldenCase.idealOutput.resolution.lemma.canonicalForm],
			),
		);
		const evaluationLemmas = evaluation.cases.flatMap((goldenCase) =>
			goldenCase.idealOutput.resolution === null
				? []
				: [goldenCase.idealOutput.resolution.lemma.canonicalForm],
		);
		expect(
			evaluationLemmas.filter((lemma) => demonstrationLemmas.has(lemma)),
		).toEqual([]);
	});

	test("assembles only demonstrations and route policy", () => {
		const prompt = assembleSystemPrompt(promptSource);
		const normalizedPrompt = prompt.replaceAll(/\s+/gu, " ");

		expect(prompt).toContain("<TARGET>Der</TARGET> Hund");
		expect(prompt).toContain("<TARGET>meinem</TARGET> Bruder");
		expect(prompt).toContain("Wir folgen <TARGET>eurem</TARGET> Rat.");
		expect(prompt).toContain(
			"Wörterbucheintrag: <TARGET>irgendein</TARGET>",
		);
		expect(prompt).toContain("<TARGET>Jener</TARGET> war günstiger");
		expect(prompt).toContain("homonymous definite-article Lemma");
		expect(prompt).toContain("exact German DET schema");
		expect(normalizedPrompt).toContain("Mandatory Core Feature table");
		for (const requiredRow of [
			"Definite article der | Art | Def | null | null | null | null",
			"Indefinite article ein | Art | Ind | Card | null | null | null",
			"Demonstrative | Dem | null | null | null | null | null",
			"Interrogative | Int | null | null | null | null | null",
			"Negative kein | Neg | null | null | null | null | null",
			"Total alle | Tot | null | null | null | null | null",
			"Total beide | Tot | null | Card | null | null | null",
			"Indefinite pronominal | Ind | null | null | null | null | null",
			"Personal possessive | Prs | null | null | Yes | 1/2/3 | null",
		]) {
			expect(normalizedPrompt).toContain(requiredRow);
		}
		expect(normalizedPrompt).toContain(
			"mein, dein, and sein require number[psor] Sing",
		);
		expect(normalizedPrompt).toContain(
			"unser and euer require number[psor] Plur",
		);
		expect(normalizedPrompt).toContain(
			"Er ... seinen establishes gender[psor] Masc",
		);
		expect(normalizedPrompt).toContain(
			"Plural agreement does not erase the modified noun's gender",
		);
		expect(normalizedPrompt).toContain("Final self-check before returning");
		expect(normalizedPrompt).toContain(
			"do not copy lemma.canonicalForm into normalizedSurface",
		);
		expect(normalizedPrompt).toContain(
			"A nullable field is still mandatory in its selected schema object",
		);
		expect(prompt).toContain("preserve formal Ihr/Ihrem capitalization");
		expect(prompt).toContain("even if the marked forms repeat");
		expect(prompt).not.toContain("<TARGET>einen</TARGET> Mantel");
		expect(prompt).not.toContain("<TARGET>beide</TARGET> Wege");
		expect(prompt).not.toContain("<TARGET>unserem</TARGET> Team");
		expect(prompt).not.toContain("<TARGET>Ihrem</TARGET> Antrag");
		expect(prompt).not.toContain("<TARGET>die</TARGET> Frau");
		expect(prompt).not.toContain("<TARGET>Derlei</TARGET> Vorfälle");
	});

	test("pins possessor layers and plural noun gender independently", () => {
		function inflectionalFeatures(
			caseId:
				| "grammar-de-det-demo-possessive-eurem"
				| "grammar-de-det-total-alle"
				| "grammar-de-det-total-beide-cardinal"
				| "grammar-de-det-possessive-deinen"
				| "grammar-de-det-possessive-unserem"
				| "grammar-de-det-possessive-seinen",
		) {
			const goldenCase = corpus.cases[caseId];
			if (
				goldenCase === undefined ||
				goldenCase.idealOutput.resolution === null
			) {
				throw new Error(`Expected resolved DET fixture ${caseId}.`);
			}
			const { surface } = goldenCase.idealOutput.resolution;
			if (!("inflectionalFeatures" in surface)) {
				throw new Error(`Expected Inflection Surface for ${caseId}.`);
			}
			return surface.inflectionalFeatures;
		}

		expect(
			inflectionalFeatures("grammar-de-det-demo-possessive-eurem"),
		).toMatchObject({
			case: "Dat",
			gender: "Masc",
			number: "Sing",
			"number[psor]": "Plur",
		});
		expect(inflectionalFeatures("grammar-de-det-total-alle")).toMatchObject(
			{ gender: "Masc", number: "Plur" },
		);
		expect(
			inflectionalFeatures("grammar-de-det-total-beide-cardinal"),
		).toMatchObject({ gender: "Masc", number: "Plur" });
		expect(
			inflectionalFeatures("grammar-de-det-possessive-deinen"),
		).toMatchObject({
			gender: "Masc",
			number: "Sing",
			"number[psor]": "Sing",
		});
		expect(
			inflectionalFeatures("grammar-de-det-possessive-unserem"),
		).toMatchObject({
			gender: "Neut",
			number: "Sing",
			"number[psor]": "Plur",
		});
		expect(
			inflectionalFeatures("grammar-de-det-possessive-seinen"),
		).toMatchObject({
			gender: "Masc",
			"gender[psor]": "Masc",
			number: "Sing",
			"number[psor]": "Sing",
		});
	});

	test("keeps fixed route and linked fields outside both Surface DTOs", () => {
		const inflection = corpus.cases["grammar-de-det-demonstrative-diesem"];
		const citation = corpus.cases["grammar-de-det-citation-jeglicher"];
		if (
			inflection?.idealOutput.resolution === null ||
			citation?.idealOutput.resolution === null ||
			inflection === undefined ||
			citation === undefined
		) {
			throw new Error("Missing DET DTO fixtures.");
		}
		for (const fixture of [inflection, citation]) {
			const resolution = fixture.idealOutput.resolution;
			if (resolution === null)
				throw new Error("Expected resolved fixture.");
			expect(
				outputSchema.safeParse({
					...fixture.idealOutput,
					resolution: {
						...resolution,
						lemma: { ...resolution.lemma, language: "de" },
					},
				}).success,
			).toBe(false);
			expect(
				outputSchema.safeParse({
					...fixture.idealOutput,
					resolution: {
						...resolution,
						surface: {
							...resolution.surface,
							language: "de",
							lemma: resolution.lemma,
						},
					},
				}).success,
			).toBe(false);
		}
	});

	test("requires a non-empty exact Inflection Feature bag", () => {
		const fixture = corpus.cases["grammar-de-det-demonstrative-diesem"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing diesem fixture.");
		}
		const resolution = fixture.idealOutput.resolution;
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				resolution: {
					...resolution,
					surface: {
						...resolution.surface,
						inflectionalFeatures: {
							case: null,
							degree: null,
							gender: null,
							"gender[psor]": null,
							number: null,
							"number[psor]": null,
						},
					},
				},
			}).success,
		).toBe(false);
	});

	test("accepts Structured Outputs' null-only historical feature bag", () => {
		const fixture = corpus.cases["grammar-de-det-citation-jeglicher"];
		if (fixture?.idealOutput.resolution === null || fixture === undefined) {
			throw new Error("Missing citation fixture.");
		}
		const resolution = fixture.idealOutput.resolution;
		expect(
			outputSchema.safeParse({
				...fixture.idealOutput,
				resolution: {
					...resolution,
					surface: {
						...resolution.surface,
						surfaceFeatures: { historicalStatus: null },
					},
				},
			}).success,
		).toBe(true);
	});
});

describe("Lexeme/DET diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const goldenCase = evaluation.cases[index];
			if (goldenCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateDeterminerGrammaticalResolution({
				caseId,
				input: goldenCase.input,
				idealOutput: goldenCase.idealOutput,
				output: goldenCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports one agreement miss without weakening other diagnostics", () => {
		const goldenCase = corpus.cases["grammar-de-det-demonstrative-diesem"];
		if (
			goldenCase?.idealOutput.resolution === null ||
			goldenCase === undefined
		) {
			throw new Error("Missing diesem fixture.");
		}
		const surface = goldenCase.idealOutput.resolution.surface;
		if (!("inflectionalFeatures" in surface)) {
			throw new Error("Expected an Inflection Surface.");
		}
		const inflectionalFeatures = surface.inflectionalFeatures as Record<
			string,
			unknown
		>;
		const output = outputSchema.parse({
			...goldenCase.idealOutput,
			resolution: {
				...goldenCase.idealOutput.resolution,
				surface: {
					...surface,
					inflectionalFeatures: {
						...inflectionalFeatures,
						case: "Acc",
					},
				},
			},
		});
		const result = evaluateDeterminerGrammaticalResolution({
			caseId: "grammar-de-det-demonstrative-diesem",
			input: goldenCase.input,
			idealOutput: goldenCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(true);
		expect(result.coreFeaturesPass).toBe(true);
	});

	test("normalizes only a null historical feature bag for exact scoring", () => {
		const goldenCase = corpus.cases["grammar-de-det-citation-jeglicher"];
		if (
			goldenCase?.idealOutput.resolution === null ||
			goldenCase === undefined
		) {
			throw new Error("Missing citation fixture.");
		}
		const output = outputSchema.parse({
			...goldenCase.idealOutput,
			resolution: {
				...goldenCase.idealOutput.resolution,
				surface: {
					...goldenCase.idealOutput.resolution.surface,
					surfaceFeatures: { historicalStatus: null },
				},
			},
		});
		const result = evaluateDeterminerGrammaticalResolution({
			caseId: "grammar-de-det-citation-jeglicher",
			input: goldenCase.input,
			idealOutput: goldenCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});

	test("rejects a resolved output for repeated same-Lemma targets", () => {
		const repeated =
			corpus.cases[
				"grammar-de-det-unresolved-repeated-same-lemma-dieser"
			];
		const resolved = corpus.cases["grammar-de-det-demonstrative-diesem"];
		if (
			repeated === undefined ||
			resolved?.idealOutput.resolution === null ||
			resolved === undefined
		) {
			throw new Error("Missing DET target-count fixtures.");
		}
		const result = evaluateDeterminerGrammaticalResolution({
			caseId: "grammar-de-det-unresolved-repeated-same-lemma-dieser",
			input: repeated.input,
			idealOutput: repeated.idealOutput,
			output: resolved.idealOutput,
		});

		expect(result.contractPass).toBe(false);
		expect(result.decisionPass).toBe(false);
		expect(result.memberCountPass).toBe(false);
	});
});
