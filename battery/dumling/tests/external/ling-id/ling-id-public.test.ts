import { describe, expect, it } from "bun:test";
import { dumling } from "../../../src";
import {
	englishGiveUpTypoPartialGvaeSelection,
	englishGiveUpTypoPartialUpSelection,
	englishWalkInflectionSurface,
	englishWalkLemma,
	englishWalkStandardFullSelection,
	germanMasculineSeeLemma,
} from "../../helpers";

describe("ID helpers", () => {
	it("encodes and decodes readable CSV and base64url IDs", () => {
		const lemmaCsv = dumling.en.id.encode.asCsv(englishWalkLemma);
		const surfaceId = dumling.en.id.encode.asBase64Url(
			englishWalkInflectionSurface,
		);
		const selectionCsv = dumling.en.id.encode.asCsv(
			englishWalkStandardFullSelection,
		);
		const selectionId = dumling.en.id.encode.asBase64Url(
			englishWalkStandardFullSelection,
		);

		expect(String(lemmaCsv)).toBe("Lemma,en,Lexeme,VERB,walk,🚶,");
		expect(surfaceId).not.toStartWith("dumling:");
		expect(String(selectionCsv)).toBe(
			"Selection,walk,Surface,Inflection,walk,tense=Pres|verbForm=Fin,Lemma,en,Lexeme,VERB,walk,🚶,",
		);
		expect(selectionId).not.toBe(
			dumling.en.id.encode.asBase64Url(
				englishWalkStandardFullSelection.surface,
			),
		);

		expect(dumling.en.id.decode.asLemma(lemmaCsv)).toEqual({
			success: true,
			data: {
				format: "csv",
				language: "en",
				kind: "Lemma",
				lemma: englishWalkLemma,
			},
		});
		expect(dumling.en.id.decode.asSurface(surfaceId)).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "en",
				kind: "Surface",
				surface: englishWalkInflectionSurface,
			},
		});
		expect(dumling.en.id.decode.asSelection(selectionId)).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "en",
				kind: "Selection",
				selection: englishWalkStandardFullSelection,
			},
		});
	});

	it("returns structured errors for malformed ids and language mismatch", () => {
		const malformed = dumling.en.id.decode.any("not-a-dumling-id");
		const germanLemmaId = dumling.de.id.encode.asBase64Url(
			germanMasculineSeeLemma,
		);
		const mismatch = dumling.en.id.decode.any(germanLemmaId);

		expect(malformed.success).toBe(false);
		if (malformed.success) {
			throw new Error("expected malformed ID failure");
		}
		expect(malformed.error.code).toBe("MalformedId");
		expect(mismatch).toEqual({
			success: false,
			error: {
				code: "LanguageMismatch",
				message: "Expected ID for en, received de",
			},
		});
	});

	it("returns entity mismatch for kind-specific decode requests", () => {
		const selectionId = dumling.en.id.encode.asBase64Url(
			englishWalkStandardFullSelection,
		);

		expect(dumling.en.id.decode.asLemma(selectionId)).toEqual({
			success: false,
			error: {
				code: "EntityMismatch",
				message: "Expected Lemma, received Selection",
			},
		});
		expect(dumling.en.id.decode.asSurface(selectionId)).toEqual({
			success: false,
			error: {
				code: "EntityMismatch",
				message: "Expected Surface, received Selection",
			},
		});
	});

	it("encodes selections as their own identity", () => {
		const upSelectionId = dumling.en.id.encode.asBase64Url(
			englishGiveUpTypoPartialUpSelection,
		);
		const gvaeSelectionId = dumling.en.id.encode.asBase64Url(
			englishGiveUpTypoPartialGvaeSelection,
		);

		expect(upSelectionId).not.toBe(gvaeSelectionId);
		expect(upSelectionId).not.toBe(
			dumling.en.id.encode.asBase64Url(
				englishGiveUpTypoPartialUpSelection.surface,
			),
		);
	});

	it("preserves selection spelling metadata in IDs", () => {
		const canonicalId = dumling.en.id.encode.asBase64Url(
			englishWalkStandardFullSelection,
		);
		const variantId = dumling.en.id.encode.asBase64Url({
			...englishWalkStandardFullSelection,
			selectionFeatures: { spelling: "Variant" },
		});

		expect(canonicalId).not.toBe(variantId);
	});

	it("accepts parser-normalizable text casing in readable CSV", () => {
		const decoded = dumling.en.id.decode.asSurface(
			"Surface,Inflection,WALKED,tense=Past|verbForm=Fin,Lemma,en,Lexeme,VERB,WALK,🚶,",
		);

		expect(decoded.success).toBe(true);
		if (!decoded.success) {
			throw new Error(decoded.error.message);
		}
		expect(decoded.data.surface.normalizedFullSurface).toBe("walked");
		expect(dumling.en.id.encode.asCsv(decoded.data.surface)).toContain(
			",walked,",
		);
	});
});
