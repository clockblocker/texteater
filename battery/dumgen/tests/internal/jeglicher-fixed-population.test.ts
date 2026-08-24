import { expect, test } from "bun:test";
import { corpus as grammarCorpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import { promptSource } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { corpus as targetCorpus } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/corpus";

const slots = {
	"nom-sing-masc": ["jeglicher", "Nom", "Masc", "Sing"],
	"nom-sing-fem": ["jegliche", "Nom", "Fem", "Sing"],
	"nom-sing-neut": ["jegliches", "Nom", "Neut", "Sing"],
	"acc-sing-masc": ["jeglichen", "Acc", "Masc", "Sing"],
	"acc-sing-fem": ["jegliche", "Acc", "Fem", "Sing"],
	"acc-sing-neut": ["jegliches", "Acc", "Neut", "Sing"],
	"dat-sing-masc": ["jeglichem", "Dat", "Masc", "Sing"],
	"dat-sing-fem": ["jeglicher", "Dat", "Fem", "Sing"],
	"dat-sing-neut": ["jeglichem", "Dat", "Neut", "Sing"],
	"gen-sing-masc": ["jegliches", "Gen", "Masc", "Sing"],
	"gen-sing-fem": ["jeglicher", "Gen", "Fem", "Sing"],
	"gen-sing-neut": ["jegliches", "Gen", "Neut", "Sing"],
	"nom-plur": ["jegliche", "Nom", null, "Plur"],
	"acc-plur": ["jegliche", "Acc", null, "Plur"],
	"dat-plur": ["jeglichen", "Dat", null, "Plur"],
	"gen-plur": ["jeglicher", "Gen", null, "Plur"],
} as const;

test("German PRON corpus resolves all sixteen jeglicher slots to one total Lemma", () => {
	const ids = new Set<string>();
	for (const [
		slot,
		[form, grammaticalCase, gender, number],
	] of Object.entries(slots)) {
		const output =
			grammarCorpus.cases[`grammar-de-pron-fixed-jeglicher-${slot}`]
				?.idealOutput;
		expect(output).toMatchObject({
			normalizedMembers: [form],
			lemma: {
				canonicalForm: "jeglicher",
				coreFeatures: { pronType: "Tot" },
			},
			surface: {
				surfaceKind: "Inflection",
				inflectionalFeatures: {
					case: grammaticalCase,
					gender,
					number,
					reflex: null,
				},
			},
		});
		ids.add(JSON.stringify([form, grammaticalCase, gender, number]));
	}
	expect(ids.size).toBe(16);
});

test("target corpus separates standalone jeglicher PRON from adnominal DET", () => {
	for (const [id, kind] of Object.entries({
		"target-de-total-jeglicher-sing-masc": "PRON",
		"target-de-total-jegliches-sing-neut": "PRON",
		"target-de-total-jegliche-plur": "PRON",
		"target-de-total-jegliche-sing-fem": "PRON",
		"target-de-total-jeglichen-acc": "PRON",
		"target-de-total-jeglichem-dat": "PRON",
		"target-de-total-adnominal-jeglicher-mensch": "DET",
		"target-de-total-adnominal-jegliches-detail": "DET",
		"target-de-total-adnominal-jegliche-details": "DET",
		"target-de-total-adnominal-jeglichen-menschen": "DET",
		"target-de-total-adnominal-jeglichem-kind": "DET",
	})) {
		expect(targetCorpus.cases[id]?.idealOutput).toMatchObject({
			decision: "Resolved",
			target: { family: "Lexeme", kind },
		});
	}
});

test("prompt teaches two-number identity and synonym closure without merging", () => {
	expect(promptSource.body).toContain(
		"jeglicher, jegliche, jegliches, jeglichen, and jeglichem",
	);
	expect(promptSource.body).toContain(
		"ordinary Synonym closure exposes jedweder",
	);
});
