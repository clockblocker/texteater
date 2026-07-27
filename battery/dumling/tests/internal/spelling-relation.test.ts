import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import {
	englishWalkCitationSelection,
	englishWalkStandardFullSelection,
	hebrewKatvuPointedVariantSelection,
} from "../helpers";

describe("selection spelling relation", () => {
	it("accepts citation selections marked as spelling variants", () => {
		expect(
			schemasFor.en.entity.Selection.Citation.Lexeme.VERB().safeParse({
				...englishWalkCitationSelection,
				selectionFeatures: { spelling: "Variant" },
			}).success,
		).toBe(true);
	});

	it("accepts inflection selections marked as spelling variants", () => {
		expect(
			schemasFor.en.entity.Selection.Inflection.Lexeme.VERB().safeParse({
				...englishWalkStandardFullSelection,
				selectionFeatures: { spelling: "Variant" },
			}).success,
		).toBe(true);
	});

	it("accepts Hebrew pointed inflection variants without variant surface kinds", () => {
		expect(
			schemasFor.he.entity.Selection.Inflection.Lexeme.VERB().safeParse(
				hebrewKatvuPointedVariantSelection,
			).success,
		).toBe(true);
	});

	it("rejects legacy surfaceKind variant payloads", () => {
		expect(
			schemasFor.en.entity.Selection.Citation.Lexeme.VERB().safeParse({
				...englishWalkCitationSelection,
				selectionFeatures: { spelling: "Variant" },
				surface: {
					...englishWalkCitationSelection.surface,
					surfaceKind: "Variant",
				},
			}).success,
		).toBe(false);
	});
});
