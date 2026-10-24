import { expect, test } from "bun:test";
import { hebrewKnowledgePrompts } from "../../../src/knowledge/he/prompts.js";

// Observed: invented roof plural, wrong book stem vowels and bare barber Def.
// General lexical-confidence/cell-label rules, not a per-word correction table.
// Independent dictionary checks: https://en.wiktionary.org/wiki/גג#Hebrew
// and https://en.wiktionary.org/wiki/רכבת#Hebrew (dictionary maqaf excluded).
test("sparse forms anchor observed plural errors in attested lexical contrasts", () => {
	const prompt = hebrewKnowledgePrompts.hebrewParadigm;
	expect(prompt).toContain("גַּג → גַּגּוֹת");
	expect(prompt).toContain("not גַּגִּים");
	expect(prompt).toContain("רַכָּבוֹת is Plur Ind; רַכְּבוֹת is Plur Cons");
	expect(prompt).toContain("Never relabel a masculine construct form as Fem");
	expect(prompt).toContain("omit that cell");
});
test("sparse forms require independently known stems and endings before feature labeling", () => {
	const prompt = hebrewKnowledgePrompts.hebrewParadigm;
	expect(prompt).toContain(
		"Know the stem vowels and the ending independently",
	);
	expect(prompt).toContain(
		"Noun gender does not determine its plural ending",
	);
	expect(prompt).toContain("do not create an unattested hybrid");
	expect(prompt).toContain(
		"Choose the actual form first, then label only its supported features",
	);
	expect(prompt).toContain(
		"A bare absolute head is not Def just because its occurrence was definite",
	);
});
