import { describe, expect, it } from "bun:test";
import * as runtimeLemma from "../../src";
import { dumling, getLanguageApi, supportedLanguages } from "../../src";
import {
	abstractSchemas,
	getSchemaTreeFor,
	schemasFor,
} from "../../src/schema";

describe("public API usage", () => {
	it("exposes the curated root runtime surface", () => {
		expect(runtimeLemma.dumling).toBe(dumling);
		expect(Object.keys(runtimeLemma).sort()).toEqual([
			"dumling",
			"getLanguageApi",
			"supportedLanguages",
		]);
		expect("schema" in runtimeLemma).toBe(false);
		expect("Language" in runtimeLemma).toBe(false);
	});

	it("exposes dynamic language helpers and language-scoped identity decoding", () => {
		expect(supportedLanguages).toEqual(["de", "en", "he"]);
		for (const language of supportedLanguages) {
			expect(Object.is(getLanguageApi(language), dumling[language])).toBe(
				true,
			);
		}

		const lemma = dumling.de.create.lemma({
			canonicalForm: "see",
			family: "Lexeme",
			kind: "NOUN",
			coreFeatures: { gender: "Masc", hyph: null },
		});
		const surface = dumling.de.create.surface.citation({
			lemma,
			normalizedSurface: "See",
			spelling: "Canonical",
			surfaceFeatures: null,
		});
		const attestation = getLanguageApi("de").convert.surface.toAttestation(
			surface,
			{
				members: [{ attested: "See", orthography: "Standard" }],
				realizationCoverage: "Full",
			},
		);

		expect(attestation.members).toEqual([
			{ attested: "See", orthography: "Standard" },
		]);
		expect("toAttestation" in dumling.de.convert.lemma).toBe(false);
		expect("asAttestationIdentity" in dumling.de.id.decode).toBe(false);
	});

	it("keeps schemas available from the dedicated schema entrypoint", () => {
		const nounAttestationSchema =
			schemasFor.de.entity.Attestation.Citation.Lexeme.NOUN();
		const nounDescriptorSchema = schemasFor.de.descriptor.Lemma.Lexeme.NOUN;

		expect(
			typeof schemasFor.de.entity.Attestation.Inflection.Lexeme.VERB()
				.parse,
		).toBe("function");
		expect(typeof nounDescriptorSchema.parse).toBe("function");
		expect(typeof nounAttestationSchema.parse).toBe("function");
		expect(typeof schemasFor.he.entity.Lemma.Lexeme.VERB().parse).toBe(
			"function",
		);
		expect(getSchemaTreeFor("de")).toBe(schemasFor.de);
		expect(schemasFor.de.entity.Attestation.Citation.Lexeme.NOUN()).toBe(
			nounAttestationSchema,
		);
		expect(
			nounDescriptorSchema.safeParse({
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
			}).success,
		).toBe(true);
		expect(
			schemasFor.de.descriptor.Surface.Citation.Lexeme.NOUN.safeParse({
				language: "de",
				surfaceKind: "Citation",
				family: "Lexeme",
				kind: "NOUN",
			}).success,
		).toBe(true);
	});

	it("exposes abstract entity and descriptor schemas by entity kind", () => {
		const abstractLemma = {
			language: "fr",
			canonicalForm: "aller",
			family: "Lexeme",
			kind: "VERB",
			coreFeatures: {},
		};

		expect(
			abstractSchemas.entity.Lemma.safeParse(abstractLemma).success,
		).toBe(true);
		expect(
			abstractSchemas.descriptor.Attestation.safeParse({
				language: "fr",
				surfaceKind: "Citation",
				family: "Lexeme",
				kind: "VERB",
			}).success,
		).toBe(true);
	});
});
