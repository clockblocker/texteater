/**
 * Every text `knowledge.produce` sends but the structural aspects'
 * (`structure-prompts.ts`), each a paragraph that cites the dumcorpus Rules
 * it states at the statement hash it was last checked against (ADR 0037,
 * #695): Luna's system prompts for the text it writes, jev's policies,
 * questions and options for the choices it judges.
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
import type { CitingPrompt } from "dumcorpus/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";

/** The Rules the Knowledge prompts cite, at the statement hashes they were checked against. */
const rules = {
	meaning: ["de/emoji-description-names-the-meaning", "5532d94dbbc3bb71"],
	translation: ["de/translation-gives-the-equivalent", "51e2aee5b7c8f087"],
	multiword: [
		"de/multiword-unit-describes-its-whole-meaning",
		"99996175abb4200d",
	],
	idiom: ["de/idiom", "d25679f2a06809b9"],
	headword: ["de/canonical-form-is-the-headword", "43184aac9186aceb"],
	ownPart: ["de/copula-describes-its-own-part", "986b2cb2531c76d7"],
	copula: ["de/copula-stays-apart", "8982593963a4d507"],
	valency: ["de/valency-frame-follows-e-valbu", "f0b9c8226ff45fb8"],
	governed: [
		"de/governed-preposition-joins-its-governor",
		"19c59bf41ed26810",
	],
	verbCore: ["de/verb-core-features", "53f39c352354bcbe"],
	ownsMembers: ["de/verb-owns-its-scattered-members", "9139952c458faeb2"],
	distinct: [
		"de/distinct-concepts-get-distinct-readings",
		"434871d7862a9fb0",
	],
	collocation: [
		"de/funktionsverbgefuege-are-collocations",
		"57f04b272a0e9aeb",
	],
	relations: ["de/relations-need-a-dictionary", "a45d1c0592489d6d"],
	routine: ["de/routine-formula-is-intj", "32797f3b5f083780"],
} as const satisfies Readonly<Record<string, Cite>>;

const registry = paragraphRegistry("de/knowledge");
const { paragraph } = registry;

// What every prompt says first: the Reading, and the Sentence as evidence.

export const shared = {
	reading: paragraph(
		"shared.reading",
		"`reading` names one Reading of a German Lemma: `lemma` is its Canonical Form, `kind` its word class and `family` whether it is a word (Lexeme), a multiword expression (Locution) or a Saying. Its `emojiDescription`, one to four emoji, names the Reading's one meaning: write about that meaning, the one it has in every sentence where the word means it. A description that starts with 🪞 names the meaning the word has with its lexical reflexive sich, which the Canonical Form leaves out; the other emoji name that meaning.",
		rules.meaning,
		rules.distinct,
		rules.verbCore,
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
		"Write the broad IPA transcription of the Lemma's Canonical Form in standard German pronunciation, as a pronouncing dictionary gives it, with no slashes or brackets. A word spelled like another with another pronunciation takes the pronunciation of this Reading's meaning. Transcribe a multiword Lemma word by word, separated by spaces, keeping every sound of every word. An abbreviation or a symbol is transcribed as the words it is read aloud as in this meaning, all of them, in IPA symbols, never in spelling («usw.»: ʊnt zoː ˈvaɪ̯tɐ; «+» read as plus: plʊs).",
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
		"Write a concise German definition of the Reading's meaning, in the style of a learner's dictionary: one phrase or short sentence that fits every use with this meaning, built from simpler words than the Lemma, and never the Lemma itself, a form of it or a second meaning. Define what the emoji picture, in its literal use when they picture a literal one, even when this sentence uses the word figuratively: a figurative use is one use of the meaning, which the definition need not name.",
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
		"Write each equivalent in its dictionary headword form and carry over none of the sentence's tense, person, number, case or degree: a verb in its infinitive, a noun in the singular unless it exists only in the plural, an adjective in its positive. A verb's equivalent keeps the reflexive or particle its meaning needs, and every equivalent keeps the Reading's word class: an adverb takes an adverb, never an adjective of the same root. The equivalent translates the target alone, in every language: it takes in no neighbouring word, no object, adverb or predicative this sentence adds («Die Suppe riecht herrlich»: smell, пахнуть; not smell wonderful, вкусно пахнуть).",
		rules.translation,
		rules.headword,
		rules.ownPart,
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
		"Answer with a JSON array of one equivalent, or up to three when the meaning has several equally usual ones, the most usual first; each a word or a short phrase, never a sentence.",
		rules.translation,
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
	),
	reflexive: paragraph(
		"valency.reflexive",
		"A lexical reflexive, a sich no other noun phrase could replace in this meaning, takes a Slot of its own right after the subject, holding one Reflexive complement in the case the meaning fixes: Acc, or Dat where an accusative object or a clause also stands with the verb («beeilen»: Nom, Reflexive Acc; «merken»: Nom, Reflexive Dat, Acc). It is Required exactly when the Emoji Description starts with 🪞. Without 🪞 it is Optional where the word keeps this meaning with and without it («ausruhen»), and absent otherwise. A sich another object could replace in this meaning is an ordinary Acc or Dat Case complement.",
		rules.verbCore,
		rules.ownsMembers,
		rules.distinct,
		rules.valency,
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
		"Include a complement the word requires even when its marker is free: a place («hausen» irgendwo), a direction («rücken» irgendwohin), a manner, a duration or an amount (Adverbial), a predicative, or a zu-infinitive («erdreisten»). The test is that dropping it is ungrammatical or changes the meaning. Leave out free adjuncts of time, place, manner or cause, a place or time complement the dictionary marks optional, and a free dative. Add an Adverbial, a Predicative or a Clause only when the dictionary's pattern for this meaning names it.",
		rules.valency,
		rules.governed,
	),
	preposition: paragraph(
		"valency.preposition",
		"A Preposition complement names the preposition the word selects and the case it governs in this construction («fahnden nach» + Dat, «pochen auf» + Acc). A participial adjective takes its verb's preposition unless the dictionary gives the adjective one of its own.",
		rules.governed,
		rules.valency,
	),
	route: paragraph(
		"valency.route",
		"An adjective's frame has no Nom Slot, since the copula owns the subject («neidisch»: «auf» + Acc). A noun's frame holds only the prepositions and clauses it governs («Sehnsucht»: «nach» + Dat), never a bare case. A Collocation's frame is its whole predicate's and takes its noun's government («Kritik üben»: «an» + Dat), and a copula expression its reflexive makes a verbal Locution has a verb's subject and Reflexive Slot.",
		rules.valency,
		rules.copula,
		rules.collocation,
	),
	fixed: paragraph(
		"valency.fixed",
		"Fixed parts are never Slots: a separable prefix, an expletive es, and a Locution's own words. A Locution's fixed noun is never its object, nor its fixed prepositional phrase a Preposition complement: a Locution VERB's frame holds its subject, its lexical reflexive and only what it governs beyond its own words («Däumchen drehen»: the Nom Slot alone; «einen Rat geben»: Nom, then a Dat Slot for whom; «ins Zeug legen» with sich: Nom, then a Reflexive Dat).",
		rules.verbCore,
		rules.idiom,
		rules.ownsMembers,
	),
	referent: paragraph(
		"valency.referent",
		"A Case or Preposition complement's referent is the dictionary's jemand (Someone) or etwas (Something) for this meaning: Either when it gives both, or when a person and a thing fill it alike («kümmern» with «um»: Either), never just what this sentence happens to show. A subject is Either whenever an institution, a machine, an event or a thing can fill it as well as a person; it is Someone only when the meaning needs a person who thinks, speaks, feels or acts on purpose, and Something only when no person can fill it.",
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

// Semantic Relations: Luna lists candidates, jev judges each one.

export const relationCandidates = {
	task: paragraph(
		"relations.task",
		"List German words and expressions that Duden, DWDS or OpenThesaurus list in one of the relations `relations` names to the Reading's meaning: at most twelve, each written as its dictionary headword, a verb or a verbal expression without its reflexive sich. List candidates, not labels; a judge decides each one's relation.",
		rules.relations,
		rules.headword,
		rules.verbCore,
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
		"synonym: means the same as the Reading in this meaning and can replace it; a register or regional difference neither demotes nor blocks it, and a dictionary's gloss is no synonym listing.",
		rules.relations,
	),
	nearSynonym: paragraph(
		"relations.nearSynonym",
		"nearSynonym: means nearly the same, with a real difference of meaning, scope or perspective; a register or regional difference alone is none, but an abwertend or pejorativ label demotes a synonym to a near synonym (Kind, Balg).",
		rules.relations,
	),
	antonym: paragraph(
		"relations.antonym",
		"antonym: its direct opposite, as a dictionary lists it; not one read off a definition's negation.",
		rules.relations,
	),
	nearAntonym: paragraph(
		"relations.nearAntonym",
		"nearAntonym: a conventional contrast short of a direct opposite, never just another member of the same set, including a converse (kaufen: verkaufen) only when a dictionary lists it as Gegenteil.",
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

/** Every registered paragraph, as dumcorpus's citation check reads it. */
export function knowledgePromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}

/** Every registered paragraph's text, for the tests. */
export function knowledgeParagraphs(): readonly string[] {
	return registry.paragraphs();
}

/** The German words the prompts quote «…», as written. */
export function knowledgeExamples(): readonly string[] {
	return registry.examples();
}
