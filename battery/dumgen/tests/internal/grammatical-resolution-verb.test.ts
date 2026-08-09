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
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/schemas";

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
	"grammar-de-verb-unresolved-perfect-aux-hat",
	"grammar-de-verb-unresolved-modal-aux-kann",
	"grammar-de-verb-unresolved-attributive-participle",
	"grammar-de-verb-unresolved-modal-complex",
	"grammar-de-verb-unresolved-copular-predicate",
	"grammar-de-verb-unresolved-contextual-reflexive",
	"grammar-de-verb-unresolved-adjunct",
	"grammar-de-verb-unresolved-modifier",
	"grammar-de-verb-unresolved-repeated-schlaeft",
	"grammar-de-verb-unresolved-unrelated-targets",
] as const;

describe("Lexeme/VERB route-local corpus", () => {
	test("keeps four minimized demonstrations and 20 disjoint held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(35);
		expect(demonstrations.ids).toEqual([
			"grammar-de-verb-finite-liest",
			"grammar-de-verb-citation-arbeiten",
			"grammar-de-verb-separable-imperative-aufpassen",
			"grammar-de-verb-reflexive-erinnert",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(verbGrammaticalResolutionExperiment.evaluation);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(24);
		const demonstrationLemmas = new Set(
			demonstrations.cases.flatMap((testCase) =>
				testCase.idealOutput.resolution === null
					? []
					: [testCase.idealOutput.resolution.lemma.canonicalForm],
			),
		);
		expect(
			evaluation.cases.flatMap((testCase) =>
				testCase.idealOutput.resolution !== null &&
				demonstrationLemmas.has(
					testCase.idealOutput.resolution.lemma.canonicalForm,
				)
					? [testCase.idealOutput.resolution.lemma.canonicalForm]
					: [],
			),
		).toEqual([]);
		expect(corpus.all().ids.some((id) => /-(?:demo|eval)-/u.test(id))).toBe(
			false,
		);
		expect(Object.keys(corpus.collections)).toEqual([
			"forms",
			"lexicalFeatures",
			"boundaries",
			"policyProbes",
		]);
	});

	test("assembles only minimized demonstrations and explicit route boundaries", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("<TARGET>liest</TARGET>");
		expect(prompt).toContain("<TARGET>arbeiten</TARGET>");
		expect(prompt).toContain("<TARGET>Pass</TARGET>");
		expect(prompt).toContain("<TARGET>auf</TARGET>");
		expect(prompt).toContain("<TARGET>erinnert</TARGET>");
		expect(prompt).not.toContain("<TARGET>hinauszulaufen</TARGET>");
		expect(prompt).not.toContain("<TARGET>gesungen</TARGET>");
		expect(prompt).not.toContain("<TARGET>tanzd</TARGET>");
		expect(prompt).toContain("Keep the AUX/VERB boundary exact");
		expect(prompt).toContain("Keep the ADJ/VERB participle boundary exact");
		expect(prompt).toContain("First apply a mechanical TARGET-scope gate");
		expect(prompt).toContain("accept every realized");
		expect(prompt).toContain("Every pair must");
		expect(prompt).toContain(
			"A marked detached prefix supplies only hasSepPrefix",
		);
		expect(prompt).toContain(
			"hasGovPrep requires independent lexical-valency evidence",
		);
		expect(prompt).toMatch(
			/A full modal spelling with its own\s+nominal complement/u,
		);
		expect(prompt).toContain(
			'{"aspect":null,"gender":null,"mood":null,"number":null,"person":null,"tense":null,"verbForm":"Part","voice":null}',
		);
		expect(prompt).toContain("Never label it verbForm Inf");
		expect(prompt).toContain("never emit aspect Perf");
		expect(prompt).toContain("never copy tense from");
		expect(prompt).toContain("hasGovPrep");
		expect(prompt).toContain("hasSepPrefix");
		expect(prompt).toContain("lexicallyReflexive");
		expect(prompt).toContain("verbType");
	});

	test("keeps unsettled voice, predicative, ellipsis, and nominalization probes out of scoring", () => {
		for (const caseId of [
			"grammar-de-verb-provisional-passive-participle-geschlossen",
			"grammar-de-verb-provisional-predicative-geschlossen",
			"grammar-de-verb-provisional-modal-ellipsis-kann",
			"grammar-de-verb-provisional-zu-infinitive-warten",
			"grammar-de-verb-provisional-nominalized-infinitive",
			"grammar-de-verb-provisional-split-stem-only",
		]) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("pins split-member, lexical-reflexive, governed-preposition, and participle payloads", () => {
		expect(
			corpus.cases["grammar-de-verb-separable-imperative-aufpassen"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard", "Standard"],
				realizationCoverage: "Full" as const,
				normalizedMembers: ["pass", "auf", "auf"],
				surface: {
					inflectionalFeatures: {
						mood: "Imp",
						verbForm: "Fin",
					},
				},
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
			corpus.cases["grammar-de-verb-reflexive-erinnert"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard", "Standard"],
				normalizedMembers: ["erinnert", "sich", "an"],
				lemma: {
					canonicalForm: "sich erinnern",
					coreFeatures: {
						hasGovPrep: "an",
						lexicallyReflexive: "Yes",
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-verb-participle-mitgebracht"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					inflectionalFeatures: {
						aspect: null,
						tense: null,
						verbForm: "Part",
						voice: null,
					},
				},
				lemma: { coreFeatures: { hasSepPrefix: "mit" } },
			},
		});
	});

	test("holds out distinct detached-separable and lexical-reflexive positives", () => {
		for (const caseId of [
			"grammar-de-verb-separable-finite-aufstehen",
			"grammar-de-verb-reflexive-schaemt",
		]) {
			expect(evaluation.ids).toContain(caseId);
			expect(demonstrations.ids).not.toContain(caseId);
		}
		expect(
			corpus.cases["grammar-de-verb-separable-finite-aufstehen"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard"],
				realizationCoverage: "Full" as const,
				normalizedMembers: ["steht", "auf"],
				lemma: {
					canonicalForm: "aufstehen",
					coreFeatures: { hasSepPrefix: "auf" },
				},
			},
		});
		expect(
			corpus.cases["grammar-de-verb-reflexive-schaemt"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard"],
				normalizedMembers: ["schämt", "sich"],
				lemma: {
					canonicalForm: "sich schämen",
					coreFeatures: {
						hasGovPrep: null,
						lexicallyReflexive: "Yes",
					},
				},
			},
		});
	});

	test("keeps analytic auxiliaries as members and lexical-head morphology", () => {
		expect(
			corpus.cases["grammar-de-verb-participle-gesungen"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard"],
				normalizedMembers: ["hat", "gesungen"],
				surface: {
					inflectionalFeatures: { verbForm: "Part", tense: null },
				},
				lemma: { canonicalForm: "singen" },
			},
		});
		expect(
			corpus.cases["grammar-de-verb-future-wird-reisen"]?.idealOutput,
		).toMatchObject({
			resolution: {
				normalizedMembers: ["wird", "reisen"],
				surface: {
					inflectionalFeatures: { verbForm: "Inf", tense: null },
				},
				lemma: { canonicalForm: "reisen" },
			},
		});
		expect(
			corpus.cases["grammar-de-verb-passive-wurde-gebeten"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard", "Standard"],
				normalizedMembers: ["wurde", "um", "gebeten"],
				surface: {
					inflectionalFeatures: {
						verbForm: "Part",
						voice: null,
					},
				},
				lemma: {
					canonicalForm: "bitten",
					coreFeatures: { hasGovPrep: "um" },
				},
			},
		});
	});

	test("keeps Aspect null on every authoritative lexical participle", () => {
		for (const caseId of [
			"grammar-de-verb-participle-mitgebracht",
			"grammar-de-verb-participle-gesungen",
		]) {
			expect(corpus.cases[caseId]?.idealOutput).toMatchObject({
				resolution: {
					surface: {
						inflectionalFeatures: {
							aspect: null,
							verbForm: "Part",
						},
					},
				},
			});
			expect(evaluation.ids).toContain(caseId);
		}
	});

	test("derives strict minimal DTOs and exact verb-form feature shapes", () => {
		const finiteCase = corpus.cases["grammar-de-verb-past-ging"];
		const citationCase = corpus.cases["grammar-de-verb-citation-arbeiten"];
		if (
			finiteCase === undefined ||
			finiteCase.idealOutput.resolution === null ||
			citationCase === undefined ||
			citationCase.idealOutput.resolution === null
		) {
			throw new Error("Missing VERB fixtures.");
		}
		expect(
			outputSchema.safeParse({
				...finiteCase.idealOutput,
				resolution: {
					...finiteCase.idealOutput.resolution,
					lemma: {
						...finiteCase.idealOutput.resolution.lemma,
						language: "de",
					},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...finiteCase.idealOutput,
				resolution: {
					...finiteCase.idealOutput.resolution,
					surface: {
						...finiteCase.idealOutput.resolution.surface,
						inflectionalFeatures: {
							gender: "Masc",
							mood: "Ind",
							number: "Sing",
							person: "3",
							tense: "Past",
							verbForm: "Fin",
							voice: null,
						},
					},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...finiteCase.idealOutput,
				resolution: {
					...finiteCase.idealOutput.resolution,
					lemma: {
						...finiteCase.idealOutput.resolution.lemma,
						coreFeatures: {
							hasGovPrep: null,
							hasSepPrefix: null,
							verbType: null,
						},
					},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...citationCase.idealOutput,
				resolution: {
					...citationCase.idealOutput.resolution,
					surface: {
						...citationCase.idealOutput.resolution.surface,
						inflectionalFeatures: {
							mood: null,
							number: null,
							person: null,
							tense: null,
							verbForm: "Inf",
							voice: null,
						},
					},
				},
			}).success,
		).toBe(false);
	});
});

describe("Lexeme/VERB diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
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

	test("reports inflection and lexical-identity misses independently", () => {
		const testCase = corpus.cases["grammar-de-verb-past-ging"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing ging fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...testCase.idealOutput.resolution.surface,
					inflectionalFeatures: {
						mood: "Sub",
						number: "Sing",
						person: "3",
						tense: "Past",
						verbForm: "Fin",
						voice: null,
					},
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

	test("scores every marked member for a split separable Surface", () => {
		const testCase =
			corpus.cases["grammar-de-verb-separable-imperative-aufpassen"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing aufpassen fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				memberOrthographies: ["Standard"],
			},
		});
		const result = evaluateVerbGrammaticalResolution({
			caseId: "grammar-de-verb-separable-imperative-aufpassen",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.memberCountPass).toBe(false);
		expect(result.memberOrthographiesPass).toBe(false);
	});
});
