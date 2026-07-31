import { describe, expect, it } from "bun:test";
import { dumling } from "../../../src";
import {
	englishGiveUpClickedGvaeSelection,
	englishGiveUpClickedUpSelection,
	englishWalkInflectionSurface,
	englishWalkLemma,
	englishWalkStandardFullSelection,
	germanMasculineSeeLemma,
} from "../../helpers";

describe("identity IDs", () => {
	it("encodes only the identity key for each layer", () => {
		const lemmaCsv = dumling.en.id.encode.asCsv(englishWalkLemma);
		const surfaceCsv = dumling.en.id.encode.asCsv(
			englishWalkInflectionSurface,
		);
		const selectionCsv = dumling.en.id.encode.asCsv(
			englishWalkStandardFullSelection,
		);

		expect(String(lemmaCsv)).toStartWith("Lemma,en,walk,Lexeme,VERB,");
		expect(String(lemmaCsv)).toContain("phrasal");
		expect(String(surfaceCsv)).toStartWith("Surface,en,Inflection,walk,");
		expect(String(surfaceCsv)).toContain("canonicalForm");
		expect(String(selectionCsv)).toBe(
			"Selection,test:en:they-walk-home-together:v1,2",
		);
	});

	it("decodes identity keys rather than pretending to hydrate DTO graphs", () => {
		const lemmaIdentityEncoding =
			dumling.en.id.encode.asBase64Url(englishWalkLemma);
		const surfaceId = dumling.en.id.encode.asBase64Url(
			englishWalkInflectionSurface,
		);
		const selectionId = dumling.en.id.encode.asBase64Url(
			englishWalkStandardFullSelection,
		);

		expect(
			dumling.en.id.decode.asLemmaIdentity(lemmaIdentityEncoding),
		).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "en",
				kind: "Lemma",
				lemmaIdentityEncodingentity: englishWalkLemma,
			},
		});
		expect(dumling.en.id.decode.asSurfaceIdentity(surfaceId)).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "en",
				kind: "Surface",
				surfaceIdentity: {
					language: "en",
					surfaceKind: "Inflection",
					normalizedSurface: "walk",
					inflectionalFeatures:
						englishWalkInflectionSurface.inflectionalFeatures,
					lemma: englishWalkLemma,
				},
			},
		});
		expect(dumling.en.id.decode.asSelectionIdentity(selectionId)).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "en",
				kind: "Selection",
				selectionIdentity: {
					segmentedSentenceId:
						englishWalkStandardFullSelection.segmentedSentenceId,
					clickedSegmentIndex: 2,
				},
			},
		});
	});

	it("keeps two clicks in one sentence distinct", () => {
		const upSelectionId = dumling.en.id.encode.asBase64Url(
			englishGiveUpClickedUpSelection,
		);
		const gvaeSelectionId = dumling.en.id.encode.asBase64Url(
			englishGiveUpClickedGvaeSelection,
		);

		expect(upSelectionId).not.toBe(gvaeSelectionId);
		expect(upSelectionId).not.toBe(
			dumling.en.id.encode.asBase64Url(
				englishGiveUpClickedUpSelection.surface,
			),
		);
	});

	it("excludes Surface metadata but includes grammar and Lemma identity", () => {
		const baseline = dumling.en.id.encode.asCsv(
			englishWalkInflectionSurface,
		);
		const metadataOnly = dumling.en.id.encode.asCsv({
			...englishWalkInflectionSurface,
			spelling: "Variant",
			realizationCoverage: "Partial",
			surfaceFeatures: { historicalStatus: "Archaic" },
		});
		const differentInflection = dumling.en.id.encode.asCsv({
			...englishWalkInflectionSurface,
			inflectionalFeatures: {
				...englishWalkInflectionSurface.inflectionalFeatures,
				tense: "Past",
			},
		});
		const differentLemma = dumling.en.id.encode.asCsv({
			...englishWalkInflectionSurface,
			lemma: {
				...englishWalkLemma,
				canonicalForm: "stroll",
			},
		});

		expect(metadataOnly).toBe(baseline);
		expect(differentInflection).not.toBe(baseline);
		expect(differentLemma).not.toBe(baseline);
	});

	it("returns structured kind and language mismatches", () => {
		const selectionId = dumling.en.id.encode.asBase64Url(
			englishWalkStandardFullSelection,
		);
		const germanLemmaIdentityEncoding = dumling.de.id.encode.asBase64Url(
			germanMasculineSeeLemma,
		);

		expect(dumling.en.id.decode.asLemmaIdentity(selectionId)).toEqual({
			success: false,
			error: {
				code: "EntityMismatch",
				message: "Expected Lemma, received Selection",
			},
		});
		expect(dumling.en.id.decode.any(germanLemmaIdentityEncoding)).toEqual({
			success: false,
			error: {
				code: "LanguageMismatch",
				message: "Expected ID for en, received de",
			},
		});
	});
});
