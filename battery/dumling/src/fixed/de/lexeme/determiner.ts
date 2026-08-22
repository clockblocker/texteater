import type {
	CoreFeaturesFor,
	Lemma,
	Reading,
} from "../../../types/public-types.js";
import type { FixedCatalog, FixedLemmaCatalog } from "../../catalog.js";

/**
 * Native German determiners accepted by the issue-224 evidence review plus
 * the repository's current native DET corpus. Arbitrary foreign/code-switched
 * determiners are deliberately outside this versioned perimeter and produce a
 * CatalogMiss in Closed production.
 */
export const FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1 = "de-Lexeme-DET-v1" as const;

type DetLemma = Lemma<"de", "Lexeme", "DET">;
type DetReading = Reading<"de", "Lexeme", "DET">;
type DetCore = CoreFeaturesFor<"de", "Lexeme", "DET">;

const EMPTY_CORE = Object.freeze({
	definite: null,
	extPos: null,
	foreign: null,
	numType: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
}) satisfies DetCore;

function core(overrides: Partial<DetCore>): DetCore {
	return { ...EMPTY_CORE, ...overrides };
}

type DetSpecification = Readonly<{
	canonicalForm: string;
	coreFeatures: DetCore;
	emojiDescription: string;
}>;

const possessive = (
	canonicalForm: string,
	person: "1" | "2" | "3",
	emojiDescription: string,
	polite: "Form" | null = null,
): DetSpecification => ({
	canonicalForm,
	coreFeatures: core({ person, polite, poss: "Yes", pronType: "Prs" }),
	emojiDescription,
});

const specifications = Object.freeze([
	{
		canonicalForm: "der",
		coreFeatures: core({ definite: "Def", pronType: "Art" }),
		emojiDescription: "👉",
	},
	{
		canonicalForm: "ein",
		coreFeatures: core({
			definite: "Ind",
			numType: "Card",
			pronType: "Art",
		}),
		emojiDescription: "1️⃣",
	},
	possessive("mein", "1", "🙋🔐"),
	possessive("dein", "2", "🫵🔐"),
	possessive("Ihr", "2", "🎩🔐", "Form"),
	possessive("sein", "3", "👨🔐"),
	possessive("ihr", "3", "👩🔐"),
	possessive("unser", "1", "👥🔐"),
	possessive("euer", "2", "🫵👥🔐"),
	...["derjenige", "derselbe", "dieser", "jener", "solcher", "derlei"].map(
		(canonicalForm): DetSpecification => ({
			canonicalForm,
			coreFeatures: core({ pronType: "Dem" }),
			emojiDescription: "👉",
		}),
	),
	{
		canonicalForm: "selber",
		coreFeatures: core({ pronType: "Emp" }),
		emojiDescription: "🟰",
	},
	{
		canonicalForm: "welcher",
		coreFeatures: core({ pronType: "Int" }),
		emojiDescription: "❓",
	},
	{
		canonicalForm: "welcher",
		coreFeatures: core({ pronType: "Rel" }),
		emojiDescription: "🔗",
	},
	{
		canonicalForm: "welch",
		coreFeatures: core({ pronType: "Exc" }),
		emojiDescription: "❗",
	},
	{
		canonicalForm: "wieviel",
		coreFeatures: core({ pronType: "Int" }),
		emojiDescription: "❓🔢",
	},
	{
		canonicalForm: "was für ein",
		coreFeatures: core({ pronType: "Int" }),
		emojiDescription: "❓👉",
	},
	{
		canonicalForm: "wievielte",
		coreFeatures: core({ numType: "Ord", pronType: "Int" }),
		emojiDescription: "❓🔢",
	},
	...[
		"einige",
		"etliche",
		"irgendein",
		"irgendwelcher",
		"mancher",
		"mehrere",
		"lauter",
		"manch",
		"etwelcher",
		"viel",
		"meist",
	].map(
		(canonicalForm): DetSpecification => ({
			canonicalForm,
			coreFeatures: core({ pronType: "Ind" }),
			emojiDescription: "🔢",
		}),
	),
	{
		canonicalForm: "mehr",
		coreFeatures: core({ extPos: "DET", pronType: "Ind" }),
		emojiDescription: "➕",
	},
	{
		canonicalForm: "wenig",
		coreFeatures: core({ extPos: "ADV", pronType: "Ind" }),
		emojiDescription: "➖",
	},
	{
		canonicalForm: "kein",
		coreFeatures: core({ pronType: "Neg" }),
		emojiDescription: "🚫",
	},
	...["alle", "jeder", "jedweder", "sämtlich"].map(
		(canonicalForm): DetSpecification => ({
			canonicalForm,
			coreFeatures: core({ pronType: "Tot" }),
			emojiDescription: "💯",
		}),
	),
	{
		canonicalForm: "beide",
		coreFeatures: core({ numType: "Card", pronType: "Tot" }),
		emojiDescription: "2️⃣",
	},
] satisfies readonly DetSpecification[]);

const lemmaAndReadingPairs = Object.freeze(
	specifications.map((specification) => {
		const lemma = fixedLemma(specification);
		return Object.freeze({
			lemma,
			reading: fixedReading(lemma, specification.emojiDescription),
		});
	}),
);

export const DE_LEXEME_DET_FIXED_LEMMA_CATALOG = Object.freeze({
	route: Object.freeze({
		language: "de",
		family: "Lexeme",
		kind: "DET",
	}),
	scope: FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
	coverage: "Complete",
	members: Object.freeze(lemmaAndReadingPairs.map(({ lemma }) => lemma)),
}) satisfies FixedLemmaCatalog<
	Readonly<{ language: "de"; family: "Lexeme"; kind: "DET" }>
>;

export const DE_LEXEME_DET_FIXED_READING_CATALOG = Object.freeze({
	scope: FIXED_CATALOG_SCOPE_DE_LEXEME_DET_V1,
	coverage: "Complete",
	members: Object.freeze(lemmaAndReadingPairs.map(({ reading }) => reading)),
}) satisfies FixedCatalog<DetReading>;

function fixedLemma(specification: DetSpecification): DetLemma {
	return deepFreeze({
		language: "de",
		family: "Lexeme",
		kind: "DET",
		canonicalForm: specification.canonicalForm,
		coreFeatures: specification.coreFeatures,
	} satisfies DetLemma);
}

function fixedReading(lemma: DetLemma, emojiDescription: string): DetReading {
	return deepFreeze({ lemma, emojiDescription } satisfies DetReading);
}

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		for (const member of Object.values(value)) deepFreeze(member);
		Object.freeze(value);
	}
	return value;
}
