/**
 * The translation prompt's paragraphs, which Knowledge Production's
 * translation call sends and `knowledge.accumulateTranslations`'s writer
 * reuses, each citing the dumcorpus Rules it states at the statement hash it
 * was last checked against (ADR 0037, #695). They register under
 * `de/knowledge`, as the other Knowledge paragraphs do.
 *
 * - There is one translation prompt; the language comes in the input
 *   (#697), and its citation-form clause is part of it (#518).
 * - Each equivalent comes as Translation Pieces (Dumrel, ADR 0055): the
 *   call writes the target language's own preposition and slot, never the
 *   German one's.
 *
 * German examples are quoted «…», so the disjointness test can read them;
 * none is a Lemma of the Knowledge gold or the spot-check samples (#693).
 */
import type { CitingPrompt } from "dumcorpus/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";

/** The Rules the translation paragraphs cite, at the statement hashes they were checked against. */
const rules = {
	meaning: ["de/emoji-description-names-the-meaning", "5532d94dbbc3bb71"],
	translation: ["de/translation-gives-the-equivalent", "3003c6d40e2db2dc"],
	multiword: [
		"de/multiword-unit-describes-its-whole-meaning",
		"99996175abb4200d",
	],
	idiom: ["de/idiom", "d25679f2a06809b9"],
	headword: ["de/canonical-form-is-the-headword", "43184aac9186aceb"],
	ownPart: ["de/copula-describes-its-own-part", "986b2cb2531c76d7"],
} as const satisfies Readonly<Record<string, Cite>>;

const registry = paragraphRegistry("de/knowledge");
const { paragraph } = registry;

export const translation = {
	task: paragraph(
		"translation.task",
		"Translate the Reading's meaning into `language` (en: English, ru: Russian): give what a bilingual dictionary gives as this meaning's equivalent. Translate the meaning the emoji name, not another meaning of the German word, even one this sentence suggests, and not the meaning of a neighbouring word.",
		rules.translation,
		rules.meaning,
	),
	citation: paragraph(
		"translation.citation",
		"Write each equivalent in its dictionary headword form and carry over none of the sentence's tense, person, number, case or degree: a verb in its infinitive, a noun in the singular unless it exists only in the plural, an adjective in its positive. A verb's equivalent keeps the reflexive or particle its meaning needs, and every equivalent keeps the Reading's word class: an adverb takes an adverb, never an adjective of the same root. The equivalent translates the target alone, in every language: it keeps the preposition it governs itself and a placeholder for the object it takes, and takes in nothing else, no neighbouring word and none of the object, negation, adverb or predicative this sentence adds («Die Suppe riecht herrlich»: smell, пахнуть; not smell wonderful, вкусно пахнуть).",
		rules.translation,
		rules.headword,
		rules.ownPart,
	),
	valency: paragraph(
		"translation.valency",
		"Write each equivalent as its pieces in reading order, each a `kind` and its `text`. A Slot is an object the equivalent takes in this meaning, written as the target language's dictionary placeholder in the form the equivalent governs: en something or someone; ru что-то, чего-то, чему-то, чем-то, чём-то, кого-то, кому-то, кем-то, ком-то. A Preposition is only ever a preposition: the target-language preposition the equivalent governs, right before its Slot, whatever preposition or case the German takes; an object with no preposition is a Slot alone. Write a Preposition only where the equivalent itself puts one before this object in the target language; a Russian verb that governs a bare case takes its Slot in that case and no Preposition, even when the German takes one (достигать, чего-то; касаться, чего-то). Text is every other word. Give a Slot for every object the equivalent takes in this meaning, a direct object included, as a bilingual dictionary shows it (беречь, что-то; руководить, чем-то); an equivalent that takes no object is one Text piece («sich verlassen»: rely, on, someone as Text, Preposition, Slot, and полагаться, на, кого-то; «jemandem vertrauen»: trust, someone as Text, Slot, and доверять, кому-то).",
		rules.translation,
	),
	form: paragraph(
		"translation.form",
		"Never pick a word only because it looks or sounds like the German one: a false friend names another thing. An abbreviation or a title takes the established equivalent of what it stands for, or the target language's usual rendering of it, never a coined word: an academic degree takes the target language's established term for that degree, else a plain description of its holder, never a compound or suffix built from the German parts. A proper name keeps its own form, transliterated into Cyrillic for ru, unless the language has an established name for it («München»: Munich, Мюнхен); never translate its parts («Lindenstraße»: Lindenstraße, Линденштрассе).",
		rules.translation,
	),
	multiword: paragraph(
		"translation.multiword",
		"Translate a Locution or a Saying as a whole: by the target language's established expression with the same meaning when there is one, else by a plain paraphrase of that meaning. Never translate it word for word, and never give another expression that only shares its words or its image.",
		rules.translation,
		rules.multiword,
		rules.idiom,
	),
	output: paragraph(
		"translation.output",
		"Answer with a JSON array of one equivalent, or up to three when the meaning has several equally usual ones, the most usual first; each a word or a short phrase, never a sentence, written as the array of its pieces.",
		rules.translation,
	),
} as const;

/** Every registered paragraph, as dumcorpus's citation check reads it. */
export function translationPromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}

/** Every registered paragraph's text, for the tests. */
export function translationParagraphs(): readonly string[] {
	return registry.paragraphs();
}

/** The German words the paragraphs quote «…», as written. */
export function translationExamples(): readonly string[] {
	return registry.examples();
}
