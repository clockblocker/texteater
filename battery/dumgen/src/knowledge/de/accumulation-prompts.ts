/**
 * Every text `knowledge.accumulateTranslations` sends (ADR 0047), each a
 * paragraph that cites the dumcorpus Rules it states at the statement hash
 * it was last checked against (ADR 0037, #695).
 *
 * - jev's policy and question mirror the Reading judge's (ADR 0031): the
 *   stored translations are bare options beside the marked Sentence, and
 *   NoMatch says the target needs an equivalent none of them gives.
 * - Luna's prompt is the translation prompt with its task narrowed to the
 *   marked occurrence: how a natural translation of the Sentence renders
 *   the target. It never carries the stored translations, so an answer
 *   they already hold shows the judge was wrong.
 */
import type { CitingPrompt } from "dumcorpus/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";
import { translation } from "./prompts.js";

/** The Rules the accumulation prompts cite, at the statement hashes they were checked against. */
const rules = {
	meaning: ["de/emoji-description-names-the-meaning", "5532d94dbbc3bb71"],
	translation: ["de/translation-gives-the-equivalent", "51e2aee5b7c8f087"],
	distinct: [
		"de/distinct-concepts-get-distinct-readings",
		"500ad6b7f0020325",
	],
} as const satisfies Readonly<Record<string, Cite>>;

const registry = paragraphRegistry("de/translation-accumulation");
const { paragraph } = registry;

// The judge (jev): the policy block it reads beside the stored translations.

export const coveragePolicy = {
	task: paragraph(
		"judge.task",
		"`reading` names one Reading of a German Lemma: `lemma` is its Canonical Form, and its `emojiDescription` names the Reading's one meaning. `markedSentence` marks one occurrence of it with <TARGET>…</TARGET>. Each option is one translation of the Reading into `language` (en: English, ru: Russian) that its dictionary entry already gives.",
		rules.translation,
		rules.meaning,
	),
	covers: paragraph(
		"judge.covers",
		"Picture the natural translation of the whole sentence into `language`, as a good translator writes it for a reader, not a word-for-word gloss. An option covers the occurrence when that translation renders the target with it, in this form or another form of the same word: another tense, person, number, case or degree.",
		rules.translation,
	),
	noMatch: paragraph(
		"judge.noMatch",
		"When that translation renders the target with a word or phrase none of the options is, answer NoMatch rather than take the nearest option, also when an option is what a gloss of the German word would give, and also when there is only one option. An option a natural translation would avoid here does not cover it.",
		rules.translation,
		rules.distinct,
	),
} as const;

export const coverageQuestion = {
	question: paragraph(
		"judge.question",
		"Which option renders the target in the natural translation of this sentence into `language`? NoMatch if that translation renders it with a word or phrase no option is.",
		rules.translation,
	),
	noMatch: paragraph(
		"judge.question.NoMatch",
		"The natural translation renders the target with a word or phrase no option is",
		rules.translation,
	),
} as const;

// Luna's writer: the translation prompt, narrowed to the occurrence.

const occurrenceReading = paragraph(
	"writer.reading",
	"`reading` names one Reading of a German Lemma: `lemma` is its Canonical Form, `kind` its word class and `family` whether it is a word (Lexeme), a multiword expression (Locution) or a Saying. Its `emojiDescription`, one to four emoji, labels the Reading's meaning, and `markedSentence` marks one occurrence of it with <TARGET>…</TARGET>, which has that meaning.",
	rules.meaning,
);

const occurrenceTask = paragraph(
	"writer.task",
	"First write `sentence`: the natural translation of `markedSentence` into `language` (en: English, ru: Russian), as a good translator writes it for a reader, not a word-for-word gloss. Then write `equivalents`: the words or phrases that translation renders the marked words with. Translate what the target does in this sentence, never the meaning of a neighbouring word, and never another meaning of the German word the sentence does not use.",
	rules.translation,
	rules.meaning,
);

const occurrenceOutput = paragraph(
	"writer.output",
	"Answer with a JSON object: `sentence`, the translation, and `equivalents`, an array of the one equivalent it uses, or up to three when the target has several equally usual renderings here, the one in `sentence` first; each a word or a short phrase in its dictionary headword form, never a sentence.",
	rules.translation,
);

/** Luna's system prompt, the same for every occurrence so the provider can cache it. */
export const occurrenceTranslationPrompt = [
	occurrenceReading,
	occurrenceTask,
	translation.citation,
	translation.form,
	translation.multiword,
	occurrenceOutput,
].join("\n");

/** Every registered paragraph, as dumcorpus's citation check reads it. */
export function accumulationPromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}
