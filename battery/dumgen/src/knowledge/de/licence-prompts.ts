/**
 * Every text the licence judge sends (ADR 0048, #1230), each a paragraph
 * that cites the dumcorpus Rules it states at the statement hash it was
 * last checked against (ADR 0037, #695).
 *
 * - The policy mirrors the Reading judge's (ADR 0031) and the translation
 *   judge's (ADR 0047): the stored forms of the Lemma's Paradigm are bare
 *   options, never the Readings that license them, beside the new
 *   Reading's Emoji Description and the marked Sentence.
 * - Each stored form is one yes-or-no question, so the judge can take
 *   both forms of a Free dimension, one of a Conditioned one, or none,
 *   which is NoMatch.
 * - It cites the German Doublet Rule, whose gold scores it.
 *
 * German examples are quoted «…», so the disjointness test can read them;
 * none is a Lemma of the Knowledge gold or the spot-check samples (#693).
 */
import type { CitingPrompt } from "dumcorpus/types";
import type * as Dumrel from "dumrel/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";

/** The Rules the licence judge cites, at the statement hashes it was checked against. */
const rules = {
	meaning: ["de/emoji-description-names-the-meaning", "5532d94dbbc3bb71"],
	doublets: ["de/meaning-conditioned-paradigm-doublets", "0881d666fc1f106a"],
	principalParts: [
		"de/principal-parts-as-the-dictionary-cites",
		"3757ab1bafee87f5",
	],
} as const satisfies Readonly<Record<string, Cite>>;

const registry = paragraphRegistry("de/paradigm-licence");
const { paragraph } = registry;

/** The policy block the judge reads in its state, once per request. */
export const licencePolicy = {
	task: paragraph(
		"judge.task",
		"`reading` names one Reading of a German Lemma: `lemma` is its Canonical Form, `kind` its word class, and its `emojiDescription` names the Reading's one meaning. `markedSentence` marks one occurrence of it with <TARGET>…</TARGET>. The Lemma has other meanings too, and its dictionary entry already holds forms of them. Each question names one stored form, the part of the paradigm it fills (`part`) and the form (`form`).",
		rules.meaning,
		rules.doublets,
	),
	takes: paragraph(
		"judge.takes",
		"Answer yes when standard German uses the form for this meaning, as Duden or DWDS give the form for it. When the dictionary gives two forms of one part for this meaning, both used, this meaning takes both: answer yes for each, also when one is rarer or older.",
		rules.doublets,
		rules.principalParts,
	),
	conditioned: paragraph(
		"judge.conditioned",
		"Answer no when the dictionary keeps the form to another meaning of the Lemma: meanings of one word may inflect differently («Bau»: «Bauten» for buildings, «Baue» for an animal's burrow; «quellen»: «quoll» when water wells up, «quellte» when someone soaks peas). A form this meaning never takes stays no, however close the meanings are.",
		rules.doublets,
		rules.meaning,
	),
	evidence: paragraph(
		"judge.evidence",
		"The sentence shows which meaning is meant and nothing more: judge every form by what this meaning takes, whether or not the sentence uses it, and never by the scene.",
		rules.meaning,
	),
} as const;

/** The question every stored form is asked; the form rides beside it. */
export const licenceQuestion = paragraph(
	"judge.question",
	"Does the meaning in `reading` take this `form` as its `part`?",
	rules.doublets,
);

/** Each Variation Dimension as the judge's `part` names it. */
export const dimensionParts: Readonly<Record<Dumrel.DimensionId, string>> = {
	plural: paragraph(
		"part.plural",
		"the nominative plural (Nominativ Plural)",
		rules.doublets,
	),
	preterite: paragraph(
		"part.preterite",
		"the third person singular Präteritum (er …)",
		rules.principalParts,
	),
	present1: paragraph(
		"part.present1",
		"the first person singular Präsens (ich …)",
		rules.principalParts,
	),
	present2: paragraph(
		"part.present2",
		"the second person singular Präsens (du …)",
		rules.principalParts,
	),
	present3: paragraph(
		"part.present3",
		"the third person singular Präsens (er …)",
		rules.principalParts,
	),
	pastParticiple: paragraph(
		"part.pastParticiple",
		"the Partizip II",
		rules.principalParts,
	),
	subjunctivePast: paragraph(
		"part.subjunctivePast",
		"the third person singular Konjunktiv II (er …)",
		rules.principalParts,
	),
};

/** A plural marker as the judge's `form` names it: what the marker says. */
export const markerForms: Readonly<Record<string, string>> = {
	NoPlural: paragraph(
		"form.NoPlural",
		"no plural: the noun is used in the singular only",
		rules.doublets,
	),
	PluralOnly: paragraph(
		"form.PluralOnly",
		"no singular: the noun is used in the plural only",
		rules.doublets,
	),
};

/** Every registered paragraph, as dumcorpus's citation check reads it. */
export function licencePromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}

/** The German examples the paragraphs quote, for the disjointness test (#693). */
export function licenceExamples(): readonly string[] {
	return registry.examples();
}
