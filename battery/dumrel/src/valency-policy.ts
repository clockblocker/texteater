import type * as Dumling from "dumling/types";
import type {
	EnglishValencyComplement,
	GermanValencyComplement,
	HebrewValencyComplement,
	ValencyComplement,
} from "./types.js";

type ComplementKind = ValencyComplement["kind"];
/** Each language's complement vocabulary; a language missing here takes no frame. */
type ComplementsByLanguage = {
	de: GermanValencyComplement;
	he: HebrewValencyComplement;
	en: EnglishValencyComplement;
};
type RoutePolicy<Kind extends ComplementKind> = Readonly<
	Record<string, Readonly<Record<string, readonly Kind[]>>>
>;

const germanVerbComplements = [
	"Case",
	"Preposition",
	"Adverbial",
	"Predicative",
	"Clause",
] as const;
const germanAdjectiveComplements = [
	"Case",
	"Preposition",
	"Adverbial",
	"Clause",
] as const;
const germanNounComplements = ["Preposition", "Clause"] as const;
const functionOrPreposition = [
	"Subject",
	"DirectObject",
	"Preposition",
] as const;
const positionOrPreposition = [
	"Subject",
	"DirectObject",
	"IndirectObject",
	"Preposition",
] as const;

/**
 * The complements each language × Family × Kind route lets its Valency Frame
 * hold, chosen per route the way ADR 0032 chooses Core Features. A route
 * missing here takes no frame. German verbs take every German kind; adjectives
 * all but Predicative. German nouns take governed prepositions (`Angst vor`)
 * and clauses, beside a preposition (`die Freude darauf, dass …`) or alone
 * (`der Versuch, etw zu tun`); their bare cases are attributes, not valency.
 * A Locution route takes the frame of the Lexeme route with its Kind (ADR
 * 0039): `Angst haben vor`. Hebrew mirrors the German choices with its own
 * complements: nouns take only governed prepositions, and it has no framed
 * Locution route yet. English makes the same choices with its own complements.
 */
const valencyPolicy: {
	readonly [L in keyof ComplementsByLanguage]: RoutePolicy<
		ComplementsByLanguage[L]["kind"]
	>;
} = {
	de: {
		Lexeme: {
			VERB: germanVerbComplements,
			ADJ: germanAdjectiveComplements,
			NOUN: germanNounComplements,
		},
		Locution: {
			VERB: germanVerbComplements,
			ADJ: germanAdjectiveComplements,
			NOUN: germanNounComplements,
		},
	},
	he: {
		Lexeme: {
			VERB: functionOrPreposition,
			ADJ: functionOrPreposition,
			NOUN: ["Preposition"],
		},
	},
	en: {
		Lexeme: {
			VERB: positionOrPreposition,
			ADJ: positionOrPreposition,
			NOUN: ["Preposition"],
		},
		Locution: {
			VERB: positionOrPreposition,
			NOUN: ["Preposition"],
		},
	},
};

/** The complement kinds a Reading of this Lemma's route may hold; empty takes no frame. */
export function allowedComplementKinds(
	lemma: Pick<Dumling.Lemma, "language" | "family" | "kind">,
): readonly ComplementKind[] {
	const policy: Partial<
		Record<Dumling.Language, RoutePolicy<ComplementKind>>
	> = valencyPolicy;
	return policy[lemma.language]?.[lemma.family]?.[lemma.kind] ?? [];
}
