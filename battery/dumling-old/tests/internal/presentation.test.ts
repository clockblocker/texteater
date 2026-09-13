import { describe, expect, test } from "bun:test";
import { ParsingError, parseAs, parseAsLemma, toPresented } from "../../src";
import type { Attestation, Lemma, Surface } from "../../src/types";
import { abstractFeatureCatalog } from "../../src/types/abstract/features/features-catalog";
import { presentedFeatureNames } from "../../src/vocabulary";
import {
	germanHausCitationSurface,
	germanHausLemma,
	hebrewShanaLemma,
} from "../helpers/attested-entities";

const germanVerbLemma = {
	language: "de",
	canonicalForm: "gehen",
	family: "Lexeme",
	kind: "VERB",
	coreFeatures: {
		hasGovPrep: null,
		hasSepPrefix: null,
		lexicallyReflexive: null,
		verbType: null,
	},
} satisfies Lemma<"de", "Lexeme", "VERB">;

const germanVerbInflectionSurface = {
	language: "de",
	normalizedSurface: "ginge",
	spelling: "Canonical",
	surfaceKind: "Inflection",
	surfaceFeatures: null,
	lemma: germanVerbLemma,
	inflectionalFeatures: {
		mood: "Sub",
		number: "Sing",
		person: "3",
		tense: "Past",
		verbForm: "Fin",
		voice: null,
	},
} satisfies Surface<"de", "Inflection", "Lexeme", "VERB">;

const germanVerbAttestation = {
	members: [{ attested: "ginge", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface: germanVerbInflectionSurface,
} satisfies Attestation<"de", "Inflection", "Lexeme", "VERB">;

const sortedPresentedFeatureNames: string[] = [...presentedFeatureNames].sort();

describe("Dumling presentation DTOs", () => {
	test("keeps the lightweight feature inventory complete", () => {
		expect(presentedFeatureNames).toHaveLength(46);
		expect(sortedPresentedFeatureNames).toEqual(
			Object.keys(abstractFeatureCatalog).sort(),
		);
	});

	test("totalizes every feature leaf and gives Citation and Inflection the same structure", () => {
		const lemma = toPresented.lemma(germanHausLemma);
		const citation = toPresented.surface(germanHausCitationSurface);
		const inflection = toPresented.surface(germanVerbInflectionSurface);

		expect(Object.keys(lemma.coreFeatures).sort()).toEqual(
			sortedPresentedFeatureNames,
		);
		expect(Object.keys(citation).sort()).toEqual(
			Object.keys(inflection).sort(),
		);
		expect(Object.keys(citation.inflectionalFeatures).sort()).toEqual(
			sortedPresentedFeatureNames,
		);
		expect(Object.keys(inflection.inflectionalFeatures).sort()).toEqual(
			sortedPresentedFeatureNames,
		);
		expect(citation.surfaceFeatures).toEqual({ historicalStatus: null });
		expect(citation.inflectionalFeatures.tense).toBeNull();
	});

	test("merges every German verb union branch into the presented feature bag", () => {
		const presented = toPresented.surface(germanVerbInflectionSurface);

		expect(presented.inflectionalFeatures).toMatchObject({
			aspect: null,
			gender: null,
			mood: "Sub",
			number: "Sing",
			person: "3",
			tense: "Past",
			verbForm: "Fin",
			voice: null,
		});
	});

	test("returns fresh nested objects without mutating canonical input", () => {
		const before = structuredClone(germanVerbAttestation);
		const first = toPresented.attestation(germanVerbAttestation);
		const second = toPresented.attestation(germanVerbAttestation);
		const presentedHebrewLemma = toPresented.lemma(hebrewShanaLemma);

		expect(germanVerbAttestation).toEqual(before);
		expect(first).not.toBe(second);
		expect(first.members).not.toBe(second.members);
		expect(first.members[0]).not.toBe(second.members[0]);
		expect(first.surface).not.toBe(second.surface);
		expect(first.surface.lemma).not.toBe(second.surface.lemma);
		expect(first.surface.surfaceFeatures).not.toBe(
			second.surface.surfaceFeatures,
		);
		expect(first.surface.inflectionalFeatures).not.toBe(
			second.surface.inflectionalFeatures,
		);
		expect(first.surface.lemma.coreFeatures).not.toBe(
			second.surface.lemma.coreFeatures,
		);
		expect(presentedHebrewLemma.coreFeatures.gender).not.toBe(
			hebrewShanaLemma.coreFeatures.gender,
		);
	});

	test("round-trips presented Lemma, Surface, and Attestation values to canonical routes", () => {
		expect(
			parseAs.lemma(
				toPresented.lemma(germanHausLemma),
				"de",
				"Lexeme",
				"NOUN",
			),
		).toEqual(germanHausLemma);
		expect(
			parseAs.surface(
				toPresented.surface(germanHausCitationSurface),
				"de",
				"Citation",
				"Lexeme",
				"NOUN",
			),
		).toEqual(germanHausCitationSurface);
		expect(
			parseAs.surface(
				toPresented.surface(germanVerbInflectionSurface),
				"de",
				"Inflection",
				"Lexeme",
				"VERB",
			),
		).toEqual(germanVerbInflectionSurface);
		expect(
			parseAs.attestation(
				toPresented.attestation(germanVerbAttestation),
				"de",
				"Inflection",
				"Lexeme",
				"VERB",
			),
		).toEqual(germanVerbAttestation);
	});

	test("also accepts canonical values through the object facade", () => {
		expect(
			parseAs.surface(
				germanVerbInflectionSurface,
				"de",
				"Inflection",
				"Lexeme",
				"VERB",
			),
		).toEqual(germanVerbInflectionSurface);
	});

	test("preserves non-null inapplicable features for strict rejection", () => {
		const presented = toPresented.surface(germanHausCitationSurface);
		presented.inflectionalFeatures.tense = "Past";

		expect(
			parseAs.surface(presented, "de", "Citation", "Lexeme", "NOUN"),
		).toBeInstanceOf(ParsingError);
	});

	test("preserves arbitrary null properties for strict rejection", () => {
		const presented = {
			...toPresented.lemma(germanHausLemma),
			unexpected: null,
		};

		expect(parseAs.lemma(presented, "de", "Lexeme", "NOUN")).toBeInstanceOf(
			ParsingError,
		);
	});

	test("keeps existing named parsers strict", () => {
		const presented = toPresented.lemma(germanHausLemma);

		expect(parseAsLemma(presented, "de", "Lexeme", "NOUN")).toBeInstanceOf(
			ParsingError,
		);
		expect(parseAsLemma(germanHausLemma, "de", "Lexeme", "NOUN")).toEqual(
			germanHausLemma,
		);
	});
});
