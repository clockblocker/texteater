/**
 * The texts the structural aspects send (#883 addenda), each a paragraph
 * that cites the dumcorpus Rules it states at the statement hash it was last
 * checked against (ADR 0037, #695): a noun's plural, a verb's principal
 * parts, an adjective's Participle Source, and a Locution's, Saying's or
 * formula's type. `prompts.ts` keeps the Reading, the evidence and the other
 * aspects' texts; this registry is apart to keep each file under the
 * file-token limit.
 *
 * German examples are quoted «…», so the disjointness test can read them;
 * none is a Lemma of the Knowledge gold or the spot-check samples (#693).
 */
import type { CitingPrompt } from "dumcorpus/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";

/** The Rules the structural prompts cite, at the statement hashes they were checked against. */
const rules = {
	meaning: ["de/emoji-description-names-the-meaning", "5532d94dbbc3bb71"],
	idiom: ["de/idiom", "c05df428b3a42079"],
	verbCore: ["de/verb-core-features", "584917189382edfe"],
	collocation: [
		"de/funktionsverbgefuege-are-collocations",
		"57f04b272a0e9aeb",
	],
	adjectivalPlural: ["de/adjectival-noun-plural-is-weak", "c7da6a431e81b3b7"],
	measurePlural: ["de/measure-noun-plural-is-regular", "ef9b7f1e15f48290"],
	pluralOnly: ["de/plural-only-noun-has-no-gender", "92946b73a6244500"],
	conjugation: ["de/conjugation-class-from-praeteritum", "c9973355dfb7314c"],
	principalParts: [
		"de/principal-parts-as-the-dictionary-cites",
		"3757ab1bafee87f5",
	],
	participle: ["de/participle-source-verb-and-meaning", "a97545caefc4a184"],
	participial: ["de/participial-adjective", "5d4481bf31cb7267"],
	formulaRole: ["de/formula-role-is-narrow", "68e794801a922563"],
	routine: ["de/routine-formula-is-intj", "32797f3b5f083780"],
	saying: ["de/saying-needs-uptake", "b191e72860fbbf9c"],
} as const satisfies Readonly<Record<string, Cite>>;

const registry = paragraphRegistry("de/knowledge-structure");
const { paragraph } = registry;

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

// Principal Parts (ADR 0038, #1217): Luna writes the forms, code judges the
// stem's Conjugation Class on the Präteritum and Dumrel checks each aspect.

export const verbForms = {
	task: paragraph(
		"verbForms.task",
		"Write the principal parts of the Reading's verb in this meaning, as Duden or DWDS lists them: its third person singular Präteritum (preterite), its Präsens forms for ich, du and er (presentSingular: first, second, third), its Partizip II (pastParticiple) and its third person singular Konjunktiv II (subjunctivePast). When this meaning has a strong and a weak form both in use, write both, the more usual first. Another meaning of the same verb may conjugate otherwise.",
		rules.conjugation,
		rules.principalParts,
		rules.meaning,
	),
	spelling: paragraph(
		"verbForms.spelling",
		"A separable verb's finite forms split off the particle («reiste ab», «hält an», «hielte an») and its Partizip II is one word («angehalten»); a reflexive verb's forms drop «sich». A verb with an inseparable prefix or an unstressed first syllable takes no ge- («verkauft», «posaunt», «studiert»).",
		rules.conjugation,
		rules.principalParts,
	),
	subjunctive: paragraph(
		"verbForms.subjunctive",
		"The Konjunktiv II is the verb's own one-word form, never a periphrasis: a Weak verb's is its Präteritum, a Strong or Mixed verb's has its own form («hielte», «dächte»).",
		rules.principalParts,
	),
	output: paragraph(
		"verbForms.output",
		"Answer with a JSON object: preterite, pastParticiple and subjunctivePast each an array of one or two forms, and presentSingular an object whose first, second and third are each an array of one or two forms.",
		rules.conjugation,
		rules.principalParts,
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

/** Every registered paragraph, as dumcorpus's citation check reads it. */
export function structurePromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}

/** Every registered paragraph's text, for the tests. */
export function structureParagraphs(): readonly string[] {
	return registry.paragraphs();
}

/** The German words the prompts quote «…», as written. */
export function structureExamples(): readonly string[] {
	return registry.examples();
}
