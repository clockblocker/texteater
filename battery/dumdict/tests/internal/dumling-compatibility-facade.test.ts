import { describe, expect, test } from "bun:test";
import {
	dumling as canonicalDumling,
	supportedLanguages as canonicalSupportedLanguages,
	getLanguageApi as getCanonicalLanguageApi,
} from "dumling";
import {
	dumling,
	getLanguageApi,
	supportedLanguages,
} from "../../src/dumling.js";
import {
	englishWalkCitationAttestation,
	englishWalkStandardFullAttestation,
	germanAufJedenFallFullAttestation,
	hebrewShanaCitationAttestation,
} from "../attested-entities/index.js";

type RuntimeLanguageApi = {
	create: {
		attestation(input: unknown): unknown;
		lemma(input: unknown): unknown;
	};
	convert: {
		lemma: { toSurface(input: unknown): unknown };
		surface: { toAttestation(input: unknown, options: unknown): unknown };
	};
	describe: {
		as: {
			attestation(input: unknown): unknown;
			lemma(input: unknown): unknown;
			surface(input: unknown): unknown;
		};
		asCsv: {
			attestation(input: unknown): unknown;
			lemma(input: unknown): unknown;
			surface(input: unknown): unknown;
		};
	};
	extract: { lemma(input: unknown): unknown };
	id: {
		decode: { any(input: string): unknown };
		encode: {
			asBase64Url(input: unknown): string;
			asCsv(input: unknown): string;
		};
	};
	parse: {
		attestation(input: unknown): unknown;
		lemma(input: unknown): unknown;
		surface(input: unknown): unknown;
	};
};

function runtimeApi(api: unknown): RuntimeLanguageApi {
	return api as RuntimeLanguageApi;
}

function record(value: unknown): Record<string, unknown> {
	if (value === null || typeof value !== "object") {
		throw new TypeError("Expected an entity fixture record.");
	}
	return value as Record<string, unknown>;
}

function expectFacadeParity(
	canonicalInput: unknown,
	compatibilityInput: unknown,
	attestation: unknown,
): void {
	const canonical = runtimeApi(canonicalInput);
	const compatibility = runtimeApi(compatibilityInput);
	const attestationRecord = record(attestation);
	const surface = record(attestationRecord.surface);
	const lemma = record(surface.lemma);

	expect(compatibility.parse.lemma(lemma)).toEqual(
		canonical.parse.lemma(lemma),
	);
	expect(compatibility.parse.surface(surface)).toEqual(
		canonical.parse.surface(surface),
	);
	expect(compatibility.parse.attestation(attestation)).toEqual(
		canonical.parse.attestation(attestation),
	);
	expect(compatibility.parse.attestation(null)).toEqual(
		canonical.parse.attestation(null),
	);

	expect(compatibility.create.lemma(lemma)).toEqual(
		canonical.create.lemma(lemma),
	);
	expect(compatibility.create.attestation(attestation)).toEqual(
		canonical.create.attestation(attestation),
	);
	expect(compatibility.convert.lemma.toSurface(lemma)).toEqual(
		canonical.convert.lemma.toSurface(lemma),
	);
	expect(
		compatibility.convert.surface.toAttestation(surface, {
			members: attestationRecord.members,
			realizationCoverage: attestationRecord.realizationCoverage,
		}),
	).toEqual(
		canonical.convert.surface.toAttestation(surface, {
			members: attestationRecord.members,
			realizationCoverage: attestationRecord.realizationCoverage,
		}),
	);

	expect(compatibility.extract.lemma(attestation)).toEqual(
		canonical.extract.lemma(attestation),
	);
	expect(compatibility.describe.as.lemma(lemma)).toEqual(
		canonical.describe.as.lemma(lemma),
	);
	expect(compatibility.describe.as.surface(surface)).toEqual(
		canonical.describe.as.surface(surface),
	);
	expect(compatibility.describe.as.attestation(attestation)).toEqual(
		canonical.describe.as.attestation(attestation),
	);
	expect(compatibility.describe.asCsv.lemma(lemma)).toEqual(
		canonical.describe.asCsv.lemma(lemma),
	);
	expect(compatibility.describe.asCsv.surface(surface)).toEqual(
		canonical.describe.asCsv.surface(surface),
	);
	expect(compatibility.describe.asCsv.attestation(attestation)).toEqual(
		canonical.describe.asCsv.attestation(attestation),
	);

	const canonicalLemmaId = canonical.id.encode.asCsv(lemma);
	const compatibilityLemmaId = compatibility.id.encode.asCsv(lemma);
	expect(compatibilityLemmaId).toBe(canonicalLemmaId);
	expect(compatibility.id.encode.asBase64Url(lemma)).toBe(
		canonical.id.encode.asBase64Url(lemma),
	);
	expect(compatibility.id.decode.any(compatibilityLemmaId)).toEqual(
		canonical.id.decode.any(canonicalLemmaId),
	);
	expect(compatibility.id.decode.any("not,a,canonical,id")).toEqual(
		canonical.id.decode.any("not,a,canonical,id"),
	);

	const normalizedInput = {
		...lemma,
		canonicalForm: "e\u0301",
	};
	expect(compatibility.parse.lemma(normalizedInput)).toEqual(
		canonical.parse.lemma(normalizedInput),
	);
	expect(compatibility.parse.lemma(normalizedInput)).toEqual(
		expect.objectContaining({
			data: expect.objectContaining({ canonicalForm: "é" }),
			success: true,
		}),
	);
}

function expectInvalidRouteParity(
	canonicalInput: unknown,
	compatibilityInput: unknown,
	attestation: unknown,
): void {
	const canonical = runtimeApi(canonicalInput);
	const compatibility = runtimeApi(compatibilityInput);
	const attestationRecord = record(attestation);
	const surface = record(attestationRecord.surface);
	const lemma = record(surface.lemma);
	for (const input of [
		null,
		{ ...lemma, extra: true },
		{ ...lemma, language: "wrong-language" },
		{ ...lemma, family: "UnknownFamily" },
	]) {
		expect(compatibility.parse.lemma(input)).toEqual(
			canonical.parse.lemma(input),
		);
	}
	for (const input of [
		null,
		{ ...surface, extra: true },
		{ ...surface, lemma: { ...lemma, language: "wrong-language" } },
		{ ...surface, surfaceKind: "UnknownSurfaceKind" },
	]) {
		expect(compatibility.parse.surface(input)).toEqual(
			canonical.parse.surface(input),
		);
	}
	for (const input of [
		null,
		{ ...attestationRecord, extra: true },
		{
			...attestationRecord,
			members: [],
			surface: {
				...surface,
				lemma: { ...lemma, language: "wrong-language" },
			},
		},
		{
			...attestationRecord,
			surface: { ...surface, surfaceKind: undefined },
		},
	]) {
		expect(compatibility.parse.attestation(input)).toEqual(
			canonical.parse.attestation(input),
		);
	}
}

describe("Dumdict lean Dumling compatibility facade", () => {
	test("preserves the canonical language API across every language", () => {
		expectFacadeParity(
			getCanonicalLanguageApi("de"),
			getLanguageApi("de"),
			germanAufJedenFallFullAttestation,
		);
		expectFacadeParity(
			getCanonicalLanguageApi("en"),
			getLanguageApi("en"),
			englishWalkCitationAttestation,
		);
		expectFacadeParity(
			getCanonicalLanguageApi("he"),
			getLanguageApi("he"),
			hebrewShanaCitationAttestation,
		);
		expectFacadeParity(
			getCanonicalLanguageApi("en"),
			getLanguageApi("en"),
			englishWalkStandardFullAttestation,
		);
	});

	test("preserves route inference and ordered failures for every entity and language", () => {
		expectInvalidRouteParity(
			getCanonicalLanguageApi("de"),
			getLanguageApi("de"),
			germanAufJedenFallFullAttestation,
		);
		expectInvalidRouteParity(
			getCanonicalLanguageApi("en"),
			getLanguageApi("en"),
			englishWalkStandardFullAttestation,
		);
		expectInvalidRouteParity(
			getCanonicalLanguageApi("he"),
			getLanguageApi("he"),
			hebrewShanaCitationAttestation,
		);
	});

	test("preserves nullable-field canonicalization in the parse facade", () => {
		const input = {
			canonicalForm: "gehen",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: null,
				lexicallyReflexive: null,
			},
			family: "Lexeme",
			kind: "VERB",
			language: "de",
		};
		expect(dumling.de.parse.lemma(input)).toEqual(
			canonicalDumling.de.parse.lemma(input),
		);
		expect(dumling.de.parse.lemma(input)).toEqual(
			expect.objectContaining({
				data: expect.objectContaining({
					coreFeatures: expect.objectContaining({ verbType: null }),
				}),
				success: true,
			}),
		);
	});

	test("preserves language inventory and Dumdict-internal object identity", () => {
		expect(supportedLanguages).toEqual(canonicalSupportedLanguages);
		expect(supportedLanguages).toEqual(["de", "en", "he"]);
		for (const language of supportedLanguages) {
			expect(Object.is(getLanguageApi(language), dumling[language])).toBe(
				true,
			);
		}
	});
});
