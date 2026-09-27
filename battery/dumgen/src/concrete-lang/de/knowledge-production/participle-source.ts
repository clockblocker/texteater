import type * as Dumling from "dumling/types";
import { normalizeText, participleMeaningValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { DumgenFailure } from "../../../universal/failure.js";
import { infinitiveShaped } from "../grammatical-resolution/infinitive-shape.js";

/**
 * What the model names for an adjectival participle: the verb its form comes
 * from and whether this Reading's meaning is a sense of that verb, or null.
 */
export type ParticipleSourceDraft = {
	readonly source: string;
	readonly separablePrefix: string | null;
	readonly meaning: Dumrel.ParticipleMeaning;
};

/**
 * Two separate questions (ADR 0036): the form names the verb for every
 * Reading of the adjective, and the Reading's sense decides its meaning.
 */
export const participleSourcePrompt =
	"The fixed exact German ADJ Reading in its marked context may be a participle. Answer two separate questions. First, source, by form alone: if the adjective's Canonical Form is the Partizip I or Partizip II of a German verb, return that verb's dictionary infinitive as source, lowercase, with sich when the verb is reflexive in the sense the adjective comes from (erholt: sich erholen), and its separable prefix as separablePrefix, else null (abgerissen: abreißen, ab). The form decides even when the adjective's meaning has moved far from the verb (geschickt: schicken; erhaben: erheben; abgefahren: abfahren, ab). Return {source:null,separablePrefix:null,meaning:null} for a plain adjective (rot, fleißig), an un- form (ungewaschen), and a word the verb does not build as its participle (bescheiden 'modest': the verb bescheiden forms beschieden). Never return the adjective itself, a noun or a phrase. Second, meaning, by this Reading's sense, whose anchor is its emojiDescription: Verbal when the Reading means the action or resulting state of a sense the verb has, figurative senses included (gekocht: kochen; aufgeregt: aufregen; gesetzt 🪑 'seated': setzen), and Drifted when no sense of the verb means it (geschickt 'skilful': schicken; gesetzt 🧓 'staid': setzen; erhaben 'sublime': erheben). One adjective's Readings can differ in meaning while sharing the source.";

export const participleSourceOutputSchema = {
	type: "object",
	properties: {
		source: { type: ["string", "null"] },
		separablePrefix: { type: ["string", "null"] },
		meaning: {
			anyOf: [
				{ type: "string", enum: ["Verbal", "Drifted"] },
				{ type: "null" },
			],
		},
	},
	required: ["source", "separablePrefix", "meaning"],
	additionalProperties: false,
} as const;

/**
 * Validates the model's answer. The source must be infinitive-shaped, a
 * separable prefix must open the verb without being all of it, and a source
 * needs a meaning; anything else is invalid output, not a missing source.
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
		Object.keys(output).length !== 3 ||
		!("source" in output) ||
		!("separablePrefix" in output) ||
		!("meaning" in output)
	)
		throw invalid("Expected only source, separablePrefix and meaning");
	const { source, separablePrefix, meaning } = output as Record<
		string,
		unknown
	>;
	if (source === null) {
		if (separablePrefix !== null || meaning !== null)
			throw invalid("A separable prefix or meaning needs a source verb");
		return null;
	}
	if (typeof source !== "string" || !infinitiveShaped(normalizeText(source)))
		throw invalid("Expected an infinitive-shaped source verb");
	if (!participleMeaningValues.includes(meaning as Dumrel.ParticipleMeaning))
		throw invalid("Expected a Verbal or Drifted meaning");
	const verb = normalizeText(source);
	const drafted = {
		source: verb,
		meaning: meaning as Dumrel.ParticipleMeaning,
	};
	if (separablePrefix === null) return { ...drafted, separablePrefix };
	if (typeof separablePrefix !== "string")
		throw invalid("Expected a separable prefix or null");
	const prefix = normalizeText(separablePrefix);
	const stem = verb.startsWith("sich ") ? verb.slice("sich ".length) : verb;
	if (!prefix || !stem.startsWith(prefix) || stem === prefix)
		throw invalid("The separable prefix must open the source verb");
	return { ...drafted, separablePrefix: prefix };
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

/** The Participle Source a draft names: its verb's Lemma and its meaning. */
export function participleSourceValue(
	draft: ParticipleSourceDraft,
): Dumrel.ParticipleSource {
	return { verb: participleSourceLemma(draft), meaning: draft.meaning };
}
