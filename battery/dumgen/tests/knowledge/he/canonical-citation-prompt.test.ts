import { expect, test } from "bun:test";
import { hebrewKnowledgePrompts } from "../../../src/knowledge/he/prompts.js";

// Frozen errors in final4 full28 and the saved adjective UI Card.
// יפה contrast independently checked: https://en.wiktionary.org/wiki/יפה#Hebrew
test("Russian adjective translations use citation form without gender-variant meanings", () => {
	const prompt = hebrewKnowledgePrompts.translations;
	expect(prompt).toContain(
		"Russian adjective equivalents use masculine singular citation form",
	);
	expect(prompt).toContain(
		"do not enumerate gender variants as separate meanings",
	);
});

test("canonical IPA retains the recovered citation's lexical stress", () => {
	const prompt = hebrewKnowledgePrompts.transcription;
	expect(prompt).toContain("Recover its lexical stress independently");
	expect(prompt).toContain("יָפֶה is jaˈfe, not ˈjafe");
	expect(prompt).toContain("יָפָה is jaˈfa");
	expect(prompt).toContain(
		"not a rule that all adjectives have final stress",
	);
});
// These tests verify prompt instructions, not the model's linguistic compliance.
test("canonical IPA resolves citation morphology before transcribing occurrence vowels", () => {
	const prompt = hebrewKnowledgePrompts.transcription;
	expect(prompt).toContain("First recover the dictionary citation form");
	expect(prompt).toContain(
		"adjective's masculine singular absolute citation",
	);
	expect(prompt).toContain(
		"verb's past third-person masculine singular citation",
	);
	expect(prompt).toContain("not its infinitive");
	expect(prompt).toContain("Only then transcribe that citation");
});

test("citation guidance does not replace an explicitly supplied or defective headword", () => {
	const prompt = hebrewKnowledgePrompts.transcription;
	expect(prompt).toContain(
		"The supplied canonical Lemma remains authoritative",
	);
	expect(prompt).toContain("do not invent an unavailable citation form");
});

test("canonical IPA checks syllable-based stress rather than marking the word onset", () => {
	const prompt = hebrewKnowledgePrompts.transcription;
	expect(prompt).toContain("Count the citation's spoken syllables");
	expect(prompt).toContain("penultimate means the second-to-last syllable");
	expect(prompt).toContain("not automatically the beginning of the word");
});
