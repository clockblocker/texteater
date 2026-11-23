import { describe, expect, test } from "bun:test";
import { hebrewKnowledgePrompts } from "../../../src/knowledge/he/prompts.js";

describe("Hebrew Reading fidelity consistency", () => {
	test("definition leads with the attested lexical function, not a literal default", () => {
		expect(hebrewKnowledgePrompts.definition).toContain(
			"Lead with the lexical use attested in the marked Sentence",
		);
		expect(hebrewKnowledgePrompts.definition).toContain(
			"not override explicit source evidence",
		);
	});
	test("transcription selects the mainstream modern Israeli inventory", () => {
		expect(hebrewKnowledgePrompts.transcription).toContain(
			"Use mainstream modern Israeli pronunciation",
		);
		expect(hebrewKnowledgePrompts.transcription).toContain(
			"not pharyngeal ħ",
		);
	});
	test("citation vowels and stress stay independent of occurrence and inventory", () => {
		expect(hebrewKnowledgePrompts.transcription).toContain("furtive patah");
		expect(hebrewKnowledgePrompts.transcription).toContain("נָקִי is naˈki");
		expect(hebrewKnowledgePrompts.hebrewParadigm).toContain(
			"Return exactly one final JSON object",
		);
	});
	test("sparse selection checks whole cells rather than analogical endings", () => {
		expect(hebrewKnowledgePrompts.hebrewParadigm).toContain(
			"Prioritize high-confidence ordinary modern forms",
		);
		expect(hebrewKnowledgePrompts.hebrewParadigm).toContain(
			"stem AND ending together",
		);
	});
	test("IPA output must not mix Hebrew consonants into affricates", () => {
		expect(hebrewKnowledgePrompts.transcription).toContain(
			"Affricates use IPA sequences such as ts",
		);
	});
	test("source fidelity is evidence rather than an output-script mandate", () => {
		expect(hebrewKnowledgePrompts.transcription).toContain(
			"Source spelling is disambiguating evidence, not an output template",
		);
	});
	test("paradigm excludes synonyms and checks construct stem independently", () => {
		expect(hebrewKnowledgePrompts.hebrewParadigm).toContain(
			"A synonym or suppletive translation is not an inflection",
		);
		expect(hebrewKnowledgePrompts.hebrewParadigm).toContain(
			"Check singular and plural construct stems independently",
		);
	});
});
