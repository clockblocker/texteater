import { expect, test } from "bun:test";
import { hebrewGrammarPrompt } from "../../src/resolve/he/grammar.js";

// Prompt-contract regressions, not claims about live model accuracy.
test("Hebrew construct state follows the contextual noun relation even when spelling is unchanged", () => {
	expect(hebrewGrammarPrompt).toContain(
		"Construct state is contextual, not dependent on a spelling change",
	);
	expect(hebrewGrammarPrompt).toContain(
		"in ספר בישול, the head ספר has definite:Cons even though its singular spelling matches the absolute form",
	);
	expect(hebrewGrammarPrompt).toContain(
		"in ספר קטן, ספר is absolute and indefinite (definite:Ind)",
	);
});

test("Hebrew ADP case distinguishes accompaniment and recipient from the definite-object marker", () => {
	expect(hebrewGrammarPrompt).toContain(
		"For Hebrew ADP coreFeatures.case, use Acc only for the definite-direct-object marker את",
	);
	expect(hebrewGrammarPrompt).toContain("עם in הלכתי עם חבר has case:null");
	expect(hebrewGrammarPrompt).toContain(
		"recipient ל in נתתי ספר לילד has case:null",
	);
	expect(hebrewGrammarPrompt).toContain("את in קראתי את הספר has case:Acc");
	expect(hebrewGrammarPrompt).toContain(
		"Other lexical prepositions have case:null in this schema",
	);
});
