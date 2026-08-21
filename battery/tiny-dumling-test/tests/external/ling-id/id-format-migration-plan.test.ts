import { describe, expect, it } from "bun:test";
import { dumling } from "../../../src";
import {
	englishWalkLemma,
	englishWalkStandardFullAttestation,
	germanMasculineSeeLemma,
} from "../../helpers";

describe("structural identity ID contract", () => {
	it("changes Lemma identity when grammatical identity data changes", () => {
		const renamedLemma = {
			...englishWalkLemma,
			canonicalForm: "walking",
		};

		expect(dumling.en.id.encode.asCsv(renamedLemma)).not.toBe(
			dumling.en.id.encode.asCsv(englishWalkLemma),
		);
	});

	it("does not give Attestation an identity codec", () => {
		expect(() =>
			dumling.en.id.encode.asCsv(
				englishWalkStandardFullAttestation as never,
			),
		).toThrow("Attestation has no ID");
	});

	it("rejects readable IDs from another language namespace", () => {
		const germanId = dumling.de.id.encode.asCsv(germanMasculineSeeLemma);
		const decoded = dumling.en.id.decode.any(germanId);

		expect(decoded).toEqual({
			success: false,
			error: {
				code: "LanguageMismatch",
				message: "Expected ID for en, received de",
			},
		});
	});
});
