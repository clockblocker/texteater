import { expect, test } from "bun:test";

import { corpus as grammarCorpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import { promptSource } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { corpus as targetCorpus } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/corpus";

const slots = {
	"nom-masc": ["jedweder", "Nom", "Masc"],
	"nom-fem": ["jedwede", "Nom", "Fem"],
	"nom-neut": ["jedwedes", "Nom", "Neut"],
	"acc-masc": ["jedweden", "Acc", "Masc"],
	"acc-fem": ["jedwede", "Acc", "Fem"],
	"acc-neut": ["jedwedes", "Acc", "Neut"],
	"dat-masc": ["jedwedem", "Dat", "Masc"],
	"dat-fem": ["jedweder", "Dat", "Fem"],
	"dat-neut": ["jedwedem", "Dat", "Neut"],
	"gen-masc": ["jedwedes", "Gen", "Masc"],
	"gen-fem": ["jedweder", "Gen", "Fem"],
	"gen-neut": ["jedwedes", "Gen", "Neut"],
} as const;

test("German PRON corpus resolves all twelve jedweder slots to one singular total Lemma", () => {
	const identities = new Set<string>();
	for (const [slot, [form, grammaticalCase, gender]] of Object.entries(
		slots,
	)) {
		const output =
			grammarCorpus.cases[`grammar-de-pron-fixed-jedweder-${slot}`]
				?.idealOutput;
		expect(output).toMatchObject({
			normalizedMembers: [form],
			lemma: {
				canonicalForm: "jedweder",
				coreFeatures: { pronType: "Tot" },
			},
			surface: {
				surfaceKind: "Inflection",
				inflectionalFeatures: {
					case: grammaticalCase,
					gender,
					number: "Sing",
					reflex: null,
				},
			},
		});
		identities.add(JSON.stringify([form, grammaticalCase, gender]));
	}
	expect(identities.size).toBe(12);
});

test("German target corpus keeps jedweder standalone PRON and adnominal DET", () => {
	for (const [id, kind] of [
		["target-de-total-jedweder-nom", "PRON"],
		["target-de-total-jedwede-nom", "PRON"],
		["target-de-total-jedweden-acc", "PRON"],
		["target-de-total-jedwedem-dat", "PRON"],
		["target-de-total-jedwedes-nom", "PRON"],
		["target-de-total-adnominal-jedweder-mensch", "DET"],
		["target-de-total-adnominal-jedweden-menschen", "DET"],
		["target-de-total-adnominal-jedwedem-kind", "DET"],
		["target-de-total-adnominal-jedwedes-detail", "DET"],
	] as const) {
		const output = targetCorpus.cases[id]?.idealOutput;
		expect(output).toMatchObject({
			decision: "Resolved",
			target: { family: "Lexeme", kind },
		});
		if (output?.decision !== "Resolved") throw new Error(`Expected ${id}.`);
		expect(output.target.memberSegmentIndices).toHaveLength(1);
	}
});

test("German PRON prompt preserves synonymy without collapsing jedweder identity", () => {
	expect(promptSource.body).toContain(
		"jedweder, jedwede, jedwedes, jedweden, and jedwedem",
	);
	expect(promptSource.body).toContain("never changes canonicalForm");
});
