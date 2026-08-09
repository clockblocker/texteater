import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	evaluation,
	proverbGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-proverb/evaluation-suite";
import { evaluateProverbGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-proverb/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/proverb/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/proverb/prompt-source";
import {
	buildDeProverbCitationSurfaceCodec,
	deProverbLemmaCodec,
	deProverbModelCitationSurfaceSchema,
	deProverbModelLemmaSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/proverb/schemas";

const expectedEvaluationIds = [
	"grammar-de-proverb-andere-laender",
	"grammar-de-proverb-ende-gut",
	"grammar-de-proverb-uebung-meister",
	"grammar-de-proverb-viele-koeche",
	"grammar-de-proverb-grube",
	"grammar-de-proverb-zuletzt-lacht",
	"grammar-de-proverb-stille-wasser",
	"grammar-de-proverb-gelegenheit-diebe",
	"grammar-de-proverb-apfel-stamm",
	"grammar-de-proverb-kleinvieh",
	"grammar-de-proverb-luegen-beine",
	"grammar-de-proverb-reden-silber",
	"grammar-de-proverb-wer-rastet",
	"grammar-de-proverb-unresolved-aphorism-nachahmer",
	"grammar-de-proverb-unresolved-idiom",
	"grammar-de-proverb-unresolved-discourse-formula",
	"grammar-de-proverb-unresolved-arbitrary-quotation",
	"grammar-de-proverb-unresolved-partial",
	"grammar-de-proverb-unresolved-overbroad-attribution",
	"grammar-de-proverb-unresolved-two-whole-units",
] as const;

describe("Phraseme/Proverb route-local schemas and corpus", () => {
	test("rejects mechanically invalid TARGET markup before model evaluation", () => {
		for (const markedContext of [
			"<TARGET>Übung</TARGET> macht",
			"<TARGET>Übung</TARGET> <TARGET>macht",
			"<TARGET></TARGET> <TARGET>macht</TARGET>",
			"<TARGET> </TARGET> <TARGET>macht</TARGET>",
			"<TARGET>Übung macht</TARGET> <TARGET>den</TARGET>",
			"<TARGET>Übung</TARGET><TARGET>,</TARGET> <TARGET>macht</TARGET>",
		]) {
			expect(inputSchema.safeParse({ markedContext }).success).toBe(
				false,
			);
		}
		expect(
			inputSchema.safeParse({
				markedContext:
					"<TARGET>Übung</TARGET> <TARGET>macht</TARGET> <TARGET>den</TARGET> <TARGET>Meister</TARGET>.",
			}).success,
		).toBe(true);
	});

	test("round-trips all fixed Lemma and Surface fields through the codecs", () => {
		const modelLemma = {
			canonicalForm: "Morgenstund hat Gold im Mund",
			coreFeatures: {},
		};
		const canonicalLemma = deProverbLemmaCodec.decode(modelLemma);
		expect(canonicalLemma).toEqual({
			language: "de",
			canonicalForm: "Morgenstund hat Gold im Mund",
			family: "Phraseme",
			kind: "Proverb",
			coreFeatures: {},
		});
		expect(deProverbLemmaCodec.encode(canonicalLemma)).toEqual(modelLemma);

		const modelSurface = {
			normalizedSurface: "Morgenstund hat Gold im Mund",
			spelling: "Canonical" as const,
			surfaceKind: "Citation" as const,
			surfaceFeatures: { historicalStatus: null },
		};
		const surfaceCodec = buildDeProverbCitationSurfaceCodec(canonicalLemma);
		const canonicalSurface = surfaceCodec.decode(modelSurface);
		expect(canonicalSurface).toEqual({
			language: "de",
			normalizedSurface: "Morgenstund hat Gold im Mund",
			spelling: "Canonical",
			surfaceKind: "Citation",
			surfaceFeatures: null,
			lemma: canonicalLemma,
		});
		expect(surfaceCodec.encode(canonicalSurface)).toEqual({
			...modelSurface,
			surfaceFeatures: null,
		});
	});

	test("projects the exact empty-Core Citation-only model DTO", () => {
		expect(
			deProverbModelLemmaSchema.parse({
				canonicalForm: "Übung macht den Meister",
				coreFeatures: {},
			}),
		).toEqual({
			canonicalForm: "Übung macht den Meister",
			coreFeatures: {},
		});
		expect(() =>
			deProverbModelLemmaSchema.parse({
				language: "de",
				canonicalForm: "Übung macht den Meister",
				coreFeatures: {},
			}),
		).toThrow();
		expect(() =>
			deProverbModelLemmaSchema.parse({
				canonicalForm: "Übung macht den Meister",
				coreFeatures: { source: "OWID" },
			}),
		).toThrow();
		expect(
			deProverbModelCitationSurfaceSchema.parse({
				normalizedSurface: "Übung macht den Meister",
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}),
		).toMatchObject({ surfaceKind: "Citation" });
		for (const extra of [
			{ realizationCoverage: "Partial" },
			{ language: "de" },
			{
				lemma: {
					language: "de",
					family: "Phraseme",
					kind: "Proverb",
					canonicalForm: "Übung macht den Meister",
					coreFeatures: {},
				},
			},
		]) {
			expect(() =>
				deProverbModelCitationSurfaceSchema.parse({
					normalizedSurface: "Übung macht den Meister",
					spelling: "Canonical",
					surfaceKind: "Citation",
					surfaceFeatures: null,
					...extra,
				}),
			).toThrow();
		}
		expect(() =>
			deProverbModelCitationSurfaceSchema.parse({
				normalizedSurface: "Übung macht den Meister",
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {},
			}),
		).toThrow();
	});

	test("pins exactly 20 held-outs disjoint from four minimized demonstrations", () => {
		expect(corpus.all().ids).toHaveLength(26);
		expect(demonstrations.ids).toEqual([
			"grammar-de-proverb-morgenstund",
			"grammar-de-proverb-typo-anfank",
			"grammar-de-proverb-was-heute",
			"grammar-de-proverb-unresolved-aphorism-alter",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation.ids).toHaveLength(20);
		expect(
			evaluation.cases.filter(
				(testCase) => testCase.idealOutput.decision === "Resolved",
			),
		).toHaveLength(13);
		expect(
			evaluation.cases.filter(
				(testCase) => testCase.idealOutput.decision === "Unresolved",
			),
		).toHaveLength(7);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation).toBe(
			proverbGrammaticalResolutionExperiment.evaluation,
		);
		expect(demonstrations.union(evaluation).ids).toHaveLength(24);
		expect(Object.keys(corpus.collections)).toEqual([
			"proverbs",
			"boundaries",
			"wordingVariants",
		]);
		for (const caseId of [
			"grammar-de-proverb-variant-andere-zeiten-andere-sitten",
			"grammar-de-proverb-variant-wer-rastet-rostet",
		] as const) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("maps every resolved TARGET member and excludes punctuation", () => {
		for (const testCase of corpus.all().cases) {
			if (testCase.idealOutput.resolution === null) continue;
			const openingCount =
				testCase.input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
			const closingCount =
				testCase.input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
			expect(openingCount).toBeGreaterThan(1);
			expect(closingCount).toBe(openingCount);
			expect(
				testCase.idealOutput.resolution.memberOrthographies,
			).toHaveLength(openingCount);
			expect(testCase.input.markedContext).not.toMatch(
				/<TARGET>[^<]*[,.!?„“][^<]*<\/TARGET>/u,
			);
		}
		expect(
			corpus.cases["grammar-de-proverb-ende-gut"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: { normalizedSurface: "Ende gut alles gut" },
				lemma: { canonicalForm: "Ende gut alles gut" },
			},
		});
	});

	test("assembles only the fixed-route demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain(
			"Target Classification has already fixed this request",
		);
		expect(prompt).toContain(
			"Otherwise the upstream Phraseme/Proverb route and marked membership remain",
		);
		expect(prompt).toContain(
			"Lack of\nrecognition, recalled provenance, or independent attestation is never a reason",
		);
		expect(prompt).toContain(
			"A named speaker quoting\na proverb does not change its route",
		);
		expect(prompt).toContain("<TARGET>Morgenstund</TARGET>");
		expect(prompt).toContain("<TARGET>Anfank</TARGET>");
		expect(prompt).toContain("<TARGET>besorgen</TARGET>,");
		expect(prompt).toContain("Aphorismensammlung");
		expect(prompt).not.toContain("<TARGET>Gelegenheit</TARGET>");
		expect(prompt).not.toContain("balanced <TARGET>");
		expect(prompt).not.toContain("an empty member");
	});
});

describe("Phraseme/Proverb pure diagnostic evaluator", () => {
	test("passes every pinned ideal output", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateProverbGrammaticalResolution({
				caseId,
				input: testCase.input,
				idealOutput: testCase.idealOutput,
				output: testCase.idealOutput,
			});
			expect(result.contractPass).toBe(true);
			expect(Object.values(result).every(Boolean)).toBe(true);
		}
	});

	test("reports member, normalization, and Core misses independently", () => {
		const testCase = corpus.cases["grammar-de-proverb-gelegenheit-diebe"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing sourced Proverb fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				memberOrthographies:
					testCase.idealOutput.resolution.memberOrthographies.slice(
						1,
					),
				realizationCoverage: "Full" as const,
				surface: {
					...testCase.idealOutput.resolution.surface,
					normalizedSurface: "Gelegenheit Diebe",
				},
			},
		});
		const result = evaluateProverbGrammaticalResolution({
			caseId: "grammar-de-proverb-gelegenheit-diebe",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(false);
		expect(result.memberCountPass).toBe(false);
		expect(result.memberOrthographiesPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.coreFeaturesPass).toBe(true);
	});

	test("canonicalizes an all-null feature bag like the codec", () => {
		const testCase = corpus.cases["grammar-de-proverb-kleinvieh"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing Proverb fixture.");
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
		const result = evaluateProverbGrammaticalResolution({
			caseId: "grammar-de-proverb-kleinvieh",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
