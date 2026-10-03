/**
 * Every text the German grammar prompts send, each a paragraph that cites
 * the dumspec Rules it states at the statement hash it was last checked
 * against (ADR 0037, #695). The citation test runs dumspec's
 * `checkPromptCitations` over `grammarPromptTexts`, so a reworded Rule
 * fails until someone re-reads the paragraph and cites the new hash.
 *
 * German example words stand in «…», so the disjointness test (#693) can
 * keep every evaluation Lemma out of them. A template's `{…}` slots are
 * filled per click; the registered text is the template.
 */
import type { CitingPrompt } from "dumspec/types";

type Cite = readonly [rule: string, hash: string];

/** The Rules the prompts cite, at the statement hashes they were checked against. */
const rules = {
	unresolved: ["de/unresolved-over-repair", "a5da7c01b403fde8"],
	largest: ["de/largest-fixed-unit", "9a404db30f2b7c82"],
	core: ["de/core-features-are-identity", "c11b321c41f117a1"],
	headword: ["de/canonical-form-is-the-headword", "43184aac9186aceb"],
	orthography: ["de/member-orthography", "66373ce319bd065a"],
	variant: ["de/variant-and-historical-status", "9e2c6c25c942a570"],
	emptyInflection: ["de/empty-inflection-is-structural", "2ea5f1e19a7417ae"],
	nounArticle: ["de/noun-owns-its-article", "c2b1f74a61545177"],
	adjectivalNoun: ["de/adjectival-noun-lemma", "bcdaf66f8862eb29"],
	neuterNoun: ["de/neuter-adjectival-noun", "a4bd8e12a664fd8e"],
	properArticle: ["de/proper-noun-article", "c3eb61394edd1818"],
	title: ["de/title-before-a-name", "dd531115e2c8a2ef"],
	verbalWhole: ["de/verbal-surface-is-whole", "ab79bbe68ce12d4c"],
	verbalParticiple: ["de/verbal-participle", "8783a18791f95718"],
	auxiliary: ["de/auxiliary-joins-the-verb-it-serves", "17cec6bff2108a22"],
	causative: ["de/causative-lassen", "6df00ff37a0a5baa"],
	recipient: ["de/recipient-passive", "0196915ee6d1a36d"],
	verbCore: ["de/verb-core-features", "584917189382edfe"],
	bracket: ["de/bracket-particle-or-circumposition", "60b1cecf8b3f74f1"],
	expletive: ["de/expletive-es-joins-its-verb", "99bff23563b49716"],
	government: [
		"de/governed-preposition-joins-its-governor",
		"2d20d7f0e21161bc",
	],
	comparability: ["de/comparability-is-lexical", "b72c043c004f9dc9"],
	attributive: ["de/attributive-adjective-stands-alone", "dc0d3ef97ace5bc0"],
	partial: ["de/partial-coverage", "5aa8e564f6ae1177"],
	modification: ["de/modification-attests-partially", "91fc596acb3813f1"],
	referent: ["de/open-referent", "eae1e1fa056277e4"],
	interjection: ["de/interjection-counts-its-words", "b572bad8906b508d"],
	foreign: ["de/foreign-unless-duden-or-german-grammar", "c2f06b03fed6e233"],
	fused: ["de/fused-word-pieces", "53eb6d28dab42ddc"],
	rShorthand: ["de/r-adverb-is-her-or-hin-shorthand", "5e2320ca5d12b229"],
	drShorthand: ["de/dr-adverb-is-da-shorthand", "1ef63f4432955e46"],
	wShorthand: ["de/bare-w-word-is-shorthand", "7ae30cfdb910de05"],
	suspended: ["de/suspended-compound-completion", "c86ab32a13fa94be"],
	abbreviation: ["de/abbreviation-is-one-segment", "8b5d215a31ab7264"],
	digits: ["de/digits-spell-the-numeral", "ae8bd58519856b20"],
	idiom: ["de/idiom", "c05df428b3a42079"],
	routine: ["de/routine-formula-is-intj", "32797f3b5f083780"],
	pronOrDet: ["de/pron-or-det-by-use", "b7ac2bf4eaaf25be"],
	splitAdverb: ["de/split-adverb-is-one-target", "05ddf27450fc5104"],
	pronominalAdverb: ["de/pronominal-adverb-stands-alone", "1b11d9ee80ce12bd"],
} as const satisfies Readonly<Record<string, Cite>>;

/** One registered paragraph: its name, its text or template, and what it cites. */
export type PromptText = {
	readonly name: string;
	readonly text: string;
	readonly cites: readonly Cite[];
};

const registry: PromptText[] = [];

/** Registers one paragraph and returns its text. */
function paragraph(name: string, text: string, ...cites: Cite[]): string {
	if (text.includes("\n")) throw Error(`${name} is more than one paragraph`);
	registry.push({ name, text, cites });
	return text;
}

/** Fills a template's `{slot}`s. */
export const fill = (
	template: string,
	values: Readonly<Record<string, string>>,
): string =>
	template.replace(
		/\{(\w+)\}/gu,
		(whole, key: string) => values[key] ?? whole,
	);

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
		"A name cited with its definite article, as streets, squares, rivers, mountains, buildings, a country or region always named with it, and titles whose article inflects are, has Core article Definite; a name cited bare has none even where this sentence gives it an article. A surname, full name or coined name has no lexical gender, unlike a first name, and its singular form shows the gender its article or adjective gives it; any other name has the lexical gender its article or an agreeing word shows. A title before a name takes the name's case.",
		rules.properArticle,
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
	),
	properGender: paragraph(
		"question.proper.gender",
		"Under `policy.properNoun`, what gender does the name have lexically? A first name has its bearer's gender; any other name but a surname, full name or coined name has the gender its article or an agreeing word shows.",
		rules.properArticle,
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
	reflexive: paragraph(
		"question.reflexive",
		"Under `policy.verbCore`, which case does the verb's lexical reflexive {m} take?",
		rules.verbCore,
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
		"If the whole verbal unit is finite, which mood does it show?",
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

/**
 * The uses an auxiliary member may have, one per authored AUX Reading,
 * keyed by its Canonical Form and Emoji Description.
 */
export const auxiliaryUses: Readonly<Record<string, string>> = {
	"haben 🏁": paragraph(
		"question.auxiliary.haben-perfect",
		"The perfect auxiliary haben, with a past participle",
		rules.auxiliary,
		rules.verbalParticiple,
	),
	"sein 🏁": paragraph(
		"question.auxiliary.sein-perfect",
		"The perfect auxiliary sein, with a past participle",
		rules.auxiliary,
		rules.verbalParticiple,
	),
	"werden 🔮": paragraph(
		"question.auxiliary.werden-future",
		"The future auxiliary werden, with an infinitive",
		rules.auxiliary,
	),
	"werden 🔄": paragraph(
		"question.auxiliary.werden-passive",
		"The process passive auxiliary werden or worden, with a past participle",
		rules.auxiliary,
		rules.verbalParticiple,
	),
	"werden 💭": paragraph(
		"question.auxiliary.werden-subjunctive",
		"würde with an infinitive, the subjunctive it forms",
		rules.auxiliary,
	),
	"bekommen 🎁": paragraph(
		"question.auxiliary.bekommen-recipient",
		"The recipient passive with bekommen, kriegen or erhalten and a past participle that adds nothing lexical",
		rules.recipient,
	),
	"lassen 🫴": paragraph(
		"question.auxiliary.lassen-causative",
		"Causative lassen with an infinitive whose doer the clause does not name",
		rules.causative,
	),
	"haben 📌": paragraph(
		"question.auxiliary.haben-obligation",
		"haben with zu and an infinitive, saying what someone must do",
		rules.auxiliary,
	),
	"sein 📋": paragraph(
		"question.auxiliary.sein-modal-passive",
		"sein with zu and an infinitive, saying what can or must be done",
		rules.auxiliary,
	),
	"sein ⏳": paragraph(
		"question.auxiliary.sein-progressive",
		"sein with am and an infinitive, an action in progress",
		rules.auxiliary,
	),
};

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
	),
	nounArticle: paragraph(
		"canonical.route.Lexeme/NOUN.article",
		"Give in `article` the definite article the noun's nominative singular takes in the dictionary (der, die or das), whatever this sentence's case, number or article: «des Hafens» is der «Hafen». Give none only for a noun with no singular or a person noun made from an adjective or participle («Abgeordnete»).",
		rules.core,
		rules.adjectivalNoun,
		rules.nounArticle,
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

/** Every registered paragraph, as dumspec's citation check reads it. */
export function grammarPromptTexts(): readonly CitingPrompt[] {
	return registry.map(({ name, text, cites }) => ({
		name: `de/resolve-grammar/${name}`,
		text,
		paragraphs: [
			{
				opens: text.slice(0, 32),
				implements: cites.map(([rule, hash]) => ({ rule, hash })),
			},
		],
	}));
}

/** The German examples the prompts quote, «…» stripped, each as written. */
export function promptExamples(): readonly string[] {
	return registry.flatMap(({ text }) =>
		[...text.matchAll(/«([^»]+)»/gu)].map(([, example]) => example ?? ""),
	);
}
