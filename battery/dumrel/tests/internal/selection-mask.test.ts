import { describe, expect, test } from "bun:test";

import {
	DEFAULT_KNOWLEDGE_SETTINGS,
	intersectKnowledgeRequestMask,
} from "../../src";
import {
	knowledgeRequestMaskSchema,
	knowledgeSettingsSchema,
} from "../../src/schema";
import type { KnowledgeRequestMask, KnowledgeSettings } from "../../src/types";

function expectDeepFrozen(value: unknown): void {
	if (typeof value !== "object" || value === null) return;
	expect(Object.isFrozen(value)).toBe(true);
	for (const nested of Object.values(value)) expectDeepFrozen(nested);
}

const completeMask: KnowledgeRequestMask = {
	transcription: null,
	definition: null,
	translations: { en: null },
	morphologicalTree: null,
	lexicalBreakdown: null,
	semanticRelations: {
		synonym: null,
		nearSynonym: null,
		antonym: null,
		nearAntonym: null,
		hypernym: null,
		hyponym: null,
		meronym: null,
		holonym: null,
	},
};

describe("Knowledge settings", () => {
	test("defaults every global leaf to enabled and freezes recursively", () => {
		expect(DEFAULT_KNOWLEDGE_SETTINGS).toEqual({
			transcription: true,
			definition: true,
			translations: { en: true },
			morphologicalTree: true,
			lexicalBreakdown: true,
			semanticRelations: {
				synonym: true,
				nearSynonym: true,
				antonym: true,
				nearAntonym: true,
				hypernym: true,
				hyponym: true,
				meronym: true,
				holonym: true,
			},
		});
		expectDeepFrozen(DEFAULT_KNOWLEDGE_SETTINGS);
	});

	test("requires a complete strict global tree", () => {
		expect(
			knowledgeSettingsSchema.parse(DEFAULT_KNOWLEDGE_SETTINGS),
		).toEqual(DEFAULT_KNOWLEDGE_SETTINGS);
		for (const invalid of [
			{},
			{ ...DEFAULT_KNOWLEDGE_SETTINGS, transcription: null },
			{
				...DEFAULT_KNOWLEDGE_SETTINGS,
				translations: { en: true, de: true },
			},
			{
				...DEFAULT_KNOWLEDGE_SETTINGS,
				semanticRelations: { synonym: true },
			},
			{ ...DEFAULT_KNOWLEDGE_SETTINGS, Lexeme: {} },
		]) {
			expect(knowledgeSettingsSchema.safeParse(invalid).success).toBe(
				false,
			);
		}
	});
});

describe("Knowledge request masks", () => {
	test("accepts the canonical sparse null tree including the empty mask", () => {
		expect(knowledgeRequestMaskSchema.parse({})).toEqual({});
		expect(knowledgeRequestMaskSchema.parse(completeMask)).toEqual(
			completeMask,
		);
	});

	test("rejects unknown/value leaves and empty nested branches", () => {
		for (const invalid of [
			{ transcription: true },
			{ definition: "definition" },
			{ translations: {} },
			{ translations: { de: null } },
			{ semanticRelations: {} },
			{ semanticRelations: { synonym: true } },
			{ semanticRelations: { related: null } },
			{ owner: "reading" },
		]) {
			expect(knowledgeRequestMaskSchema.safeParse(invalid).success).toBe(
				false,
			);
		}
	});

	test("intersects without mutation and preserves all enabled leaves", () => {
		const result = intersectKnowledgeRequestMask(
			completeMask,
			DEFAULT_KNOWLEDGE_SETTINGS,
		);
		expect(result).toEqual(completeMask);
		expect(result).not.toBe(completeMask);
		expect(result.semanticRelations).not.toBe(
			completeMask.semanticRelations,
		);
		expect(completeMask).toEqual({
			...completeMask,
			semanticRelations: completeMask.semanticRelations,
		});
	});

	test("removes disabled leaves and prunes empty branches", () => {
		const settings: KnowledgeSettings = {
			...DEFAULT_KNOWLEDGE_SETTINGS,
			definition: false,
			translations: { en: false },
			morphologicalTree: false,
			semanticRelations: {
				synonym: true,
				nearSynonym: false,
				antonym: false,
				nearAntonym: false,
				hypernym: false,
				hyponym: false,
				meronym: false,
				holonym: false,
			},
		};
		expect(intersectKnowledgeRequestMask(completeMask, settings)).toEqual({
			transcription: null,
			lexicalBreakdown: null,
			semanticRelations: { synonym: null },
		});
	});

	test("returns the canonical empty mask when every setting is disabled", () => {
		const disabled: KnowledgeSettings = {
			transcription: false,
			definition: false,
			translations: { en: false },
			morphologicalTree: false,
			lexicalBreakdown: false,
			semanticRelations: {
				synonym: false,
				nearSynonym: false,
				antonym: false,
				nearAntonym: false,
				hypernym: false,
				hyponym: false,
				meronym: false,
				holonym: false,
			},
		};
		expect(intersectKnowledgeRequestMask(completeMask, disabled)).toEqual(
			{},
		);
	});
});
