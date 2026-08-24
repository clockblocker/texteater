import { expect, test } from "bun:test";

import { corpus as grammarCorpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import { promptSource as pronounPromptSource } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { corpus as targetCorpus } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/corpus";

test("German PRON corpus resolves every alles and alle Surface to the promoted Lemma", () => {
	const expected = {
		"grammar-de-pron-fixed-alles-nom": ["alles", "Nom", "Neut", "Sing"],
		"grammar-de-pron-fixed-alles-acc": ["alles", "Acc", "Neut", "Sing"],
		"grammar-de-pron-fixed-allem-dat": ["alles", "Dat", "Neut", "Sing"],
		"grammar-de-pron-fixed-alle-nom": ["alle", "Nom", null, "Plur"],
		"grammar-de-pron-fixed-alle-acc": ["alle", "Acc", null, "Plur"],
		"grammar-de-pron-fixed-allen-dat": ["alle", "Dat", null, "Plur"],
		"grammar-de-pron-fixed-aller-gen": ["alle", "Gen", null, "Plur"],
	} as const;

	for (const [
		caseId,
		[canonicalForm, grammaticalCase, gender, number],
	] of Object.entries(expected)) {
		const ideal = grammarCorpus.cases[caseId]?.idealOutput;
		expect(ideal?.lemma).toEqual({
			canonicalForm,
			coreFeatures: {
				extPos: null,
				foreign: null,
				person: null,
				polite: null,
				poss: null,
				pronType: "Tot",
				referenceGender: null,
				referenceNumber: null,
			},
		});
		expect(ideal?.surface).toMatchObject({
			surfaceKind: "Inflection",
			inflectionalFeatures: {
				case: grammaticalCase,
				gender,
				number,
				reflex: null,
			},
		});
	}
	expect(
		Object.keys(grammarCorpus.cases).some((caseId) =>
			caseId.includes("alles-gen"),
		),
	).toBe(false);
});

test("German target corpus keeps free total forms PRON and adnominal controls DET", () => {
	const singletonPronouns = [
		["target-de-total-alles-nom", 0],
		["target-de-total-alles-acc", 4],
		["target-de-total-allem-dat", 2],
		["target-de-total-alle-nom", 0],
		["target-de-total-alle-acc", 4],
		["target-de-total-allen-dat", 4],
		["target-de-total-aller-gen", 4],
	] as const;
	for (const [caseId, clickedSegmentIndex] of singletonPronouns) {
		expect(targetCorpus.cases[caseId]?.idealOutput).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "PRON",
				memberSegmentIndices: [clickedSegmentIndex],
			},
		});
	}

	for (const caseId of [
		"target-de-total-adnominal-alles-material",
		"target-de-total-adnominal-alle-gaeste",
		"target-de-total-adnominal-allen-gaesten",
		"target-de-total-adnominal-aller-anfang",
	]) {
		expect(targetCorpus.cases[caseId]?.idealOutput).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind: "DET",
				memberSegmentIndices: [0],
			},
		});
	}
});

test("German PRON demonstrations teach both total Lemmas and the PRON route boundary", () => {
	if (
		pronounPromptSource.demonstrations === undefined ||
		!("ids" in pronounPromptSource.demonstrations)
	) {
		throw new Error("Expected corpus-backed PRON demonstrations.");
	}
	expect(pronounPromptSource.demonstrations.ids).toEqual(
		expect.arrayContaining([
			"grammar-de-pron-fixed-alles-acc",
			"grammar-de-pron-fixed-alle-nom",
			"grammar-de-pron-fixed-aller-gen",
		]),
	);
});
