import { describe, expect, test } from "bun:test";
import { runCodegen } from "codegen";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

import type { AiSdk } from "../../src/ai-sdk/ai-sdk";
import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import {
	COMPACT_CODE_MAPS,
	COMPACT_CODE_SCHEMAS,
	COMPACT_FIELD_KEYS,
	compactCitationSurfaceSchema,
	compactGrammaticalInputSchema,
	compactGrammaticalOutputCodec,
	compactGrammaticalOutputSchema,
	compactInflectionSurfaceSchema,
	compactNounLemmaSchema,
	compactReadingInputCodec,
	compactReadingInputSchema,
	compactReadingOutputCodec,
	compactReadingOutputSchema,
	grammaticalLegendClaims,
	readingLegendClaims,
} from "../../src/experiments/issue-22-compact-noun-dtos/compact-codecs";
import {
	buildCompactNounExperiment,
	COMPACT_NOUN_EXPERIMENT_CATALOG,
} from "../../src/experiments/issue-22-compact-noun-dtos/compact-prompts";
import { buildDeterministicComparison } from "../../src/experiments/issue-22-compact-noun-dtos/comparison";
import {
	GRAMMATICAL_COMPARISON_CASES,
	READING_COMPARISON_CASES,
} from "../../src/experiments/issue-22-compact-noun-dtos/comparison-cases";
import { stableJson } from "../../src/lib/stable-json";
import { compactSystemPromptRecipe } from "../../src/promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/generate-system-prompts";
import { body as grammaticalBody } from "../../src/promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/grammatical-resolution/de/lexeme/noun/body";
import { examplesForTest as grammaticalTestExamples } from "../../src/promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/grammatical-resolution/de/lexeme/noun/examples-for-test";
import { examplesToUse as grammaticalUseExamples } from "../../src/promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/grammatical-resolution/de/lexeme/noun/examples-to-use";
import { body as readingBody } from "../../src/promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/reading-resolution/de/lexeme/noun/body";
import { examplesForTest as readingTestExamples } from "../../src/promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/reading-resolution/de/lexeme/noun/examples-for-test";
import { examplesToUse as readingUseExamples } from "../../src/promptsmith/laboratory/experiments/issue-22-compact-noun-dtos/prompt-part/reading-resolution/de/lexeme/noun/examples-to-use";

const grammarLibraryCase = GRAMMATICAL_COMPARISON_CASES[0];
const readingLibraryCase = READING_COMPARISON_CASES[0];
const readingTeaCase = READING_COMPARISON_CASES[1];
const grammaticalTestExample = grammaticalTestExamples[0];
const readingTestExample = readingTestExamples[0];
if (
	!grammarLibraryCase ||
	!readingLibraryCase ||
	!readingTeaCase ||
	!grammaticalTestExample ||
	!readingTestExample
) {
	throw new Error(
		"Issue #22 comparison and test fixtures must not be empty.",
	);
}

describe("issue #22 compact German noun DTO codecs", () => {
	test("round-trips Inflection and Citation grammar results", () => {
		const inflection = grammarLibraryCase.expectedCanonical;
		const compactInflection =
			compactGrammaticalOutputCodec.encode(inflection);
		expect(compactInflection).toMatchObject({
			d: "R",
			r: {
				o: ["S"],
				s: { k: "I", i: { c: "D", n: "S" } },
				l: { g: "F" },
			},
		});
		expect(compactGrammaticalOutputCodec.decode(compactInflection)).toEqual(
			inflection,
		);

		const citation = {
			decision: "Resolved",
			memberOrthographies: ["Standard"],
			surface: {
				language: "de",
				normalizedSurface: "Haus",
				spelling: "Variant",
				realizationCoverage: "Full",
				surfaceKind: "Citation",
				surfaceFeatures: { historicalStatus: "Archaic" },
			},
			lemma: {
				canonicalForm: "Haus",
				coreFeatures: { gender: "Neut", hyph: null },
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
			},
		} satisfies z.input<typeof compactGrammaticalOutputCodec.out>;
		const compactCitation = compactGrammaticalOutputCodec.encode(citation);
		expect(compactCitation).toMatchObject({
			d: "R",
			r: { s: { k: "C", i: null, p: "V", h: "A" } },
		});
		expect(compactGrammaticalOutputCodec.decode(compactCitation)).toEqual(
			citation,
		);
	});

	test("round-trips Reading application input and output", () => {
		const comparisonCase = readingTeaCase;
		const compactInput = compactReadingInputCodec.encode(
			comparisonCase.input,
		);
		expect(compactInput).toEqual({
			c: "Der <TARGET>Tee</TARGET> duftet.",
			l: { c: "Tee", g: "M", h: null },
			e: ["☕ Tee"],
		});
		expect(compactReadingInputCodec.decode(compactInput)).toEqual(
			comparisonCase.input,
		);

		const compactOutput = compactReadingOutputCodec.encode(
			comparisonCase.expectedCanonical,
		);
		expect(compactOutput).toEqual({ d: "R", e: "☕ Tee" });
		expect(compactReadingOutputCodec.decode(compactOutput)).toEqual(
			comparisonCase.expectedCanonical,
		);
	});

	test("rejects invalid codes, missing fields, unknown fields, and invalid canonical values", () => {
		const validCompact = compactGrammaticalOutputCodec.encode(
			grammarLibraryCase.expectedCanonical,
		);
		expect(() =>
			compactGrammaticalOutputCodec.decode({
				...validCompact,
				d: "Q",
			} as never),
		).toThrow();
		expect(() =>
			compactGrammaticalOutputSchema.parse({ r: null }),
		).toThrow();
		expect(() =>
			compactGrammaticalOutputSchema.parse({
				d: "U",
				r: null,
				decision: "Unresolved",
			}),
		).toThrow();
		expect(() =>
			compactGrammaticalOutputCodec.decode({
				...validCompact,
				d: "U",
			} as never),
		).toThrow(/must have r=null/);
		expect(() =>
			compactReadingInputCodec.encode({
				...readingLibraryCase.input,
				lemma: {
					...readingLibraryCase.input.lemma,
					language: "en",
				},
			} as never),
		).toThrow();
		expect(() =>
			compactGrammaticalOutputCodec.decode({
				...validCompact,
				r: {
					...validCompact.r,
					s: {
						...validCompact.r?.s,
						k: "I",
						i: { c: null, n: null },
					},
				},
			} as never),
		).toThrow();
	});
});

describe("issue #22 Promptsmith experiment", () => {
	test("derives every compact code schema and prompt legend from the authoritative maps", () => {
		for (const [name, map] of Object.entries(COMPACT_CODE_MAPS)) {
			expect(new Set(Object.values(map)).size).toBe(
				Object.keys(map).length,
			);
			const schemaCodes = COMPACT_CODE_SCHEMAS[
				name as keyof typeof COMPACT_CODE_SCHEMAS
			].options as readonly string[];
			expect(schemaCodes).toEqual(Object.keys(map));
		}
		for (const claim of grammaticalLegendClaims) {
			expect(grammaticalBody).toContain(claim);
		}
		for (const claim of readingLegendClaims) {
			expect(readingBody).toContain(claim);
		}

		const grammaticalLegend = grammaticalLegendClaims.join("\n");
		for (const name of [
			"grammarDecision",
			"memberOrthography",
			"spelling",
			"realizationCoverage",
			"surfaceKind",
			"historicalStatus",
			"gender",
			"hyph",
			"case",
			"number",
		] as const) {
			for (const [code, meaning] of Object.entries(
				COMPACT_CODE_MAPS[name],
			)) {
				expect(grammaticalLegend).toContain(`${code}=${meaning}`);
			}
		}
		const readingLegend = readingLegendClaims.join("\n");
		for (const name of ["gender", "hyph", "readingDecision"] as const) {
			for (const [code, meaning] of Object.entries(
				COMPACT_CODE_MAPS[name],
			)) {
				expect(readingLegend).toContain(`${code}=${meaning}`);
			}
		}
	});

	test("keeps every compact schema key synchronized with its documented meaning", () => {
		const resolutionSchema =
			compactGrammaticalOutputSchema.shape.r.unwrap();
		const inflectionSchema = compactInflectionSurfaceSchema.shape.i;
		const keySets = [
			[
				compactGrammaticalInputSchema.shape,
				COMPACT_FIELD_KEYS.grammaticalInput,
			],
			[
				compactGrammaticalOutputSchema.shape,
				COMPACT_FIELD_KEYS.grammaticalOutput,
			],
			[resolutionSchema.shape, COMPACT_FIELD_KEYS.grammaticalResolution],
			[compactCitationSurfaceSchema.shape, COMPACT_FIELD_KEYS.surface],
			[compactInflectionSurfaceSchema.shape, COMPACT_FIELD_KEYS.surface],
			[inflectionSchema.shape, COMPACT_FIELD_KEYS.inflectionalFeatures],
			[compactNounLemmaSchema.shape, COMPACT_FIELD_KEYS.lemma],
			[compactReadingInputSchema.shape, COMPACT_FIELD_KEYS.readingInput],
			[
				compactReadingOutputSchema.shape,
				COMPACT_FIELD_KEYS.readingOutput,
			],
		] as const;

		for (const [shape, fields] of keySets) {
			expect(Object.keys(shape).toSorted()).toEqual(
				Object.values(fields).toSorted(),
			);
		}

		const allLegendText = [
			...grammaticalLegendClaims,
			...readingLegendClaims,
		].join("\n");
		for (const fields of Object.values(COMPACT_FIELD_KEYS)) {
			for (const [meaning, key] of Object.entries(fields)) {
				expect(allLegendText).toContain(`${key}=${meaning}`);
			}
		}
	});

	test("keeps authored examples tiny and test examples out of generated prompts", () => {
		const examples = [...grammaticalUseExamples, ...readingUseExamples];
		const serialized = stableJson(examples);
		for (const verboseKey of [
			"markedContext",
			"decision",
			"memberOrthographies",
			"normalizedSurface",
			"canonicalForm",
			"emojiDescription",
		]) {
			expect(serialized).not.toContain(`"${verboseKey}"`);
		}
		const prompts = [
			COMPACT_NOUN_EXPERIMENT_CATALOG.grammaticalResolution.prompt
				.systemPrompt,
			COMPACT_NOUN_EXPERIMENT_CATALOG.readingResolution.prompt
				.systemPrompt,
		].join("\n");
		expect(prompts).not.toContain(grammaticalTestExample.id);
		expect(prompts).not.toContain(readingTestExample.id);
		expect(prompts).not.toContain(
			"Die <TARGET>Banken</TARGET> sind geöffnet.",
		);
	});

	test("produces strict OpenAI-compatible output schemas and current generated assets", async () => {
		expect(() =>
			zodTextFormat(
				compactGrammaticalOutputSchema,
				"issue_22_compact_grammar",
			),
		).not.toThrow();
		expect(() =>
			zodTextFormat(
				compactReadingOutputSchema,
				"issue_22_compact_reading",
			),
		).not.toThrow();
		const result = await runCodegen(compactSystemPromptRecipe, {
			mode: "check",
		});
		expect(result.status).toBe("clean");
		expect(result.applied).toEqual([]);
	});

	test("is opt-in and executes canonical results without changing the default catalog", async () => {
		expect("experiment" in PROMPT_CATALOG.laboratory).toBeFalse();
		expect(
			PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme.NOUN
				.prompt,
		).not.toBe(
			COMPACT_NOUN_EXPERIMENT_CATALOG.grammaticalResolution.prompt,
		);

		const modelOutputs = [
			compactGrammaticalOutputCodec.encode(
				grammarLibraryCase.expectedCanonical,
			),
			compactReadingOutputCodec.encode(
				readingLibraryCase.expectedCanonical,
			),
		];
		const serializedInputs: string[] = [];
		const sdk: AiSdk = {
			async structuredGeneration(input) {
				serializedInputs.push(input);
				return modelOutputs.shift() as never;
			},
			async unstructuredGeneration() {
				throw new Error("not used");
			},
		};
		const generate = buildCompactNounExperiment(sdk);
		await expect(
			generate.grammaticalResolution(grammarLibraryCase.input),
		).resolves.toEqual(grammarLibraryCase.expectedCanonical);
		await expect(
			generate.readingResolution(readingLibraryCase.input),
		).resolves.toEqual(readingLibraryCase.expectedCanonical);
		expect(serializedInputs[0]).toBe(
			'{"c":"Wir sitzen in der <TARGET>Bibliothek</TARGET>."}',
		);
		const capturedReadingInput = serializedInputs[1] ?? "";
		expect(capturedReadingInput).not.toContain("language");
		expect(capturedReadingInput).not.toContain("family");
		expect(capturedReadingInput).not.toContain("kind");
	});

	test("records deterministic same-case reductions with canonical codec success", () => {
		const comparison = buildDeterministicComparison();
		expect(comparison.measurements).toHaveLength(8);
		expect(
			comparison.measurements.every(
				(measurement) =>
					measurement.codecSuccess &&
					measurement.canonicalMatchesReference,
			),
		).toBeTrue();
		for (const total of comparison.totals.filter((total) =>
			[
				"serializedInputBytes",
				"serializedOutputBytes",
				"estimatedOutputTokens",
			].includes(total.metric),
		)) {
			expect(total.compact).toBeLessThan(total.verbose);
		}
		for (const total of comparison.totals.filter(
			(total) => total.metric === "systemPromptBytes",
		)) {
			expect(total.compact).toBeGreaterThan(total.verbose);
		}
		const estimatedInputs = comparison.totals.filter(
			(total) => total.metric === "estimatedInputTokens",
		);
		expect(estimatedInputs).toMatchObject([
			{
				stage: "grammaticalResolution",
				verbose: 986,
				compact: 1080,
			},
			{
				stage: "readingResolution",
				verbose: 691,
				compact: 669,
			},
		]);
		const currentCompactPromptFingerprints = comparison.measurements
			.filter((measurement) => measurement.arm === "compact")
			.map(({ stage, systemPromptBytes, systemPromptSha256 }) => ({
				stage,
				systemPromptBytes,
				systemPromptSha256,
			}));
		expect(currentCompactPromptFingerprints).toEqual([
			{
				stage: "grammaticalResolution",
				systemPromptBytes: 2106,
				systemPromptSha256:
					"4c2fde8670250b4ef71129320328f6c9519971c9899f06121f991e394d225ccf",
			},
			{
				stage: "grammaticalResolution",
				systemPromptBytes: 2106,
				systemPromptSha256:
					"4c2fde8670250b4ef71129320328f6c9519971c9899f06121f991e394d225ccf",
			},
			{
				stage: "readingResolution",
				systemPromptBytes: 1242,
				systemPromptSha256:
					"13d94cb8f66f7f9804a4c15a5ae453614c5bedca214c6531d51cca516b76ea07",
			},
			{
				stage: "readingResolution",
				systemPromptBytes: 1242,
				systemPromptSha256:
					"13d94cb8f66f7f9804a4c15a5ae453614c5bedca214c6531d51cca516b76ea07",
			},
		]);
	});
});
