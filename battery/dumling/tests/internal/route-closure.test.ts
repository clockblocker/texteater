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
	FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
	FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
	FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	fixedMembersFor,
	fixedPopulationFor,
} from "../../src/fixed";

const detRoute = {
	language: "de",
	family: "Lexeme",
	kind: "DET",
} as const;

const auxRoute = {
	language: "de",
	family: "Lexeme",
	kind: "AUX",
} as const;

const pronounRoute = {
	language: "de",
	family: "Lexeme",
	kind: "PRON",
} as const;

describe("Route Closure", () => {
	test("promotes German DET for Reading and therefore Lemma", () => {
		expect(isClosedRouteFor.reading(detRoute)).toBe(true);
		expect(isClosedRouteFor.lemma(detRoute)).toBe(true);
	});

	test("promotes German AUX for Reading and therefore Lemma", () => {
		expect(isClosedRouteFor.reading(auxRoute)).toBe(true);
		expect(isClosedRouteFor.lemma(auxRoute)).toBe(true);
	});

	test("defaults every absent route to Open", () => {
		for (const route of [
			pronounRoute,
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
				"die/Art/null",
				"das/Art/null",
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
		for (const canonicalForm of ["der", "die", "das"]) {
			expect(
				catalog?.members.filter(
					(lemma) => lemma.canonicalForm === canonicalForm,
				),
			).toHaveLength(1);
		}
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
		expect(allFixedLemmaCatalogs()).toHaveLength(3);
		expect(allFixedLemmaCatalogs()[0]?.route).toEqual(detRoute);
		expect(Object.isFrozen(allFixedLemmaCatalogs())).toBe(true);
		expect(allFixedReadingCatalogs()).toHaveLength(3);
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

describe("fixed German PRON population", () => {
	test("keeps the route Open while curating exact identities", () => {
		expect(isClosedRouteFor.lemma(pronounRoute)).toBe(false);
		expect(isClosedRouteFor.reading(pronounRoute)).toBe(false);
		const catalog = fixedPopulationFor.lemma(pronounRoute);
		expect(catalog?.scope).toBe(
			FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
		);
		expect(catalog?.coverage).toBe("Curated");
		expect(catalog?.members.length).toBeGreaterThanOrEqual(52);
		expect(
			catalog?.members.filter(
				({ coreFeatures }) => coreFeatures.poss === "Yes",
			),
		).toHaveLength(9);
	});

	test("promotes total alles and alle as separate fixed Lemmas with one Reading each", () => {
		const catalog = fixedPopulationFor.lemma(pronounRoute);
		const totals = catalog?.members.filter(
			({ canonicalForm, coreFeatures }) =>
				coreFeatures.pronType === "Tot" &&
				["alles", "alle"].includes(canonicalForm),
		);

		expect(
			totals?.map(({ canonicalForm, coreFeatures }) => ({
				canonicalForm,
				coreFeatures,
			})),
		).toEqual([
			{
				canonicalForm: "alles",
				coreFeatures: {
					extPos: null,
					foreign: null,
					person: null,
					polite: null,
					poss: null,
					pronType: "Tot",
					referenceGender: null,
					referenceNumber: null,
				},
			},
			{
				canonicalForm: "alle",
				coreFeatures: {
					extPos: null,
					foreign: null,
					person: null,
					polite: null,
					poss: null,
					pronType: "Tot",
					referenceGender: null,
					referenceNumber: null,
				},
			},
		]);
		for (const lemma of totals ?? []) {
			const readings = fixedPopulationFor.reading(lemma);
			expect(readings?.members).toHaveLength(1);
			expect(readings?.members[0]?.lemma).toEqual(lemma);
		}
	});

	test("distinguishes homographs by reference identity and owns one Reading each", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const ihm = catalog?.members.filter(
			({ canonicalForm }) => canonicalForm === "ihm",
		);
		expect(ihm).toHaveLength(2);
		expect(
			ihm?.map(({ coreFeatures }) => coreFeatures.referenceGender).sort(),
		).toEqual(["Masc", "Neut"]);
		const ihr = catalog?.members.filter(
			({ canonicalForm }) => canonicalForm === "ihr",
		);
		expect(ihr).toHaveLength(4);
		const formalSie = catalog?.members.filter(
			({ canonicalForm, coreFeatures }) =>
				canonicalForm === "Sie" && coreFeatures.polite === "Form",
		);
		expect(
			formalSie
				?.map(({ coreFeatures }) => coreFeatures.referenceNumber)
				.sort(),
		).toEqual(["Plur", "Sing"]);
		for (const lemma of catalog?.members ?? []) {
			const readings = fixedPopulationFor.reading(lemma);
			expect(readings?.members).toHaveLength(1);
			expect(readings?.members[0]?.emojiDescription).toBe(
				lemma.canonicalForm === "sich"
					? "🪞"
					: lemma.coreFeatures.pronType === "Tot"
						? "🌐"
						: lemma.coreFeatures.pronType === "Int"
							? "❓"
							: lemma.coreFeatures.pronType === "Neg"
								? "🚫"
								: lemma.coreFeatures.poss === "Yes"
									? "🔑"
									: "👤",
			);
		}
	});

	test("collects the jemand case paradigm under one fixed indefinite Lemma", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const jemand = catalog?.members.filter(
			({ canonicalForm }) => canonicalForm === "jemand",
		);

		expect(jemand).toHaveLength(1);
		expect(jemand?.[0]?.coreFeatures).toEqual({
			extPos: null,
			foreign: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Ind",
			referenceGender: null,
			referenceNumber: null,
		});
		expect(
			catalog?.members.filter(({ canonicalForm }) =>
				["jemanden", "jemandem", "jemandes"].includes(canonicalForm),
			),
		).toEqual([]);
		const fixedJemand = jemand?.[0];
		if (!fixedJemand) throw new Error("Expected fixed jemand Lemma.");
		const readings = fixedMembersFor.reading(fixedJemand);
		expect(readings?.members).toHaveLength(1);
		expect(readings?.members[0]?.lemma).toEqual(fixedJemand);
		expect(readings?.members[0]?.emojiDescription).toBe("👤");
	});

	test("promotes one negative nichts Lemma with one Reading and no nix identity", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const nichts = catalog?.members.filter(
			({ canonicalForm, coreFeatures }) =>
				canonicalForm === "nichts" && coreFeatures.pronType === "Neg",
		);

		expect(nichts).toHaveLength(1);
		expect(nichts?.[0]?.coreFeatures).toEqual({
			extPos: null,
			foreign: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Neg",
			referenceGender: null,
			referenceNumber: null,
		});
		expect(
			catalog?.members.some(
				({ canonicalForm }) => canonicalForm === "nix",
			),
		).toBe(false);
		const lemma = nichts?.[0];
		if (!lemma) throw new Error("Expected fixed nichts Lemma.");
		const readings = fixedMembersFor.reading(lemma);
		expect(readings?.members).toHaveLength(1);
		expect(readings?.members[0]).toEqual({
			lemma,
			emojiDescription: "🚫",
		});
	});

	test("collects the singular jeder paradigm under one fixed total Lemma", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const jeder = catalog?.members.filter(
			({ canonicalForm, coreFeatures }) =>
				canonicalForm === "jeder" && coreFeatures.pronType === "Tot",
		);
		expect(jeder).toHaveLength(1);
		expect(
			catalog?.members.filter(({ canonicalForm }) =>
				["jede", "jedes", "jeden", "jedem"].includes(canonicalForm),
			),
		).toEqual([]);
		const lemma = jeder?.[0];
		if (!lemma) throw new Error("Expected fixed jeder Lemma.");
		expect(fixedMembersFor.reading(lemma)?.members).toEqual([
			{ lemma, emojiDescription: "🌐" },
		]);
	});

	test("collects the singular jedweder paradigm under one separate fixed total Lemma", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const lemmas = catalog?.members.filter(
			({ canonicalForm, coreFeatures }) =>
				canonicalForm === "jedweder" && coreFeatures.pronType === "Tot",
		);
		expect(lemmas).toHaveLength(1);
		expect(
			catalog?.members.filter(({ canonicalForm }) =>
				["jedwede", "jedwedes", "jedweden", "jedwedem"].includes(
					canonicalForm,
				),
			),
		).toEqual([]);
		const lemma = lemmas?.[0];
		if (!lemma) throw new Error("Expected fixed jedweder Lemma.");
		expect(fixedMembersFor.reading(lemma)?.members).toEqual([
			{ lemma, emojiDescription: "🌐" },
		]);
	});

	test("collects singular and plural jeglicher under one separate fixed total Lemma", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const lemmas = catalog?.members.filter(
			({ canonicalForm }) => canonicalForm === "jeglicher",
		);
		expect(lemmas).toHaveLength(1);
		expect(
			catalog?.members.filter(({ canonicalForm }) =>
				["jegliche", "jegliches", "jeglichen", "jeglichem"].includes(
					canonicalForm,
				),
			),
		).toEqual([]);
		const lemma = lemmas?.[0];
		if (!lemma) throw new Error("Expected fixed jeglicher Lemma.");
		expect(lemma.coreFeatures.pronType).toBe("Tot");
		expect(fixedMembersFor.reading(lemma)?.members).toEqual([
			{ lemma, emojiDescription: "🌐" },
		]);
	});

	test("collects the niemand case paradigm under one fixed negative Lemma", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const niemand = catalog?.members.filter(
			({ canonicalForm }) => canonicalForm === "niemand",
		);

		expect(niemand).toHaveLength(1);
		expect(niemand?.[0]?.coreFeatures).toEqual({
			extPos: null,
			foreign: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Neg",
			referenceGender: null,
			referenceNumber: null,
		});
		expect(
			catalog?.members.filter(({ canonicalForm }) =>
				["niemanden", "niemandem", "niemandes"].includes(canonicalForm),
			),
		).toEqual([]);
		const fixedNiemand = niemand?.[0];
		if (!fixedNiemand) throw new Error("Expected fixed niemand Lemma.");
		const readings = fixedMembersFor.reading(fixedNiemand);
		expect(readings?.members).toHaveLength(1);
		expect(readings?.members[0]?.lemma).toEqual(fixedNiemand);
		expect(readings?.members[0]?.emojiDescription).toBe("🚫");
	});

	test("collects all standalone kein- forms under one fixed keiner Lemma", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const keiner = catalog?.members.filter(
			({ canonicalForm }) => canonicalForm === "keiner",
		);
		expect(keiner).toHaveLength(1);
		expect(keiner?.[0]?.coreFeatures.pronType).toBe("Neg");
		expect(
			catalog?.members.filter(({ canonicalForm }) =>
				["keine", "keines", "keinen", "keinem"].includes(canonicalForm),
			),
		).toEqual([]);
		const lemma = keiner?.[0];
		if (!lemma) throw new Error("Expected fixed keiner Lemma.");
		expect(fixedMembersFor.reading(lemma)?.members).toHaveLength(1);
	});

	test("promotes one singular total jedermann Lemma without jedermanns", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const lemma = catalog?.members.find(
			({ canonicalForm }) => canonicalForm === "jedermann",
		);
		expect(lemma?.coreFeatures.pronType).toBe("Tot");
		expect(
			catalog?.members.some(
				({ canonicalForm }) => canonicalForm === "jedermanns",
			),
		).toBe(false);
		if (!lemma) throw new Error("Expected fixed jedermann Lemma.");
		expect(fixedMembersFor.reading(lemma)?.members).toHaveLength(1);
	});

	test("collects all standalone manch- forms under one fixed mancher Lemma", () => {
		const catalog = fixedMembersFor.lemma(pronounRoute);
		const lemma = catalog?.members.find(
			({ canonicalForm }) => canonicalForm === "mancher",
		);
		expect(lemma?.coreFeatures.pronType).toBe("Tot");
		expect(
			catalog?.members.filter(({ canonicalForm }) =>
				["manche", "manches", "manchen", "manchem"].includes(
					canonicalForm,
				),
			),
		).toEqual([]);
		if (!lemma) throw new Error("Expected fixed mancher Lemma.");
		expect(fixedMembersFor.reading(lemma)?.members).toHaveLength(1);
	});

	test("promotes separate exact-form demonstrative and relative populations", () => {
		const members = fixedMembersFor.lemma(pronounRoute)?.members ?? [];
		const forms = [
			"der",
			"die",
			"das",
			"den",
			"dem",
			"dessen",
			"deren",
			"denen",
		];
		for (const pronType of ["Dem", "Rel"] as const) {
			const population = members.filter(
				(candidate) => candidate.coreFeatures.pronType === pronType,
			);
			expect(
				population.map(({ canonicalForm }) => canonicalForm),
			).toEqual(forms);
			for (const lemma of population) {
				expect(lemma.coreFeatures).toEqual({
					extPos: null,
					foreign: null,
					person: null,
					polite: null,
					poss: null,
					pronType,
					referenceGender: null,
					referenceNumber: null,
				});
				expect(fixedMembersFor.reading(lemma)?.members).toEqual([
					{
						lemma,
						emojiDescription: "👤",
					},
				]);
			}
		}
	});

	test("promotes one plural-only mehrere total Lemma and Reading", () => {
		const mehrere = fixedMembersFor
			.lemma(pronounRoute)
			?.members.filter(
				({ canonicalForm, coreFeatures }) =>
					canonicalForm === "mehrere" &&
					coreFeatures.pronType === "Tot",
			);
		expect(mehrere).toHaveLength(1);
		expect(mehrere?.[0]?.coreFeatures).toEqual({
			extPos: null,
			foreign: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Tot",
			referenceGender: null,
			referenceNumber: null,
		});
		const lemma = mehrere?.[0];
		if (!lemma) throw new Error("Expected fixed mehrere Lemma.");
		expect(fixedMembersFor.reading(lemma)?.members).toEqual([
			{ lemma, emojiDescription: "🌐" },
		]);
	});
});

describe("fixed German AUX members", () => {
	test("covers the complete native AUX class and promoted sein peers", () => {
		const catalog = fixedMembersFor.lemma(auxRoute);
		expect(catalog?.scope).toBe(FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1);
		expect(catalog?.coverage).toBe("Complete");
		expect(
			catalog?.members.map(
				({ canonicalForm, coreFeatures }) =>
					`${canonicalForm}/${coreFeatures.verbType}`,
			),
		).toEqual([
			"sein/null",
			"bin/null",
			"bist/null",
			"ist/null",
			"sind/null",
			"seid/null",
			"haben/null",
			"werden/null",
			"dürfen/Mod",
			"können/Mod",
			"mögen/Mod",
			"müssen/Mod",
			"sollen/Mod",
			"wollen/Mod",
		]);
	});

	test("owns one ordinary frozen Reading per exact AUX Lemma", () => {
		const catalog = fixedMembersFor.lemma(auxRoute);
		for (const lemma of catalog?.members ?? []) {
			const readings = fixedMembersFor.reading(lemma);
			expect(readings?.scope).toBe(FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1);
			expect(readings?.coverage).toBe("Complete");
			expect(readings?.members).toHaveLength(1);
			expect(readings?.members[0]?.lemma).toEqual(lemma);
			expect(Object.isFrozen(lemma)).toBe(true);
			expect(Object.isFrozen(readings?.members[0])).toBe(true);
		}
	});
});
