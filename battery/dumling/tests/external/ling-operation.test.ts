import { describe, expect, it } from "bun:test";
import { dumling } from "../../src";
import type { SelectionOptionsFor } from "../../src/types";
import {
	englishWalkCitationSelection,
	englishWalkCitationSurface,
	englishWalkInflectionSurface,
	englishWalkLemma,
	germanHausCitationSurface,
	hebrewKatvuStandardFullSelection,
} from "../helpers";

describe("operations", () => {
	it("extracts the exact Lemma from surfaces and selections", () => {
		expect(dumling.en.extract.lemma(englishWalkCitationSurface)).toBe(
			englishWalkLemma,
		);
		expect(dumling.en.extract.lemma(englishWalkCitationSelection)).toBe(
			englishWalkLemma,
		);
		expect(dumling.he.extract.lemma(hebrewKatvuStandardFullSelection)).toBe(
			hebrewKatvuStandardFullSelection.surface.lemma,
		);
	});

	it("builds valid surfaces and attestation-local selections", () => {
		expect(dumling.en.convert.lemma.toSurface(englishWalkLemma)).toEqual(
			englishWalkCitationSurface,
		);

		const selectionOptions = {
			segmentedSentenceId: dumling.en.create.segmentedSentenceId(
				"test:en:walk-conversion:v1",
			),
			clickedSegmentIndex: 2,
			surfaceSegmentIndices: [2],
			attestedSurface: "Walk",
			selectedOrthography: "Standard",
		} satisfies SelectionOptionsFor;
		expect(
			dumling.en.convert.surface.toSelection(
				englishWalkInflectionSurface,
				selectionOptions,
			),
		).toEqual({
			...selectionOptions,
			surface: englishWalkInflectionSurface,
		});
	});

	it("derives structural descriptors without semantic content", () => {
		expect(
			dumling.en.describe.as.lemma(englishWalkCitationSelection),
		).toEqual({
			language: "en",
			family: "Lexeme",
			kind: "VERB",
		});
		expect(dumling.en.describe.as.surface(englishWalkLemma)).toEqual({
			language: "en",
			surfaceKind: "Citation",
			family: "Lexeme",
			kind: "VERB",
		});
		expect(
			dumling.en.describe.as.selection(englishWalkInflectionSurface),
		).toEqual({
			language: "en",
			surfaceKind: "Inflection",
			family: "Lexeme",
			kind: "VERB",
		});
		expect(
			dumling.de.describe.as.selection(germanHausCitationSurface),
		).toEqual({
			language: "de",
			surfaceKind: "Citation",
			family: "Lexeme",
			kind: "NOUN",
		});
		expect(
			String(
				dumling.en.describe.asCsv.selection(
					englishWalkInflectionSurface,
				),
			),
		).toBe("Selection,en,Inflection,Lexeme,VERB");
	});
});
