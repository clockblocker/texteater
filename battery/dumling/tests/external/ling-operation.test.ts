import { describe, expect, it } from "bun:test";
import { dumling } from "../../src";
import type { AttestationOptionsFor } from "../../src/types";
import {
	englishWalkCitationAttestation,
	englishWalkCitationSurface,
	englishWalkInflectionSurface,
	englishWalkLemma,
	germanHausCitationSurface,
	hebrewKatvuStandardFullAttestation,
} from "../helpers";

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
		} satisfies AttestationOptionsFor;
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
