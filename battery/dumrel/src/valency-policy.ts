import type * as Dumling from "dumling/types";
import type { ValencyComplement } from "./types.js";

type ComplementKind = ValencyComplement["kind"];
type RoutePolicy = Readonly<
	Record<string, Readonly<Record<string, readonly ComplementKind[]>>>
>;

const caseOrPreposition = ["Case", "Preposition"] as const;

/**
 * The complements each language × Family × Kind route lets its Valency Frame
 * hold, chosen per route the way ADR 0032 chooses Core Features. A route
 * missing here takes no frame. German nouns take only governed prepositions
 * (`Angst vor`); their bare cases are attributes, not valency.
 */
const valencyPolicy: Partial<Record<Dumling.Language, RoutePolicy>> = {
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
};

/** The complement kinds a Reading of this Lemma's route may hold; empty takes no frame. */
export function allowedComplementKinds(
	lemma: Pick<Dumling.Lemma, "language" | "family" | "kind">,
): readonly ComplementKind[] {
	return valencyPolicy[lemma.language]?.[lemma.family]?.[lemma.kind] ?? [];
}
