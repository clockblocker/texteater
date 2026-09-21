/**
 * Route inventories for the intake experiments.
 *
 * Production reaches 20 of the 33 `grammar/de/...` schemas Dumgen already
 * generates: `Phraseme/Collocation`, `Lexeme/PUNCT`, `Lexeme/X` and the ten
 * `Morpheme/*` routes are unreachable because target classification never
 * offers them. `extendedRoutes` adds the three occurrence-level ones;
 * `morphemeKinds` belongs to the sub-occurrence lattice layer, not here.
 *
 * `hierarchical*` splits the one flat Choice into a Family Choice plus one
 * Kind Choice per Family, all asked speculatively in the same round trip, so
 * the inventory can grow without a 34-option flat list competing for
 * probability mass.
 */

import { choice } from "promptsmith/typesafe";
import { routes as productionRoutes } from "../../src/concrete-lang/de/target-classification/assembly.js";
import { modelSchemas } from "../../src/generated/model-schemas.js";

export { productionRoutes };

export const extendedRoutes: Record<string, string> = {
	...productionRoutes,
	"Lexeme/PUNCT": "Punctuation resolvable as its own unit",
	"Lexeme/X":
		"Unanalyzable or foreign material with no other defensible route",
	"Phraseme/Collocation":
		"Conventional multiword expression with restricted lexical choices and a compositional overall meaning",
};

/**
 * The Lexeme layer's route inventory (`layers.ts`): Lexeme Kinds only. AUX is
 * not a route (ADR 0026), PUNCT and X keep every occurrence resolvable, and
 * no Phraseme Kind competes with a word for its own mass.
 */
export const lexemeRoutes: Record<string, string> = {
	...Object.fromEntries(
		Object.entries({
			ADJ: "Adjective, including adjectival participles, established property predicates, comparative and adverbially used adjectives",
			ADP: "Adposition (preposition, postposition or fixed circumposition), including one that is a fixed part of a larger expression",
			ADV: "Adverb, including a whole adverbial correlator (einerseits/andererseits, teils/teils)",
			CCONJ: "Coordinating conjunction, including a complete fixed correlator (entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch, je/desto)",
			DET: "A determiner directly modifying a noun (mein, dieser, kein, welcher, jeder), never the absorbed article der/die/das/ein of a noun",
			INTJ: "Interjection",
			NOUN: "Common noun with its one absorbed overt article, including substantivized participles, whether or not it is part of a larger expression",
			NUM: "Numeral",
			PART: "Particle",
			PRON: "Pronoun used substantively, or attributive genitive dessen/deren/wessen",
			PROPN: "Proper noun",
			PUNCT: "Punctuation resolvable as its own unit",
			SCONJ: "Subordinating conjunction, including fixed multi-member conjunctions and correlators (um/zu, ohne/zu, statt/zu, so/dass)",
			SYM: "Symbol",
			VERB: "One lexical verb with its own auxiliaries, separable particle, required reflexive, governed preposition and lexically selected es; modals and copulas included; whether or not it is part of a larger expression",
			X: "Unanalyzable or foreign material",
		}).map(([kind, description]) => [`Lexeme/${kind}`, description]),
	),
	Unresolved:
		"No defensible word contains this occurrence: its exact grammatical members cannot be decided",
};

export const lexemeKinds: Record<string, string> = {
	ADJ: "Adjective, including adjectival participles and adverbial adjective uses",
	ADP: "Adposition (preposition, postposition or fixed circumposition)",
	ADV: "Adverb, including a whole adverbial correlator",
	AUX: "Meaning-bearing modal with an overt infinitive, or copula; includes its own scoped grammatical auxiliaries",
	CCONJ: "Coordinating conjunction, including a complete fixed correlator",
	DET: "Determiner modifying a noun",
	INTJ: "Interjection",
	NOUN: "Common noun, including substantivized participles",
	NUM: "Numeral",
	PART: "Particle",
	PRON: "Pronoun used substantively, or attributive genitive dessen/deren/wessen",
	PROPN: "Proper noun",
	PUNCT: "Punctuation resolvable as its own unit",
	SCONJ: "Subordinating conjunction, including fixed multi-member conjunctions",
	SYM: "Symbol",
	VERB: "Whole lexical verb with its own scoped auxiliaries and fixed members",
	X: "Unanalyzable or foreign material",
};

export const phrasemeKinds: Record<string, string> = {
	Aphorism: "Established concise attributed maxim",
	Collocation:
		"Conventional multiword expression with restricted lexical choices and a compositional overall meaning",
	DiscourseFormula: "Established fixed discourse formula",
	Idiom: "Established noncompositional expression in this contextual meaning",
	Proverb: "Established traditional saying",
};

export const morphemeKinds: Record<string, string> = {
	Prefix: "Bound morpheme attached before a root",
	Suffix: "Bound morpheme attached after a root",
	Suffixoid: "Formerly free element now used as a productive suffix",
	Root: "The lexical core carrying the word's central meaning",
	Interfix: "Linking element joining two stems in a compound",
	Infix: "Bound morpheme inserted inside a root",
	Circumfix: "Bound morpheme wrapping a root on both sides",
	Transfix: "Discontinuous vowel pattern interleaved with a consonantal root",
	Clitic: "Phonologically bound but syntactically independent element",
	Duplifix: "Reduplicated element",
};

export const families: Record<string, string> = {
	Lexeme: "A single word-class unit: one dictionary word with its fixed grammatical members",
	Phraseme:
		"An established multiword expression with its own dictionary identity",
	Construction:
		"A grammatical composition realized as one source word, such as a fused preposition and article",
	Unresolved: "No defensible complete unit contains this occurrence",
};

/** Family plus one speculative Kind question per relation-bearing Family. */
export function hierarchicalQuestions(
	marker: string,
	criteriaRef = "criteria",
) {
	return {
		family: choice(
			`Under \`${criteriaRef}\`, which Dumling Family does the complete fixed unit containing ${marker} belong to? Classify the whole unit, not the standalone part of speech of this word.`,
			families,
		),
		lexemeKind: choice(
			`If that unit is a Lexeme, which Kind is it? Answer as if the Lexeme Family were established; do not revise the Family judgment.`,
			{ ...lexemeKinds, Unresolved: "No defensible Lexeme Kind" },
		),
		phrasemeKind: choice(
			`If that unit is a Phraseme, which Kind is it? Answer as if the Phraseme Family were established; do not revise the Family judgment.`,
			{ ...phrasemeKinds, Unresolved: "No defensible Phraseme Kind" },
		),
	};
}

type ChoiceAnswer = {
	type: "choice";
	choice: string;
	confidence: number;
	probabilities: Record<string, number>;
};

/**
 * Family first, then that Family's Kind. `beam` lets the second-best Family
 * win when the best one has no defensible Kind, which is the cheap version of
 * the docs' beam search over Choice probabilities.
 */
export function resolveHierarchical(
	answers: Record<string, unknown>,
	prefix: string,
	beam = 2,
): { route: string; familyConfidence: number; kindConfidence: number } {
	const family = answers[`${prefix}family`] as ChoiceAnswer | undefined;
	if (!family || family.type !== "choice")
		return { route: "Unresolved", familyConfidence: 0, kindConfidence: 0 };
	const ranked = Object.entries(family.probabilities)
		.sort((a, b) => b[1] - a[1])
		.slice(0, beam);
	for (const [candidate, probability] of ranked) {
		if (candidate === "Unresolved")
			return {
				route: "Unresolved",
				familyConfidence: probability,
				kindConfidence: 0,
			};
		if (candidate === "Construction")
			return {
				route: "Construction/Fusion",
				familyConfidence: probability,
				kindConfidence: 1,
			};
		const key = candidate === "Lexeme" ? "lexemeKind" : "phrasemeKind";
		const kind = answers[`${prefix}${key}`] as ChoiceAnswer | undefined;
		if (!kind || kind.type !== "choice" || kind.choice === "Unresolved")
			continue;
		return {
			route: `${candidate}/${kind.choice}`,
			familyConfidence: probability,
			kindConfidence: kind.confidence,
		};
	}
	return { route: "Unresolved", familyConfidence: 0, kindConfidence: 0 };
}

/** Routes Dumgen can already resolve grammar for, versus what intake offers. */
export function routeReachability(offered: readonly string[]) {
	const schemas = Object.keys(modelSchemas)
		.filter((key) => key.startsWith("grammar/de/"))
		.map((key) => key.slice("grammar/de/".length))
		.sort();
	const offeredSet = new Set(
		offered.filter((route) => route !== "Unresolved"),
	);
	return {
		grammarSchemas: schemas.length,
		offeredRoutes: offeredSet.size,
		unreachable: schemas.filter((route) => !offeredSet.has(route)),
		offeredWithoutSchema: [...offeredSet].filter(
			(route) => !schemas.includes(route),
		),
	};
}
