import { describe, expect, it } from "bun:test";
import { dumling } from "../../../src";
import {
	englishWalkLemma,
	englishWalkStandardFullSelection,
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

	it("keys a Selection by immutable sentence ID and local clicked index", () => {
		const reclassifiedSelection = {
			...englishWalkStandardFullSelection,
			attestedSurface: "wolk",
			selectedOrthography: "Typo" as const,
		};

		expect(dumling.en.id.encode.asCsv(reclassifiedSelection)).toBe(
			dumling.en.id.encode.asCsv(englishWalkStandardFullSelection),
		);
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
