import type { Lemma, Reading } from "../../../types/public-types.js";
import type { FixedCatalog, FixedLemmaCatalog } from "../../catalog.js";

/** Complete native German AUX inventory with promoted present-tense sein forms. */
export const FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1 = "de-Lexeme-AUX-v1" as const;

type AuxLemma = Lemma<"de", "Lexeme", "AUX">;
type AuxReading = Reading<"de", "Lexeme", "AUX">;

type AuxSpecification = Readonly<{
	canonicalForm: string;
	verbType: "Mod" | null;
	emojiDescription: string;
}>;

const specifications = Object.freeze([
	...["sein", "bin", "bist", "ist", "sind", "seid"].map(
		(canonicalForm): AuxSpecification => ({
			canonicalForm,
			verbType: null,
			emojiDescription: "🟰",
		}),
	),
	{ canonicalForm: "haben", verbType: null, emojiDescription: "🤲" },
	{ canonicalForm: "werden", verbType: null, emojiDescription: "🔄" },
	{ canonicalForm: "dürfen", verbType: "Mod", emojiDescription: "✅" },
	{ canonicalForm: "können", verbType: "Mod", emojiDescription: "💪" },
	{ canonicalForm: "mögen", verbType: "Mod", emojiDescription: "❤️" },
	{ canonicalForm: "müssen", verbType: "Mod", emojiDescription: "⚠️" },
	{ canonicalForm: "sollen", verbType: "Mod", emojiDescription: "📋" },
	{ canonicalForm: "wollen", verbType: "Mod", emojiDescription: "🎯" },
] satisfies readonly AuxSpecification[]);

const lemmaAndReadingPairs = Object.freeze(
	specifications.map((specification) => {
		const lemma = fixedLemma(specification);
		return Object.freeze({
			lemma,
			reading: fixedReading(lemma, specification.emojiDescription),
		});
	}),
);

export const DE_LEXEME_AUX_FIXED_LEMMA_CATALOG = Object.freeze({
	route: Object.freeze({
		language: "de",
		family: "Lexeme",
		kind: "AUX",
	}),
	scope: FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
	coverage: "Complete",
	members: Object.freeze(lemmaAndReadingPairs.map(({ lemma }) => lemma)),
}) satisfies FixedLemmaCatalog<
	Readonly<{ language: "de"; family: "Lexeme"; kind: "AUX" }>
>;

export const DE_LEXEME_AUX_FIXED_READING_CATALOG = Object.freeze({
	scope: FIXED_CATALOG_SCOPE_DE_LEXEME_AUX_V1,
	coverage: "Complete",
	members: Object.freeze(lemmaAndReadingPairs.map(({ reading }) => reading)),
}) satisfies FixedCatalog<AuxReading>;

function fixedLemma(specification: AuxSpecification): AuxLemma {
	return deepFreeze({
		language: "de",
		family: "Lexeme",
		kind: "AUX",
		canonicalForm: specification.canonicalForm,
		coreFeatures: { verbType: specification.verbType },
	} satisfies AuxLemma);
}

function fixedReading(lemma: AuxLemma, emojiDescription: string): AuxReading {
	return deepFreeze({ lemma, emojiDescription } satisfies AuxReading);
}

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		for (const member of Object.values(value)) deepFreeze(member);
		Object.freeze(value);
	}
	return value;
}
