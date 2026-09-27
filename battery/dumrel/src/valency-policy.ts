import type * as Dumling from "dumling/types";
import type {
	GermanValencyComplement,
	HebrewValencyComplement,
	ValencyComplement,
} from "./types.js";

type ComplementKind = ValencyComplement["kind"];
/** Each language's complement vocabulary; a language missing here takes no frame. */
type ComplementsByLanguage = {
	de: GermanValencyComplement;
	he: HebrewValencyComplement;
};
type RoutePolicy<Kind extends ComplementKind> = Readonly<
	Record<string, Readonly<Record<string, readonly Kind[]>>>
>;

const caseOrPreposition = ["Case", "Preposition"] as const;
const functionOrPreposition = [
	"Subject",
	"DirectObject",
	"Preposition",
] as const;

/**
 * The complements each language × Family × Kind route lets its Valency Frame
 * hold, chosen per route the way ADR 0032 chooses Core Features. A route
 * missing here takes no frame. German nouns take only governed prepositions
 * (`Angst vor`); their bare cases are attributes, not valency. Hebrew mirrors
 * the German choices with its own complements: nouns take only governed
 * prepositions, and Idiom is its one framed Phraseme route, since Hebrew has
 * no Collocation route.
 */
const valencyPolicy: {
	readonly [L in keyof ComplementsByLanguage]: RoutePolicy<
		ComplementsByLanguage[L]["kind"]
	>;
} = {
	de: {
		Lexeme: {
			VERB: caseOrPreposition,
			ADJ: caseOrPreposition,
			NOUN: ["Preposition"],
		},
		Phraseme: {
			Collocation: caseOrPreposition,
			Idiom: caseOrPreposition,
		},
	},
	he: {
		Lexeme: {
			VERB: functionOrPreposition,
			ADJ: functionOrPreposition,
			NOUN: ["Preposition"],
		},
		Phraseme: {
			Idiom: functionOrPreposition,
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
