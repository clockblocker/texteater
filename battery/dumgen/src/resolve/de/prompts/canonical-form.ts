import { paragraph, rules } from "./registry.js";

// Luna's Canonical Form call: one system prompt, its route's line included.

export const canonicalForm = {
	task: paragraph(
		"canonical.task",
		"You write the Canonical Form of one German unit and the spelling of each of its members. Its route, its judged features and its members are fixed.",
		rules.headword,
	),
	headword: paragraph(
		"canonical.headword",
		"The Canonical Form is the dictionary headword, in Duden's recommended current spelling and in the casing the dictionary shows, never the casing the word's position gives: a sentence-initial «Mangels» is the preposition «mangels», «WTF» keeps its capitals, and an old or Swiss spelling such as «Kuß» or «Schiffahrt» is cited as «Kuss» and «Schifffahrt». When a stored Lemma in `lemmaCandidates` is this unit's headword, write it as stored.",
		rules.headword,
	),
	members: paragraph(
		"canonical.members",
		"Spell each member as the unit shows it, in the word's lexical casing, one entry per member in order, those in `outsideHeadword` and `auxiliaries` included. Correct a member judged Typo, and write a member judged Shorthand as the word it shortens: an r- word as its her- or hin- word, a dr- word as its da(r)- word, a bare w-word as its irgend- word. A member judged Standard keeps its letters and changes at most in casing. A member in `fixedMembers` keeps the spelling given there.",
		rules.orthography,
		rules.fused,
		rules.abbreviation,
		rules.rShorthand,
		rules.drShorthand,
		rules.wShorthand,
	),
	suspended: paragraph(
		"canonical.suspended",
		"A member ending in a hyphen in an und or oder coordination is completed with the ending it shares with the full compound beside it: «Ost-» in «Ost- und Westküste» is «Ostküste».",
		rules.suspended,
	),
	slot: paragraph(
		"canonical.slot",
		"An open slot in a discontinuous form is … (U+2026) with a space on each side: «ob … oder».",
		rules.headword,
	),
} as const;

/** The line of guidance Luna reads for each route. */
export const routeGuidance: Readonly<Record<string, string>> = {
	"Lexeme/NOUN": paragraph(
		"canonical.route.Lexeme/NOUN",
		"A noun is cited bare, in the nominative singular, with noun capitalization, without its article or a governed preposition, even where the members show its plural («Gläser» is «Glas»); only a plural-only noun keeps its plural. A person noun made from an adjective or participle is cited in its weak form after der («Abgeordnete»), and a neuter one in its weak form («Ungewisse»).",
		rules.headword,
		rules.nounArticle,
		rules.adjectivalNoun,
		rules.neuterNoun,
		rules.pluralOnly,
	),
	nounArticle: paragraph(
		"canonical.route.Lexeme/NOUN.article",
		"Give in `article` the definite article the noun's nominative singular takes in the dictionary (der, die or das), whatever this sentence's case, number or article: «des Hafens» is der «Hafen». Give none only for a noun with no singular or a person noun made from an adjective or participle («Abgeordnete»).",
		rules.core,
		rules.adjectivalNoun,
		rules.nounArticle,
		rules.pluralOnly,
	),
	"Lexeme/PROPN": paragraph(
		"canonical.route.Lexeme/PROPN",
		"A name keeps its registered spelling and capitals, without a genitive ending and without the article it is cited with («Zugspitze» for «die Zugspitze»).",
		rules.headword,
		rules.properArticle,
	),
	"Lexeme/VERB": paragraph(
		"canonical.route.Lexeme/VERB",
		"A verb is cited as the infinitive of its main verb, with sich before it when `judged.lexicallyReflexive` is set and with its separable prefix (`judged.hasSepPrefix`) written on, never with the members in `auxiliaries`, causative lassen, its subject es or a governed preposition: «sich sputen», «fortfahren».",
		rules.headword,
		rules.verbCore,
		rules.expletive,
		rules.auxiliary,
		rules.causative,
	),
	"Lexeme/ADJ": paragraph(
		"canonical.route.Lexeme/ADJ",
		"An adjective is cited in its uninflected positive form, also for a suppletive comparative or superlative, without a governed preposition; only one with no predicative form, as an ordinal, cites its attributive headword («obere» in «die obere Etage»).",
		rules.headword,
		rules.government,
		rules.attributive,
	),
	"Lexeme/ADV": paragraph(
		"canonical.route.Lexeme/ADV",
		"An adverb is cited in its positive form, the positive headword of a suppletive comparative or superlative. A da, wo or hier split from its hin, her or preposition is cited as the one word they form, such as «hiermit», never as its first piece alone. A member judged Shorthand is cited as the word it shortens.",
		rules.headword,
		rules.comparability,
		rules.splitAdverb,
		rules.pronominalAdverb,
		rules.rShorthand,
		rules.drShorthand,
		rules.wShorthand,
	),
	"Lexeme/ADP": paragraph(
		"canonical.route.Lexeme/ADP",
		"An adposition is cited in lowercase as one word; a fused piece is the preposition it stands for.",
		rules.headword,
		rules.fused,
	),
	"Lexeme/CCONJ": paragraph(
		"canonical.route.Lexeme/CCONJ",
		"A conjunction is cited in lowercase.",
		rules.headword,
	),
	"Lexeme/SCONJ": paragraph(
		"canonical.route.Lexeme/SCONJ",
		"A conjunction is cited in lowercase.",
		rules.headword,
	),
	"Lexeme/INTJ": paragraph(
		"canonical.route.Lexeme/INTJ",
		"An interjection is cited as written, pieces and spacing kept, in its lexical casing, but letters stretched for effect are cited in the dictionary's spelling («pssst» is «pst»); a one-word routine formula is cited as its word, without a preposition or complement after it.",
		rules.headword,
		rules.interjection,
		rules.routine,
		rules.variant,
		rules.government,
	),
	"Lexeme/NUM": paragraph(
		"canonical.route.Lexeme/NUM",
		"A numeral written in digits is cited as the numeral word it spells, never as digits; a year from 1100 to 1999 is spelled in hundreds, not thousands.",
		rules.headword,
		rules.digits,
	),
	"Lexeme/SYM": paragraph(
		"canonical.route.Lexeme/SYM",
		"A symbol is cited as the sign itself.",
		rules.headword,
	),
	"Lexeme/PART": paragraph(
		"canonical.route.Lexeme/PART",
		"A particle is cited in lowercase in its standard spelling: a regional or colloquial spelling or a shortening is cited as the particle it stands for.",
		rules.headword,
		rules.variant,
		rules.orthography,
	),
	Locution: paragraph(
		"canonical.route.Locution",
		"A Locution is cited in its dictionary wording: a verbal one as its fixed words with the infinitive last, keeping the article or fused preposition that wording has and leaving out open slots, never a placeholder such as jemandem or etwas («Maulaffen feilhalten»), a nominal one in the nominative, an adpositional or conjunctional one with … for each slot.",
		rules.headword,
		rules.idiom,
	),
	"Saying/Saying": paragraph(
		"canonical.route.Saying/Saying",
		"A Saying is cited as a sentence in its full standard wording, even when this sentence quotes only part of it or changes a word, capitalized, with the commas that wording has and no final punctuation.",
		rules.headword,
		rules.partial,
	),
	"Foreign/Foreign": paragraph(
		"canonical.route.Foreign/Foreign",
		"Foreign material is cited in its source language's own spelling, correcting only casing that comes from its position and typos.",
		rules.headword,
		rules.foreign,
	),
};
