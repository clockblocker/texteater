import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	verbGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-verb/evaluation-suite";
import { evaluateVerbGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-verb/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/verb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/verb/prompt-source";
import {
	inputSchema,
	outputSchema,
	verbResolutionCodec,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/verb/schemas";

const expectedEvaluationIds = [
	"grammar-de-verb-dw-perfect-etabliert",
	"grammar-de-verb-dw-perfect-eingependelt",
	"grammar-de-verb-dw-perfect-ausgeschlossen",
	"grammar-de-verb-dw-separable-nachwirken",
	"grammar-de-verb-dw-passive-weitergeleitet",
	"grammar-de-verb-dw-future-finden",
	"grammar-de-verb-dw-pluperfect-angekuendigt",
	"grammar-de-verb-dw-passive-aufgefressen",
	"grammar-de-verb-dw-perfect-ausgesprochen",
	"grammar-de-verb-dw-pluperfect-passive-verschifft",
	"grammar-de-verb-dw-separable-vorbereiten",
	"grammar-de-verb-finite-liest",
	"grammar-de-verb-past-ging",
	"grammar-de-verb-typo-tanzd",
	"grammar-de-verb-full-modal-mag",
	"grammar-de-verb-prep-governed-warten-auf",
	"grammar-de-verb-prep-free-warten-im",
	"grammar-de-verb-prep-governed-verzichten-auf",
	"grammar-de-verb-prep-free-sprechen-im",
	"grammar-de-verb-prep-governed-reflexive-erinnern-an",
	"grammar-de-verb-prep-governed-reflexive-sehnen-nach",
	"grammar-de-verb-prep-free-reflexive-erholen-im",
	"grammar-de-verb-prep-governed-warnen-vor",
	"grammar-de-verb-prep-free-arbeiten-mit",
	"grammar-de-verb-prep-free-spielen-auf",
] as const;

describe("Lexeme/VERB route-local corpus", () => {
	test("contains only resolvable cases under the classified-target contract", () => {
		expect(corpus.all().ids).toHaveLength(46);
		expect(demonstrations.ids).toEqual([
			"grammar-de-verb-citation-arbeiten",
			"grammar-de-verb-separable-imperative-aufpassen",
			"grammar-de-verb-dw-future-beteiligen",
			"grammar-de-verb-dw-separable-aufsetzen",
			"grammar-de-verb-dw-modal-passive-hergestellt",
			"grammar-de-verb-dw-perfect-passive-aufgefunden",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(verbGrammaticalResolutionExperiment.evaluation);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(31);
		expect(Object.keys(corpus.collections)).toEqual([
			"forms",
			"lexicalFeatures",
			"policyProbes",
			"dwArticles",
			"prepositionContrasts",
		]);
		expect(corpus.all().ids.some((id) => id.includes("unresolved"))).toBe(
			false,
		);
		expect(
			corpus.all().ids.some((id) => id.includes("modal-ellipsis")),
		).toBe(false);
	});

	test("holds out balanced governed and free preposition contrasts", () => {
		const contrasts = corpus.collections.prepositionContrasts;
		expect(contrasts.ids).toHaveLength(10);
		expect(demonstrations.isDisjointFrom(contrasts)).toBe(true);
		expect(
			contrasts.ids.filter((id) => id.includes("-governed-")),
		).toHaveLength(5);
		expect(
			contrasts.ids.filter((id) => id.includes("-free-")),
		).toHaveLength(5);
		expect(
			contrasts.ids.filter((id) => id.includes("-reflexive-")),
		).toHaveLength(3);
		for (const id of contrasts.ids) {
			expect(evaluation.ids).toContain(id);
		}
	});

	test("keeps the DW article cases source-backed and deliberately split", () => {
		const dwCases = corpus.collections.dwArticles;
		expect(dwCases.ids).toHaveLength(15);
		const demonstrationDwIds = demonstrations.ids.filter((id) =>
			id.includes("-dw-"),
		);
		const evaluationDwIds = evaluation.ids.filter((id) =>
			id.includes("-dw-"),
		);
		expect(demonstrationDwIds).toHaveLength(4);
		expect(evaluationDwIds).toHaveLength(11);
		expect(new Set([...demonstrationDwIds, ...evaluationDwIds])).toEqual(
			new Set(dwCases.ids),
		);

		for (const testCase of dwCases.cases) {
			expect(testCase.contaminationKeys).toHaveLength(1);
			expect(testCase.contaminationKeys?.[0]).toStartWith(
				"source:https://",
			);
			expect(testCase.input.markedContext.length).toBeGreaterThan(80);
		}
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
		expect(prompt).toContain("<agent_role>");
		expect(prompt).toContain("<fixed_contract>");
		expect(prompt).toContain("<lexical_head_repairs>");
		expect(prompt).toContain("<final_checks>");
		expect(prompt).toContain('"members":["Pass","auf","auf"]');
		expect(prompt).toContain('"members":["hergestellt","werden"]');
		expect(prompt).toContain('"members":["ist","aufgefunden","worden"]');
		expect(prompt).toContain(
			"Target Classification has already established",
		);
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
			inputSchema.safeParse({
				markedContext: finiteCase.input.markedContext,
			}).success,
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

		const runtimeOutput = verbResolutionCodec.decode(
			finiteCase.idealOutput,
		);
		expect(runtimeOutput).toMatchObject({
			lemma: { coreFeatures: { verbType: null } },
		});
		expect(verbResolutionCodec.encode(runtimeOutput)).toEqual(
			finiteCase.idealOutput,
		);
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
