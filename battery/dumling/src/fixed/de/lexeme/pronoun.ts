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
	emojiDescription: "👤" | "🪞" | "🔑";
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

const specifications = Object.freeze([
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
] satisfies readonly PronounSpecification[]);

const lemmaAndReadingPairs = Object.freeze(
	specifications.map((specification) => {
		const lemma = fixedLemma(specification);
		return Object.freeze({
			lemma,
			reading: fixedReading(lemma, specification.emojiDescription),
		});
	}),
);

export const DE_LEXEME_PRON_PERSONAL_FIXED_LEMMA_CATALOG = Object.freeze({
	route: Object.freeze({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
	}),
	scope: FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	coverage: "Curated",
	members: Object.freeze(lemmaAndReadingPairs.map(({ lemma }) => lemma)),
}) satisfies FixedLemmaCatalog<
	Readonly<{ language: "de"; family: "Lexeme"; kind: "PRON" }>
>;

export const DE_LEXEME_PRON_PERSONAL_FIXED_READING_CATALOG = Object.freeze({
	scope: FIXED_POPULATION_SCOPE_DE_LEXEME_PRON_PERSONAL_V1,
	coverage: "Curated",
	members: Object.freeze(lemmaAndReadingPairs.map(({ reading }) => reading)),
}) satisfies FixedCatalog<PronounReading>;

function fixedLemma(specification: PronounSpecification): PronounLemma {
	return deepFreeze({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm: specification.canonicalForm,
		coreFeatures: specification.coreFeatures,
	} satisfies PronounLemma);
}

function fixedReading(
	lemma: PronounLemma,
	emojiDescription: PronounSpecification["emojiDescription"],
): PronounReading {
	return deepFreeze({ lemma, emojiDescription } satisfies PronounReading);
}

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		for (const member of Object.values(value)) deepFreeze(member);
		Object.freeze(value);
	}
	return value;
}
