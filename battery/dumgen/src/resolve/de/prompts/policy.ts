import { paragraph, rules } from "./registry.js";

// The policy block: a call sends a paragraph only when a question it asks
// cites it (#691).

export const policy = {
	unit: paragraph(
		"policy.unit",
		"The unit marked in `marked` is fixed: segmentation chose its members and its route. Analyze this whole unit in its sentence, never regroup or reroute it, and answer Unresolved only when the sentence does not settle a question.",
		rules.unresolved,
		rules.largest,
	),
	identity: paragraph(
		"policy.identity",
		"Core Features belong to the Lemma, the dictionary entry; what this occurrence shows belongs to its Surface. A form spelled as the dictionary spells it need not be the dictionary form: «schliefst» is a Surface of «schlafen».",
		rules.core,
		rules.headword,
	),
	orthography: paragraph(
		"policy.orthography",
		"A member is a Typo only for a real spelling or casing error; a sentence-initial capital, casing the word leaves free and a licensed variant are no Typo. A member is Shorthand when it is a standalone shortened spelling of a longer word: an abbreviation, an r- or dr- shortening of a her-, hin- or da- word, or a bare w-word standing for its irgend- word. A Surface is Variant only when this form is spelled other than the dictionary's main spelling of that same form, never for inflection, a typo or a shortening; an archaic form is about the form, not old spelling.",
		rules.orthography,
		rules.variant,
		rules.abbreviation,
		rules.rShorthand,
		rules.drShorthand,
		rules.wShorthand,
	),
	inflection: paragraph(
		"policy.inflection",
		"An empty inflection or case states structure, never doubt: a Surface leaves its inflection empty only for a dictionary citation, a word mentioned rather than used, and a noun leaves its case empty only in direct address or as a bare noun after voll; a bare noun after a preposition takes the case the preposition governs there.",
		rules.emptyInflection,
	),
	noun: paragraph(
		"policy.noun",
		"A noun's article is a member, never a feature, and the noun's Surface marks its own case and number. Its lexical gender is the gender of its nominative singular with der, die or das, whatever case, number or article this sentence gives it: «des Hafens» is a form of der «Hafen», and «Gläser» keeps the gender of das «Glas». A person noun made from an adjective or participle is one Lemma with no gender, whose singular form shows a gender («der Abgeordnete», «die Abgeordnete»); a neuter one with a meaning of its own keeps Neut («das Ungewisse»).",
		rules.nounArticle,
		rules.core,
		rules.adjectivalNoun,
		rules.neuterNoun,
	),
	properNoun: paragraph(
		"policy.properNoun",
		"A name cited with its definite article, as streets, squares, rivers, mountains, buildings, a country or region always named with it, an organisation German names with it («der ADAC», «die FIFA») and titles whose article inflects are, has Core article Definite, and an organisation's gender is that article's; a name cited bare has none even where this sentence gives it an article. A surname, full name or coined name has no lexical gender, unlike a first name, and its singular form shows the gender its article or adjective gives it; any other name has the lexical gender its article or an agreeing word shows. A title before a name takes the name's case.",
		rules.properArticle,
		rules.organisation,
		rules.title,
	),
	verbal: paragraph(
		"policy.verbal",
		"A verbal Surface describes the whole unit: its auxiliaries make the perfect, future, passive or causative, and tense, mood, person and number describe its finite verb. A participle is verbal only in a perfect with haben or sein or in a passive with werden, bekommen, kriegen or erhalten; causative lassen joins an infinitive whose doer the clause does not name.",
		rules.verbalWhole,
		rules.verbalParticiple,
		rules.auxiliary,
		rules.causative,
		rules.recipient,
	),
	verbCore: paragraph(
		"policy.verbCore",
		"A verb's separable prefix is only its separable particle, attached or standing apart, never a preposition the verb governs or one with its own complement; a directional word in the verbal bracket is the particle when verb and word form a particle verb («führt … vorüber» is «vorüberführen»), and so is a noun or adjective the infinitive writes as one word with the verb («findet … statt» is «stattfinden»). A prefix the verb never splits off, which takes no ge- in the participle («überquert», «widerlegt»), is inseparable and no separable prefix. A lexical reflexive's case is fixed per verb.",
		rules.verbCore,
		rules.bracket,
	),
	government: paragraph(
		"policy.government",
		"A member that is the preposition the unit's head selects for its complement is the head's valency evidence and never part of the Lemma; a fixed word of an expression, an adjunct's preposition or a separable particle is not.",
		rules.government,
	),
	adjective: paragraph(
		"policy.adjective",
		"An adjective or adverb is comparable when Duden, or else DWDS, gives its headword comparison forms, suppletive ones from another stem included; forms marked colloquial or rare do not count, and a participle no dictionary lists as an adjective is not comparable. Every form of a comparable one marks its degree, positive when uncompared; a non-comparable one marks none. Only an adjective that agrees with a noun, attributively or standing in for an elided noun, marks case, gender and number.",
		rules.comparability,
		rules.attributive,
	),
	coverage: paragraph(
		"policy.coverage",
		"Coverage is Partial only when fixed wording is really missing or deliberately changed and the unit is still recognized; a split unit, or free words between its members, is still Full.",
		rules.partial,
		rules.modification,
	),
	referent: paragraph(
		"policy.referent",
		"Some pronoun forms spell several cells that only the referent tells apart. Take the cell the text settles through an antecedent, the verb's agreement, address or capitalization, in this sentence or in `neighbours`; a singular finite verb settles a singular cell, a plural one a plural cell. When nothing settles it, choose the option that leaves it open; never guess a cell.",
		rules.referent,
		rules.pronOrDet,
	),
	interjection: paragraph(
		"policy.interjection",
		"An answer word replying to a question, quoted or embedded too, has partType Res; any other interjection has none, even one given as a reply, such as a laugh, an exclamation or a thanks.",
		rules.interjection,
	),
	foreign: paragraph(
		"policy.foreign",
		"A Foreign unit is material of another language that shows no German grammar here, and its Lemma names that language.",
		rules.foreign,
	),
	fused: paragraph(
		"policy.fused",
		"A piece of a fused word stands for the word it holds; when it can stand for several, the sentence decides which.",
		rules.fused,
	),
} as const;

export type PolicyName = keyof typeof policy;
