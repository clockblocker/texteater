import { describe, expect, it } from "bun:test";
import { dumling } from "../../../src";
import {
	englishWalkInflectionSurface,
	englishWalkLemma,
	germanMasculineSeeLemma,
} from "../../helpers";

describe("identity IDs", () => {
	it("encodes only Lemma and Surface identity keys", () => {
		const lemmaCsv = dumling.en.id.encode.asCsv(englishWalkLemma);
		const surfaceCsv = dumling.en.id.encode.asCsv(
			englishWalkInflectionSurface,
		);

		expect(String(lemmaCsv)).toStartWith("Lemma,en,walk,Lexeme,VERB,");
		expect(String(lemmaCsv)).toContain("phrasal");
		expect(String(surfaceCsv)).toStartWith("Surface,en,Inflection,walk,");
		expect(String(surfaceCsv)).toContain("canonicalForm");
	});

	it("decodes identity keys without hydrating DTO graphs", () => {
		const lemmaId = dumling.en.id.encode.asBase64Url(englishWalkLemma);
		const surfaceId = dumling.en.id.encode.asBase64Url(
			englishWalkInflectionSurface,
		);

		expect(dumling.en.id.decode.asLemmaIdentity(lemmaId)).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "en",
				kind: "Lemma",
				lemmaIdentity: englishWalkLemma,
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
	});

	it("keeps Surface identity byte-stable across non-identity metadata", () => {
		const baseline = dumling.en.id.encode.asCsv(
			englishWalkInflectionSurface,
		);
		const metadataOnly = dumling.en.id.encode.asCsv({
			...englishWalkInflectionSurface,
			spelling: "Variant",
			surfaceFeatures: { historicalStatus: "Archaic" },
		});

		expect(metadataOnly).toBe(baseline);
		expect(
			String(
				dumling.en.id.encode.asBase64Url(englishWalkInflectionSurface),
			),
		).toBe(
			"djMscyxlbixpLHdhbGssInsiIm1vb2QiIjpudWxsLCIibnVtYmVyIiI6bnVsbCwiInBlcnNvbiIiOm51bGwsIiJ0ZW5zZSIiOiIiUHJlcyIiLCIidmVyYkZvcm0iIjoiIkZpbiIiLCIidm9pY2UiIjpudWxsfSIsInsiImNhbm9uaWNhbEZvcm0iIjoiIndhbGsiIiwiImNvcmVGZWF0dXJlcyIiOnsiImFiYnIiIjpudWxsLCIiZXh0UG9zIiI6bnVsbCwiImhhc0dvdlByZXAiIjpudWxsLCIicGhyYXNhbCIiOm51bGwsIiJzdHlsZSIiOm51bGx9LCIiZmFtaWx5IiI6IiJMZXhlbWUiIiwiImtpbmQiIjoiIlZFUkIiIiwiImxhbmd1YWdlIiI6IiJlbiIifSI",
		);
	});

	it("hard-breaks historical Selection IDs", () => {
		expect(
			dumling.en.id.decode.any(
				"Selection,test:en:they-walk-home-together:v1,2",
			),
		).toEqual({
			success: false,
			error: {
				code: "MalformedId",
				message: "ID is not valid base64url",
			},
		});
	});

	it("returns structured kind and language mismatches", () => {
		const surfaceId = dumling.en.id.encode.asBase64Url(
			englishWalkInflectionSurface,
		);
		const germanLemmaId = dumling.de.id.encode.asBase64Url(
			germanMasculineSeeLemma,
		);

		expect(dumling.en.id.decode.asLemmaIdentity(surfaceId)).toEqual({
			success: false,
			error: {
				code: "EntityMismatch",
				message: "Expected Lemma, received Surface",
			},
		});
		expect(dumling.en.id.decode.any(germanLemmaId)).toEqual({
			success: false,
			error: {
				code: "LanguageMismatch",
				message: "Expected ID for en, received de",
			},
		});
	});
});
