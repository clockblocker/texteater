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
 *   prompt has one wording. The one translation prompt's paragraphs live
 *   in `translation-prompts.ts`.
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
	multiword: [
		"de/multiword-unit-describes-its-whole-meaning",
		"99996175abb4200d",
	],
	idiom: ["de/idiom", "d25679f2a06809b9"],
	headword: ["de/canonical-form-is-the-headword", "43184aac9186aceb"],
	copula: ["de/copula-stays-apart", "8982593963a4d507"],
	valency: ["de/valency-frame-follows-e-valbu", "bb0916c5f324dcf2"],
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

// Valency: Luna extracts the concrete pattern realized in this sentence
// (ADR 0034), written in the dictionary notation `valency-prompts.ts` states.

export const valency = {
	task: paragraph(
		"valency.task",
		"Extract the concrete Valency Pattern that <TARGET> actually realizes in `markedSentence` under this Reading's meaning. List only the governed complements present in this sentence — never add optional complements this sentence omits and never list unencountered alternatives.",
		rules.valency,
	),
	subject: paragraph(
		"valency.subject",
		"A verb's pattern, a verbal Locution's included, opens with its subject N, whatever this sentence does with it (an imperative, an infinitive or a passive still has an active subject N). In a passive sentence, map the passive subject back to its active case (A or D). Only a verb whose subject is purely an expletive «es» takes no N.",
		rules.valency,
	),
	reflexive: paragraph(
		"valency.reflexive",
		"A lexical reflexive, a sich no other noun phrase could replace in this meaning, stands right after the subject as a Reflexive complement in the case the meaning fixes. Test it in the first person: with ich as the subject, in this meaning, the reflexive reads mich for Acc and mir for Dat («beeilen»: ich beeile mich, Nom, Reflexive Acc; «merken»: ich merke mir etwas, Nom, Reflexive Dat, Acc). Inside a fixed phrase it is the object of the phrase's preposition, which the Reflexive names, in the case that preposition governs there («an sich halten»: Reflexive «an» + Dat). A 🪞 Reading always includes its lexical Reflexive in every pattern. Without 🪞, a sich another object could replace in this meaning is an ordinary Acc or Dat Case complement.",
		rules.verbCore,
		rules.ownsMembers,
		rules.distinct,
		rules.valency,
	),
	lesart: paragraph(
		"valency.lesart",
		"The pattern belongs to the one Lesart the Emoji Description names, grounded in this sentence's actual realization. Never invent complements absent from `markedSentence`, and never include free adjuncts.",
		rules.valency,
		rules.meaning,
	),
	freeMarker: paragraph(
		"valency.freeMarker",
		"Include a governed complement realized in `markedSentence` even when its marker is free: a place («hausen» irgendwo), a direction («rücken» irgendwohin), a manner, a duration or an amount (Adverbial), a predicative, or a clause/infinitive («erdreisten» zu+Inf). Leave out free adjuncts of time, place, manner or cause, and leave out free datives.",
		rules.valency,
		rules.governed,
	),
	preposition: paragraph(
		"valency.preposition",
		"A Preposition complement names the governed preposition realized in `markedSentence` and the case it governs there («fahnden nach» + Dat, «pochen auf» + Acc). When a da(r)- pronominal adverb anticipates a subordinate clause or infinitive («darauf achten, dass …»), record the Clause with that preposition («auf dass») instead of a separate Preposition complement.",
		rules.governed,
		rules.valency,
	),
	route: paragraph(
		"valency.route",
		"An adjective's pattern has no Nom, since the copula owns the subject («neidisch auf jemanden»: «auf» + Acc; bare «neidisch» with no complement in the sentence: empty). A noun's pattern holds only the prepositions and clauses it governs in this sentence («Sehnsucht nach dem Meer»: «nach» + Dat; bare «Sehnsucht»: empty), never a bare case. A Collocation's pattern is its whole predicate's and includes any governed complement realized for its noun («Kritik an dem Plan üben»: Nom, «an» + Dat; bare «Kritik üben»: Nom alone).",
		rules.valency,
		rules.copula,
		rules.collocation,
	),
	fixed: paragraph(
		"valency.fixed",
		"Fixed parts are never complements: a separable prefix, an expletive es, and a Locution's own words. A Locution's fixed noun is never its object, nor its fixed prepositional phrase a Preposition complement: a Locution VERB's pattern holds its subject, its lexical reflexive if any, and only what it governs beyond its own words in `markedSentence` («Däumchen drehen»: N alone; «ihm einen Rat geben»: N D; «sich ins Zeug legen»: N sich(A)).",
		rules.verbCore,
		rules.idiom,
		rules.ownsMembers,
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
