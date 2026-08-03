import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	aphorismGrammaticalResolutionExperiment,
	evaluation,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-aphorism/evaluation-suite";
import { evaluateAphorismGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-aphorism/evaluator";
import { corpus } from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/aphorism/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/aphorism/prompt-source";
import {
	deAphorismModelCitationSurfaceSchema,
	deAphorismModelLemmaSchema,
	inputSchema,
	outputSchema,
} from "../../src/promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/aphorism/schemas";

const expectedEvaluationIds = [
	"grammar-de-aphorism-nachahmer",
	"grammar-de-aphorism-nachsicht",
	"grammar-de-aphorism-kindheit",
	"grammar-de-aphorism-alter",
	"grammar-de-aphorism-jugend",
	"grammar-de-aphorism-tadel",
	"grammar-de-aphorism-liebe-rechte",
	"grammar-de-aphorism-gegenwart",
	"grammar-de-aphorism-streiten",
	"grammar-de-aphorism-unbezahlbar",
	"grammar-de-aphorism-grundsaetze",
	"grammar-de-aphorism-casing-menschen",
	"grammar-de-aphorism-unresolved-idiom",
	"grammar-de-aphorism-unresolved-collocation",
	"grammar-de-aphorism-unresolved-arbitrary-quotation",
	"grammar-de-aphorism-unresolved-ordinary-sentence",
	"grammar-de-aphorism-unresolved-literary-quotation",
	"grammar-de-aphorism-unresolved-partial",
	"grammar-de-aphorism-unresolved-two-whole-units",
	"grammar-de-aphorism-unresolved-proverb-grube",
] as const;

describe("Phraseme/Aphorism route-local schemas and corpus", () => {
	test("rejects mechanically invalid TARGET markup before model evaluation", () => {
		for (const markedContext of [
			"<TARGET>Alt</TARGET> werden",
			"<TARGET>Alt</TARGET> <TARGET>werden",
			"<TARGET></TARGET> <TARGET>werden</TARGET>",
			"<TARGET> </TARGET> <TARGET>werden</TARGET>",
			"<TARGET>Alt werden</TARGET> <TARGET>heißt</TARGET>",
			"<TARGET>Alt</TARGET><TARGET>,</TARGET> <TARGET>werden</TARGET>",
		]) {
			expect(inputSchema.safeParse({ markedContext }).success).toBe(
				false,
			);
		}
		expect(
			inputSchema.safeParse({
				markedContext:
					"<TARGET>Alt</TARGET> <TARGET>werden</TARGET>, <TARGET>heißt</TARGET> <TARGET>sehend</TARGET> <TARGET>werden</TARGET>.",
			}).success,
		).toBe(true);
	});

	test("projects the exact empty-Core Citation-only DTO", () => {
		expect(
			deAphorismModelLemmaSchema.parse({
				canonicalForm: "Alt werden heißt sehend werden",
				coreFeatures: {},
			}),
		).toEqual({
			canonicalForm: "Alt werden heißt sehend werden",
			coreFeatures: {},
		});
		expect(() =>
			deAphorismModelLemmaSchema.parse({
				language: "de",
				canonicalForm: "Alt werden heißt sehend werden",
				coreFeatures: {},
			}),
		).toThrow();
		expect(() =>
			deAphorismModelLemmaSchema.parse({
				canonicalForm: "Alt werden heißt sehend werden",
				coreFeatures: { author: "Marie von Ebner-Eschenbach" },
			}),
		).toThrow();
		expect(
			deAphorismModelCitationSurfaceSchema.parse({
				normalizedSurface: "Alt werden heißt sehend werden",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceKind: "Citation",
				surfaceFeatures: null,
			}),
		).toMatchObject({ surfaceKind: "Citation" });
		expect(() =>
			deAphorismModelCitationSurfaceSchema.parse({
				normalizedSurface: "Alt werden heißt sehend werden",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {},
			}),
		).toThrow();
	});

	test("pins 20 held-outs disjoint from four minimized demonstrations", () => {
		expect(corpus.all().ids).toHaveLength(26);
		expect(demonstrations.ids).toEqual([
			"grammar-de-aphorism-alt-werden",
			"grammar-de-aphorism-typo-hoert",
			"grammar-de-aphorism-historical-muss",
			"grammar-de-aphorism-unresolved-proverb",
		]);
		expect(evaluation.ids).toEqual(expectedEvaluationIds);
		expect(evaluation.ids).toHaveLength(20);
		expect(
			evaluation.cases.filter(
				(testCase) => testCase.idealOutput.decision === "Resolved",
			),
		).toHaveLength(12);
		expect(
			evaluation.cases.filter(
				(testCase) => testCase.idealOutput.decision === "Unresolved",
			),
		).toHaveLength(8);
		expect(demonstrations.isDisjointFrom(evaluation)).toBe(true);
		expect(evaluation).toBe(
			aphorismGrammaticalResolutionExperiment.evaluation,
		);
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
	});

	test("keeps two authorship boundaries corpus-only", () => {
		expect(Object.keys(corpus.collections)).toEqual([
			"resolved",
			"boundaries",
			"authorshipBoundaries",
		]);
		for (const caseId of [
			"grammar-de-aphorism-authorship-anonymous-maxim",
			"grammar-de-aphorism-authorship-overbroad-attribution",
		] as const) {
			expect(corpus.cases[caseId]).toBeDefined();
			expect(demonstrations.ids).not.toContain(caseId);
			expect(evaluation.ids).not.toContain(caseId);
		}
	});

	test("maps every lexical TARGET member to one orthography value", () => {
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
	});

	test("keeps punctuation outside membership and treats historical spelling honestly", () => {
		expect(
			corpus.cases["grammar-de-aphorism-alt-werden"]?.idealOutput,
		).toMatchObject({
			resolution: {
				surface: {
					normalizedSurface: "Alt werden heißt sehend werden",
				},
			},
		});
		expect(
			corpus.cases["grammar-de-aphorism-historical-muss"]?.idealOutput,
		).toMatchObject({
			resolution: {
				memberOrthographies: [
					"Standard",
					"Standard",
					"Standard",
					"Standard",
					"Standard",
					"Standard",
				],
				surface: {
					normalizedSurface: "Wer nichts weiß muß alles glauben",
					spelling: "Variant",
				},
				lemma: { canonicalForm: "Wer nichts weiß muss alles glauben" },
			},
		});
	});

	test("assembles only demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain(
			"Target Classification has already fixed this request",
		);
		expect(prompt).toContain(
			"Unfamiliarity with the wording\nis not evidence for Unresolved",
		);
		expect(prompt).toContain(
			"look only for hard contradiction evidence that is observable",
		);
		expect(prompt).toMatch(
			/unmarked context explicitly labels the marked wording as a Collocation or\s+Funktionsverbgefüge/u,
		);
		expect(prompt).toMatch(
			/a traditional Proverb, a merely episodic observation/u,
		);
		expect(prompt).toMatch(
			/drama or scene-bound dialogue, or ordinary direct speech/u,
		);
		expect(prompt).toMatch(
			/punctuation separates\s+the marked members into multiple complete units/u,
		);
		expect(prompt).toContain("Hard contradiction evidence is decisive");
		expect(prompt).toContain(
			"Do not invent a contradiction from the marked wording's style or content",
		);
		expect(prompt).toContain(
			"recognition, recalled authorship, or independent attestation is never a reason",
		);
		expect(prompt).not.toContain(
			"Resolve only when all and only the lexical members of one complete Aphorism",
		);
		expect(prompt).not.toContain(
			"Resolve only with strong evidence that the complete marked wording",
		);
		expect(prompt).toContain("<TARGET>Alt</TARGET>");
		expect(prompt).toContain("<TARGET>höhrt</TARGET>");
		expect(prompt).toContain("<TARGET>muß</TARGET>");
		expect(prompt).toContain("<TARGET>Morgenstund</TARGET>");
		expect(prompt).not.toContain("<TARGET>Nachahmer</TARGET>");
		expect(prompt).not.toContain("Marie</TARGET> <TARGET>von</TARGET>");
		expect(prompt).not.toContain("balanced <TARGET>");
		expect(prompt).not.toContain("an empty member");
		expect(prompt).not.toContain("targeted punctuation mark");
		expect(prompt).toMatch(
			/when the complete maxim begins with\s+lowercase die, normalize it to Die/u,
		);
		expect(prompt).toMatch(
			/An attested uppercase initial at the beginning of\s+the maxim is ordinary sentence-initial capitalization and remains Standard/u,
		);
	});

	test("keeps source-verified held-outs free of bibliographic hints", () => {
		const sourced = corpus.cases["grammar-de-aphorism-nachahmer"];
		expect(sourced?.idealOutput.decision).toBe("Resolved");
		expect(sourced?.input.markedContext).not.toMatch(
			/Marie|Ebner|Aphorism|Quelle|Sammlung/u,
		);
	});

	test("makes the dramatic-quotation contradiction observable in context", () => {
		const literary =
			corpus.cases["grammar-de-aphorism-unresolved-literary-quotation"];
		expect(literary?.input.markedContext).toContain("Bühnenszene");
		expect(literary?.idealOutput.decision).toBe("Unresolved");
	});

	test("pins every classified v4 decision and initial-casing regression", () => {
		expect(
			corpus.cases["grammar-de-aphorism-jugend"]?.idealOutput,
		).toMatchObject({
			decision: "Resolved",
			resolution: {
				surface: {
					normalizedSurface:
						"In der Jugend lernt im Alter versteht man",
				},
			},
		});

		const casing =
			corpus.cases["grammar-de-aphorism-casing-menschen"]?.idealOutput;
		expect(casing).toMatchObject({
			decision: "Resolved",
			resolution: {
				surface: {
					normalizedSurface:
						"Die Menschen denen wir eine Stütze sind die geben uns den Halt im Leben",
				},
				lemma: {
					canonicalForm:
						"Die Menschen denen wir eine Stütze sind die geben uns den Halt im Leben",
				},
			},
		});
		if (casing?.resolution === null || casing === undefined) {
			throw new Error("Missing resolved initial-casing fixture.");
		}
		expect(casing.resolution.memberOrthographies).toEqual([
			"Typo",
			...Array.from({ length: 13 }, () => "Standard" as const),
		]);

		for (const caseId of [
			"grammar-de-aphorism-unresolved-collocation",
			"grammar-de-aphorism-unresolved-ordinary-sentence",
			"grammar-de-aphorism-unresolved-literary-quotation",
			"grammar-de-aphorism-unresolved-two-whole-units",
			"grammar-de-aphorism-unresolved-proverb-grube",
		] as const) {
			expect(corpus.cases[caseId]?.idealOutput).toEqual({
				decision: "Unresolved",
				resolution: null,
			});
		}

		expect(
			corpus.cases["grammar-de-aphorism-unresolved-collocation"]?.input
				.markedContext,
		).toContain("ausdrücklich als Funktionsverbgefüge");
		expect(
			corpus.cases["grammar-de-aphorism-unresolved-ordinary-sentence"]
				?.input.markedContext,
		).toContain("rein episodische Beobachtung");
		expect(
			corpus.cases["grammar-de-aphorism-unresolved-literary-quotation"]
				?.input.markedContext,
		).toContain("konkreten Bühnenszene");
		expect(
			corpus.cases["grammar-de-aphorism-unresolved-two-whole-units"]
				?.input.markedContext,
		).toMatch(/<\/TARGET>\. <TARGET>/u);
		expect(
			corpus.cases["grammar-de-aphorism-unresolved-proverb-grube"]?.input
				.markedContext,
		).toContain("traditionelle Sprichwort");
	});
});

describe("Phraseme/Aphorism pure diagnostic evaluator", () => {
	test("passes every pinned ideal output", () => {
		for (const [index, caseId] of evaluation.ids.entries()) {
			const testCase = evaluation.cases[index];
			if (testCase === undefined) throw new Error(`Missing ${caseId}.`);
			const result = evaluateAphorismGrammaticalResolution({
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
		const testCase = corpus.cases["grammar-de-aphorism-nachahmer"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing sourced Aphorism fixture.");
		}
		const output = outputSchema.parse({
			...testCase.idealOutput,
			resolution: {
				...testCase.idealOutput.resolution,
				memberOrthographies:
					testCase.idealOutput.resolution.memberOrthographies.slice(
						1,
					),
				surface: {
					...testCase.idealOutput.resolution.surface,
					normalizedSurface: "Die Nachahmer",
				},
			},
		});
		const result = evaluateAphorismGrammaticalResolution({
			caseId: "grammar-de-aphorism-nachahmer",
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
		const testCase = corpus.cases["grammar-de-aphorism-alter"];
		if (
			testCase === undefined ||
			testCase.idealOutput.resolution === null
		) {
			throw new Error("Missing Aphorism fixture.");
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
		const result = evaluateAphorismGrammaticalResolution({
			caseId: "grammar-de-aphorism-alter",
			input: testCase.input,
			idealOutput: testCase.idealOutput,
			output,
		});
		expect(result.contractPass).toBe(true);
		expect(result.surfaceFeaturesPass).toBe(true);
	});
});
