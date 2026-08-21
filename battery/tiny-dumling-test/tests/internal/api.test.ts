import { describe, expect, it } from "bun:test";
import { dumling } from "../../src";
import type { Attestation, Surface } from "../../src/types";
import { englishGiveUpTypoFullAttestation } from "../helpers";

describe("language API", () => {
	it("constructs and round-trips a strict Lemma → Surface → Attestation graph", () => {
		const lemma = dumling.de.create.lemma({
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
				surfaceFeatures: null,
			});
		const attestation: Attestation<"de", "Citation", "Lexeme", "NOUN"> =
			dumling.de.create.attestation({
				members: [{ attested: "Schloss", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface,
			});

		expect(attestation.surface.lemma).toBe(lemma);
		expect(dumling.de.extract.lemma(attestation)).toBe(lemma);
		expect(
			dumling.de.parse.attestation(
				JSON.parse(JSON.stringify(attestation)),
			),
		).toEqual({
			success: true,
			data: attestation,
		});
	});

	it("keeps mixed Typo/Standard evidence on ordered discontinuous members", () => {
		expect(englishGiveUpTypoFullAttestation.members).toEqual([
			{ attested: "gvae", orthography: "Typo" },
			{ attested: "up", orthography: "Standard" },
		]);
		expect(englishGiveUpTypoFullAttestation.realizationCoverage).toBe(
			"Full",
		);
		expect(englishGiveUpTypoFullAttestation.surface.normalizedSurface).toBe(
			"gave up",
		);
	});

	it("represents Partial without inserting omitted realization material", () => {
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
		const attestation = dumling.de.create.attestation({
			members: [
				{ attested: "heulte", orthography: "Standard" },
				{ attested: "mit", orthography: "Standard" },
			],
			realizationCoverage: "Partial",
			surface,
		});

		expect(attestation.realizationCoverage).toBe("Partial");
		expect(attestation.surface.normalizedSurface).toBe("heulte mit");
		expect(attestation.surface.lemma.canonicalForm).toBe(
			"mit den Wölfen heulen",
		);
	});

	it("rejects empty members, click fields, unknown fields, and coverage on Surface", () => {
		const valid = englishGiveUpTypoFullAttestation;
		const schema = dumling.en.parse.attestation;

		expect(schema({ ...valid, members: [] }).success).toBe(false);
		expect(
			schema({
				...valid,
				members: [{ attested: "", orthography: "Standard" }],
			}).success,
		).toBe(false);
		expect(schema({ ...valid, clickedSegmentIndex: 2 }).success).toBe(
			false,
		);
		expect(
			schema({ ...valid, attestationId: "not-licensed" }).success,
		).toBe(false);
		expect(
			schema({
				...valid,
				surface: { ...valid.surface, realizationCoverage: "Full" },
			}).success,
		).toBe(false);
	});
});
