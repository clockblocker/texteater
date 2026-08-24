import { expect, test } from "bun:test";
import { corpus as pronounCorpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import { promptSource as pronounPrompt } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { corpus as targetCorpus } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/corpus";

test("target classification keeps standalone mehrere forms PRON and adnominal controls DET", () => {
	for (const grammaticalCase of ["nom", "acc", "dat", "gen"] as const) {
		for (const [role, kind] of [
			["pron", "PRON"],
			["det", "DET"],
		] as const) {
			const output =
				targetCorpus.cases[
					`target-de-mehrere-${role}-${grammaticalCase}`
				]?.idealOutput;
			expect(output?.decision).toBe("Resolved");
			if (output?.decision !== "Resolved") {
				throw new Error(
					`Expected resolved mehrere ${role} ${grammaticalCase} case.`,
				);
			}
			expect(output.target.family).toBe("Lexeme");
			expect(output.target.kind).toBe(kind);
			expect(output.target.memberSegmentIndices).toHaveLength(1);
		}
	}
});

test("grammatical resolution maps all four plural cases to Lemma mehrere", () => {
	const expected = {
		nom: ["mehrere", "Nom"],
		acc: ["mehrere", "Acc"],
		dat: ["mehreren", "Dat"],
		gen: ["mehrerer", "Gen"],
	} as const;
	for (const [slot, [normalizedMember, grammaticalCase]] of Object.entries(
		expected,
	)) {
		const goldenCase =
			pronounCorpus.cases[`grammar-de-pron-fixed-mehrere-${slot}`];
		expect(goldenCase?.idealOutput).toMatchObject({
			normalizedMembers: [normalizedMember],
			surface: {
				surfaceKind: "Inflection",
				inflectionalFeatures: {
					case: grammaticalCase,
					gender: null,
					number: "Plur",
					reflex: null,
				},
			},
			lemma: {
				canonicalForm: "mehrere",
				coreFeatures: { pronType: "Tot" },
			},
		});
	}
});

test("the PRON prompt teaches plural-only mehrere without singular or DET fallback", () => {
	expect(pronounPrompt.body).toContain("plural-only Lemma mehrere");
	expect(pronounPrompt.body).toContain("never invent Gender or a singular");
	const demonstrations = pronounPrompt.demonstrations;
	if (!demonstrations || !("ids" in demonstrations)) {
		throw new Error("Expected canonical-corpus demonstrations.");
	}
	expect(demonstrations.ids).toContain("grammar-de-pron-fixed-mehrere-dat");
	expect(demonstrations.ids).toContain("grammar-de-pron-fixed-mehrere-gen");
});
