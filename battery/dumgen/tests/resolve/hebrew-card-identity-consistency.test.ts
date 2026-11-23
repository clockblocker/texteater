import { expect, test } from "bun:test";
import { hebrewGrammarPrompt } from "../../src/resolve/he/grammar.js";
import { hebrewReadingPrompt } from "../../src/resolve/he/reading.js";

// Prompt-contract regressions only: real model outcomes are evaluated separately.
test("canonical identity and normalized occurrence are separate outputs", () => {
	expect(hebrewGrammarPrompt).toContain("Never lemmatize normalizedSurface");
	expect(hebrewGrammarPrompt).toContain(
		"normalizedSurface רגלי, canonicalForm רגל",
	);
});
test("finite occurrence agreement is not erased by participle sparsity", () => {
	expect(hebrewGrammarPrompt).toContain(
		"Unambiguous finite agreement is not unknown",
	);
});
test("weak and hollow verbs use the actual past-3ms citation consonants", () => {
	expect(hebrewGrammarPrompt).toContain(
		"For weak and hollow verbs, recover the actual past-3ms dictionary form in the identified binyan, not an infinitive stem or abstract root",
	);
	expect(hebrewGrammarPrompt).toContain(
		"canonicalForm must spell that citation's consonants; do not restore root letters absent from the citation",
	);
	expect(hebrewGrammarPrompt).toContain(
		"ordinary run: past-3ms רָץ gives canonicalForm רץ, not רוץ from infinitive לָרוּץ",
	);
	expect(hebrewGrammarPrompt).toContain(
		"Infinitival ל remains in normalizedSurface of the infinitive",
	);
});

test("Part Surface person and tense follow an explicit local morphology-only policy", () => {
	expect(hebrewGrammarPrompt).toContain(
		"Local Hebrew Surface policy is morphology-only for verbForm:Part: write person:null and tense:null, even with an overt subject",
	);
	expect(hebrewGrammarPrompt).toContain(
		"Do not transfer the subject's person to the participle; retain its morphological gender and number",
	);
	expect(hebrewGrammarPrompt).toContain(
		"This is a local representation policy, not a universal UD annotation claim",
	);
	expect(hebrewGrammarPrompt).toContain(
		"hebBinyan:PAAL, hebExistential:null, verbForm:Part, tense:null, person:null, gender:Masc, number:Plur",
	);
});

for (const [stage, prompt] of [
	["Grammar first draft", hebrewGrammarPrompt],
	["Reading fallback", hebrewReadingPrompt],
] as const) {
	test(`${stage} emoji generation identifies the contextual real-world kind`, () => {
		expect(prompt).toContain(
			"Name the target's contextual real-world kind, not an animal or object merely evoked by its name",
		);
		expect(prompt).toContain(
			"A device/tool must not be represented solely by an animal emoji, even when their Hebrew names are homographs",
		);
		expect(prompt).toContain(
			"If a single emoji is ambiguous, compose a short emoji-only label with a kind discriminator",
		);
		expect(prompt).toContain(
			"עכבר as a computer input device → 🖱, not 🐭 or 🐁 alone; עכבר as an animal → 🐭",
		);
	});
}
