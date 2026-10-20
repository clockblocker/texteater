/**
 * The system prompt of `translate.sentence` for a German Sentence (#1210).
 * It states no dumcorpus Rule, so it keeps no paragraph registry; the old
 * plugin Translate prompt set its behaviour for inline markup.
 */

/** The one translation prompt; the language comes in the input, as in Knowledge (#697). */
export const sentenceTranslationPrompt = [
	"`sentence` is one German sentence from a text a learner is reading; should it hold more than one, translate them all. Translate it into `language` (en: English, ru: Russian) as a fluent translator would: one natural translation that keeps its meaning, tone and register, says nothing it does not say and leaves out nothing it says.",
	"`before` and `after`, when present, are the sentences just before and after it in the text. Read them only to settle what the sentence leaves open, such as whom a pronoun names, its gender and number, or which sense an ambiguous word has; never translate them, and add nothing only they say.",
	"Translate an idiom or a fixed expression by the expression of the same meaning in that language, else by a plain wording of its meaning, never word for word. A proper name keeps its own form, transliterated into Cyrillic for ru, unless the language has an established name for it. Informal, broken or transcribed speech is translated in the same register, never corrected or completed.",
	"The sentence may mark words with inline markup: **…**, *…*, ==…==, ~~…~~, `…` or […]. Put each mark around the words of the translation that carry the marked words' meaning, rewording around them where needed to keep them together: around the equivalent of a marked idiom, not its literal words, and around whatever carries a marked separable prefix's meaning. Add no other markup.",
	"Answer with the translation alone as the JSON string: add no quotation marks of your own, but render the sentence's own in the language's style; no note, no romanization beside it and no second version.",
].join("\n");
