import { paragraph, rules } from "./registry.js";

// Question texts. `{m}` is a member reference such as `members.m1` ("auf").

export const question = {
	orthography: paragraph(
		"question.orthography",
		"Under `policy.orthography`, is a member of the unit a Typo or Shorthand?",
		rules.orthography,
	),
	orthographyNone: paragraph(
		"question.orthography.None",
		"Neither: every member is spelled as the word is written",
		rules.orthography,
	),
	typoMember: paragraph(
		"question.orthography.Typo",
		"{m} has a real spelling or casing error",
		rules.orthography,
	),
	shorthandMember: paragraph(
		"question.orthography.Shorthand",
		"{m} is a shortened spelling of a longer word",
		rules.orthography,
		rules.abbreviation,
	),
	citation: paragraph(
		"question.citation",
		"Under `policy.inflection`, is the unit used in its sentence, or only mentioned as a dictionary citation, a name or a title?",
		rules.emptyInflection,
	),
	spelling: paragraph(
		"question.spelling",
		"Under `policy.orthography`, how is the unit's form spelled, compared with the dictionary's main spelling of that same form?",
		rules.variant,
	),
	spellingCanonical: paragraph(
		"question.spelling.Canonical",
		"The dictionary's main spelling of this form; an inflected or capitalized form counts, and so does a form whose only fault is a typo, judged as the word it misspells",
		rules.variant,
		rules.orthography,
	),
	archaic: paragraph(
		"question.archaic",
		"Under `policy.orthography`, is the unit's form itself archaic?",
		rules.variant,
	),
	reading: paragraph(
		"question.reading",
		"Under `policy.fused`, {m} is a piece of the fused word {word}. Which word does its piece {piece} stand for here?",
		rules.fused,
	),
	shortened: paragraph(
		"question.shortened",
		"Under `policy.orthography`, {m} is a shortened adverb. Which word does it stand for here? Movement towards the speaker or the scene's viewpoint gives the her- word, movement away from it the hin- word.",
		rules.rShorthand,
	),
	indefinite: paragraph(
		"question.indefinite",
		"Under `policy.orthography`, does {m} ask a question or open a clause here, or does it stand for its irgend- word, unstressed inside its clause?",
		rules.wShorthand,
	),
	indefiniteAsks: paragraph(
		"question.indefinite.Asks",
		"It asks, as a direct or embedded question or an echo question, or it opens a relative or other clause",
		rules.wShorthand,
	),
	indefiniteIrgend: paragraph(
		"question.indefinite.Indefinite",
		"It stands for its irgend- word: somewhere, somehow, at some time",
		rules.wShorthand,
	),
	nounGender: paragraph(
		"question.noun.gender",
		"Under `policy.noun`, what lexical gender does the noun's dictionary entry have: the gender of its nominative singular, whatever case, number or article this sentence shows?",
		rules.core,
		rules.adjectivalNoun,
		rules.neuterNoun,
	),
	nounGenderNone: paragraph(
		"question.noun.gender.None",
		"None: only a person noun made from an adjective or participle, or a noun with no singular at all; a plural form of a noun that has a singular takes that singular's gender",
		rules.adjectivalNoun,
		rules.core,
	),
	nounGenderMasc: paragraph(
		"question.noun.gender.Masc",
		"Masculine: its nominative singular takes der",
		rules.core,
	),
	nounGenderFem: paragraph(
		"question.noun.gender.Fem",
		"Feminine: its nominative singular takes die",
		rules.core,
	),
	nounGenderNeut: paragraph(
		"question.noun.gender.Neut",
		"Neuter: its nominative singular takes das",
		rules.core,
	),
	nounFreeGender: paragraph(
		"question.noun.freeGender",
		"The noun takes more than one gender in one of its senses and a single gender in its others. Does it mean here {sense}?",
		rules.freeGender,
	),
	nounFreeGenderYes: paragraph(
		"question.noun.freeGender.Yes",
		"Yes: that sense, which takes either gender",
		rules.freeGender,
	),
	nounFreeGenderNo: paragraph(
		"question.noun.freeGender.No",
		"No: another of its senses, with one gender",
		rules.freeGender,
	),
	locutionGender: paragraph(
		"question.locution.gender",
		"Under `policy.noun`, what lexical gender does the whole expression have, the gender of its head noun?",
		rules.core,
		rules.idiom,
	),
	nounKind: paragraph(
		"question.noun.kind",
		"Under `policy.noun`, what kind of noun is this, whatever number it shows here?",
		rules.adjectivalNoun,
		rules.core,
	),
	nounKindOrdinary: paragraph(
		"question.noun.kind.Ordinary",
		"An ordinary noun with a singular, even when this sentence shows its plural",
		rules.core,
	),
	nounKindPluralOnly: paragraph(
		"question.noun.kind.PluralOnly",
		"A noun with no singular at all in the dictionary",
		rules.core,
	),
	nounKindAdjectival: paragraph(
		"question.noun.kind.Adjectival",
		"A person noun made from an adjective or participle, inflected like one («der Abgeordnete», «die Abgeordnete»)",
		rules.adjectivalNoun,
	),
	nounNumber: paragraph(
		"question.noun.number",
		"Which number does the unit bear in this sentence?",
		rules.core,
	),
	formGender: paragraph(
		"question.formGender",
		"If the unit's Lemma has no gender and it is singular here, which gender does its form show through its article, ending or an agreeing word?",
		rules.adjectivalNoun,
		rules.properArticle,
	),
	nounCase: paragraph(
		"question.noun.case",
		"Under `policy.inflection`, which case does the unit bear in this sentence? Its article and its form leave these open.",
		rules.emptyInflection,
		rules.nounArticle,
	),
	unmarkedCase: paragraph(
		"question.noun.case.Unmarked",
		"No case: direct address, or a bare noun after voll",
		rules.emptyInflection,
	),
	properArticle: paragraph(
		"question.proper.article",
		"Under `policy.properNoun`, is this name cited in a dictionary with its definite article?",
		rules.properArticle,
		rules.organisation,
	),
	properGender: paragraph(
		"question.proper.gender",
		"Under `policy.properNoun`, what gender does the name have lexically? A first name has its bearer's gender; any other name but a surname, full name or coined name has the gender its article or an agreeing word shows.",
		rules.properArticle,
		rules.organisation,
	),
	properGenderNone: paragraph(
		"question.proper.gender.None",
		"None: a surname, full name or coined name, never a first name, or a name used only in the plural",
		rules.properArticle,
	),
	properGenderMasc: paragraph(
		"question.proper.gender.Masc",
		"Masculine: a man's first name, or a name that takes der in the singular",
		rules.properArticle,
	),
	properGenderFem: paragraph(
		"question.proper.gender.Fem",
		"Feminine: a woman's first name, or a name that takes die in the singular",
		rules.properArticle,
	),
	properGenderNeut: paragraph(
		"question.proper.gender.Neut",
		"Neuter: a name that takes das, as a city or country named without an article does",
		rules.properArticle,
	),
	auxiliary: paragraph(
		"question.auxiliary",
		"Under `policy.verbal`, which use is {m} in this verbal unit?",
		rules.auxiliary,
		rules.verbalParticiple,
	),
	auxiliaryMain: paragraph(
		"question.auxiliary.Main",
		"It is the unit's own verb here, not an auxiliary",
		rules.auxiliary,
	),
	prefix: paragraph(
		"question.prefix",
		"Under `policy.verbCore`, does the verb's dictionary entry have a separable prefix, and which? A separable prefix is split off from the finite verb in a main clause and takes ge- or zu after it in the participle or infinitive; a word standing apart that the infinitive writes as one with the verb is one. For a shortened r- word, movement towards the speaker or the scene's viewpoint gives the her- word, movement away from it the hin- word.",
		rules.verbCore,
		rules.bracket,
		rules.rShorthand,
	),
	expletive: paragraph(
		"question.expletive",
		"Is {m} the subject es the verb selects, which refers to nothing?",
		rules.expletive,
	),
	verbForm: paragraph(
		"question.verbForm",
		"Under `policy.verbal`, is the whole verbal unit finite, an infinitive or a participle?",
		rules.verbalWhole,
	),
	mood: paragraph(
		"question.mood",
		"If the whole verbal unit is finite, which mood does its finite verb's form show? Judge the form, not the sense: a word of doubt or possibility leaves an indicative form indicative, and a Konjunktiv II form, a polite present one included, mostly differs from the preterite, as «flöge» from «flog».",
		rules.verbalWhole,
	),
	tense: paragraph(
		"question.tense",
		"If the whole verbal unit is finite and not imperative, which tense does its finite verb show? Konjunktiv I is Pres and Konjunktiv II Past.",
		rules.verbalWhole,
	),
	person: paragraph(
		"question.person",
		"If the whole verbal unit is finite, which person does its finite verb agree in?",
		rules.verbalWhole,
	),
	verbNumber: paragraph(
		"question.verb.number",
		"If the whole verbal unit is finite, which number does its finite verb agree in?",
		rules.verbalWhole,
	),
	participle: paragraph(
		"question.participle",
		"If the whole verbal unit is a participle, is it a present or a past participle?",
		rules.verbalWhole,
	),
	comparable: paragraph(
		"question.comparable",
		"Under `policy.adjective`, does Duden, or else DWDS, give this word's headword comparison forms, suppletive ones included?",
		rules.comparability,
	),
	comparableYes: paragraph(
		"question.comparable.Yes",
		"Yes: its headword itself has a comparative and a superlative, from its own stem or, for a suppletive word, from another stem",
		rules.comparability,
	),
	comparableNo: paragraph(
		"question.comparable.No",
		"No: the headword itself has no comparison forms, as for an ordinal, a possessive, a demonstrative, interrogative or relative adverb, only colloquial or rare ones, or a participle no dictionary lists as an adjective; a word it modifies does not count",
		rules.comparability,
	),
	attributive: paragraph(
		"question.attributive",
		"Under `policy.adjective`, does the adjective agree with a noun here, before it or standing in for an elided one?",
		rules.comparability,
		rules.attributive,
	),
	degree: paragraph(
		"question.degree",
		"Under `policy.adjective`, which degree does this form mark?",
		rules.comparability,
	),
	agreementCase: paragraph(
		"question.agreement.case",
		"If the unit agrees with a noun or itself inflects here, which case does it bear?",
		rules.core,
	),
	agreementGender: paragraph(
		"question.agreement.gender",
		"If the unit agrees with a noun or itself inflects here, which gender does it show? Plural agreement shows none.",
		rules.core,
	),
	agreementNumber: paragraph(
		"question.agreement.number",
		"If the unit agrees with a noun or itself inflects here, which number does it bear?",
		rules.core,
	),
	inflects: paragraph(
		"question.inflects",
		"Does the unit itself inflect for case, gender or number in this sentence, rather than standing invariant?",
		rules.emptyInflection,
	),
	realizedCase: paragraph(
		"question.realizedCase",
		"Which case does the adposition's complement take here? Read it from the complement's form when it shows it; otherwise give the case this adposition assigns in this use.",
		rules.core,
		rules.government,
	),
	realizedCaseNone: paragraph(
		"question.realizedCase.None",
		"No case-marked nominal complement: a clause, an adverb or none",
		rules.core,
	),
	answer: paragraph(
		"question.answer",
		"Under `policy.interjection`, is the unit an answer word?",
		rules.interjection,
		rules.routine,
	),
	sourceLanguage: paragraph(
		"question.sourceLanguage",
		"Under `policy.foreign`, which language is the unit from?",
		rules.foreign,
	),
	coverage: paragraph(
		"question.coverage",
		"Under `policy.coverage`, does the sentence realize all of the unit's fixed wording?",
		rules.partial,
		rules.modification,
	),
	governed: paragraph(
		"question.governed",
		"Under `policy.government`, is {m} the preposition the unit's head selects for its complement?",
		rules.government,
	),
	governedFree: paragraph(
		"question.governed.Free",
		"No: a fixed word of the expression, an adjunct's preposition or a separable particle",
		rules.government,
	),
	governedCase: paragraph(
		"question.governedCase",
		"If {m} is the preposition the head selects, which case does its complement take here?",
		rules.government,
	),
	governedReferent: paragraph(
		"question.governedReferent",
		"If {m} is the preposition the head selects, does its complement here name a person or a thing?",
		rules.government,
	),
	cell: paragraph(
		"question.cell",
		"Which form of {lemma} is {m} in this sentence?",
		rules.core,
		rules.referent,
	),
	cellOpen: paragraph(
		"question.cell.open",
		"{cells}: nothing in the text settles which",
		rules.referent,
	),
	unresolved: paragraph(
		"question.Unresolved",
		"The sentence does not settle this",
		rules.unresolved,
	),
} as const;
