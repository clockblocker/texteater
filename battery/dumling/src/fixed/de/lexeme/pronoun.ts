import type {
	CoreFeaturesFor,
	Lemma,
	Reading,
} from "../../../types/public-types.js";
import type { FixedCatalog, FixedLemmaCatalog } from "../../catalog.js";

/** Learner-oriented German personal, reflexive, and substantive-possessive identities. */
export const FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1 =
	"de-Lexeme-PRON-personal-v1" as const;

type PronounLemma = Lemma<"de", "Lexeme", "PRON">;
type PronounReading = Reading<"de", "Lexeme", "PRON">;
type PronounCore = CoreFeaturesFor<"de", "Lexeme", "PRON">;

const EMPTY_CORE = Object.freeze({
	extPos: null,
	foreign: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
	referenceGender: null,
	referenceNumber: null,
}) satisfies PronounCore;

function core(overrides: Partial<PronounCore>): PronounCore {
	return { ...EMPTY_CORE, ...overrides };
}

type PronounSpecification = Readonly<{
	canonicalForm: string;
	coreFeatures: PronounCore;
	emojiDescription: "👤" | "❓" | "🚫" | "🪞" | "🔑" | "🌐";
}>;

type Reference = Readonly<{
	person: "1" | "2" | "3";
	polite?: "Form" | "Infm" | null;
	referenceGender?: "Fem" | "Masc" | "Neut" | null;
	referenceNumber: "Plur" | "Sing" | null;
}>;

function personal(
	canonicalForms: readonly string[],
	reference: Reference,
): PronounSpecification[] {
	return canonicalForms.map((canonicalForm) => ({
		canonicalForm,
		coreFeatures: core({
			person: reference.person,
			polite: reference.polite ?? null,
			poss: null,
			pronType: "Prs",
			referenceGender: reference.referenceGender ?? null,
			referenceNumber: reference.referenceNumber,
		}),
		emojiDescription: "👤",
	}));
}

function possessive(
	canonicalForm: string,
	reference: Reference,
): PronounSpecification {
	return {
		canonicalForm,
		coreFeatures: core({
			person: reference.person,
			polite: reference.polite ?? null,
			poss: "Yes",
			pronType: "Prs",
			referenceGender: reference.referenceGender ?? null,
			referenceNumber: reference.referenceNumber,
		}),
		emojiDescription: "🔑",
	};
}

function buildSpecifications(): readonly PronounSpecification[] {
	return Object.freeze([
		...personal(["ich", "mich", "mir", "meiner"], {
			person: "1",
			referenceNumber: "Sing",
		}),
		...personal(["du", "dich", "dir", "deiner"], {
			person: "2",
			polite: "Infm",
			referenceNumber: "Sing",
		}),
		...personal(["er", "ihn", "ihm", "seiner"], {
			person: "3",
			referenceGender: "Masc",
			referenceNumber: "Sing",
		}),
		...personal(["sie", "ihr", "ihrer"], {
			person: "3",
			referenceGender: "Fem",
			referenceNumber: "Sing",
		}),
		...personal(["es", "ihm", "seiner"], {
			person: "3",
			referenceGender: "Neut",
			referenceNumber: "Sing",
		}),
		...personal(["wir", "uns", "unser"], {
			person: "1",
			referenceNumber: "Plur",
		}),
		...personal(["ihr", "euch", "euer"], {
			person: "2",
			polite: "Infm",
			referenceNumber: "Plur",
		}),
		...personal(["sie", "ihnen", "ihrer"], {
			person: "3",
			referenceNumber: "Plur",
		}),
		...personal(["Sie", "Ihnen", "Ihrer"], {
			person: "2",
			polite: "Form",
			referenceNumber: "Sing",
		}),
		...personal(["Sie", "Ihnen", "Ihrer"], {
			person: "2",
			polite: "Form",
			referenceNumber: "Plur",
		}),
		{
			canonicalForm: "sich",
			coreFeatures: core({ person: "3", pronType: "Prs" }),
			emojiDescription: "🪞",
		},
		possessive("mein", { person: "1", referenceNumber: "Sing" }),
		possessive("dein", {
			person: "2",
			polite: "Infm",
			referenceNumber: "Sing",
		}),
		possessive("sein", {
			person: "3",
			referenceGender: "Masc",
			referenceNumber: "Sing",
		}),
		possessive("sein", {
			person: "3",
			referenceGender: "Neut",
			referenceNumber: "Sing",
		}),
		possessive("ihr", {
			person: "3",
			referenceGender: "Fem",
			referenceNumber: "Sing",
		}),
		possessive("ihr", { person: "3", referenceNumber: "Plur" }),
		possessive("unser", { person: "1", referenceNumber: "Plur" }),
		possessive("euer", {
			person: "2",
			polite: "Infm",
			referenceNumber: "Plur",
		}),
		possessive("Ihr", {
			person: "2",
			polite: "Form",
			referenceNumber: null,
		}),
		{
			canonicalForm: "alles",
			coreFeatures: core({ pronType: "Tot" }),
			emojiDescription: "🌐",
		},
		{
			canonicalForm: "alle",
			coreFeatures: core({ pronType: "Tot" }),
			emojiDescription: "🌐",
		},
		...(["wer", "wen", "wem", "wessen"] as const).map((canonicalForm) => ({
			canonicalForm,
			coreFeatures: core({ pronType: "Int" }),
			emojiDescription: "❓" as const,
		})),
		{
			canonicalForm: "jemand",
			coreFeatures: core({ pronType: "Ind" }),
			emojiDescription: "👤",
		},
		{
			canonicalForm: "niemand",
			coreFeatures: core({ pronType: "Neg" }),
			emojiDescription: "🚫",
		},
		{
			canonicalForm: "nichts",
			coreFeatures: core({ pronType: "Neg" }),
			emojiDescription: "🚫",
		},
		{
			canonicalForm: "jeder",
			coreFeatures: core({ pronType: "Tot" }),
			emojiDescription: "🌐",
		},
		{
			canonicalForm: "jedweder",
			coreFeatures: core({ pronType: "Tot" }),
			emojiDescription: "🌐",
		},
		{
			canonicalForm: "jeglicher",
			coreFeatures: core({ pronType: "Tot" }),
			emojiDescription: "🌐",
		},
		{
			canonicalForm: "keiner",
			coreFeatures: core({ pronType: "Neg" }),
			emojiDescription: "🚫",
		},
		{
			canonicalForm: "jedermann",
			coreFeatures: core({ pronType: "Tot" }),
			emojiDescription: "🌐",
		},
		{
			canonicalForm: "mancher",
			coreFeatures: core({ pronType: "Tot" }),
			emojiDescription: "🌐",
		},
		{
			canonicalForm: "mehrere",
			coreFeatures: core({ pronType: "Tot" }),
			emojiDescription: "🌐",
		},
		...(["Dem", "Rel"] as const).flatMap((pronType) =>
			["der", "die", "das", "den", "dem", "dessen", "deren", "denen"].map(
				(canonicalForm) => ({
					canonicalForm,
					coreFeatures: core({ pronType }),
					emojiDescription: "👤" as const,
				}),
			),
		),
	] satisfies readonly PronounSpecification[]);
}

let pairCache:
	| readonly Readonly<{ lemma: PronounLemma; reading: PronounReading }>[]
	| undefined;

function lemmaAndReadingPairs() {
	pairCache ??= Object.freeze(
		buildSpecifications().map((specification) => {
			const lemma = fixedLemma(specification);
			return Object.freeze({
				lemma,
				reading: fixedReading(lemma, specification.emojiDescription),
			});
		}),
	);
	return pairCache;
}

let lemmaMembersCache: readonly PronounLemma[] | undefined;
let readingMembersCache: readonly PronounReading[] | undefined;

export const DE_LEXEME_PRON_PERSONAL_FIXED_LEMMA_CATALOG = Object.freeze({
	route: Object.freeze({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
	}),
	scope: FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	coverage: "Curated",
	get members() {
		lemmaMembersCache ??= Object.freeze(
			lemmaAndReadingPairs().map(({ lemma }) => lemma),
		);
		return lemmaMembersCache;
	},
}) satisfies FixedLemmaCatalog<
	Readonly<{ language: "de"; family: "Lexeme"; kind: "PRON" }>
>;

export const DE_LEXEME_PRON_PERSONAL_FIXED_READING_CATALOG = Object.freeze({
	scope: FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	coverage: "Curated",
	get members() {
		readingMembersCache ??= Object.freeze(
			lemmaAndReadingPairs().map(({ reading }) => reading),
		);
		return readingMembersCache;
	},
}) satisfies FixedCatalog<PronounReading>;

function fixedLemma(specification: PronounSpecification): PronounLemma {
	return Object.freeze({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm: specification.canonicalForm,
		coreFeatures: Object.freeze(specification.coreFeatures),
	} satisfies PronounLemma);
}

function fixedReading(
	lemma: PronounLemma,
	emojiDescription: PronounSpecification["emojiDescription"],
): PronounReading {
	return Object.freeze({ lemma, emojiDescription } satisfies PronounReading);
}
