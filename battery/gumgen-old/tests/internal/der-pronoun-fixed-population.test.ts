import { expect, test } from "bun:test";
import { corpus as pronounCorpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/golden-corpus/corpus";
import { promptSource as pronounPrompt } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/pronoun/prompt-source";
import { corpus as targetCorpus } from "../../src/promptsmith/production/prompt-part/target-classification/de/high-level-whole-unit/corpus/corpus";

test("target classification separates free der forms from adnominal DET occurrences", () => {
	const expected = {
		"target-de-der-pron-dem-der": ["PRON", 0],
		"target-de-der-pron-dem-die": ["PRON", 0],
		"target-de-der-pron-dem-das": ["PRON", 0],
		"target-de-der-pron-rel-der": ["PRON", 8],
		"target-de-der-pron-rel-die": ["PRON", 4],
		"target-de-der-pron-rel-das": ["PRON", 4],
		"target-de-der-pron-det-der": ["DET", 0],
		"target-de-der-pron-det-die": ["DET", 0],
		"target-de-der-pron-det-das": ["DET", 0],
	} as const;

	for (const [caseId, [kind, memberSegmentIndex]] of Object.entries(
		expected,
	)) {
		expect(targetCorpus.cases[caseId]?.idealOutput).toEqual({
			decision: "Resolved",
			target: {
				family: "Lexeme",
				kind,
				memberSegmentIndices: [memberSegmentIndex],
			},
		});
	}
});

test("grammatical resolution preserves the full exact-form Dem and Rel matrices", () => {
	const cases = Object.entries(pronounCorpus.cases).filter(([caseId]) =>
		caseId.startsWith("grammar-de-pron-fixed-der-paradigm-"),
	);
	expect(cases).toHaveLength(32);
	for (const pronType of ["Dem", "Rel"] as const) {
		const population = cases.filter(
			([, goldenCase]) =>
				goldenCase.idealOutput.lemma.coreFeatures.pronType === pronType,
		);
		expect(population).toHaveLength(16);
		expect(
			new Set(
				population.map(
					([, goldenCase]) =>
						goldenCase.idealOutput.lemma.canonicalForm,
				),
			),
		).toEqual(
			new Set([
				"der",
				"die",
				"das",
				"den",
				"dem",
				"dessen",
				"deren",
				"denen",
			]),
		);
		for (const [, goldenCase] of population) {
			expect(goldenCase.idealOutput.surface.surfaceKind).toBe(
				"Inflection",
			);
			if (goldenCase.idealOutput.surface.surfaceKind !== "Inflection") {
				continue;
			}
			expect(
				goldenCase.idealOutput.surface.inflectionalFeatures.case,
			).not.toBeNull();
			expect(
				goldenCase.idealOutput.surface.inflectionalFeatures.number,
			).not.toBeNull();
		}
	}
});

test("the PRON prompt directly demonstrates one same-spelling Dem and Rel pair", () => {
	const demonstrations = pronounPrompt.demonstrations;
	if (!demonstrations || !("ids" in demonstrations)) {
		throw new Error("Expected canonical-corpus demonstrations.");
	}
	const demonstrationIds = demonstrations.ids;
	expect(demonstrationIds).toContain(
		"grammar-de-pron-fixed-der-paradigm-dem-der-nom-masc",
	);
	expect(demonstrationIds).toContain(
		"grammar-de-pron-fixed-der-paradigm-rel-der-nom-masc",
	);
	expect(pronounPrompt.body).toContain(
		"exact normalized written form as the Lemma",
	);
});
