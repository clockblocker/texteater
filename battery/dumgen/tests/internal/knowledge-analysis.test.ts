import { describe, expect, test } from "bun:test";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import { PROMPT_CATALOG } from "../../src/catalog/prompt-catalog";
import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	lexicalResolutionCorpus,
	lexicalSegmentationCorpus,
	morphologicalResolutionCorpus,
	morphologicalSegmentationCorpus,
} from "../../src/promptsmith/production/knowledge-analysis/corpora";
import { promptSource as lexicalResolutionSource } from "../../src/promptsmith/production/knowledge-analysis/lexical-breakdown/resolution/prompt-source";
import { promptSource as lexicalSegmentationSource } from "../../src/promptsmith/production/knowledge-analysis/lexical-breakdown/segmentation/prompt-source";
import { promptSource as morphologicalResolutionSource } from "../../src/promptsmith/production/knowledge-analysis/morphological-tree/resolution/prompt-source";
import { promptSource as morphologicalSegmentationSource } from "../../src/promptsmith/production/knowledge-analysis/morphological-tree/segmentation/prompt-source";
import {
	projectLexicalBreakdownContribution,
	projectMorphologicalTreeContribution,
} from "../../src/promptsmith/production/knowledge-analysis/projection";
import {
	lexicalResolutionOutputSchema,
	lexicalSegmentationOutputSchema,
	morphologicalResolutionOutputSchema,
	morphologicalSegmentationOutputSchema,
} from "../../src/promptsmith/production/knowledge-analysis/schemas";

describe("Knowledge analysis Prompt Sources", () => {
	test("own separate pointer-only segmentation and resolution corpora", () => {
		expect(morphologicalSegmentationCorpus.all().ids).toHaveLength(5);
		expect(morphologicalResolutionCorpus.all().ids).toHaveLength(3);
		expect(lexicalSegmentationCorpus.all().ids).toHaveLength(3);
		expect(lexicalResolutionCorpus.all().ids).toHaveLength(3);

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
		const catalog = PROMPT_CATALOG.laboratory.knowledge;
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
		if (morphology === undefined || lexical === undefined) {
			throw new Error("Missing resolution corpus cases.");
		}

		const identitySchema = z.string().regex(/^reading:[^:]+$/);
		const morphemeReadingSchema = z.strictObject({
			opaqueReadingIdentity: identitySchema,
			lemma: schemasFor.de.entity.Lemma.Morpheme.Prefix(),
			emojiDescription: z.string().min(1),
		});
		const projectedMorphology = projectMorphologicalTreeContribution(
			morphology,
			{
				readingSchema: morphemeReadingSchema,
				resolveReading: (draft) => ({
					opaqueReadingIdentity: `reading:${draft.lemmaDescriptor.canonicalForm}`,
					lemma: {
						...draft.lemmaDescriptor,
						coreFeatures: { hasSepPrefix: null },
					},
					emojiDescription: draft.emojiDescription,
				}),
			},
		);
		const prefix = projectedMorphology.root.children[0];
		expect(
			prefix?.nodeKind === "morphemeReading"
				? prefix.reading.opaqueReadingIdentity
				: null,
		).toBe("reading:ent-");
		expect(projectedMorphology.root.children[1]).toEqual({
			nodeKind: "unitShadow",
			unitShadow: {
				language: "de",
				canonicalForm: "spannen",
				family: "Lexeme",
				kind: "VERB",
			},
		});

		const projectedLexical = projectLexicalBreakdownContribution(lexical);
		expect(projectedLexical).toEqual([
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
		]);
	});

	test("validates caller-resolved Morpheme Readings", () => {
		const morphology =
			morphologicalResolutionCorpus.cases[
				"morphology-resolve-direct-pointers"
			]?.idealOutput;
		if (morphology === undefined)
			throw new Error("Missing morphology case.");
		const schema = z.strictObject({
			opaqueReadingIdentity: z.string().regex(/^reading:/),
			lemma: schemasFor.de.entity.Lemma.Morpheme.Prefix(),
			emojiDescription: z.string().min(1),
		});

		expect(() =>
			projectMorphologicalTreeContribution(morphology, {
				readingSchema: schema,
				resolveReading: (draft) => ({
					opaqueReadingIdentity: "invented",
					lemma: { ...draft.lemmaDescriptor, coreFeatures: {} },
					emojiDescription: draft.emojiDescription,
				}),
			}),
		).toThrow();
	});
});
