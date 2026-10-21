/**
 * Every text the licence judge sends (ADR 0048, #1260), each a paragraph
 * that cites the dumcorpus Rules it states at the statement hash it was
 * last checked against (ADR 0037, #695).
 *
 * - The policy mirrors the Reading judge's (ADR 0031) and the translation
 *   judge's (ADR 0047): the forms are bare options, never the Readings
 *   that license them, beside the new Reading's Emoji Description and the
 *   marked Sentence.
 * - A question puts the stored forms and the forms Luna wrote for the new
 *   Reading side by side, in one order that hides which is which, so jev
 *   chooses between a form and its rival instead of judging a correct form
 *   alone, which it says yes to (#1230).
 * - Each option is a selection of those forms, so the judge can take one
 *   form of a Conditioned dimension or several of a Free one.
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
		"`reading` names one Reading of a German Lemma: `lemma` is its Canonical Form, `kind` its word class, and its `emojiDescription` names the Reading's one meaning. `markedSentence` marks one occurrence of it with <TARGET>…</TARGET>. Each question names one part of the paradigm (`part`) and lists, as `forms`, forms of that part a dictionary gives this word: some may be this meaning's, others another meaning's. Each option is a selection of those forms.",
		rules.meaning,
		rules.doublets,
	),
	takes: paragraph(
		"judge.takes",
		"Pick the option that lists exactly the forms a dictionary such as Duden or DWDS gives this meaning for the part. Pick several forms only when the dictionary gives them as alternatives of this one meaning, both in use, also when one is rarer or older («backen»: «backte» and «buk»).",
		rules.doublets,
		rules.principalParts,
	),
	conditioned: paragraph(
		"judge.conditioned",
		"Two forms of one part more often belong to two meanings than to one. Meanings of one German word often inflect differently, in a noun's plural («Bau»: «Bauten» for buildings, «Baue» for an animal's burrow) or in a verb's strong and weak forms («quellen»: «quoll» when water wells up, «quellte» when someone soaks peas). That a form is a correct form of the word is not enough: first recall the form this very meaning takes, then leave out every form the dictionary keeps to another meaning.",
		rules.doublets,
		rules.meaning,
	),
	evidence: paragraph(
		"judge.evidence",
		"The sentence shows which meaning is meant and nothing more: judge every form by what this meaning takes, whether or not the sentence uses it, and never by the scene.",
		rules.meaning,
	),
} as const;

/** The question every judged dimension is asked; its part and forms ride beside it. */
export const licenceQuestion = paragraph(
	"judge.question",
	"Which of `forms` does a dictionary give as the `part` of the meaning in `reading`?",
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

/** A plural marker as the judge's forms name it: what the marker says. */
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
