import { expect, test } from "bun:test";
import { hebrewGrammarPrompt } from "../../src/resolve/he/grammar.js";

test("ordinary Hebrew present participles explicitly retain required nullable existential feature", () => {
	expect(hebrewGrammarPrompt).toContain("hebExistential:null");
	expect(hebrewGrammarPrompt).toContain("אומרים");
	expect(hebrewGrammarPrompt).toContain("verbForm:Part");
	expect(hebrewGrammarPrompt).toContain("tense:null");
});

test("nullable-feature guidance preserves schema and contextual identity controls", () => {
	expect(hebrewGrammarPrompt).toContain(
		"exact supplied schema fields and enumerations",
	);
	expect(hebrewGrammarPrompt).toContain(
		"keep consonantal spelling and lexical distinctions",
	);
	expect(hebrewGrammarPrompt).toContain(
		"Keep route language/family/kind exactly as supplied",
	);
});
