import { question } from "./question.js";
import { paragraph, rules } from "./registry.js";

// Option labels, by question, each keyed by the answer code reads; key
// order is the order jev sees. A question whose options are built per
// click (a member's Typo, a prefix, an auxiliary's uses, the cases a
// table allows) labels them from these tables or adds the table's fixed
// options to them.

const caseNames = {
	Nom: "Nominative, as a subject or a predicate noun",
	Acc: "Accusative, as a direct object or after a preposition that takes it",
	Dat: "Dative, as an indirect object or after a preposition that takes it",
	Gen: "Genitive, as a possessor or after a preposition that takes it",
} as const;
const genderNames = {
	Masc: "Masculine",
	Fem: "Feminine",
	Neut: "Neuter",
} as const;

export const options = {
	case: caseNames,
	nounCase: { ...caseNames, Unmarked: question.unmarkedCase },
	number: { Sing: "Singular", Plur: "Plural" },
	orthography: { None: question.orthographyNone },
	spelling: {
		Canonical: question.spellingCanonical,
		Licensed: "Another spelling a current standard accepts",
		Historical: "A spelling only an earlier standard accepted",
		Regional: "A dialect or regional spelling",
		Expressive: "Letters stretched for effect",
	},
	archaic: { Current: "A current form", Archaic: "An archaic form" },
	citation: {
		Used: "Used in the sentence, inflected as its role there needs",
		Citation: "Only mentioned, as a dictionary entry, a name or a title",
	},
	auxiliary: { Main: question.auxiliaryMain },
	expletive: {
		Subject: "Yes: the subject es, referring to nothing",
		None: "No: an object or a fixed word of the expression",
	},
	prefix: {
		None: "No separable prefix: the verb's dictionary infinitive is written without any of these",
	},
	verbForm: {
		Fin: "Finite: its own finite verb or auxiliary, an imperative included",
		Inf: "An infinitive, a separate modal's finite form aside",
		Part: "A participle, without its own finite or infinitive auxiliary",
	},
	mood: {
		Ind: "Indicative",
		Sub: "Subjunctive, Konjunktiv I or II",
		Imp: "Imperative",
	},
	tense: { Pres: "Present", Past: "Past" },
	person: {
		"1": "First person",
		"2": "Second person",
		"3": "Third person, formal Sie included",
	},
	participle: { Present: "Present participle", Past: "Past participle" },
	properArticle: {
		Definite: "Cited with its definite article",
		Bare: "Cited bare",
	},
	properGender: {
		der: question.properGenderMasc,
		die: question.properGenderFem,
		das: question.properGenderNeut,
		None: question.properGenderNone,
	},
	nounGender: {
		der: question.nounGenderMasc,
		die: question.nounGenderFem,
		das: question.nounGenderNeut,
		None: question.nounGenderNone,
	},
	freeGender: {
		Yes: question.nounFreeGenderYes,
		No: question.nounFreeGenderNo,
	},
	nounKind: {
		Ordinary: question.nounKindOrdinary,
		PluralOnly: question.nounKindPluralOnly,
		Adjectival: question.nounKindAdjectival,
	},
	formGender: {
		der: "Masculine, as der shows",
		die: "Feminine, as die shows",
		das: "Neuter, as das shows",
	},
	indefinite: {
		Asks: question.indefiniteAsks,
		Indefinite: question.indefiniteIrgend,
	},
	comparable: { Yes: question.comparableYes, No: question.comparableNo },
	degree: {
		Pos: "Positive, uncompared",
		Cmp: "Comparative",
		Sup: "Superlative, am … -sten included",
	},
	attributive: {
		Yes: "It agrees with a noun",
		No: "Predicative or adverbial, agreeing with nothing",
	},
	inflects: { Yes: "It inflects here", No: "Invariant here" },
	agreementGender: {
		...genderNames,
		Unmarked: "No gender: plural agreement",
	},
	realizedCase: { None: question.realizedCaseNone },
	answer: { Res: "An answer word", None: "Another interjection" },
	sourceLanguage: {
		en: "English",
		fr: "French",
		it: "Italian",
		es: "Spanish",
		la: "Latin",
		pt: "Portuguese",
		nl: "Dutch",
		sv: "Swedish",
		ru: "Russian",
		tr: "Turkish",
		ja: "Japanese",
	},
	coverage: {
		Full: "All of its fixed wording is realized",
		Partial: "Some fixed wording is missing or deliberately changed",
	},
	governed: {
		Governed: "Yes, the head selects it",
		Free: question.governedFree,
	},
	governedAdverb: {
		Governed:
			"Yes: that preposition is a fixed word of the expression heading its open slot",
		Free: "No: the expression has no such fixed word",
	},
	governedReferent: {
		Someone: "A person or people",
		Something: "A thing, place, event, fact or idea",
		Either: "Either: the sentence leaves it open or it names both",
	},
} as const;

/** A Case a NOUN's Case question may offer: a case, or Unmarked. */
export type CaseOption = keyof typeof options.nounCase;

/**
 * How the cell question's options name a closed-class cell's coordinates,
 * keyed by the feature values its Core and Surface give, in the order the
 * option lists them.
 */
export const cellCoordinates = {
	case: {
		Nom: "nominative",
		Acc: "accusative",
		Dat: "dative",
		Gen: "genitive",
	},
	number: { Sing: "singular", Plur: "plural" },
	gender: { Masc: "masculine", Fem: "feminine", Neut: "neuter" },
	person: "person {n}",
	polite: "formal address",
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
	"lassen 🗣👉": paragraph(
		"question.auxiliary.lassen-causative",
		"Causative lassen with an infinitive whose doer the clause does not name; never lassen with its own reflexive, the modal passive ('can be done')",
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
