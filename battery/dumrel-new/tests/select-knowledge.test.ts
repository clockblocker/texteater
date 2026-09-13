import { expect, test } from "bun:test";
import { selectKnowledge } from "dumrel";
import {
	knowledgeRequestMaskSchema,
	knowledgeSelectionInputSchema,
} from "dumrel/schema";
import type { KnowledgeSelectionInput } from "dumrel/types";

const route = { language: "de", family: "Lexeme", kind: "NOUN" } as const;
test("Knowledge settings default to enabled and filter only applicable aspects", () => {
	const all = selectKnowledge({ route });
	expect(all.success).toBe(true);
	if (!all.success) return;
	expect(all.value).toHaveProperty("definition", null);
	expect(all.value).toHaveProperty("translations.en", null);
	expect(all.value).not.toHaveProperty("lexicalBreakdown");
	const filtered = selectKnowledge({
		route,
		settings: {
			definition: false,
			translations: { en: false },
			semanticRelations: { synonym: false },
		},
	});
	expect(filtered.success).toBe(true);
	if (!filtered.success) return;
	expect(filtered.value).not.toHaveProperty("definition");
	expect(filtered.value).not.toHaveProperty("translations");
	expect(filtered.value).not.toHaveProperty("semanticRelations.synonym");
	expect(filtered.value).toHaveProperty("transcription", null);
	expect(knowledgeRequestMaskSchema.parse(filtered.value)).toEqual(
		filtered.value,
	);
});
test("invalid and unavailable routes are distinct, compiled selection agrees with schema", () => {
	for (const value of [
		{ route, settings: { definition: null } },
		{ route, settings: { typo: true } },
		{ route: { ...route, kind: "Idiom" } },
	]) {
		expect(knowledgeSelectionInputSchema.safeParse(value).success).toBe(
			false,
		);
		expect(
			selectKnowledge(value as unknown as KnowledgeSelectionInput)
				.success,
		).toBe(false);
	}
	const unavailable = selectKnowledge({
		route: { ...route, language: "he" },
	});
	expect(unavailable.success).toBe(false);
	if (!unavailable.success)
		expect(unavailable.error).toHaveProperty(
			"_tag",
			"KnowledgePolicyUnavailable",
		);
});
