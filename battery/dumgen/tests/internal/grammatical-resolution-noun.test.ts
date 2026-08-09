import { describe, expect, test } from "bun:test";
import { runCodegen } from "codegen";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import { systemPromptRecipe } from "../../src/promptsmith/assembly/generate-system-prompts";
import {
	evaluation,
	nounGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-noun/evaluation-suite";
import { evaluateNounGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-noun/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/noun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/noun/prompt-source";

const expectedEvaluationIds = [
	"grammar-de-noun-citation-haus",
	"grammar-de-noun-inflection-nom-plur-banken",
	"grammar-de-noun-inflection-acc-sing-hund",
	"grammar-de-noun-inflection-acc-plur-buecher",
	"grammar-de-noun-inflection-dat-plur-kindern",
	"grammar-de-noun-inflection-gen-sing-mannes",
	"grammar-de-noun-inflection-gen-plur-frauen",
	"grammar-de-noun-hyphenated-u-bahn",
	"grammar-de-noun-casing-typo-katze",
	"grammar-de-noun-archaic-odem",
	"grammar-de-noun-repeated-token-second-bank",
	"grammar-de-noun-unresolved-verb-route",
	"grammar-de-noun-unresolved-ambiguous-leiter",
	"grammar-de-noun-unresolved-overbroad-phrase",
	"grammar-de-noun-unresolved-two-unrelated-targets",
] as const;

describe("Lexeme/NOUN reference corpus", () => {
	test("keeps necessary policy demonstrations and 15 explicitly pinned held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(26);
		expect(demonstrations.ids).toEqual([
			"grammar-de-noun-typo-kaffe",
			"grammar-de-noun-demo-unresolved-adjective-route",
			"grammar-de-noun-demo-citation-hyphen-u-boot",
			"grammar-de-noun-demo-unresolved-ambiguous-see",
			"grammar-de-noun-demo-archaic-antlitz",
			"grammar-de-noun-demo-lowercase-stadt",
			"grammar-de-noun-demo-unresolved-overbroad-rathaus",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(nounGrammaticalResolutionExperiment.evaluation);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation.ids).toHaveLength(15);
		expect(demonstrations.union(evaluation).ids).toHaveLength(22);
	});

	test("assembles only the selected policy demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);

		expect(prompt).toContain("Kaffe");
		expect(prompt).toContain("Der Zug ist <TARGET>schnell</TARGET>.");
		expect(prompt).toContain("Wörterbucheintrag: <TARGET>U-Boot</TARGET>");
		expect(prompt).toContain(
			"Stichwort ohne Kontext: <TARGET>See</TARGET>",
		);
		expect(prompt).toContain("Antlitz");
		expect(prompt).toContain("<TARGET>stadt</TARGET>");
		expect(prompt).toContain("<TARGET>alte Rathaus</TARGET>");
		expect(prompt).toContain(
			"A noun in an ordinary sentence is Inflection",
		);
		expect(prompt).not.toContain("Bibliothek");
		expect(prompt).not.toContain("Banken");
		expect(prompt).not.toContain("Photographie");
		expect(prompt).not.toContain("Leute");
		expect(prompt).not.toContain("Kinder- und Jugendbücher");
	});

	test("derives generated provenance from both selected semantic modules", async () => {
		const result = await runCodegen(systemPromptRecipe, { mode: "check" });
		const artifact = result.plan.artifacts.find(
			({ meta }) =>
				meta.route === "grammatical-resolution/de/lexeme/noun",
		);
		expect(artifact).toBeDefined();
		const paths =
			artifact?.provenance.flatMap((provenance) =>
				provenance.kind === "source" ? [provenance.path] : [],
			) ?? [];
		expect(paths.some((path) => path.endsWith("prompt-source.ts"))).toBe(
			true,
		);
		expect(paths.some((path) => path.endsWith("schemas.ts"))).toBe(true);
		expect(
			paths.some((path) => path.endsWith("golden-corpus/corpus.ts")),
		).toBe(true);
		expect(
			paths.some((path) =>
				path.endsWith("golden-corpus/cases/boundaries.ts"),
			),
		).toBe(true);
		expect(
			paths.some((path) =>
				path.endsWith("golden-corpus/cases/orthography-and-surface.ts"),
			),
		).toBe(true);
		expect(
			paths.some((path) =>
				path.endsWith("golden-corpus/cases/inflection.ts"),
			),
		).toBe(false);
	});
});

describe("Lexeme/NOUN diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateNounGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});

			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports a field miss without weakening exact structural scoring", () => {
		const testCase = corpus.cases["grammar-de-noun-typo-kaffe"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing resolved Kaffee case.");
		}
		const output = {
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				normalizedMembers: ["Kaffe"],
			},
		};
		const result = evaluateNounGrammaticalResolution({
			caseId: "grammar-de-noun-typo-kaffe",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.decisionPass).toBe(true);
		expect(result.memberOrthographiesPass).toBe(true);
	});

	test("treats a null-only model feature bag like the runtime codec does", () => {
		const testCase =
			corpus.cases["grammar-de-noun-inflection-acc-sing-hund"];
		if (
			testCase?.idealOutput.resolution === null ||
			testCase === undefined
		) {
			throw new Error("Missing resolved Hund case.");
		}
		const output = {
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...testCase.idealOutput.resolution.surface,
					surfaceFeatures: { historicalStatus: null },
				},
			},
		};
		const result = evaluateNounGrammaticalResolution({
			caseId: "grammar-de-noun-inflection-acc-sing-hund",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});

	test("requires exact Unresolved/null output and checks member count", () => {
		const unresolved =
			corpus.cases["grammar-de-noun-unresolved-two-unrelated-targets"];
		const resolved = corpus.cases["grammar-de-noun-hyphenated-u-bahn"];
		if (
			unresolved === undefined ||
			resolved?.idealOutput.resolution === null ||
			resolved === undefined
		) {
			throw new Error("Missing boundary fixtures.");
		}
		const exact = evaluateNounGrammaticalResolution({
			caseId: "grammar-de-noun-unresolved-two-unrelated-targets",
			input: unresolved.input,
			idealOutput: unresolved.idealOutput,
			output: unresolved.idealOutput,
		});
		const wrong = evaluateNounGrammaticalResolution({
			caseId: "grammar-de-noun-unresolved-two-unrelated-targets",
			input: unresolved.input,
			idealOutput: unresolved.idealOutput,
			output: resolved.idealOutput,
		});

		expect(exact.contractPass).toBe(true);
		expect(wrong.contractPass).toBe(false);
		expect(wrong.decisionPass).toBe(false);
		expect(wrong.memberCountPass).toBe(false);
	});
});
