// Generated from explicitly selected demonstrations, never held-out cases.
export const prompts: Readonly<Record<string, string>> = {
	"reading-generation/de":
		'We are helping a language learner distinguish meanings that are useful to distinguish.\n\nThe supplied *lemma* is already resolved and fixed. Do not revise it.\nConsider only the use marked by <TARGET>...</TARGET> in *markedContext*.\nCreate an emojiDescription for the learner-facing concept of this use.\n\nAn emojiDescription contains only one to four Unicode RGI emoji graphemes.\nNever include the lemma, a gloss, or explanatory text.\n\nThe lemma remains visible to the learner. The emoji only needs to distinguish\nthat lemma\'s learner-facing Readings; it does not need to identify the lemma by itself.\n\nDescribe only meaning that stays stable across attestations. Omit scenery,\nparticipants, tense, and other incidental details from the marked context.\nPrefer one conventional emoji by default. Use multiple emoji only when they\npreserve stable, useful lexical structure that one emoji cannot.\n\nTransparent prefixes, particles, or compound members may receive consistent\nemoji components when they add useful stable structure. Never illustrate\nopaque or fossilized components mechanically.\n\nDo not split semantic pennies. Distinguish homonyms, but prefer one broad,\nrecognizable learner-facing concept over narrow dictionary-style distinctions.\nRelated or polysemous uses need distinct descriptions only when combining them\nwould materially mislead a beginner.\nReturn exactly { "emojiDescription": string }.\n\nExamples to follow:\n\nExample 1\nInput:\n{"lemma":"Haus","markedContext":"Wir wohnen in einem <TARGET>Haus</TARGET>."}\nIdeal output:\n{"emojiDescription":"🏠"}',
};
export const grammarPromptRoutes: Readonly<Record<string, string>> = {
	"de/Construction/Fusion": "grammatical-resolution/de/construction/fusion",
	"de/Lexeme/ADJ": "grammatical-resolution/de/lexeme/adjective",
	"de/Lexeme/ADP": "grammatical-resolution/de/lexeme/adposition",
	"de/Lexeme/ADV": "grammatical-resolution/de/lexeme/adverb",
	"de/Lexeme/AUX": "grammatical-resolution/de/lexeme/auxiliary",
	"de/Lexeme/CCONJ":
		"grammatical-resolution/de/lexeme/coordinating-conjunction",
	"de/Lexeme/DET": "grammatical-resolution/de/lexeme/determiner",
	"de/Lexeme/INTJ": "grammatical-resolution/de/lexeme/interjection",
	"de/Lexeme/NOUN": "grammatical-resolution/de/lexeme/noun",
	"de/Lexeme/NUM": "grammatical-resolution/de/lexeme/numeral",
	"de/Lexeme/X": "grammatical-resolution/de/lexeme/other",
	"de/Lexeme/PART": "grammatical-resolution/de/lexeme/particle",
	"de/Lexeme/PRON": "grammatical-resolution/de/lexeme/pronoun",
	"de/Lexeme/PROPN": "grammatical-resolution/de/lexeme/proper-noun",
	"de/Lexeme/PUNCT": "grammatical-resolution/de/lexeme/punctuation",
	"de/Lexeme/SCONJ":
		"grammatical-resolution/de/lexeme/subordinating-conjunction",
	"de/Lexeme/SYM": "grammatical-resolution/de/lexeme/symbol",
	"de/Lexeme/VERB": "grammatical-resolution/de/lexeme/verb",
	"de/Morpheme/Circumfix": "grammatical-resolution/de/morpheme/circumfix",
	"de/Morpheme/Clitic": "grammatical-resolution/de/morpheme/clitic",
	"de/Morpheme/Duplifix": "grammatical-resolution/de/morpheme/duplifix",
	"de/Morpheme/Infix": "grammatical-resolution/de/morpheme/infix",
	"de/Morpheme/Interfix": "grammatical-resolution/de/morpheme/interfix",
	"de/Morpheme/Prefix": "grammatical-resolution/de/morpheme/prefix",
	"de/Morpheme/Root": "grammatical-resolution/de/morpheme/root",
	"de/Morpheme/Suffix": "grammatical-resolution/de/morpheme/suffix",
	"de/Morpheme/Suffixoid": "grammatical-resolution/de/morpheme/suffixoid",
	"de/Morpheme/Transfix": "grammatical-resolution/de/morpheme/transfix",
	"de/Phraseme/Aphorism": "grammatical-resolution/de/phraseme/aphorism",
	"de/Phraseme/Collocation": "grammatical-resolution/de/phraseme/collocation",
	"de/Phraseme/DiscourseFormula":
		"grammatical-resolution/de/phraseme/discourse-formula",
	"de/Phraseme/Idiom": "grammatical-resolution/de/phraseme/idiom",
	"de/Phraseme/Proverb": "grammatical-resolution/de/phraseme/proverb",
};
