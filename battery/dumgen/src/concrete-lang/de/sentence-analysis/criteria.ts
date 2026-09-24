/**
 * The rules and inventories behind the German Sentence Analysis (Dumgen ADR
 * 0006). Measured in `prototypes/intake/` (README, "Two layers"): the Lexeme
 * layer keeps the shipped `targetCriteria` wording with only its Phraseme and
 * Fusion sentences removed; rewriting the realization rules collapsed the
 * membership accuracy, so the text stays verbatim.
 */
import { targetCriteria } from "../target-classification/judgments.js";

export const notation =
	"In `sentence`, <sN> tags identify selectable occurrences by original segment index N. Untagged text supplies context only. Every occurrence belongs to exactly one complete fixed unit; most units have exactly one member.";

/** The realization rules: which Segments realize one word. */
export const realizationCriteria = targetCriteria
	.replace(
		"Select the largest complete fixed learner-facing unit containing the clicked occurrence.",
		"Select the complete fixed unit containing the clicked occurrence: one dictionary word together with its fixed grammatical members. A multiword expression (an idiom, a collocation, a Funktionsverbgefüge, a proverb, a formula) is not a unit here: every word inside it is its own unit with its own grammatical members, and the expression is judged separately.",
	)
	.replace(
		/ A Funktionsverbgefüge, a support verb with its predicate noun \([^)]*\), is one Collocation target[^.]*\.(?: [^.]*\.)?/u,
		"",
	)
	.replace(
		/An established noncompositional expression is an Idiom;[^\n]*?only a support-verb predicate is a Collocation\.\n/u,
		"A fused preposition and article (im, zum, ins, zur) is one ADP unit whose article part belongs to the following noun.\n",
	)
	.replace(
		"im/zum/ins remain ADP and do not join nouns. Their internal article may supply noun grammar later without adding the fused word to noun membership.",
		"im/zum/ins do not join nouns as a whole.",
	)
	.replace(
		" These noun rules preserve any larger established idiom boundary.",
		"",
	);

/** The fixedness rules: which words are fixed lexical members of one expression. */
export const fixednessCriteria = `An expression is an established multiword unit with its own dictionary identity, made of words that are its fixed lexical members. A word is a fixed lexical member when the expression requires this particular word or a narrow set of alternatives in this slot: replacing it with an ordinary synonym would break the expression. A fixed preposition or fixed article of the expression counts as a member through the word that carries it (ins Feuer, zur Verfügung, das Eis). Free arguments, modifiers and fillers are never members, however close they stand: in stellt den Schülern Material zur Verfügung the expression is stellt ... zur Verfügung and den Schülern and Material are free.
Degrees of fixedness. A free combination lets every word be replaced by a synonym (ein Buch kaufen). A preferred combination is conventional but freely replaceable and has no expression of its own (starker Regen). A collocation is only a German Funktionsverbgefüge, a support verb with its predicate noun: the lexical choice is restricted while the meaning stays compositional (zur Verfügung stellen, in Frage kommen, eine Entscheidung treffen, eine Frage stellen, zur Kenntnis nehmen, Abschied nehmen). An idiom is established and noncompositional in this contextual meaning, with or without a noun (den Faden verlieren, das Eis brechen, Öl ins Feuer gießen, es in sich haben); identical literal wording used literally is not an idiom. A discourse formula is a fixed conversational routine (Guten Morgen, Herzlichen Dank, Wie geht's). A proverb is a traditional complete saying (Morgenstund hat Gold im Mund); an aphorism is an established attributed maxim (Zeit ist Geld).
Mere proximity, frequency or ordinary compositional combination never establishes an expression. When membership is uncertain or contradictory, answer Unresolved instead of repairing, trimming or extending the expression.`;

/** The Lexeme layer's route inventory: Lexeme Kinds only (AUX is not a route, ADR 0026). */
export const lexemeRoutes: Record<string, string> = {
	"Lexeme/ADJ":
		"Adjective, including adjectival participles, established property predicates, comparative and adverbially used adjectives",
	"Lexeme/ADP":
		"Adposition (preposition, postposition or fixed circumposition), including one that is a fixed part of a larger expression",
	"Lexeme/ADV":
		"Adverb, including a whole adverbial correlator (einerseits/andererseits, teils/teils)",
	"Lexeme/CCONJ":
		"Coordinating conjunction, including a complete fixed correlator (entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch, je/desto)",
	"Lexeme/DET":
		"A determiner directly modifying a noun (mein, dieser, kein, welcher, jeder), never the absorbed article der/die/das/ein of a noun",
	"Lexeme/INTJ": "Interjection",
	"Lexeme/NOUN":
		"Common noun with its one absorbed overt article, including substantivized participles, whether or not it is part of a larger expression",
	"Lexeme/NUM": "Numeral",
	"Lexeme/PART":
		"Particle, including the infinitive marker zu before an infinitive (schwer zu erklären, versucht zu schlafen)",
	"Lexeme/PRON":
		"Pronoun used substantively, or attributive genitive dessen/deren/wessen",
	"Lexeme/PROPN": "Proper noun",
	"Lexeme/PUNCT": "Punctuation resolvable as its own unit",
	"Lexeme/SCONJ":
		"Subordinating conjunction, including fixed multi-member conjunctions and correlators (um/zu, ohne/zu, statt/zu, so/dass); a zu without um, ohne or statt is not one",
	"Lexeme/SYM": "Symbol",
	"Lexeme/VERB":
		"One lexical verb with its own auxiliaries, separable particle, required reflexive, governed preposition and lexically selected es; modals and copulas included; whether or not it is part of a larger expression",
	"Lexeme/X": "Unanalyzable or foreign material",
	Unresolved:
		"No defensible word contains this occurrence: its exact grammatical members cannot be decided",
};

export const roles = {
	Head: "The member that names a unit with other fixed members: the noun of a noun phrase unit, the lexical verb (finite, infinitive or participle) of a verbal unit, the verb of an idiom",
	SeparableParticle:
		"The separated prefix of a separable verb standing apart from its verb (steht ... auf, wirken ... nach)",
	GovernedPreposition:
		"A preposition the verb lexically selects for its complement (wartet auf, erinnert sich an, geht um), not a free adjunct preposition (wartet im Keller)",
	Reflexive:
		"An inherently required reflexive pronoun of a reflexive verb (schämt sich, erinnert sich), not an optional reflexive object",
	Expletive:
		"A lexically selected nonreferential subject es of its verb (es gibt, es regnet, es geht um), not referential, positional, anticipatory or object es",
	Article:
		"The definite or indefinite article a common noun absorbs (der in der Aufstieg, ein in ein Haus); mein, dieser, kein are not articles",
	Auxiliary:
		"sein, haben, werden, or recipient-passive bekommen, marking perfect, future or passive for the lexical verb of its unit; a modal or a copula is not an auxiliary",
	Free: "Not a fixed member of any multi-word unit: the word stands alone as its own single-member unit",
	Unresolved: "Its role cannot be defensibly decided",
} as const;

export type RoleAnswer = keyof typeof roles;

/** The fixedness Score levels, in order; the index is the score. */
export const fixednessLevels = [
	"Free combination: this word can be replaced by any synonym without breaking anything",
	"Preferred combination: conventional wording with no expression of its own",
	"Collocation: a Funktionsverbgefüge, a support verb with its predicate noun; the lexical choice is restricted but the meaning stays compositional",
	"Fixed expression: an established noncompositional idiom, discourse formula, proverb or aphorism in this contextual meaning",
] as const;

export const phrasemeKindOptions = {
	Aphorism: "Established concise attributed maxim",
	Collocation:
		"Funktionsverbgefüge: a support verb with its predicate noun, restricted in wording and compositional in meaning; wording without a predicate noun is never one",
	DiscourseFormula: "Established fixed discourse formula",
	Idiom: "Established noncompositional expression in this contextual meaning",
	Proverb: "Established traditional saying",
	None: "This word is not a fixed lexical member of any established expression here",
	Unresolved: "Whether it is a member cannot be defensibly decided",
} as const;

/** Definite and indefinite article forms a NOUN target may absorb. */
export const articleForms: ReadonlySet<string> = new Set([
	"der",
	"die",
	"das",
	"den",
	"dem",
	"des",
	"ein",
	"eine",
	"einen",
	"einem",
	"einer",
	"eines",
]);
