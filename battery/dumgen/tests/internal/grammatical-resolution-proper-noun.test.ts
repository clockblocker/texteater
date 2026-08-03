import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	properNounGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-proper-noun/evaluation-suite";
import { evaluateProperNounGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-proper-noun/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/proper-noun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/proper-noun/prompt-source";
import {
	buildDeProperNounInflectionSurfaceCodec,
	deProperNounLemmaCodec,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/proper-noun/schemas";

const expectedEvaluationIds = [
	"grammar-de-propn-acc-sing-anna",
	"grammar-de-propn-dat-sing-berlin",
	"grammar-de-propn-nom-sing-deutschland",
	"grammar-de-propn-acc-sing-schweiz",
	"grammar-de-propn-gen-sing-peters",
	"grammar-de-propn-gen-sing-deutschlands",
	"grammar-de-propn-gen-sing-hans-apostrophe",
	"grammar-de-propn-vocative-anna",
	"grammar-de-propn-dat-plur-niederlanden",
	"grammar-de-propn-citation-hamburg",
	"grammar-de-propn-typo-muenchn",
	"grammar-de-propn-canonical-acronym-nato",
	"grammar-de-propn-unresolved-common-noun-stadt",
	"grammar-de-propn-unresolved-adjective-schnell",
	"grammar-de-propn-unresolved-numeral-2024",
	"grammar-de-propn-unresolved-verb-reisen",
	"grammar-de-propn-unresolved-repeated-peter",
	"grammar-de-propn-unresolved-unrelated-anna-berlin",
] as const;

describe("Lexeme/PROPN route-local corpus", () => {
	test("keeps role-neutral IDs, four demonstrations, and 18 held-out cases", () => {
		expect(corpus.all().ids).toHaveLength(30);
		expect(demonstrations.ids).toEqual([
			"grammar-de-propn-citation-dresden",
			"grammar-de-propn-nom-sing-maria",
			"grammar-de-propn-typo-koelnn",
			"grammar-de-propn-unresolved-multi-token-angela-merkel",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation).toBe(
			properNounGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(demonstrations.union(evaluation).ids).toHaveLength(22);
		expect(corpus.all().ids.some((id) => /-(?:demo|eval)-/u.test(id))).toBe(
			false,
		);
		expect(Object.keys(corpus.collections)).toEqual([
			"resolved",
			"orthography",
			"boundaries",
			"policyProbes",
		]);

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

	test("assembles only demonstrations and the token-level route policy", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("<TARGET>Dresden</TARGET>");
		expect(prompt).toContain("<TARGET>Maria</TARGET>");
		expect(prompt).toContain("<TARGET>Kölnn</TARGET>");
		expect(prompt).toContain("<TARGET>Angela Merkel</TARGET>");
		expect(prompt).not.toContain("<TARGET>Münchn</TARGET>");
		expect(prompt).not.toContain("<TARGET>NATO</TARGET>");
		expect(prompt).not.toContain("<TARGET>Heinrich II</TARGET>");
		expect(prompt).not.toContain("<TARGET>adidas</TARGET>");
		expect(prompt).toContain("token-level grammatical resolution");
		expect(prompt).toContain("not named-entity resolution");
		expect(prompt).toContain(
			"ordinary contextual proper name is Inflection",
		);
		expect(prompt).toContain("An acronym is not");
		expect(prompt).toContain("automatically an abbreviation");
		expect(prompt).toMatch(
			/Lexical evidence can\s+establish an organization name as abbreviated and gendered/u,
		);
		expect(prompt).toMatch(
			/A lexical plural-only name has no modeled Gender/u,
		);
		expect(prompt).toMatch(
			/An established\s+German loan or name is not Foreign/u,
		);
	});

	test("keeps unsettled feature and route policy probes corpus-only", () => {
		for (const caseId of [
			"grammar-de-propn-provisional-numeric-name-ii",
			"grammar-de-propn-provisional-organization-spd-gender",
			"grammar-de-propn-provisional-foreign-new",
			"grammar-de-propn-provisional-abbreviation-chr",
			"grammar-de-propn-provisional-stylized-brand-adidas",
			"grammar-de-propn-provisional-pluralized-surname-schmidts",
		]) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("contamination-links parallel multi-token and overbroad stimuli", () => {
		const demonstration =
			corpus.cases[
				"grammar-de-propn-unresolved-multi-token-angela-merkel"
			];
		if (demonstration === undefined) throw new Error("Missing fixture.");
		const demonstrationKeys = new Set(
			demonstration.contaminationKeys ?? [],
		);
		for (const caseId of [
			"grammar-de-propn-unresolved-multi-token-johann-wolfgang",
			"grammar-de-propn-unresolved-overbroad-stadt-berlin",
		]) {
			const twin = corpus.cases[caseId];
			if (twin === undefined) throw new Error(`Missing ${caseId}.`);
			expect(
				(twin.contaminationKeys ?? []).some((key) =>
					demonstrationKeys.has(key),
				),
			).toBe(true);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("pins held-out repair, established acronym identity, lexical plural, and genitive split", () => {
		expect(
			corpus.cases["grammar-de-propn-typo-muenchn"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Typo"],
				surface: { normalizedSurface: "München" },
				lemma: { canonicalForm: "München" },
			},
		});
		expect(
			corpus.cases["grammar-de-propn-canonical-acronym-nato"]
				?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: ["Standard"],
				surface: { normalizedSurface: "NATO" },
				lemma: {
					canonicalForm: "NATO",
					coreFeatures: {
						abbr: "Yes",
						foreign: null,
						gender: "Fem",
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-propn-canonical-acronym-nato"]?.input
				.markedContext,
		).toBe("<TARGET>NATO</TARGET> tagt heute.");
		expect(
			corpus.cases["grammar-de-propn-dat-plur-niederlanden"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					normalizedSurface: "Niederlanden",
					inflectionalFeatures: { case: "Dat", number: "Plur" },
				},
				lemma: {
					canonicalForm: "Niederlande",
					coreFeatures: {
						abbr: null,
						foreign: null,
						gender: null,
					},
				},
			},
		});
		expect(
			corpus.cases["grammar-de-propn-gen-sing-peters"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					normalizedSurface: "Peters",
					inflectionalFeatures: { case: "Gen", number: "Sing" },
				},
				lemma: { canonicalForm: "Peter" },
			},
		});
	});

	test("derives strict minimal DTOs and a non-empty Inflection feature bag", () => {
		const citationCase = corpus.cases["grammar-de-propn-citation-dresden"];
		const inflectionCase = corpus.cases["grammar-de-propn-dat-sing-berlin"];
		if (
			citationCase === undefined ||
			citationCase.idealOutput.resolution === null ||
			inflectionCase === undefined ||
			inflectionCase.idealOutput.resolution === null
		) {
			throw new Error("Missing PROPN fixtures.");
		}
		expect(
			outputSchema.safeParse({
				...citationCase.idealOutput,
				resolution: {
					...citationCase.idealOutput.resolution,
					lemma: {
						...citationCase.idealOutput.resolution.lemma,
						language: "de",
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
						inflectionalFeatures: { case: "Nom", number: "Sing" },
					},
				},
			}).success,
		).toBe(false);
		expect(
			outputSchema.safeParse({
				...inflectionCase.idealOutput,
				resolution: {
					...inflectionCase.idealOutput.resolution,
					surface: {
						...inflectionCase.idealOutput.resolution.surface,
						inflectionalFeatures: { case: null, number: null },
					},
				},
			}).success,
		).toBe(false);
	});

	test("round-trips route-fixed Lemma and Surface fields", () => {
		const modelLemma = {
			canonicalForm: "Berlin",
			coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
		} as const;
		const lemma = deProperNounLemmaCodec.decode(modelLemma);
		expect(lemma).toEqual({
			...modelLemma,
			language: "de",
			family: "Lexeme",
			kind: "PROPN",
		});
		expect(deProperNounLemmaCodec.encode(lemma)).toEqual(modelLemma);

		const modelSurface = {
			normalizedSurface: "Berlin",
			spelling: "Canonical",
			realizationCoverage: "Full",
			surfaceKind: "Inflection",
			surfaceFeatures: { historicalStatus: null },
			inflectionalFeatures: { case: "Dat", number: "Sing" },
		} as const;
		const codec = buildDeProperNounInflectionSurfaceCodec(lemma);
		expect(codec.decode(modelSurface)).toEqual({
			...modelSurface,
			surfaceFeatures: null,
			language: "de",
			lemma,
		});
	});
});

describe("Lexeme/PROPN diagnostic evaluator", () => {
	test("passes every pinned ideal output exactly", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateProperNounGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports inflection and identity misses independently", () => {
		const testCase = corpus.cases["grammar-de-propn-dat-sing-berlin"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing Berlin fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...testCase.idealOutput.resolution.surface,
					inflectionalFeatures: { case: "Acc", number: "Sing" },
				},
			},
		});
		const result = evaluateProperNounGrammaticalResolution({
			caseId: "grammar-de-propn-dat-sing-berlin",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.inflectionalFeaturesPass).toBe(false);
		expect(result.canonicalFormPass).toBe(true);
		expect(result.coreFeaturesPass).toBe(true);
	});

	test("canonicalizes a null-only Surface Feature bag for scoring", () => {
		const testCase = corpus.cases["grammar-de-propn-acc-sing-anna"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing Anna fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				surface: {
					...testCase.idealOutput.resolution.surface,
					surfaceFeatures: { historicalStatus: null },
				},
			},
		});
		const result = evaluateProperNounGrammaticalResolution({
			caseId: "grammar-de-propn-acc-sing-anna",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
