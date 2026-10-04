/**
 * What the judge reads about units, condensed from the dumcorpus German Rules
 * (`de/largest-fixed-unit` onward). The wording is Dumgen's own; the Rules
 * stay the authority. Every request of the unit stage carries it in state.
 */
export const unitGuide = {
	task: "Every word of the sentence belongs to exactly one unit: the biggest unit a click on it should open. Most units are one word.",
	lexeme_units: [
		"A noun or name owns the article der/die/das/ein that opens its phrase, across adjectives and numerals: der steile Aufstieg is [der, Aufstieg] and [steile]. The article part of a fused word belongs to the noun too: im Wald is [i] and [m, Wald]. If the noun is elided, the word standing in for it owns the article ([den, roten]). mein, dieser, kein and other determiners are units of their own.",
		"A verb owns its separable particle (zog … an), an inherently reflexive pronoun (sich schämen, erinnert sich), the auxiliaries sein/haben/werden of its perfect, future or passive (hat … gegessen, ist … worden, wird … gebaut), a non-referential es it selects (es gibt, es regnet, geht's), and a preposition it governs (wartet auf, erinnert sich an), wherever they stand.",
		"An adjective or noun owns a preposition it governs: stolz auf, Angst vor. A free preposition (im Keller, mit dem Bus) is a unit of its own.",
		"A split adverb is one unit: Da … von is davon, Wo … hin is wohin. A pronominal adverb written as one word (darauf, davon) is its own unit and never joins a verb.",
		"Stay apart: a modal verb and its infinitive, a copula (sein, werden, bleiben) and its predicate, zu before an infinitive, nicht, attributive adjectives, a participle describing a state (Die Tür ist geschlossen), pronouns, conjunctions, adverbs.",
	],
	multiword_units: [
		"Idioms and collocations acting as one word: den Faden verlieren, ins Gras beißen, zur Verfügung stellen, Angst haben, in Frage kommen. Members are the fixed words with their fixed articles and prepositions; free objects and adverbs stay out.",
		"Fixed adverbials and connectives: zum Teil, auf keinen Fall, so oder so, ganz und gar, entweder … oder, nicht nur … sondern auch, um … zu, je … desto.",
		"Routine formulas: guten Morgen, tut mir leid, gern geschehen, Darf ich bitten.",
		"A complete proverb or famous quotation used as a saying is one unit over all its words: Morgenstund hat Gold im Mund.",
		"Words that merely stand together or often co-occur are not fixed: ein Buch kaufen, starker Regen.",
	],
};
