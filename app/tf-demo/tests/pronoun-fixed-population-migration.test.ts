import { expect, test } from "bun:test";
import { fixedPronounCandidatesForLegacySurface } from "../convex/pronounFixedPopulationMigration";
import { withLegacyPronounReferenceNulls } from "../server/operationalParsing";

const legacyCore = {
	extPos: null,
	foreign: null,
	person: "1",
	polite: null,
	poss: null,
	pronType: "Prs",
} as const;

test("legacy PRON reads gain explicit nullable reference keys", () => {
	const normalized = withLegacyPronounReferenceNulls({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm: "ich",
		coreFeatures: legacyCore,
	});

	expect(normalized).toMatchObject({
		coreFeatures: { referenceGender: null, referenceNumber: null },
	});
});

test("migration identifies deterministic case forms and reports homographs", () => {
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "ich",
			coreFeatures: legacyCore,
			normalizedSurface: "mich",
		}).map(({ lemma }) => lemma.canonicalForm),
	).toEqual(["mich"]);

	const thirdPerson = { ...legacyCore, person: "3" as const };
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "er",
			coreFeatures: thirdPerson,
			normalizedSurface: "ihm",
		}),
	).toHaveLength(2);
	expect(
		fixedPronounCandidatesForLegacySurface({
			canonicalForm: "er",
			coreFeatures: thirdPerson,
			inflectionalFeatures: {
				case: "Dat",
				gender: "Masc",
				number: "Sing",
			},
			normalizedSurface: "ihm",
		}),
	).toHaveLength(1);
});

test("migration resolves a declined possessive to its fixed base", () => {
	const candidates = fixedPronounCandidatesForLegacySurface({
		canonicalForm: "mein",
		coreFeatures: { ...legacyCore, poss: "Yes" },
		normalizedSurface: "meiner",
	});

	expect(candidates).toHaveLength(1);
	expect(candidates[0]?.lemma.canonicalForm).toBe("mein");
});

test("formal Surface number never guesses the legacy addressee count", () => {
	const formalCore = {
		...legacyCore,
		person: "2" as const,
		polite: "Form" as const,
	};
	const legacy = {
		canonicalForm: "Sie",
		coreFeatures: formalCore,
		inflectionalFeatures: { case: "Nom", number: "Plur" },
		normalizedSurface: "Sie",
	} as const;

	expect(fixedPronounCandidatesForLegacySurface(legacy)).toHaveLength(2);
	expect(
		fixedPronounCandidatesForLegacySurface({
			...legacy,
			coreFeatures: { ...formalCore, referenceNumber: "Sing" },
		}),
	).toHaveLength(1);
});
