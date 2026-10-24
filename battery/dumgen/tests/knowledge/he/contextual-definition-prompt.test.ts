import { expect, test } from "bun:test";
import { hebrewKnowledgePrompts } from "../../../src/knowledge/he/prompts.js";

// Final-only new10: furniture use was defined as an anatomical organ only.
// Wording coverage is not evidence that a real generation chooses the right sense.
test("definition excludes incidental sentence details without losing sense-specific function", () => {
	const prompt = hebrewKnowledgePrompts.definition;
	expect(prompt).toContain(
		"Distinguish a sense-specific function from incidental sentence details",
	);
	expect(prompt).toContain("אמר meaning say does not become express thanks");
	expect(prompt).toContain(
		"בית meaning house does not require stone construction",
	);
	expect(prompt).toContain("Keep the sense-specific function");
});
test("definition covers the contextual use within the resolved Reading", () => {
	const prompt = hebrewKnowledgePrompts.definition;
	expect(prompt).toContain("cover the use attested in the marked Sentence");
	expect(prompt).toContain("not only the most frequent concrete meaning");
	expect(prompt).toContain("do not switch to an unrelated Reading");
});
