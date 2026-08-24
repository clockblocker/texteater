import { expect, test } from "bun:test";

import { corpus as grammarCorpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import { promptSource } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { corpus as targetCorpus } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/corpus";

const slots = {
	"nom-masc": ["jeder", "Nom", "Masc"],
	"nom-fem": ["jede", "Nom", "Fem"],
	"nom-neut": ["jedes", "Nom", "Neut"],
	"acc-masc": ["jeden", "Acc", "Masc"],
	"acc-fem": ["jede", "Acc", "Fem"],
	"acc-neut": ["jedes", "Acc", "Neut"],
	"dat-masc": ["jedem", "Dat", "Masc"],
	"dat-fem": ["jeder", "Dat", "Fem"],
	"dat-neut": ["jedem", "Dat", "Neut"],
	"gen-masc": ["jedes", "Gen", "Masc"],
	"gen-fem": ["jeder", "Gen", "Fem"],
	"gen-neut": ["jedes", "Gen", "Neut"],
} as const;

test("German PRON corpus resolves all twelve jeder slots to one singular total Lemma", () => {
	const surfaceKeys = new Set<string>();
	for (const [slot, [form, grammaticalCase, gender]] of Object.entries(
		slots,
	)) {
		const output =
			grammarCorpus.cases[`grammar-de-pron-fixed-jeder-${slot}`]
				?.idealOutput;
		expect(output).toMatchObject({
			memberOrthographies: ["Standard"],
			normalizedMembers: [form],
			lemma: {
				canonicalForm: "jeder",
				coreFeatures: { pronType: "Tot", referenceNumber: null },
			},
			surface: {
				spelling: "Canonical",
				surfaceKind: "Inflection",
				inflectionalFeatures: {
					case: grammaticalCase,
					gender,
					number: "Sing",
					reflex: null,
				},
			},
		});
		surfaceKeys.add(
			JSON.stringify([form, grammaticalCase, gender, "Sing"]),
		);
	}
	expect(surfaceKeys.size).toBe(12);
	expect(
		Object.values(grammarCorpus.cases).some(({ idealOutput }) =>
			idealOutput.lemma.canonicalForm === "jeder" &&
			"inflectionalFeatures" in idealOutput.surface
				? idealOutput.surface.inflectionalFeatures.number === "Plur"
				: false,
		),
	).toBe(false);
});

test("German target corpus keeps standalone jeder forms PRON and adnominal forms DET", () => {
	for (const slot of Object.keys(slots)) {
		const output =
			targetCorpus.cases[`target-de-total-jeder-${slot}`]?.idealOutput;
		expect(output).toMatchObject({
			decision: "Resolved",
			target: { family: "Lexeme", kind: "PRON" },
		});
		if (output?.decision !== "Resolved")
			throw new Error(`Expected ${slot}.`);
		expect(output.target.memberSegmentIndices).toHaveLength(1);
	}
	for (const id of [
		"jeder-mensch",
		"jede-person",
		"jedes-kind",
		"jeden-menschen",
		"jedem-kind",
	]) {
		const output =
			targetCorpus.cases[`target-de-total-adnominal-${id}`]?.idealOutput;
		expect(output).toMatchObject({
			decision: "Resolved",
			target: { family: "Lexeme", kind: "DET" },
		});
		if (output?.decision !== "Resolved") throw new Error(`Expected ${id}.`);
		expect(output.target.memberSegmentIndices).toHaveLength(1);
	}
});

test("German PRON prompt teaches the one-Lemma singular jeder boundary", () => {
	expect(promptSource.body).toContain("jeder, jede, jedes, jeden, and jedem");
	expect(promptSource.body).toContain("never invent a plural jeder Surface");
});
