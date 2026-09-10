import { describe, expect, it } from "bun:test";
import { dumling } from "../../src";
import {
	englishWalkCitationAttestation,
	englishWalkCitationSurface,
	englishWalkInflectionSurface,
	englishWalkLemma,
	germanHausCitationSurface,
	hebrewKatvuStandardFullAttestation,
} from "../helpers";

type AttestationConversionOptions = Parameters<
	typeof dumling.en.convert.surface.toAttestation
>[1];

describe("operations", () => {
	it("extracts the exact Lemma from surfaces and attestations", () => {
		expect(dumling.en.extract.lemma(englishWalkCitationSurface)).toBe(
			englishWalkLemma,
		);
		expect(dumling.en.extract.lemma(englishWalkCitationAttestation)).toBe(
			englishWalkLemma,
		);
		expect(
			dumling.he.extract.lemma(hebrewKatvuStandardFullAttestation),
		).toBe(hebrewKatvuStandardFullAttestation.surface.lemma);
	});

	it("builds valid surfaces and click-independent attestations", () => {
		expect(dumling.en.convert.lemma.toSurface(englishWalkLemma)).toEqual(
			englishWalkCitationSurface,
		);

		const attestationOptions = {
			members: [{ attested: "Walk", orthography: "Standard" }],
			realizationCoverage: "Full",
		} as const;
		expect(
			dumling.en.convert.surface.toAttestation(
				englishWalkInflectionSurface,
				attestationOptions,
			),
		).toEqual({
			...attestationOptions,
			surface: englishWalkInflectionSurface,
		});
	});

	it("projects only licensed Attestation fields from runtime options", () => {
		const options = {
			members: [{ attested: "walked", orthography: "Standard" }],
			realizationCoverage: "Full",
			clickedSegmentIndex: 4,
		} as const;

		expect(
			dumling.en.convert.surface.toAttestation(
				englishWalkInflectionSurface,
				options,
			),
		).toEqual({
			members: [{ attested: "walked", orthography: "Standard" }],
			realizationCoverage: "Full",
			surface: englishWalkInflectionSurface,
		});
	});

	it("rejects runtime conversion options with no Attestation members", () => {
		expect(() =>
			dumling.en.convert.surface.toAttestation(
				englishWalkInflectionSurface,
				{
					members: [],
					realizationCoverage: "Full",
				} as unknown as AttestationConversionOptions,
			),
		).toThrow("Attestation members must be non-empty");
	});

	it("rejects runtime conversion options with invalid realization coverage", () => {
		expect(() =>
			dumling.en.convert.surface.toAttestation(
				englishWalkInflectionSurface,
				{
					members: [{ attested: "walked", orthography: "Standard" }],
					realizationCoverage: "Bogus",
				} as unknown as AttestationConversionOptions,
			),
		).toThrow();
	});

	it("derives structural descriptors without semantic content", () => {
		expect(
			dumling.en.describe.as.lemma(englishWalkCitationAttestation),
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
			dumling.en.describe.as.attestation(englishWalkInflectionSurface),
		).toEqual({
			language: "en",
			surfaceKind: "Inflection",
			family: "Lexeme",
			kind: "VERB",
		});
		expect(
			dumling.de.describe.as.attestation(germanHausCitationSurface),
		).toEqual({
			language: "de",
			surfaceKind: "Citation",
			family: "Lexeme",
			kind: "NOUN",
		});
		expect(
			String(
				dumling.en.describe.asCsv.attestation(
					englishWalkInflectionSurface,
				),
			),
		).toBe("Attestation,en,Inflection,Lexeme,VERB");
	});
});
