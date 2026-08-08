import { describe, expect, it } from "bun:test";
import { schemasFor } from "../../src/schema";
import {
	germanBVGAbbreviationAttestation,
	germanHausCitationSurface,
	germanKindLemma,
	makeLexemeSurfaceReference,
} from "../helpers";

describe("German noun schemas", () => {
	it("accepts supported noun Lemmas and inflections", () => {
		expect(
			schemasFor.de.entity.Lemma.Lexeme.NOUN().safeParse(germanKindLemma)
				.success,
		).toBe(true);
		expect(
			schemasFor.de.entity.Attestation.Inflection.Lexeme.NOUN().safeParse(
				{
					members: [{ attested: "kindern", orthography: "Standard" }],
					realizationCoverage: "Full",

					surface: {
						...makeLexemeSurfaceReference("de", "NOUN", "kind"),
						language: "de",
						normalizedSurface: "kindern",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						inflectionalFeatures: {
							case: "Dat",
							number: "Plur",
						},
					},
				},
			).success,
		).toBe(true);
	});

	it("reject unsupported noun features", () => {
		expect(
			schemasFor.de.entity.Lemma.Lexeme.NOUN().safeParse({
				language: "de",
				canonicalForm: "kind",
				family: "Lexeme",
				kind: "NOUN",
				coreFeatures: {
					case: "Nom",
				},
			}).success,
		).toBe(false);

		expect(
			schemasFor.de.entity.Attestation.Inflection.Lexeme.NOUN().safeParse(
				{
					members: [{ attested: "kindern", orthography: "Standard" }],
					realizationCoverage: "Full",

					surface: {
						...makeLexemeSurfaceReference("de", "NOUN", "kind"),
						language: "de",
						normalizedSurface: "kindern",
						spelling: "Canonical",
						surfaceKind: "Inflection",
						inflectionalFeatures: {
							case: "Ins",
							number: "Dual",
						},
					},
				},
			).success,
		).toBe(false);
	});

	it("keeps registry access and citation attestations intact", () => {
		expect(
			schemasFor.de.entity.Surface.Citation.Lexeme.NOUN().safeParse(
				germanHausCitationSurface,
			).success,
		).toBe(true);
		expect(
			schemasFor.de.entity.Attestation.Citation.Lexeme.PROPN().safeParse(
				germanBVGAbbreviationAttestation,
			).success,
		).toBe(true);
		expect(
			typeof schemasFor.de.entity.Attestation.Citation.Lexeme.NOUN()
				.parse,
		).toBe("function");
	});
});
