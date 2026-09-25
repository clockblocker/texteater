import type * as Dumling from "dumling/types";
import { normalizeText } from "dumrel";
import { DumgenFailure } from "../../../universal/failure.js";
import { infinitiveShaped } from "../grammatical-resolution/infinitive-shape.js";

/** What the model names for an adjectival participle: its verb, or null. */
export type ParticipleSourceDraft = {
	readonly source: string;
	readonly separablePrefix: string | null;
};

export const participleSourcePrompt =
	"Name the verb the fixed exact German ADJ Reading in its marked context is a participle of. Decide by the adjective's form: if it is the Partizip I or Partizip II of a German verb, return that verb's dictionary infinitive as source, lowercase, with sich when the verb is reflexive in the sense the adjective comes from (erholt: sich erholen), and its separable prefix as separablePrefix, else null (abgerissen: abreißen, ab). A lexicalized participle still names its verb (überzeugend: überzeugen; gelassen: lassen). Return {source:null,separablePrefix:null} for an adjective that is no participle form of a living verb: a plain adjective (rot, fleißig), an un- form (ungewaschen) or a word only historically related to a verb. Never return the adjective itself, a noun or a phrase.";

export const participleSourceOutputSchema = {
	type: "object",
	properties: {
		source: { type: ["string", "null"] },
		separablePrefix: { type: ["string", "null"] },
	},
	required: ["source", "separablePrefix"],
	additionalProperties: false,
} as const;

/**
 * Validates the model's answer. The source must be infinitive-shaped and a
 * separable prefix must open the verb without being all of it; anything else
 * is invalid output, not a missing source.
 */
export function parseParticipleSource(
	output: unknown,
	route: string,
): ParticipleSourceDraft | null {
	const invalid = (message: string) =>
		new DumgenFailure(
			"InvalidModelOutput",
			"produceKnowledge",
			message,
			route,
		);
	if (
		!output ||
		typeof output !== "object" ||
		Object.keys(output).length !== 2 ||
		!("source" in output) ||
		!("separablePrefix" in output)
	)
		throw invalid("Expected only source and separablePrefix");
	const { source, separablePrefix } = output as Record<string, unknown>;
	if (source === null) {
		if (separablePrefix !== null)
			throw invalid("A separable prefix needs a source verb");
		return null;
	}
	if (typeof source !== "string" || !infinitiveShaped(normalizeText(source)))
		throw invalid("Expected an infinitive-shaped source verb");
	const verb = normalizeText(source);
	if (separablePrefix === null) return { source: verb, separablePrefix };
	if (typeof separablePrefix !== "string")
		throw invalid("Expected a separable prefix or null");
	const prefix = normalizeText(separablePrefix);
	const stem = verb.startsWith("sich ") ? verb.slice("sich ".length) : verb;
	if (!prefix || !stem.startsWith(prefix) || stem === prefix)
		throw invalid("The separable prefix must open the source verb");
	return { source: verb, separablePrefix: prefix };
}

/**
 * The VERB Lemma a draft names. Its Core Features follow the same shape
 * Grammatical Resolution gives the verb (`sich verlieben` is
 * lexicallyReflexive, `umstürzen` has prefix `um`), so the claim joins the
 * verb's own Readings.
 */
export function participleSourceLemma(
	draft: ParticipleSourceDraft,
): Dumling.Lemma<"de", "Lexeme", "VERB"> {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: draft.source,
		coreFeatures: {
			hasSepPrefix: draft.separablePrefix,
			lexicallyReflexive: draft.source.startsWith("sich ") ? "Yes" : null,
			verbType: null,
		},
	};
}
