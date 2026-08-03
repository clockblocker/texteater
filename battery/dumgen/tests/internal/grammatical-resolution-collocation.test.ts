import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	collocationGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-collocation/evaluation-suite";
import { evaluateCollocationGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-collocation/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/prompt-source";
import { outputSchema } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/schemas";

const expectedEvaluationIds = [
	"grammar-de-coll-antrag-present-full",
	"grammar-de-coll-antrag-past-full",
	"grammar-de-coll-kritik-present-full",
	"grammar-de-coll-hilfe-plural-full",
	"grammar-de-coll-abschied-past-full",
	"grammar-de-coll-massnahmen-present-full",
	"grammar-de-coll-stellung-imperative-full",
	"grammar-de-coll-anspruch-participle-full",
	"grammar-de-coll-ausdruck-infinitive-full",
	"grammar-de-coll-einfluss-present-full",
	"grammar-de-coll-rolle-modified-full",
	"grammar-de-coll-anspruch-partial",
	"grammar-de-coll-kritik-citation",
	"grammar-de-coll-hilfe-typo",
	"grammar-de-coll-unresolved-idiom-loeffel",
	"grammar-de-coll-unresolved-construction-je-desto",
	"grammar-de-coll-unresolved-verb-only-antrag",
	"grammar-de-coll-unresolved-overbroad-clause",
] as const;

describe("Phraseme/Collocation route-local corpus", () => {
	test("keeps four demonstrations and 18 disjoint held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(25);
		expect(demonstrations.ids).toEqual([
			"grammar-de-coll-decision-present-full",
			"grammar-de-coll-betracht-citation",
			"grammar-de-coll-verfuegung-partial",
			"grammar-de-coll-unresolved-free-book-read",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			collocationGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(22);
		expect(corpus.all().ids.some((id) => /-(?:demo|eval)-/u.test(id))).toBe(
			false,
		);
		expect(Object.keys(corpus.collections)).toEqual([
			"forms",
			"boundaries",
			"policyProbes",
		]);
	});

	test("keeps resolved demonstration Lemmas out of held-out scoring", () => {
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
	});

	test("assembles the route policy and only the selected demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("German verbal support-verb");
		expect(prompt).toContain("Core Features are exactly {}");
		expect(prompt).toContain("at least two\nmarked distinctive components");
		expect(prompt).toContain("A marked support verb alone");
		expect(prompt).toContain(
			"normalizedSurface contains only normalized marked",
		);
		expect(prompt).toContain("<TARGET>trifft</TARGET>");
		expect(prompt).toContain("<TARGET>Betracht</TARGET>");
		expect(prompt).toContain("<TARGET>Verfügung</TARGET>");
		expect(prompt).toContain("<TARGET>Buch</TARGET>");
		expect(prompt).not.toContain("<TARGET>Antrag</TARGET>");
		expect(prompt).not.toContain("<TARGET>Löffel</TARGET>");
	});

	test("pins Full, Partial, Citation, and member-aligned payloads", () => {
		expect(
			corpus.cases["grammar-de-coll-decision-present-full"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard", "Standard"],
				surface: {
					normalizedSurface: "trifft eine Entscheidung",
					realizationCoverage: "Full",
					surfaceKind: "Inflection",
				},
				lemma: {
					canonicalForm: "eine Entscheidung treffen",
					coreFeatures: {},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-coll-verfuegung-partial"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard", "Standard"],
				surface: {
					normalizedSurface: "stellen Verfügung",
					realizationCoverage: "Partial",
				},
				lemma: { canonicalForm: "zur Verfügung stellen" },
			},
		});
		expect(
			corpus.cases["grammar-de-coll-betracht-citation"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: { surfaceKind: "Citation" },
				lemma: { canonicalForm: "in Betracht ziehen" },
			},
		});
	});

	test("pins the support verb feature shape for finite, infinitive, and participle Surfaces", () => {
		expect(
			corpus.cases["grammar-de-coll-antrag-present-full"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					inflectionalFeatures: {
						mood: "Ind",
						number: "Sing",
						person: "3",
						tense: "Pres",
						verbForm: "Fin",
						voice: null,
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-coll-ausdruck-infinitive-full"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: { inflectionalFeatures: { verbForm: "Inf" } },
			},
		});
		expect(
			corpus.cases["grammar-de-coll-anspruch-participle-full"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					inflectionalFeatures: {
						aspect: null,
						tense: null,
						verbForm: "Part",
					},
				},
			},
		});
	});

	test("covers route boundaries and keeps component-identity questions corpus-only", () => {
		for (const caseId of [
			"grammar-de-coll-unresolved-free-book-read",
			"grammar-de-coll-unresolved-idiom-loeffel",
			"grammar-de-coll-unresolved-construction-je-desto",
			"grammar-de-coll-unresolved-verb-only-antrag",
			"grammar-de-coll-unresolved-overbroad-clause",
		]) {
			expect(corpus.cases[caseId]?.idealOutput).toEqual({
				decision: "Unresolved",
				resolution: null,
			});
		}
		for (const caseId of [
			"grammar-de-coll-provisional-determiner-alternant",
			"grammar-de-coll-provisional-plural-alternant",
			"grammar-de-coll-provisional-support-verb-alternant",
		]) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("derives strict minimal Collocation DTOs", () => {
		const testCase = corpus.cases["grammar-de-coll-antrag-present-full"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing Collocation fixture.");
		}
		expect(
			outputSchema.safeParse({
				...testCase.idealOutput,
				resolution: {
					...testCase.idealOutput.resolution,
					lemma: {
						...testCase.idealOutput.resolution.lemma,
						family: "Phraseme",
					},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...testCase.idealOutput,
				resolution: {
					...testCase.idealOutput.resolution,
					lemma: {
						...testCase.idealOutput.resolution.lemma,
						coreFeatures: { supportVerb: "stellen" },
					},
				},
			}).success,
		).toBe(false);
	});
});

describe("Phraseme/Collocation diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateCollocationGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("diagnoses member alignment, coverage, and Core independently", () => {
		const testCase = corpus.cases["grammar-de-coll-antrag-present-full"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing Collocation fixture.");
		}
		const output = {
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				memberOrthographies: ["Standard" as const],
				surface: {
					...testCase.idealOutput.resolution.surface,
					realizationCoverage: "Partial" as const,
				},
				lemma: {
					...testCase.idealOutput.resolution.lemma,
					coreFeatures: { unsupported: true },
				},
			},
		};
		const result = evaluateCollocationGrammaticalResolution({
			caseId: "grammar-de-coll-antrag-present-full",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output: output as never,
		});
		expect(result.memberCountPass).toBe(false);
		expect(result.memberOrthographiesPass).toBe(false);
		expect(result.realizationCoveragePass).toBe(false);
		expect(result.coreFeaturesPass).toBe(false);
		expect(result.decisionPass).toBe(true);
	});
});
