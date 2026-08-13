import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	verbGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-verb/evaluation-suite";
import { evaluateVerbGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-verb/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/prompt-source";
import {
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/schemas";

const expectedEvaluationIds = [
	"grammar-de-verb-infinitive-hinauszulaufen",
	"grammar-de-verb-participle-mitgebracht",
	"grammar-de-verb-participle-gesungen",
	"grammar-de-verb-governed-preposition-wartet",
	"grammar-de-verb-separable-finite-aufstehen",
	"grammar-de-verb-reflexive-schaemt",
	"grammar-de-verb-future-wird-reisen",
	"grammar-de-verb-passive-wurde-gebeten",
	"grammar-de-verb-full-werden",
	"grammar-de-verb-full-hat",
] as const;

describe("Lexeme/VERB route-local corpus", () => {
	test("contains only resolvable cases under the classified-target contract", () => {
		expect(corpus.all().ids).toHaveLength(21);
		expect(demonstrations.ids).toEqual([
			"grammar-de-verb-finite-liest",
			"grammar-de-verb-citation-arbeiten",
			"grammar-de-verb-separable-imperative-aufpassen",
			"grammar-de-verb-reflexive-erinnert",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(verbGrammaticalResolutionExperiment.evaluation);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(14);
		expect(Object.keys(corpus.collections)).toEqual([
			"forms",
			"lexicalFeatures",
			"policyProbes",
		]);
		expect(corpus.all().ids.some((id) => id.includes("unresolved"))).toBe(
			false,
		);
		expect(
			corpus.all().ids.some((id) => id.includes("modal-ellipsis")),
		).toBe(false);
	});

	test("aligns exact input members with marked context in every case", () => {
		for (const testCase of corpus.all().cases) {
			const markedMembers = [
				...testCase.input.markedContext.matchAll(
					/<TARGET>([^<>]+)<\/TARGET>/gu,
				),
			].map((match) => match[1] ?? "");
			expect(testCase.input.members).toEqual(markedMembers);
			expect(testCase.idealOutput.memberOrthographies).toHaveLength(
				testCase.input.members.length,
			);
			expect(testCase.idealOutput.normalizedMembers).toHaveLength(
				testCase.input.members.length,
			);
		}
	});

	test("assembles flattened demonstrations for an already classified target", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain('"members":["liest"]');
		expect(prompt).toContain('"members":["Pass","auf","auf"]');
		expect(prompt).toContain("Target Classification has already established");
		expect(prompt).toContain(
			"Return only memberOrthographies, normalizedMembers, surface, and lemma",
		);
		expect(prompt).not.toContain('"decision":"Resolved"');
		expect(prompt).not.toContain('"resolution":');
		expect(prompt).not.toContain('"realizationCoverage":');
		expect(prompt).not.toContain('"verbType":');
	});

	test("enforces the compact input and output DTOs", () => {
		const finiteCase = corpus.cases["grammar-de-verb-finite-liest"];
		expect(finiteCase).toBeDefined();
		if (finiteCase === undefined) return;

		expect(
			inputSchema.safeParse({ markedContext: finiteCase.input.markedContext })
				.success,
		).toBe(false);
		expect(
			inputSchema.safeParse({
				...finiteCase.input,
				members: ["lesen"],
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				resolution: finiteCase.idealOutput,
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...finiteCase.idealOutput,
				realizationCoverage: "Full",
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...finiteCase.idealOutput,
				lemma: {
					...finiteCase.idealOutput.lemma,
					coreFeatures: {
						hasGovPrep: null,
						hasSepPrefix: null,
						lexicallyReflexive: null,
						verbType: null,
					},
				},
			}).success,
		).toBe(false);
	});

	test("keeps multi-member lexical evidence and lexical-head morphology", () => {
		expect(
			corpus.cases["grammar-de-verb-separable-imperative-aufpassen"],
		).toMatchObject({
			input: { members: ["Pass", "auf", "auf"] },
			idealOutput: {
				memberOrthographies: ["Standard", "Standard", "Standard"],
				normalizedMembers: ["pass", "auf", "auf"],
				lemma: {
					canonicalForm: "aufpassen",
					coreFeatures: {
						hasGovPrep: "auf",
						hasSepPrefix: "auf",
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-verb-participle-gesungen"],
		).toMatchObject({
			input: { members: ["hat", "gesungen"] },
			idealOutput: {
				normalizedMembers: ["hat", "gesungen"],
				surface: {
					inflectionalFeatures: { verbForm: "Part", tense: null },
				},
				lemma: { canonicalForm: "singen" },
			},
		});
	});
});

describe("Lexeme/VERB diagnostic evaluator", () => {
	test("passes every pinned ideal output", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateVerbGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports an inflection miss without hiding lexical identity", () => {
		const testCase = corpus.cases["grammar-de-verb-past-ging"];
		if (
			testCase === undefined ||
			testCase.idealOutput.surface.surfaceKind !== "Inflection"
		) {
			throw new Error("Missing ging fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			surface: {
				...testCase.idealOutput.surface,
				inflectionalFeatures: {
					mood: "Sub",
					number: "Sing",
					person: "3",
					tense: "Past",
					verbForm: "Fin",
					voice: null,
				},
			},
		});
		const result = evaluateVerbGrammaticalResolution({
			caseId: "grammar-de-verb-past-ging",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.canonicalFormPass).toBe(true);
		expect(result.coreFeaturesPass).toBe(true);
	});
});
