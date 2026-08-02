import { describe, expect, it } from "bun:test";
import { dumling } from "../../src";
import type { Selection, Surface } from "../../src/types";
import {
	englishGiveUpClickedGvaeSelection,
	englishGiveUpClickedUpSelection,
} from "../helpers";

describe("language API", () => {
	it("constructs a strict Lemma → Surface → Selection graph", () => {
		const lemma = dumling.de.create.lemma({
			canonicalForm: "Schloss",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: {
				gender: "Neut",
				hyph: null,
			},
		});
		const surface: Surface<"de", "Citation", "Lexeme", "NOUN"> =
			dumling.de.create.surface.citation({
				lemma,
				normalizedSurface: "Schloss",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceFeatures: null,
			});
		const selection: Selection<"de", "Citation", "Lexeme", "NOUN"> =
			dumling.de.create.selection({
				segmentedSentenceId: dumling.de.create.segmentedSentenceId(
					"sentence:de:schloss-an-der-tuer",
				),
				clickedSegmentIndex: 2,
				surfaceSegmentIndices: [2],
				attestedSurface: "Schloss",
				selectedOrthography: "Standard",
				surface,
			});

		expect(selection.surface.lemma).toBe(lemma);
		expect(dumling.de.extract.lemma(selection)).toBe(lemma);
		expect(dumling.de.parse.selection(selection)).toEqual({
			success: true,
			data: selection,
		});
	});

	it("distinguishes grammatical Lemma identities that share a spelling", () => {
		const noun = dumling.en.create.lemma({
			canonicalForm: "book",
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
		const verb = dumling.en.create.lemma({
			canonicalForm: "book",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {
				abbr: null,
				extPos: null,
				hasGovPrep: null,
				phrasal: null,
				style: null,
			},
		});

		expect(noun.canonicalForm).toBe(verb.canonicalForm);
		expect(dumling.en.id.encode.asCsv(noun)).not.toBe(
			dumling.en.id.encode.asCsv(verb),
		);
	});

	it("reuses one Schloss Lemma across learner-reading contexts", () => {
		const lemma = dumling.de.create.lemma({
			canonicalForm: "Schloss",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: { gender: "Neut", hyph: null },
		});
		const homonymousLemma = dumling.de.create.lemma({
			canonicalForm: "Schloss",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: { gender: "Neut", hyph: null },
		});
		const surface: Surface<"de", "Citation", "Lexeme", "NOUN"> =
			dumling.de.create.surface.citation({
				lemma,
				normalizedSurface: "Schloss",
				spelling: "Canonical",
				realizationCoverage: "Full",
				surfaceFeatures: null,
			});
		const lockContext: Selection<"de", "Citation", "Lexeme", "NOUN"> =
			dumling.de.create.selection({
				segmentedSentenceId: dumling.de.create.segmentedSentenceId(
					"sentence:de:schloss-lock",
				),
				clickedSegmentIndex: 2,
				surfaceSegmentIndices: [2],
				attestedSurface: "Schloss",
				selectedOrthography: "Standard",
				surface,
			});
		const castleContext: Selection<"de", "Citation", "Lexeme", "NOUN"> =
			dumling.de.create.selection({
				segmentedSentenceId: dumling.de.create.segmentedSentenceId(
					"sentence:de:schloss-castle",
				),
				clickedSegmentIndex: 2,
				surfaceSegmentIndices: [2],
				attestedSurface: "Schloss",
				selectedOrthography: "Standard",
				surface,
			});

		expect(lockContext.surface.lemma).toEqual(castleContext.surface.lemma);
		expect(homonymousLemma).toEqual(lemma);
		expect(dumling.de.id.encode.asCsv(homonymousLemma)).toBe(
			dumling.de.id.encode.asCsv(lemma),
		);
		expect(dumling.de.id.encode.asCsv(lockContext)).not.toBe(
			dumling.de.id.encode.asCsv(castleContext),
		);
		expect("emojiDescription" in lockContext.surface.lemma).toBe(false);
	});

	it("represents a partial idiom realization on the Surface", () => {
		const lemma = dumling.de.create.lemma({
			canonicalForm: "mit den Wölfen heulen",
			family: "Phraseme",
			kind: "Idiom",
			coreFeatures: {},
		});
		const surface: Surface<"de", "Inflection", "Phraseme", "Idiom"> =
			dumling.de.create.surface.inflection({
				lemma,
				normalizedSurface: "heulte mit",
				spelling: "Canonical",
				realizationCoverage: "Partial",
				inflectionalFeatures: {
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Past",
					verbForm: "Fin",
					voice: null,
				},
				surfaceFeatures: null,
			});
		const selection: Selection<"de", "Inflection", "Phraseme", "Idiom"> =
			dumling.de.create.selection({
				segmentedSentenceId: dumling.de.create.segmentedSentenceId(
					"sentence:de:obwohl-er-heulte-mit",
				),
				clickedSegmentIndex: 8,
				surfaceSegmentIndices: [8, 12],
				attestedSurface: "heulte mit",
				selectedOrthography: "Standard",
				surface,
			});

		expect(selection.surface.realizationCoverage).toBe("Partial");
		expect(selection.surface.normalizedSurface).toBe("heulte mit");
		expect(selection.surface.lemma.canonicalForm).toBe(
			"mit den Wölfen heulen",
		);
	});

	it("represents an inflected support-verb collocation", () => {
		const lemma = dumling.de.create.lemma({
			canonicalForm: "eine Entscheidung treffen",
			family: "Phraseme",
			kind: "Collocation",
			coreFeatures: {},
		});
		const surface: Surface<"de", "Inflection", "Phraseme", "Collocation"> =
			dumling.de.create.surface.inflection({
				lemma,
				normalizedSurface: "trifft eine Entscheidung",
				spelling: "Canonical",
				realizationCoverage: "Full",
				inflectionalFeatures: {
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
					verbForm: "Fin",
					voice: null,
				},
				surfaceFeatures: null,
			});
		const selection: Selection<
			"de",
			"Inflection",
			"Phraseme",
			"Collocation"
		> = dumling.de.create.selection({
			segmentedSentenceId: dumling.de.create.segmentedSentenceId(
				"sentence:de:eine-entscheidung-treffen",
			),
			clickedSegmentIndex: 2,
			surfaceSegmentIndices: [2, 4, 6],
			attestedSurface: "trifft eine Entscheidung",
			selectedOrthography: "Standard",
			surface,
		});

		expect(selection.surface.lemma.family).toBe("Phraseme");
		expect(selection.surface.lemma.kind).toBe("Collocation");
		expect(selection.surface.realizationCoverage).toBe("Full");
		expect(dumling.de.parse.selection(selection)).toEqual({
			success: true,
			data: selection,
		});
	});

	it("keeps clicked text local while a settled phrasal verb spans several indices", () => {
		expect(englishGiveUpClickedGvaeSelection.surfaceSegmentIndices).toEqual(
			[2, 4],
		);
		expect(englishGiveUpClickedUpSelection.surfaceSegmentIndices).toEqual([
			2, 4,
		]);
		expect(englishGiveUpClickedGvaeSelection.clickedSegmentIndex).toBe(2);
		expect(englishGiveUpClickedUpSelection.clickedSegmentIndex).toBe(4);
		expect(englishGiveUpClickedGvaeSelection.surface).toBe(
			englishGiveUpClickedUpSelection.surface,
		);
	});

	it("preserves the attested Surface verbatim", () => {
		const decomposed = "Cafe\u0301";
		const selection = dumling.en.create.selection({
			...englishGiveUpClickedUpSelection,
			attestedSurface: decomposed,
		});

		expect(selection.attestedSurface).toBe(decomposed);
		expect(selection.attestedSurface).not.toBe(decomposed.normalize("NFC"));
	});

	it("rejects removed Selection fields instead of silently accepting them", () => {
		const parsed = dumling.en.parse.selection({
			segmentedSentenceId: "sentence:bad",
			clickedSegmentIndex: 0,
			surfaceSegmentIndices: [0],
			attestedSurface: "word",
			selectedOrthography: "Standard",
			spelledSelection: "word",
			surface: {},
		});

		expect(parsed.success).toBe(false);
	});
});
