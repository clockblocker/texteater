import { describe, expect, it } from "bun:test";
import { dumling } from "../../src";
import { schemasFor } from "../../src/schema";
import type { Selection, Surface } from "../../src/types";
import {
	englishGiveUpClickedGvaeSelection,
	englishGiveUpClickedUpSelection,
	hebrewKatvuPointedVariantSelection,
} from "../helpers";

describe("orthography and spelling ownership", () => {
	it("models armour as a Standard click on a Variant Surface of the armor Lemma", () => {
		const armorLemma = dumling.en.create.lemma({
			canonicalForm: "armor",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				abbr: null,
				extPos: null,
				foreign: null,
				numForm: null,
				numType: null,
				style: null,
			},
		});
		const canonicalArmorSurface: Surface<
			"en",
			"Citation",
			"Lexeme",
			"NOUN"
		> = dumling.en.create.surface.citation({
			lemma: armorLemma,
			normalizedSurface: "armor",
			spelling: "Canonical",
			realizationCoverage: "Full",
			surfaceFeatures: null,
		});
		const variantArmourSurface: Surface<
			"en",
			"Citation",
			"Lexeme",
			"NOUN"
		> = dumling.en.create.surface.citation({
			lemma: armorLemma,
			normalizedSurface: "armour",
			spelling: "Variant",
			realizationCoverage: "Full",
			surfaceFeatures: null,
		});
		const armourSelection: Selection<"en", "Citation", "Lexeme", "NOUN"> =
			dumling.en.create.selection({
				segmentedSentenceId: dumling.en.create.segmentedSentenceId(
					"sentence:en:polished-armour",
				),
				clickedSegmentIndex: 4,
				surfaceSegmentIndices: [4],
				attestedSurface: "armour",
				selectedOrthography: "Standard",
				surface: variantArmourSurface,
			});

		expect(armourSelection.selectedOrthography).toBe("Standard");
		expect(armourSelection.surface.spelling).toBe("Variant");
		expect(armourSelection.surface.normalizedSurface).toBe("armour");
		expect(armourSelection.surface.lemma.canonicalForm).toBe("armor");
		expect(armourSelection.surface.lemma).toEqual(
			canonicalArmorSurface.lemma,
		);
		expect(
			schemasFor.en.entity.Selection.Citation.Lexeme.NOUN().safeParse(
				armourSelection,
			).success,
		).toBe(true);
	});

	it("keeps a typo on the clicked Selection while the resolved Surface stays canonical", () => {
		expect(englishGiveUpClickedGvaeSelection.selectedOrthography).toBe(
			"Typo",
		);
		expect(englishGiveUpClickedUpSelection.selectedOrthography).toBe(
			"Standard",
		);
		expect(englishGiveUpClickedGvaeSelection.surface).toBe(
			englishGiveUpClickedUpSelection.surface,
		);
		expect(englishGiveUpClickedGvaeSelection.surface.spelling).toBe(
			"Canonical",
		);
		expect(
			englishGiveUpClickedGvaeSelection.surface.realizationCoverage,
		).toBe("Full");
		expect(englishGiveUpClickedGvaeSelection.attestedSurface).toBe(
			"gvae up",
		);
		expect(
			englishGiveUpClickedGvaeSelection.surface.normalizedSurface,
		).toBe("gave up");
	});

	it("accepts Hebrew pointed text as a Variant Surface, not a special Surface kind", () => {
		expect(hebrewKatvuPointedVariantSelection.selectedOrthography).toBe(
			"Standard",
		);
		expect(hebrewKatvuPointedVariantSelection.surface.spelling).toBe(
			"Variant",
		);
		expect(
			schemasFor.he.entity.Selection.Inflection.Lexeme.VERB().safeParse(
				hebrewKatvuPointedVariantSelection,
			).success,
		).toBe(true);
	});
});
