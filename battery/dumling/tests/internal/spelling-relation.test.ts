import { describe, expect, it } from "bun:test";
import { dumling } from "../../src";
import { schemasFor } from "../../src/schema";
import type { Attestation, Surface } from "../../src/types";
import {
	englishGiveUpTypoFullAttestation,
	hebrewKatvuPointedVariantAttestation,
} from "../helpers";

describe("orthography and spelling ownership", () => {
	it("models armour as Standard evidence on a Variant Surface of the armor Lemma", () => {
		const armorLemma = dumling.en.create.lemma({
			canonicalForm: "armor",
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
		const canonicalArmorSurface: Surface<
			"en",
			"Citation",
			"Lexeme",
			"NOUN"
		> = dumling.en.create.surface.citation({
			lemma: armorLemma,
			normalizedSurface: "armor",
			spelling: "Canonical",
			surfaceFeatures: null,
		});
		const variantArmourSurface: Surface<
			"en",
			"Citation",
			"Lexeme",
			"NOUN"
		> = dumling.en.create.surface.citation({
			lemma: armorLemma,
			normalizedSurface: "armour",
			spelling: "Variant",
			surfaceFeatures: null,
		});
		const armourAttestation: Attestation<
			"en",
			"Citation",
			"Lexeme",
			"NOUN"
		> = dumling.en.create.attestation({
			members: [{ attested: "armour", orthography: "Standard" }],
			realizationCoverage: "Full",
			surface: variantArmourSurface,
		});

		expect(armourAttestation.members[0].orthography).toBe("Standard");
		expect(armourAttestation.surface.spelling).toBe("Variant");
		expect(armourAttestation.surface.normalizedSurface).toBe("armour");
		expect(armourAttestation.surface.lemma.canonicalForm).toBe("armor");
		expect(armourAttestation.surface.lemma).toEqual(
			canonicalArmorSurface.lemma,
		);
		expect(
			schemasFor.en.entity.Attestation.Citation.Lexeme.NOUN().safeParse(
				armourAttestation,
			).success,
		).toBe(true);
	});

	it("keeps mixed typo evidence on Attestation while Surface stays canonical", () => {
		expect(englishGiveUpTypoFullAttestation.members).toEqual([
			{ attested: "gvae", orthography: "Typo" },
			{ attested: "up", orthography: "Standard" },
		]);
		expect(englishGiveUpTypoFullAttestation.surface.spelling).toBe(
			"Canonical",
		);
		expect(englishGiveUpTypoFullAttestation.realizationCoverage).toBe(
			"Full",
		);
		expect(englishGiveUpTypoFullAttestation.surface.normalizedSurface).toBe(
			"gave up",
		);
	});

	it("accepts Hebrew pointed text as a Variant Surface, not a special Surface kind", () => {
		expect(
			hebrewKatvuPointedVariantAttestation.members[0].orthography,
		).toBe("Standard");
		expect(hebrewKatvuPointedVariantAttestation.surface.spelling).toBe(
			"Variant",
		);
		expect(
			schemasFor.he.entity.Attestation.Inflection.Lexeme.VERB().safeParse(
				hebrewKatvuPointedVariantAttestation,
			).success,
		).toBe(true);
	});
});
