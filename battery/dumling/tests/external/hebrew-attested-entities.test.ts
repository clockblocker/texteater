import { describe, expect, it } from "bun:test";
import { dumling } from "../../src";
import { schemasFor } from "../../src/schema";
import {
	hebrewKatavLemma,
	hebrewKatvuInflectionSurface,
	hebrewKatvuPointedVariantAttestation,
	hebrewKatvuStandardFullAttestation,
	hebrewShanaCitationAttestation,
	hebrewShanaCitationSurface,
	hebrewShanaLemma,
	hebrewUsAbbreviationAttestation,
	hebrewUsAbbreviationCitationSurface,
	hebrewUsAbbreviationLemma,
} from "../helpers";

describe("Hebrew attested entities", () => {
	it("stay valid against the public Hebrew schemas", () => {
		expect(
			schemasFor.he.entity.Lemma.Lexeme.VERB().safeParse(hebrewKatavLemma)
				.success,
		).toBe(true);
		expect(
			schemasFor.he.entity.Lemma.Lexeme.NOUN().safeParse(hebrewShanaLemma)
				.success,
		).toBe(true);
		expect(
			schemasFor.he.entity.Lemma.Lexeme.PROPN().safeParse(
				hebrewUsAbbreviationLemma,
			).success,
		).toBe(true);
		expect(
			schemasFor.he.entity.Surface.Inflection.Lexeme.VERB().safeParse(
				hebrewKatvuInflectionSurface,
			).success,
		).toBe(true);
		expect(
			schemasFor.he.entity.Surface.Citation.Lexeme.NOUN().safeParse(
				hebrewShanaCitationSurface,
			).success,
		).toBe(true);
		expect(
			schemasFor.he.entity.Surface.Citation.Lexeme.PROPN().safeParse(
				hebrewUsAbbreviationCitationSurface,
			).success,
		).toBe(true);
		expect(
			schemasFor.he.entity.Attestation.Inflection.Lexeme.VERB().safeParse(
				hebrewKatvuStandardFullAttestation,
			).success,
		).toBe(true);
		expect(
			schemasFor.he.entity.Attestation.Citation.Lexeme.NOUN().safeParse(
				hebrewShanaCitationAttestation,
			).success,
		).toBe(true);
		expect(
			schemasFor.he.entity.Attestation.Citation.Lexeme.PROPN().safeParse(
				hebrewUsAbbreviationAttestation,
			).success,
		).toBe(true);
		expect(
			schemasFor.he.entity.Attestation.Inflection.Lexeme.VERB().safeParse(
				hebrewKatvuPointedVariantAttestation,
			).success,
		).toBe(true);
	});

	it("work with the public operation helpers", () => {
		expect(
			dumling.he.extract.lemma(hebrewKatvuStandardFullAttestation),
		).toBe(hebrewKatavLemma);
		expect(dumling.he.extract.lemma(hebrewShanaCitationSurface)).toBe(
			hebrewShanaLemma,
		);
		expect(dumling.he.convert.lemma.toSurface(hebrewShanaLemma)).toEqual(
			hebrewShanaCitationSurface,
		);
		expect(
			dumling.he.describe.as.attestation(hebrewKatvuInflectionSurface),
		).toEqual({
			language: "he",
			surfaceKind: "Inflection",
			family: "Lexeme",
			kind: "VERB",
		});
	});

	it("encodes Hebrew entities and decodes their identity keys", () => {
		const lemmaIdentityEncoding =
			dumling.he.id.encode.asBase64Url(hebrewKatavLemma);
		const surfaceId = dumling.he.id.encode.asBase64Url(
			hebrewKatvuInflectionSurface,
		);
		expect(
			dumling.he.id.decode.asLemmaIdentity(lemmaIdentityEncoding),
		).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "he",
				kind: "Lemma",
				lemmaIdentity: hebrewKatavLemma,
			},
		});
		expect(dumling.he.id.decode.asSurfaceIdentity(surfaceId)).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "he",
				kind: "Surface",
				surfaceIdentity: {
					language: "he",
					surfaceKind: "Inflection",
					normalizedSurface: "כתבו",
					inflectionalFeatures:
						hebrewKatvuInflectionSurface.inflectionalFeatures,
					lemma: hebrewKatavLemma,
				},
			},
		});
	});
});
