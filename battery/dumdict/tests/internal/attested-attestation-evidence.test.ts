import { describe, expect, test } from "bun:test";
import { dumling } from "../../src";
import {
	englishAttestations,
	englishGiveUpTypoFullAttestation,
	englishWalkStandardFullAttestation,
	germanAufJedenFallFullAttestation,
	hebrewKatvuStandardFullAttestation,
} from "../attested-entities";

describe("Dumdict ↔ Dumling attested fixture boundary", () => {
	test("parses every stored English occurrence through Dumling", () => {
		expect(
			englishAttestations.map(
				(attestation) =>
					dumling.en.parse.attestation(attestation).success,
			),
		).toEqual([
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
		]);
	});

	test("keeps exact member text paired with orthography", () => {
		expect(englishGiveUpTypoFullAttestation.members).toEqual([
			{ attested: "gvae", orthography: "Typo" },
			{ attested: "up", orthography: "Standard" },
		]);
	});

	test("represents multi-member realizations without click state", () => {
		expect(
			germanAufJedenFallFullAttestation.members.map(
				({ attested }) => attested,
			),
		).toEqual(["auf", "jeden", "Fall"]);
		expect(germanAufJedenFallFullAttestation).not.toHaveProperty(
			"clickedSegmentIndex",
		);
	});

	test("keeps occurrence coverage language independent", () => {
		expect(englishWalkStandardFullAttestation.realizationCoverage).toBe(
			"Full",
		);
		expect(hebrewKatvuStandardFullAttestation.realizationCoverage).toBe(
			"Full",
		);
	});
});
