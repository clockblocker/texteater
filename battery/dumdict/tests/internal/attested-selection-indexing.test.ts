import { describe, expect, test } from "bun:test";
import {
	englishBankRiverSelection,
	englishLookUpSelection,
	englishWalkStandardFullSelection,
	germanBVGAbbreviationSelection,
	hebrewKatvuStandardFullSelection,
	hebrewUsAbbreviationSelection,
} from "../attested-entities";

describe("attested Selection indexing", () => {
	test("counts text, whitespace, and punctuation as Segments", () => {
		expect(englishWalkStandardFullSelection.clickedSegmentIndex).toBe(2);
		expect(englishBankRiverSelection.clickedSegmentIndex).toBe(10);
		expect(germanBVGAbbreviationSelection.clickedSegmentIndex).toBe(20);
		expect(hebrewKatvuStandardFullSelection.clickedSegmentIndex).toBe(2);
		expect(hebrewUsAbbreviationSelection.clickedSegmentIndex).toBe(0);
	});

	test("records only Surface member text indices for multiword forms", () => {
		expect(englishLookUpSelection.clickedSegmentIndex).toBe(2);
		expect(englishLookUpSelection.surfaceSegmentIndices).toEqual([2, 4]);
	});
});
