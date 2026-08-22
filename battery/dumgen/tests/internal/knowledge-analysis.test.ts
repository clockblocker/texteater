import { describe, expect, test } from "bun:test";
import { applyKnowledgeChange } from "dumrel";
import { knowledgeChangeSchema } from "dumrel/schema";

import { LEGACY_KNOWLEDGE_PROMPT_CATALOG } from "../../src/catalog/legacy-knowledge-prompt-catalog";
import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	lexicalResolutionCorpus,
	lexicalSegmentationCorpus,
	morphologicalResolutionCorpus,
	morphologicalSegmentationCorpus,
	translationAnalysisCorpus,
} from "../../src/promptsmith/production/knowledge-analysis/corpora";
import { promptSource as lexicalResolutionSource } from "../../src/promptsmith/production/knowledge-analysis/lexical-breakdown/resolution/prompt-source";
import { promptSource as lexicalSegmentationSource } from "../../src/promptsmith/production/knowledge-analysis/lexical-breakdown/segmentation/prompt-source";
import { promptSource as morphologicalResolutionSource } from "../../src/promptsmith/production/knowledge-analysis/morphological-tree/resolution/prompt-source";
import { promptSource as morphologicalSegmentationSource } from "../../src/promptsmith/production/knowledge-analysis/morphological-tree/segmentation/prompt-source";
import {
	projectLexicalBreakdownChange,
	projectMorphologicalTreeChange,
	projectPendingSemanticRelation,
	projectTranslationChange,
} from "../../src/promptsmith/production/knowledge-analysis/projection";
import {
	lexicalResolutionOutputSchema,
	lexicalSegmentationOutputSchema,
	morphologicalResolutionOutputSchema,
	morphologicalSegmentationOutputSchema,
	translationAnalysisOutputSchema,
} from "../../src/promptsmith/production/knowledge-analysis/schemas";
import { promptSource as translationAnalysisSource } from "../../src/promptsmith/production/knowledge-analysis/translation/prompt-source";

describe("Knowledge analysis Prompt Sources", () => {
	test("own separate pointer-only segmentation and resolution corpora", () => {
		expect(morphologicalSegmentationCorpus.all().ids).toHaveLength(5);
		expect(morphologicalResolutionCorpus.all().ids).toHaveLength(3);
		expect(lexicalSegmentationCorpus.all().ids).toHaveLength(3);
		expect(lexicalResolutionCorpus.all().ids).toHaveLength(3);
		expect(translationAnalysisCorpus.all().ids).toHaveLength(8);

		const verbal =
			lexicalSegmentationCorpus.cases[
				"lexical-segment-contextual-reflexive"
			]?.input;
		expect(verbal?.source).toBe("mich erinnern");
		expect(verbal?.owner.lemmaDescriptor.canonicalForm).toBe(
			"sich erinnern",
		);
	});

	test("registers all generated prompt variants in the runtime catalog", () => {
		const catalog = LEGACY_KNOWLEDGE_PROMPT_CATALOG;
		const pairs = [
			[
				catalog.morphologicalTree.segmentation.prompt,
				morphologicalSegmentationSource,
			],
			[
				catalog.morphologicalTree.resolution.prompt,
				morphologicalResolutionSource,
			],
			[
				catalog.lexicalBreakdown.segmentation.prompt,
				lexicalSegmentationSource,
			],
			[
				catalog.lexicalBreakdown.resolution.prompt,
				lexicalResolutionSource,
			],
			[catalog.translation.prompt, translationAnalysisSource],
		] as const;

		for (const [prompt, source] of pairs) {
			expect(prompt.systemPrompt).toBe(assembleSystemPrompt(source));
		}
	});

	test("forbids invented analysis metadata in every durable output", () => {
		const labelledTree = {
			root: {
				nodeKind: "structure",
				operation: "compound",
				children: [
					{
						role: "head",
						node: {
							nodeKind: "lexicalUnit",
							sourceText: "Kraftwerk",
						},
					},
				],
			},
		};
		expect(
			morphologicalSegmentationOutputSchema.safeParse(labelledTree)
				.success,
		).toBe(false);
		expect(
			morphologicalResolutionOutputSchema.safeParse(labelledTree).success,
		).toBe(false);
		expect(
			lexicalSegmentationOutputSchema.safeParse({
				components: [
					{ role: "reflexive", sourceText: "mich" },
					{ role: "content", sourceText: "erinnern" },
				],
			}).success,
		).toBe(false);
		expect(
			lexicalResolutionOutputSchema.safeParse([
				{
					role: "reflexive",
					language: "de",
					canonicalForm: "sich",
					family: "Lexeme",
					kind: "PRON",
				},
				{
					language: "de",
					canonicalForm: "erinnern",
					family: "Lexeme",
					kind: "VERB",
				},
			]).success,
		).toBe(false);
	});

	test("projects only Morpheme drafts and leaves all lexical targets as shadows", () => {
		const morphology =
			morphologicalResolutionCorpus.cases[
				"morphology-resolve-direct-pointers"
			]?.idealOutput;
		const lexical =
			lexicalResolutionCorpus.cases["lexical-resolve-contextual-shadows"]
				?.idealOutput;
		const repeatedLexical =
			lexicalResolutionCorpus.cases["lexical-resolve-repeated-shadows"]
				?.idealOutput;
		if (
			morphology === undefined ||
			lexical === undefined ||
			repeatedLexical === undefined
		) {
			throw new Error("Missing resolution corpus cases.");
		}

		const projectedMorphology = projectMorphologicalTreeChange(
			morphology,
			(draft) => ({
				lemma: {
					...draft.lemmaDescriptor,
					coreFeatures: { hasSepPrefix: null },
				},
				emojiDescription: draft.emojiDescription,
			}),
		);
		expect(projectedMorphology).toMatchObject({
			kind: "Contribute",
			aspect: "morphologicalTree",
		});
		const prefix = projectedMorphology.value.root.children[0];
		expect(
			prefix?.nodeKind === "morphemeReading"
				? prefix.reading.lemma.canonicalForm
				: null,
		).toBe("ent-");
		expect(projectedMorphology.value.root.children[1]).toEqual({
			nodeKind: "unitShadow",
			unitShadow: {
				language: "de",
				canonicalForm: "spannen",
				family: "Lexeme",
				kind: "VERB",
			},
		});

		const projectedLexical = projectLexicalBreakdownChange(lexical);
		expect(projectedLexical).toEqual({
			kind: "Contribute",
			aspect: "lexicalBreakdown",
			value: [
				{
					language: "de",
					canonicalForm: "sich",
					family: "Lexeme",
					kind: "PRON",
				},
				{
					language: "de",
					canonicalForm: "erinnern",
					family: "Lexeme",
					kind: "VERB",
				},
			],
		});
		expect(
			projectLexicalBreakdownChange(repeatedLexical).value.map(
				({ canonicalForm }) => canonicalForm,
			),
		).toEqual(["so", "oder", "so"]);
	});

	test("validates caller-resolved Morpheme Readings", () => {
		const morphology =
			morphologicalResolutionCorpus.cases[
				"morphology-resolve-direct-pointers"
			]?.idealOutput;
		if (morphology === undefined)
			throw new Error("Missing morphology case.");
		expect(() =>
			projectMorphologicalTreeChange(morphology, (draft) => ({
				lemma: {
					...draft.lemmaDescriptor,
					family: "Lexeme",
					kind: "NOUN",
					coreFeatures: { gender: "Neut", hyph: null },
				},
				emojiDescription: draft.emojiDescription,
			})),
		).toThrow();
	});

	test("validates unresolved relation targets as pending DTOs only", () => {
		expect(
			projectPendingSemanticRelation({
				relation: "antonym",
				target: {
					language: "de",
					canonicalForm: "kalt",
					family: "Lexeme",
					kind: "ADJ",
				},
			}),
		).toEqual({
			relation: "antonym",
			target: {
				language: "de",
				canonicalForm: "kalt",
				family: "Lexeme",
				kind: "ADJ",
			},
		});
		expect(() =>
			projectPendingSemanticRelation({
				sourceReading: "invented-owner",
				relation: "antonym",
				target: {
					language: "de",
					canonicalForm: "kalt",
					family: "Lexeme",
					kind: "ADJ",
				},
			}),
		).toThrow();
	});

	test("projects private Translation decisions into exact Dumrel Changes", () => {
		const sourceReading = {
			lemmaDescriptor: {
				language: "de" as const,
				canonicalForm: "Café",
				family: "Lexeme" as const,
				kind: "NOUN" as const,
			},
			emojiDescription: "☕",
		};
		const covered = projectTranslationChange(
			{
				markedContext: "Das <TARGET>Café</TARGET> öffnet früh.",
				sourceReading,
				targetLanguage: "fr" as const,
				existingTranslations: ["cafe\u0301"],
			},
			{ decision: "Covered", existingIndex: 0 },
		);
		expect(covered).toEqual({
			kind: "Contribute",
			aspect: "translations",
			language: "fr",
			value: ["café"],
		});
		expect(
			applyKnowledgeChange({ translations: { fr: ["café"] } }, covered),
		).toEqual({ translations: { fr: ["café"] } });

		const added = projectTranslationChange(
			{
				markedContext: "Der <TARGET>Knirps</TARGET> lacht.",
				sourceReading: {
					...sourceReading,
					lemmaDescriptor: {
						...sourceReading.lemmaDescriptor,
						canonicalForm: "Knirps",
					},
				},
				targetLanguage: "en" as const,
				existingTranslations: ["child"],
			},
			{ decision: "Add", translation: " kid " },
		);
		expect(added.value).toEqual(["kid"]);
		expect(
			applyKnowledgeChange(
				{
					definition: "a young person",
					translations: { en: ["child"] },
				},
				added,
			),
		).toEqual({
			definition: "a young person",
			translations: { en: ["child", "kid"] },
		});
	});

	test("rejects a model-selected Translation index outside the supplied bucket", () => {
		const input =
			translationAnalysisCorpus.cases["translation-cover-near-equivalent"]
				?.input;
		if (input === undefined) throw new Error("Missing Translation case.");
		expect(() =>
			LEGACY_KNOWLEDGE_PROMPT_CATALOG.translation.prompt.outputPostcondition.assert(
				input,
				{ decision: "Covered", existingIndex: 2 },
			),
		).toThrow("missing existing Translation");
	});

	test("keeps Translation buckets atomic and rejects empty candidates", () => {
		const existing = {
			definition: "context stays",
			translations: { en: ["child", "kid"] as [string, ...string[]] },
		};
		const corrected = applyKnowledgeChange(existing, {
			kind: "Correct",
			aspect: "translations",
			language: "en",
			value: ["youngster", "youngster"],
		});
		expect(corrected).toEqual({
			definition: "context stays",
			translations: { en: ["youngster"] },
		});
		expect(
			applyKnowledgeChange(corrected, {
				kind: "Retract",
				aspect: "translations",
				language: "en",
			}),
		).toEqual({ definition: "context stays" });
		expect(
			knowledgeChangeSchema.safeParse({
				kind: "Contribute",
				aspect: "translations",
				language: "en",
				value: [],
			}).success,
		).toBe(false);
		expect(
			translationAnalysisOutputSchema.safeParse({
				decision: "Add",
				translation: "   ",
			}).success,
		).toBe(false);
		expect(
			translationAnalysisOutputSchema.safeParse({
				decision: "Add",
				translation: "kid",
				targetReading: "forbidden",
			}).success,
		).toBe(false);
	});
});
