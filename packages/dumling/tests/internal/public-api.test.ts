import { describe, expect, it } from "bun:test";
import * as runtimeEntry from "../../src";
import { dumling, getLanguageApi, supportedLanguages } from "../../src";
import {
	abstractSchemas,
	getSchemaTreeFor,
	schemasFor,
} from "../../src/schema";

describe("public API usage", () => {
	it("exposes the curated root runtime surface", () => {
		expect(runtimeEntry.dumling).toBe(dumling);
		expect(Object.keys(runtimeEntry).sort()).toEqual([
			"dumling",
			"getLanguageApi",
			"supportedLanguages",
		]);
		expect("schema" in runtimeEntry).toBe(false);
		expect("Language" in runtimeEntry).toBe(false);
	});

	it("exposes dynamic language helpers and language-scoped ID decoding", () => {
		expect(supportedLanguages).toEqual(["de", "en", "he"]);
		expect(getLanguageApi("de")).toBe(dumling.de);

		const selection = getLanguageApi("de").convert.lemma.toSelection(
			dumling.de.create.lemma({
				canonicalLemma: "see",
				lemmaKind: "Lexeme",
				lemmaSubKind: "NOUN",
				inherentFeatures: { gender: "Masc" },
				meaningInEmojis: "🌊",
			}),
		);
		const id = dumling.de.id.encode.asBase64Url(selection);

		expect(dumling.de.id.decode.asSelection(id)).toEqual({
			success: true,
			data: {
				format: "base64url",
				language: "de",
				kind: "Selection",
				selection,
			},
		});
	});

	it("keeps schemas available from the dedicated schema entrypoint", () => {
		const nounSelectionSchema =
			schemasFor.de.entity.Selection.Citation.Lexeme.NOUN();
		const nounDescriptorSchema = schemasFor.de.descriptor.Lemma.Lexeme.NOUN;

		expect(
			typeof schemasFor.de.entity.Selection.Inflection.Lexeme.VERB()
				.parse,
		).toBe("function");
		expect(typeof nounDescriptorSchema.parse).toBe("function");
		expect(typeof nounSelectionSchema.parse).toBe("function");
		expect(typeof schemasFor.he.entity.Lemma.Lexeme.VERB().parse).toBe(
			"function",
		);
		expect(getSchemaTreeFor("de")).toBe(schemasFor.de);
		expect(schemasFor.de.entity.Selection.Citation.Lexeme.NOUN()).toBe(
			nounSelectionSchema,
		);
		expect(
			nounDescriptorSchema.safeParse({
				language: "de",
				lemmaKind: "Lexeme",
				lemmaSubKind: "NOUN",
			}).success,
		).toBe(true);
		expect(
			schemasFor.de.descriptor.Surface.Citation.Lexeme.NOUN.safeParse({
				language: "de",
				surfaceKind: "Citation",
				lemmaKind: "Lexeme",
				lemmaSubKind: "NOUN",
			}).success,
		).toBe(true);
	});

	it("exposes abstract entity and descriptor schemas by entity kind", () => {
		const abstractLemma = {
			language: "fr",
			canonicalLemma: "aller",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🚶",
		};

		expect(
			abstractSchemas.entity.Lemma.safeParse(abstractLemma).success,
		).toBe(true);
		expect(
			abstractSchemas.descriptor.Selection.safeParse({
				language: "fr",
				surfaceKind: "Citation",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
			}).success,
		).toBe(true);
	});
});
