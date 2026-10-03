/**
 * Every text `knowledge.produce` sends, each a paragraph that cites the
 * dumspec Rules it states at the statement hash it was last checked
 * against (ADR 0037, #695): Luna's system prompts for the text it writes,
 * jev's policies, questions and options for the choices it judges.
 *
 * - The Emoji Description is the sense boundary in every prompt, and the
 *   Sentence is evidence that never redefines the sense (#623).
 * - The relation judgment states its policy once per call, in its state,
 *   and each candidate's question is one line (#697). The candidate
 *   prompt has one wording, and there is one translation prompt, its
 *   citation-form clause included (#697, #518).
 * - No prompt repeats a negative list its output schema already enforces
 *   (#697), and no option is a bare label: every Kind and relation the
 *   judge may pick is defined (#669).
 *
 * German examples are quoted «…», so the disjointness test can read them;
 * none is a Lemma of the Knowledge gold or the spot-check samples (#693).
 */
import type { CitingPrompt } from "dumspec/types";

type Cite = readonly [rule: string, hash: string];

/** The Rules the Knowledge prompts cite, at the statement hashes they were checked against. */
const rules = {
	meaning: ["de/emoji-description-names-the-meaning", "5532d94dbbc3bb71"],
	translation: ["de/translation-gives-the-equivalent", "51e2aee5b7c8f087"],
	multiword: [
		"de/multiword-unit-describes-its-whole-meaning",
		"99996175abb4200d",
	],
	idiom: ["de/idiom", "c05df428b3a42079"],
	headword: ["de/canonical-form-is-the-headword", "43184aac9186aceb"],
	ownPart: ["de/copula-describes-its-own-part", "986b2cb2531c76d7"],
	copula: ["de/copula-stays-apart", "abeb2e5948f88fe7"],
	valency: ["de/valency-frame-follows-e-valbu", "f0b9c8226ff45fb8"],
	governed: [
		"de/governed-preposition-joins-its-governor",
		"19c59bf41ed26810",
	],
	verbCore: ["de/verb-core-features", "584917189382edfe"],
	collocation: [
		"de/funktionsverbgefuege-are-collocations",
		"57f04b272a0e9aeb",
	],
	adjectivalPlural: ["de/adjectival-noun-plural-is-weak", "c7da6a431e81b3b7"],
	measurePlural: ["de/measure-noun-plural-is-regular", "ef9b7f1e15f48290"],
	pluralOnly: ["de/plural-only-noun-has-no-gender", "92946b73a6244500"],
	conjugation: ["de/conjugation-class-from-praeteritum", "c9973355dfb7314c"],
	relations: ["de/relations-need-a-dictionary", "b8777ac73be3fda5"],
	participle: ["de/participle-source-verb-and-meaning", "a97545caefc4a184"],
	participial: ["de/participial-adjective", "5d4481bf31cb7267"],
	formulaRole: ["de/formula-role-is-narrow", "68e794801a922563"],
	routine: ["de/routine-formula-is-intj", "32797f3b5f083780"],
	saying: ["de/saying-needs-uptake", "b191e72860fbbf9c"],
} as const satisfies Readonly<Record<string, Cite>>;

/** One registered paragraph: its name, its text and what it cites. */
type PromptText = {
	readonly name: string;
	readonly text: string;
	readonly cites: readonly Cite[];
};

const registry: PromptText[] = [];

/** Registers one paragraph and returns its text. */
function paragraph(name: string, text: string, ...cites: Cite[]): string {
	if (text.includes("\n")) throw Error(`${name} is more than one paragraph`);
	if (registry.some((entry) => entry.name === name))
		throw Error(`${name} is registered twice`);
	registry.push({ name, text, cites });
	return text;
}

// What every prompt says first: the Reading, and the Sentence as evidence.

export const shared = {
	reading: paragraph(
		"shared.reading",
		"`reading` names one Reading of a German Lemma: `lemma` is its Canonical Form, `kind` its word class and `family` whether it is a word (Lexeme), a multiword expression (Locution) or a Saying. Its `emojiDescription`, one to four emoji, names the Reading's one meaning: write about that meaning, the one it has in every sentence where the word means it.",
		rules.meaning,
	),
	evidence: paragraph(
		"shared.evidence",
		"`markedSentence` marks one occurrence of it with <TARGET>…</TARGET>. The sentence is evidence of how the word is used, never a new meaning: a figurative or unusual use here, the sentence's scene and its other words' meanings change nothing about the Reading.",
		rules.meaning,
		rules.multiword,
	),
} as const;

// Luna's text aspects.

export const transcription = {
	task: paragraph(
		"transcription.task",
		"Write the broad IPA transcription of the Lemma's Canonical Form in standard German pronunciation, as a pronouncing dictionary gives it, with no slashes or brackets. A word spelled like another with another pronunciation takes the pronunciation of this Reading's meaning. Transcribe a multiword Lemma word by word, separated by spaces, keeping every sound of every word. An abbreviation or a symbol is transcribed as the words it is read aloud as, in IPA symbols, never in spelling («usw.»: ʊnt zoː ˈvaɪ̯tɐ).",
		rules.headword,
		rules.meaning,
	),
	output: paragraph(
		"transcription.output",
		"Answer with the transcription alone as the JSON string.",
		rules.headword,
	),
} as const;

export const definition = {
	task: paragraph(
		"definition.task",
		"Write a concise German definition of the Reading's meaning, in the style of a learner's dictionary: one phrase or short sentence that fits every use with this meaning, built from simpler words than the Lemma, and never the Lemma itself, a form of it or a second meaning. Define what the emoji name even when this sentence uses the word figuratively: a figurative use is one use of the meaning, not the meaning itself.",
		rules.meaning,
	),
	multiword: paragraph(
		"definition.multiword",
		"Define a Locution or a Saying by the meaning of the whole unit, not of its words, and a function word or a routine formula by what it does in a sentence or a conversation.",
		rules.multiword,
		rules.idiom,
		rules.routine,
	),
	output: paragraph(
		"definition.output",
		"Answer with the definition alone as the JSON string.",
		rules.meaning,
	),
} as const;

export const translation = {
	task: paragraph(
		"translation.task",
		"Translate the Reading's meaning into `language` (en: English, ru: Russian): give what a bilingual dictionary gives as this meaning's equivalent. Translate the meaning the emoji name, not another meaning of the German word, even one this sentence suggests, and not the meaning of a neighbouring word.",
		rules.translation,
		rules.meaning,
	),
	citation: paragraph(
		"translation.citation",
		"Write each equivalent in its dictionary headword form and carry over none of the sentence's tense, person, number, case or degree: a verb in its infinitive, a noun in the singular unless it exists only in the plural, an adjective in its positive. A verb's equivalent keeps the reflexive or particle its meaning needs. The equivalent translates the target alone: it takes in no neighbouring word, no object, adverb or predicative this sentence adds («Die Suppe riecht herrlich»: smell, пахнуть; not smell wonderful, вкусно пахнуть).",
		rules.translation,
		rules.headword,
		rules.ownPart,
	),
	form: paragraph(
		"translation.form",
		"Never pick a word only because it looks or sounds like the German one: a false friend names another thing. An abbreviation or a title takes the established equivalent of what it stands for, or the target language's usual rendering of it, never a coined word. A proper name keeps its own form, transliterated into Cyrillic for ru, unless the language has an established name for it («München»: Munich, Мюнхен); never translate its parts («Lindenstraße»: Lindenstraße, Линденштрассе).",
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
		"Answer with a JSON array of one equivalent, or up to three when the meaning has several equally usual ones, the most usual first; each a word or a short phrase, never a sentence.",
		rules.translation,
	),
} as const;

// Plural: Luna writes the forms, jev judges whether there are any.

export const plural = {
	task: paragraph(
		"plural.task",
		"Write the nominative plural forms the Reading's noun takes in this meaning, as Duden or DWDS gives them, the most usual first, at most three, each one word without an article. Another meaning of the same noun may form its plural otherwise («Leiter»: «Leitern» for the ladder, «Leiter» for the person in charge). Write no form when this meaning has no plural or no singular, and never a dative plural, whose -n the case adds.",
		rules.meaning,
		rules.pluralOnly,
	),
	adjectival: paragraph(
		"plural.adjectival",
		"A noun formed from an adjective or participle for a person gives only its weak plural after the definite article, the form its citation shares («Abgeordnete»: «Abgeordneten»).",
		rules.adjectivalPlural,
	),
	measure: paragraph(
		"plural.measure",
		"A measure noun gives only its regular plural; the uninflected form after a number is a measure construction, not a plural.",
		rules.measurePlural,
	),
	output: paragraph(
		"plural.output",
		"Answer with a JSON array of the plural forms, empty when there are none.",
		rules.pluralOnly,
	),
	question: paragraph(
		"plural.question",
		"Does the noun, in the meaning its Emoji Description names, have a singular and a plural?",
		rules.meaning,
		rules.pluralOnly,
	),
	hasPlural: paragraph(
		"plural.HasPlural",
		"Both: it is used in the singular and in the plural in this meaning",
		rules.pluralOnly,
	),
	noPlural: paragraph(
		"plural.NoPlural",
		"Singular only: this meaning is not used in the plural (a mass, a substance, an abstraction)",
		rules.pluralOnly,
	),
	pluralOnly: paragraph(
		"plural.PluralOnly",
		"Plural only: the dictionary gives this noun no singular and cites it in the plural",
		rules.pluralOnly,
	),
} as const;

// Conjugation Class: Luna writes the Präteritum, code judges the stem.

export const conjugation = {
	task: paragraph(
		"conjugation.task",
		"Write the third person singular Präteritum of the Reading's verb in this meaning, as Duden or DWDS lists it: a separable verb with its particle split off («reiste ab»), a reflexive verb without «sich». When this meaning has a strong and a weak Präteritum both in use, write both, the more usual first. Another meaning of the same verb may conjugate otherwise.",
		rules.conjugation,
		rules.meaning,
	),
	output: paragraph(
		"conjugation.output",
		"Answer with a JSON array of one or two forms.",
		rules.conjugation,
	),
} as const;

// Valency: Luna proposes the frame (ADR 0034, #675, #677).

export const valency = {
	task: paragraph(
		"valency.task",
		"Propose the Reading's Valency Frame: the Satzbauplan E-VALBU gives for this meaning, else Duden's. It lists the complements a learner must know to use the word in this meaning as Slots, in E-VALBU order with the subject first; a Slot holds one complement, or the alternatives that fill the same role.",
		rules.valency,
	),
	subject: paragraph(
		"valency.subject",
		"A verb's frame, a verbal Locution's included, opens with its subject: a Required Slot holding a Nom Case complement, whatever this sentence does with it (an imperative, an infinitive or a passive still has a subject in the frame). Only an expletive «es» subject takes no Slot.",
		rules.valency,
		rules.verbCore,
	),
	lesart: paragraph(
		"valency.lesart",
		"The frame is the Satzbauplan of the one Lesart the Emoji Description names. A complement this sentence leaves out still belongs in it; a complement only another meaning of the word takes does not, even when this sentence shows one.",
		rules.valency,
		rules.meaning,
	),
	status: paragraph(
		"valency.status",
		"A Slot is Optional when the word keeps this meaning without it, and Required when dropping it is ungrammatical or changes the meaning. When either of two complements completes the frame, both Slots are Optional.",
		rules.valency,
	),
	alternatives: paragraph(
		"valency.alternatives",
		"Alternatives share one Slot: each clause form the dictionary lists for a complement, and prepositions that alternate in the same role and meaning («plaudern» takes one Optional Slot of «über» + Acc and «von» + Dat).",
		rules.valency,
	),
	freeMarker: paragraph(
		"valency.freeMarker",
		"Include a complement the word requires even when its marker is free: a place («hausen» irgendwo), a direction («rücken» irgendwohin), a manner, a duration or an amount (Adverbial), a predicative, or a zu-infinitive («sich erdreisten»). The test is that dropping it is ungrammatical or changes the meaning. Leave out free adjuncts of time, place, manner or cause, a place or time complement the dictionary marks optional, and a free dative. Add an Adverbial, a Predicative or a Clause only when the dictionary's pattern for this meaning names it.",
		rules.valency,
		rules.governed,
	),
	preposition: paragraph(
		"valency.preposition",
		"A Preposition complement names the preposition the word selects and the case it governs in this construction («sich sehnen nach» + Dat, «pochen auf» + Acc). A participial adjective takes its verb's preposition unless the dictionary gives the adjective one of its own.",
		rules.governed,
		rules.valency,
	),
	route: paragraph(
		"valency.route",
		"An adjective's frame has no Nom Slot, since the copula owns the subject («neidisch»: «auf» + Acc). A noun's frame holds only the prepositions and clauses it governs («Sehnsucht»: «nach» + Dat), never a bare case. A Collocation's frame is its whole predicate's and takes its noun's government («Kritik üben»: «an» + Dat).",
		rules.valency,
		rules.copula,
		rules.collocation,
	),
	fixed: paragraph(
		"valency.fixed",
		"Fixed parts are never Slots: a separable prefix, a lexical reflexive («sich verbeugen» has no Slot for «sich»), an expletive es, and a Locution's own words. A Locution's fixed noun is never its object, nor its fixed prepositional phrase a Preposition complement: a Locution VERB's frame holds its subject and only what it governs beyond its own words («Däumchen drehen»: the Nom Slot alone; «einen Rat geben»: Nom, then a Dat Slot for whom).",
		rules.verbCore,
		rules.idiom,
	),
	referent: paragraph(
		"valency.referent",
		"A Case or Preposition complement's referent is the dictionary's jemand (Someone) or etwas (Something) for this meaning: Either when it gives both, or when a person and a thing fill it alike («sich kümmern um»: Either), never just what this sentence happens to show. A subject is Either whenever an institution, a machine, an event or a thing can fill it as well as a person; it is Someone only when the meaning needs a person who thinks, speaks, feels or acts on purpose, and Something only when no person can fill it.",
		rules.valency,
	),
	shapes: paragraph(
		"valency.shapes",
		"A Predicative names whether it describes the subject or the object and its marker: None, Als or Für («jemanden für klug halten»: Object, Für). A Clause names its form, ZuInfinitive, BareInfinitive, Dass, Ob or W, and its correlate: Required when the clause needs one, Optional when it may take one.",
		rules.valency,
	),
	output: paragraph(
		"valency.output",
		"Use only the complement kinds `complementKinds` names. Answer {valency: [...]} with the Slots in order, each {status, complements}, or {valency: []} when the Reading governs nothing.",
		rules.valency,
	),
} as const;

// Participle Source: Luna names the verb by form, jev checks it and judges the meaning.

export const participle = {
	task: paragraph(
		"participle.task",
		"Say which German verb the adjective's Canonical Form is a participle of, by its form: its Partizip II, or its Partizip I for an adjective in -end, letter for letter. A participle whose meaning moved away from its verb still names that verb («erhaben»: «erheben»).",
		rules.participle,
		rules.participial,
	),
	reflexive: paragraph(
		"participle.reflexive",
		"When the verb has a plain and a reflexive form, the noun the adjective describes picks one: the plain verb when the noun is its object, the reflexive verb when the noun is its subject («verliebt»: «sich verlieben»); when both fit, the plain verb, unless the dictionary files the participle under the reflexive.",
		rules.participle,
		rules.verbCore,
	),
	parts: paragraph(
		"participle.parts",
		"Write the verb's dictionary infinitive without «sich» (verb), the case of its lexical reflexive, Acc or Dat, or null (reflexive), its separable prefix or null (separablePrefix; an inseparable prefix such as ver- or ent- is none), its third person singular Präteritum (preterite) and the participle the adjective is, its Partizip II or, for an adjective in -end, its Partizip I (participle).",
		rules.verbCore,
		rules.participle,
	),
	none: paragraph(
		"participle.none",
		"Answer {verb: null} for a plain adjective, an un- form, and a word no verb builds as its participle even though a verb is spelled like it.",
		rules.participle,
		rules.participial,
	),
	formQuestion: paragraph(
		"participle.formQuestion",
		"A writer claims the adjective `adjective` is a participle of the verb `verb`. Conjugate the verb yourself: is it a German verb, and is the adjective, letter for letter, its Partizip II or its Partizip I?",
		rules.participle,
	),
	formYes: paragraph(
		"participle.Participle",
		"Yes: the adjective is that verb's participle",
		rules.participle,
	),
	formNo: paragraph(
		"participle.NotParticiple",
		"No: the verb builds no participle spelled so, or is no German verb",
		rules.participle,
	),
	meaningQuestion: paragraph(
		"participle.meaningQuestion",
		"The adjective's form is a participle of `verb`. Does a current meaning of that verb paraphrase the Reading's meaning, the one its Emoji Description names? Test a Partizip II in the passive (has been …ed) and a Partizip I in the progressive (is …ing).",
		rules.participle,
		rules.meaning,
	),
	verbal: paragraph(
		"participle.Verbal",
		"Verbal: a current meaning of the verb paraphrases it, figurative ones included («gekocht»: has been cooked)",
		rules.participle,
	),
	drifted: paragraph(
		"participle.Drifted",
		"Drifted: no current meaning of the verb paraphrases it; the verb only explains the form («erhaben» 'sublime'). Being comparable alone is no drift",
		rules.participle,
	),
	unsure: paragraph(
		"participle.Unresolved",
		"Cannot decide defensibly",
		rules.participle,
	),
} as const;

// Locution Type, Saying Type and Formula Role: jev judges, Luna writes an attribution (#669).

export const locutionType = {
	question: paragraph(
		"locutionType.question",
		"Which type is this Locution in the meaning its Emoji Description names?",
		rules.idiom,
		rules.collocation,
	),
	idiom: paragraph(
		"locutionType.Idiom",
		"Idiom: an established expression whose meaning is not the sum of its words («ins Gras beißen»)",
		rules.idiom,
	),
	collocation: paragraph(
		"locutionType.Collocation",
		"Collocation: a Funktionsverbgefüge, a verb that only supports its noun or adjective predicate, which carries the meaning: the whole means what the noun's own verb would («in Erwägung ziehen»: erwägen; «Anklage erheben»: anklagen). Its noun keeping its meaning makes it a Collocation, not Neither",
		rules.collocation,
	),
	none: paragraph(
		"locutionType.None",
		"Neither: neither an idiom nor a support-verb construction: a fixed pairing or formula whose words keep their own meanings and whose verb, if any, is no mere support",
		rules.idiom,
		rules.collocation,
	),
} as const;

export const sayingType = {
	question: paragraph(
		"sayingType.question",
		"Which type of Saying is this?",
		rules.saying,
	),
	proverb: paragraph(
		"sayingType.Proverb",
		"Proverb: a traditional saying with no known author («Übung macht den Meister»)",
		rules.saying,
	),
	wingedWord: paragraph(
		"sayingType.WingedWord",
		"Winged Word: a line from a known source, a writer, a work or a historical figure, used apart from it («Die Axt im Haus erspart den Zimmermann»)",
		rules.saying,
	),
	attribution: paragraph(
		"sayingType.attribution",
		"The Saying is a Winged Word, a line from a known source. Name its source as `Author, Work`, the work left out when it is unknown, as a reference collection such as Büchmann gives it.",
		rules.saying,
	),
	attributionOutput: paragraph(
		"sayingType.attributionOutput",
		"Answer with the attribution alone as the JSON string, or null when no source is known.",
		rules.saying,
	),
} as const;

/** The Formula Roles and what each means, as the judge reads them. */
export const formulaRole = {
	question: paragraph(
		"formulaRole.question",
		"Which conversational routine does this formula perform in the meaning its Emoji Description names?",
		rules.formulaRole,
		rules.routine,
	),
	options: {
		Greeting: paragraph(
			"formulaRole.Greeting",
			"Greeting: opens an encounter («grüß Gott»)",
			rules.formulaRole,
		),
		Farewell: paragraph(
			"formulaRole.Farewell",
			"Farewell: closes an encounter or a letter («bis bald»)",
			rules.formulaRole,
		),
		Thanks: paragraph(
			"formulaRole.Thanks",
			"Thanks: expresses gratitude",
			rules.formulaRole,
		),
		Apology: paragraph(
			"formulaRole.Apology",
			"Apology: excuses oneself or asks pardon",
			rules.formulaRole,
		),
		Sympathy: paragraph(
			"formulaRole.Sympathy",
			"Sympathy: a formula said to someone to condole or wish them well in misfortune («herzliches Beileid»); a sigh of one's own regret is no Sympathy",
			rules.formulaRole,
		),
		Request: paragraph(
			"formulaRole.Request",
			"Request: asks someone to do something",
			rules.formulaRole,
		),
		Acknowledgment: paragraph(
			"formulaRole.Acknowledgment",
			"Acknowledgment: a fixed formula confirming that something was heard or accepted; a plain answer of yes or no is none",
			rules.formulaRole,
		),
		Refusal: paragraph(
			"formulaRole.Refusal",
			"Refusal: a fixed formula declining an offer or request; a plain answer of no is none",
			rules.formulaRole,
		),
		Reaction: paragraph(
			"formulaRole.Reaction",
			"Reaction: only a fixed reply to a trigger («nicht der Rede wert» after thanks), never just any reply",
			rules.formulaRole,
		),
		Initiation: paragraph(
			"formulaRole.Initiation",
			"Initiation: opens a request or a turn, such as catching someone's attention",
			rules.formulaRole,
		),
		Transition: paragraph(
			"formulaRole.Transition",
			"Transition: moves a conversation to another topic or stage",
			rules.formulaRole,
		),
		None: paragraph(
			"formulaRole.None",
			"None: it performs no routine: an exclamation of feeling, surprise, dismay or disgust, laughter, a sound word, an answer particle such as yes or no, an attention word that only voices annoyance, or a wish or congratulation, which no role names",
			rules.formulaRole,
		),
	},
} as const;

// Semantic Relations: Luna lists candidates, jev judges each one.

export const relationCandidates = {
	task: paragraph(
		"relations.task",
		"List German words and expressions that Duden, DWDS or OpenThesaurus list in one of the relations `relations` names to the Reading's meaning: at most twelve, each written as its dictionary headword. List candidates, not labels; a judge decides each one's relation.",
		rules.relations,
		rules.headword,
	),
	whole: paragraph(
		"relations.whole",
		"A candidate holds for the whole Reading, every use its Emoji Description names, not only this sentence's. A Saying relates only to other Sayings; a word or a Locution relates to words and Locutions.",
		rules.relations,
		rules.meaning,
	),
	output: paragraph(
		"relations.output",
		"Answer with a JSON array of the candidates, empty when there are none.",
		rules.relations,
	),
} as const;

/** What each relation means, stated once per judgment (#697). */
export const relationDefinitions = {
	synonym: paragraph(
		"relations.synonym",
		"synonym: means the same as the Reading in this meaning and can replace it; a register difference neither demotes nor blocks it, and a dictionary's gloss is no synonym listing.",
		rules.relations,
	),
	nearSynonym: paragraph(
		"relations.nearSynonym",
		"nearSynonym: means nearly the same, with a real difference of meaning, scope or perspective.",
		rules.relations,
	),
	antonym: paragraph(
		"relations.antonym",
		"antonym: its direct opposite, as a dictionary lists it; not one read off a definition's negation.",
		rules.relations,
	),
	nearAntonym: paragraph(
		"relations.nearAntonym",
		"nearAntonym: a conventional contrast short of a direct opposite, never just another member of the same set.",
		rules.relations,
	),
	hypernym: paragraph(
		"relations.hypernym",
		"hypernym: a broader category the dictionary lists as its Oberbegriff, not a definition's genus and not a catch-all such as «Ding».",
		rules.relations,
	),
	holonym: paragraph(
		"relations.holonym",
		"holonym: a whole it is a part, member or substance of; not a broader category.",
		rules.relations,
	),
	endonym: paragraph(
		"relations.endonym",
		"endonym: the local name of the place this proper noun names in another language.",
		rules.relations,
	),
} as const;

export const relationJudgment = {
	policy: paragraph(
		"relations.policy",
		"A writer listed `candidates` as related to the Reading. A relation holds only when Duden, DWDS or OpenThesaurus list it for this meaning and it holds for the whole Reading. Each relation the Reading may take is defined in `relations`; each word class in `kinds`.",
		rules.relations,
	),
	relation: paragraph(
		"relations.question",
		"Which relation does this candidate bear to the Reading?",
		rules.relations,
	),
	none: paragraph(
		"relations.None",
		"None of the listed relations holds",
		rules.relations,
	),
	unsure: paragraph(
		"relations.Unsure",
		"Cannot decide defensibly",
		rules.relations,
	),
	kind: paragraph(
		"relations.kind",
		"Which word class is this candidate as a whole unit?",
		rules.headword,
	),
	otherFamily: paragraph(
		"relations.OtherFamily",
		"It is no unit of the kind listed, such as a sentence or a free phrase",
		rules.relations,
	),
} as const;

/** The word classes a relation candidate may take, each defined once (#669). */
export const kindDefinitions = {
	NOUN: paragraph(
		"kinds.NOUN",
		"NOUN: a noun or a noun phrase acting as one",
		rules.headword,
	),
	PROPN: paragraph("kinds.PROPN", "PROPN: a proper name", rules.headword),
	VERB: paragraph(
		"kinds.VERB",
		"VERB: a verb, or an expression acting as one",
		rules.headword,
	),
	ADJ: paragraph(
		"kinds.ADJ",
		"ADJ: an adjective, or an expression acting as one",
		rules.headword,
	),
	ADV: paragraph(
		"kinds.ADV",
		"ADV: an adverb, or an expression acting as one",
		rules.headword,
	),
	ADP: paragraph("kinds.ADP", "ADP: a preposition", rules.headword),
	CCONJ: paragraph(
		"kinds.CCONJ",
		"CCONJ: a coordinating conjunction",
		rules.headword,
	),
	SCONJ: paragraph(
		"kinds.SCONJ",
		"SCONJ: a subordinating conjunction",
		rules.headword,
	),
	INTJ: paragraph(
		"kinds.INTJ",
		"INTJ: an interjection or a routine formula",
		rules.routine,
	),
	NUM: paragraph("kinds.NUM", "NUM: a numeral", rules.headword),
	PRON: paragraph("kinds.PRON", "PRON: a pronoun", rules.headword),
	DET: paragraph("kinds.DET", "DET: a determiner", rules.headword),
} as const;

/** Every registered paragraph, as dumspec's citation check reads it. */
export function knowledgePromptTexts(): readonly CitingPrompt[] {
	return registry.map(({ name, text, cites }) => ({
		name: `de/knowledge/${name}`,
		text,
		paragraphs: [
			{
				opens: text.slice(0, 32),
				implements: cites.map(([rule, hash]) => ({ rule, hash })),
			},
		],
	}));
}

/** Every registered paragraph's text, for the tests. */
export function knowledgeParagraphs(): readonly string[] {
	return registry.map(({ text }) => text);
}

/** The German words the prompts quote «…», as written. */
export function knowledgeExamples(): readonly string[] {
	return registry.flatMap(({ text }) =>
		[...text.matchAll(/«([^»]+)»/gu)].map(([, example]) => example ?? ""),
	);
}
