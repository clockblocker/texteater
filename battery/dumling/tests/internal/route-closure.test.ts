import { describe, expect, test } from "bun:test";
import {
	isClosedRouteFor,
	ParsingError,
	parseAsLemma,
	parseAsReading,
} from "../../src";
import {
	allFixedLemmaCatalogs,
	allFixedReadingCatalogs,
	FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
	fixedMembersFor,
} from "../../src/fixed";

const detRoute = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
} as const;

describe("Route Closure", () => {
	test("promotes German DET for Reading and therefore Lemma", () => {
		expect(isClosedRouteFor.reading(detRoute)).toBe(true);
		expect(isClosedRouteFor.lemma(detRoute)).toBe(true);
	});

	test("defaults every absent route to Open", () => {
		for (const route of [
			{ language: "de", family: "Lexeme", kind: "NOUN" },
			{ language: "en", family: "Lexeme", kind: "DET" },
			{ language: "he", family: "Lexeme", kind: "DET" },
		] as const) {
			expect(isClosedRouteFor.lemma(route)).toBe(false);
			expect(isClosedRouteFor.reading(route)).toBe(false);
		}
	});
});

describe("fixed German DET members", () => {
	test("covers the named native/current-corpus v1 perimeter", () => {
		const catalog = fixedMembersFor.lemma(detRoute);
		expect(catalog).toBeDefined();
		expect(catalog?.scope).toBe(FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1);
		expect(catalog?.coverage).toBe("Complete");

		const identities = catalog?.members.map(
			({ canonicalForm, coreFeatures }) =>
				`${canonicalForm}/${coreFeatures.pronType}/${coreFeatures.extPos}`,
		);
		expect(identities).toEqual(
			expect.arrayContaining([
				"der/Art/null",
				"ein/Art/null",
				"dieser/Dem/null",
				"selber/Emp/null",
				"welcher/Int/null",
				"welcher/Rel/null",
				"welch/Exc/null",
				"kein/Neg/null",
				"alle/Tot/null",
				"beide/Tot/null",
				"mehr/Ind/DET",
				"wenig/Ind/ADV",
				"etwelcher/Ind/null",
				"wievielte/Int/null",
			]),
		);
		expect(
			catalog?.members.some(
				({ canonicalForm }) => canonicalForm === "the",
			),
		).toBe(false);
		expect(new Set(identities).size).toBe((identities ?? []).length);
	});

	test("owns one ordinary frozen Reading per exact Lemma", () => {
		const lemmaCatalog = fixedMembersFor.lemma(detRoute);
		expect(lemmaCatalog).toBeDefined();
		for (const lemma of lemmaCatalog?.members ?? []) {
			const readings = fixedMembersFor.reading(lemma);
			const reading = readings?.members[0];
			expect(readings?.scope).toBe(FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1);
			expect(readings?.coverage).toBe("Complete");
			expect(readings?.members).toHaveLength(1);
			expect(reading?.lemma).toEqual(lemma);
			expect(Object.isFrozen(lemma)).toBe(true);
			expect(Object.isFrozen(reading)).toBe(true);
			const parsedLemma = parseAsLemma(lemma, "de", "Lexeme", "DET");
			expect(parsedLemma).not.toBeInstanceOf(ParsingError);
			expect(parsedLemma).toEqual(lemma);
			if (!reading) throw new Error("Fixed Lemma has no fixed Reading.");
			const parsedReading = parseAsReading(
				reading,
				"de",
				"Lexeme",
				"DET",
			);
			expect(parsedReading).not.toBeInstanceOf(ParsingError);
			expect(parsedReading).toEqual(reading);
		}
	});

	test("iterates catalogs for the idempotent application loader", () => {
		expect(allFixedLemmaCatalogs()).toHaveLength(1);
		expect(allFixedLemmaCatalogs()[0]?.route).toEqual(detRoute);
		expect(Object.isFrozen(allFixedLemmaCatalogs())).toBe(true);
		expect(allFixedReadingCatalogs()).toHaveLength(1);
		expect(allFixedReadingCatalogs()[0]?.scope).toBe(
			FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
		);
		expect(Object.isFrozen(allFixedReadingCatalogs())).toBe(true);
	});

	test("distinguishes an absent catalog from a catalog member miss", () => {
		expect(
			fixedMembersFor.lemma({
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
			}),
		).toBeUndefined();
		const det = fixedMembersFor.lemma(detRoute);
		const foreignCandidate = {
			...det?.members[0],
			canonicalForm: "the",
		};
		expect(
			det?.members.some(
				(member) =>
					member.canonicalForm === foreignCandidate.canonicalForm,
			),
		).toBe(false);
	});
});
