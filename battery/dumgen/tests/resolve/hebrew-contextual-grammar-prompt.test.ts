import { expect, test } from "bun:test";
import { hebrewGrammarPrompt } from "../../src/resolve/he/grammar.js";

// Prompt-contract regressions, not claims about live model accuracy.
test("unmarked predicative adjectives follow the ADJ nullable schema, not subject definiteness", () => {
	expect(hebrewGrammarPrompt).toContain(
		"A definite subject does not make a bare predicative adjective definite",
	);
	expect(hebrewGrammarPrompt).toContain(
		"For ADJ, unmarked definiteness is definite:null, not Ind",
	);
	expect(hebrewGrammarPrompt).toContain(
		"An attributive adjective with its own definite article takes definite:Def",
	);
});
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

test("a preceding quantifier does not put its following noun in construct state", () => {
	expect(hebrewGrammarPrompt).toContain(
		"A noun following a quantifier is not thereby construct",
	);
	expect(hebrewGrammarPrompt).toContain(
		"Cons belongs to the head that governs a following nominal complement, not automatically to that complement",
	);
	expect(hebrewGrammarPrompt).toContain(
		"An absolute indefinite NOUN has definite:Ind",
	);
});

test("quantified noun state contrasts an existential predicate with a following nominal complement", () => {
	expect(hebrewGrammarPrompt).toContain(
		"In לכל עם יש מסורות משלו., עם has definite:Ind: יש is the existential predicate, not its nominal complement",
	);
	expect(hebrewGrammarPrompt).toContain(
		"in כל עם ישראל, עם has definite:Cons because ישראל is its nominal complement, despite preceding כל",
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

test("Hebrew genitive marker uses the supported Gen value without changing lexical prepositions", () => {
	// HTB492: של is ADP Case=Gen / case:gen, not an unmarked ADP.
	expect(hebrewGrammarPrompt).toContain("של in הספר של הילד has case:Gen");
	expect(hebrewGrammarPrompt).toContain("עם in הלכתי עם חבר has case:null");
	expect(hebrewGrammarPrompt).toContain("את in קראתי את הספר has case:Acc");
});
