import type * as Dumling from "dumling/types";
import { normalizeText } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { DumgenFailure } from "../../../universal/failure.js";
import { choice } from "../../../universal/questions.js";
import { infinitiveShaped } from "../grammatical-resolution/infinitive-shape.js";

/**
 * What the model names for an adjectival participle's form: the verb whose
 * participle it is, with its separable prefix.
 */
export type ParticipleFormDraft = {
	readonly source: string;
	readonly separablePrefix: string | null;
	/** The verb's third person singular Präteritum, evidence for the form check. */
	readonly preterite: string;
};

/** A form draft with the meaning the judgment settled for this Reading. */
export type ParticipleSourceDraft = ParticipleFormDraft & {
	readonly meaning: Dumrel.ParticipleMeaning;
};

/**
 * The first of two questions (ADR 0036): the form alone names the verb, the
 * same for every Reading of the adjective. The model also spells the verb's
 * participle, so code checks the form.
 */
export const participleFormPrompt =
	"Say which German verb the fixed exact ADJ Reading's Canonical Form is a participle of, by form alone. The Canonical Form is a participle when it is, letter for letter, the Partizip II or the Partizip I of a German verb. Its meaning does not matter: a participle whose meaning moved away from its verb still names that verb (geschickt 'skilful': schicken; erhaben 'sublime': erheben). " +
	"Return the verb's principal parts in order. source: its dictionary infinitive, lowercase, with sich when the verb is reflexive in the sense the adjective comes from (erholt: sich erholen); separablePrefix: its separable prefix, else null; preterite: its third person singular Präteritum; participle: its Partizip II, or its Partizip I for an adjective in -end, which equals the Canonical Form. Examples: abgefahren: abfahren, ab, fuhr ab, abgefahren; erhaben: erheben, null, erhob, erhaben; lachend: lachen, null, lachte, lachend. " +
	"The source is an infinitive, so it is never the adjective itself, except for a verb whose Partizip II is spelled like its infinitive (verlassen: verlassen). " +
	"Return all four null for a plain adjective (rot, fleißig), an un- form (ungewaschen), and a word no verb builds as its participle, even when a verb is spelled like it (bescheiden 'modest': the verb bescheiden builds beschieden).";

export const participleFormOutputSchema = {
	type: "object",
	properties: {
		source: { type: ["string", "null"] },
		separablePrefix: { type: ["string", "null"] },
		preterite: { type: ["string", "null"] },
		participle: { type: ["string", "null"] },
	},
	required: ["source", "separablePrefix", "preterite", "participle"],
	additionalProperties: false,
} as const;

/**
 * Checks the generated verb by form alone: is the adjective that verb's
 * participle? Its state holds no sentence, so no meaning can sway it.
 */
export function participleFormQuestion(
	adjective: string,
	form: ParticipleFormDraft,
) {
	const verb = form.source;
	return {
		form: choice(
			`A proposer claims the German verb ${verb} (Präteritum ${form.preterite}) has ${adjective} as its participle. Check the claim by conjugating ${verb} yourself: is ${verb} a German verb, and is ${adjective}, letter for letter, its Partizip II or its Partizip I? Compare spellings only: geschickt is the Partizip II of schicken, erhaben of erheben, verlassen of verlassen, and lachend the Partizip I of lachen. A word spelled like the verb's infinitive counts only when the verb builds its Partizip II that way: the verb bescheiden builds beschieden, so bescheiden is not its participle.`,
			{
				Participle: `${adjective} is a participle of ${verb}`,
				NotParticiple: `${verb} builds no participle spelled ${adjective}, or is no German verb`,
				Unresolved: "Cannot defensibly decide",
			},
		),
	};
}

/**
 * The second question, asked per Reading once the form names a verb: is this
 * Reading's meaning a sense of that verb?
 */
export function participleMeaningQuestion(verb: string) {
	return {
		meaning: choice(
			`The fixed ADJ Reading's form is a participle of the verb ${verb}. Is its meaning in this sentence, anchored by its emojiDescription, a sense of ${verb}? Test it by paraphrasing the sentence with ${verb}: die gekochten Eier are eggs someone has cooked; ein geschickter Handwerker is skilful, not sent (schicken).`,
			{
				Verbal: `The adjective here means an action or resulting state of a sense ${verb} has today, figurative senses included: ein aufgeregtes Kind is a child something has excited (aufregen); ein gesetzter 🪑 Gast has been seated (setzen).`,
				Drifted: `No sense of ${verb} paraphrases this meaning; the verb only explains the form: ein erhabener Anblick is sublime, not raised (erheben); ein gesetzter 🧓 Herr is staid, not seated (setzen).`,
				Unresolved: "Cannot defensibly decide",
			},
		),
	};
}

/**
 * Validates the model's form answer. The source must be infinitive-shaped and
 * a separable prefix must open the verb without being all of it; anything
 * else is invalid output, not a missing source. A participle that is not the
 * adjective's Canonical Form means no verb builds that form (`verlegen`
 * 'embarrassed': the verb `verlegen` builds `verlegt`), so there is no source.
 */
export function parseParticipleForm(
	output: unknown,
	adjective: string,
	route: string,
): ParticipleFormDraft | null {
	const invalid = (message: string) =>
		new DumgenFailure(
			"InvalidModelOutput",
			"produceKnowledge",
			message,
			route,
		);
	const fields = ["source", "separablePrefix", "preterite", "participle"];
	if (
		!output ||
		typeof output !== "object" ||
		Object.keys(output).length !== fields.length ||
		fields.some((field) => !(field in output))
	)
		throw invalid(
			"Expected only source, separablePrefix, preterite and participle",
		);
	const { source, separablePrefix, preterite, participle } = output as Record<
		string,
		unknown
	>;
	if (source === null) {
		if (
			separablePrefix !== null ||
			preterite !== null ||
			participle !== null
		)
			throw invalid("Only a source verb has principal parts");
		return null;
	}
	if (typeof preterite !== "string")
		throw invalid("Expected the source verb's preterite");
	if (typeof source !== "string" || !infinitiveShaped(normalizeText(source)))
		throw invalid("Expected an infinitive-shaped source verb");
	if (typeof participle !== "string")
		throw invalid("Expected the source verb's participle");
	if (normalizeText(participle) !== normalizeText(adjective)) return null;
	const verb = normalizeText(source);
	const parts = { source: verb, preterite: normalizeText(preterite) };
	if (separablePrefix === null) return { ...parts, separablePrefix };
	if (typeof separablePrefix !== "string")
		throw invalid("Expected a separable prefix or null");
	const prefix = normalizeText(separablePrefix);
	const stem = verb.startsWith("sich ") ? verb.slice("sich ".length) : verb;
	if (!prefix || !stem.startsWith(prefix) || stem === prefix)
		throw invalid("The separable prefix must open the source verb");
	return { ...parts, separablePrefix: prefix };
}

/**
 * The VERB Lemma a draft names. Its Core Features follow the same shape
 * Grammatical Resolution gives the verb (`sich verlieben` is
 * lexicallyReflexive, `umstürzen` has prefix `um`), so the claim joins the
 * verb's own Readings.
 */
export function participleSourceLemma(
	draft: ParticipleFormDraft,
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
