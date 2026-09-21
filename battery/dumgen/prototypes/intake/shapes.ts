/**
 * Two shapes of the same intake design: where the rules live.
 *
 * `state` is the shipped shape: `targetCriteria` (about 900 words) travels in
 * state on every call and every question says "under `criteria`". `questions`
 * follows TypeSafe's guidance that state carries content and questions carry
 * judgment logic: the state is the tagged sentence only, the membership rules
 * are the membership question's structured instructions, and the route rules
 * are structured option descriptions on the route Choice. Same design, same
 * inventory, same assembly; only the request shape differs.
 */
import { type ChoiceQuestion, choice } from "promptsmith/typesafe";
import { targetCriteria } from "../../src/concrete-lang/de/target-classification/judgments.js";
import { indexedContext } from "../../src/universal/validation.js";
import type { Sentence } from "./corpus.js";

export type Shape = {
	readonly id: string;
	readonly summary: string;
	state(sentence: Sentence): Record<string, unknown>;
	membership(
		sentence: Sentence,
		anchor: number,
		other: number,
	): ChoiceQuestion;
	route(
		sentence: Sentence,
		index: number,
		inventory: Record<string, string>,
	): ChoiceQuestion;
	/** Questions per call; the `questions` shape repeats its rules per question. */
	readonly chunk: number;
};

const notation =
	"In `sentence`, <sN> tags identify selectable occurrences by original segment index N. Untagged text supplies context only.";

const tagged = (sentence: Sentence) =>
	indexedContext({
		id: sentence.id,
		language: "de",
		segments: sentence.segments,
	} as never);

/** The shipped shape: rules in `criteria`, questions point at it. */
export const stateShape: Shape = {
	id: "state",
	summary: "targetCriteria in state, questions reference `criteria`",
	chunk: 220,
	state(sentence) {
		return {
			sentence: tagged(sentence),
			criteria: `${notation} Every occurrence belongs to exactly one complete fixed unit; most units have exactly one member. ${targetCriteria}`,
		};
	},
	membership(_sentence, anchor, other) {
		return choice(
			`Under \`criteria\`, does occurrence <s${other}> in \`sentence\` belong to the same complete fixed unit as occurrence <s${anchor}>?`,
			{
				Include: "It is a fixed member of that same unit",
				Exclude:
					"It belongs to another unit or is free contextual material",
				Unresolved: "Its membership cannot be defensibly decided",
			},
		);
	},
	route(_sentence, index, inventory) {
		return choice(
			`Under \`criteria\`, what is the Family/Kind of the complete fixed unit that contains occurrence <s${index}> in \`sentence\`? Classify the whole unit, not the standalone part of speech of this word alone.`,
			inventory,
		);
	},
};

/** `targetCriteria` carved into what membership needs, as structured instructions. */
const membershipRules = {
	unit: "The complete fixed unit is the largest learner-facing unit containing an occurrence: one dictionary word with its fixed grammatical members, or one established multiword expression. Identity is occurrence position, never spelling. Every fixed member of a unit selects exactly the same unit; most units have exactly one member.",
	include: [
		"fixed function words of the unit",
		"a verb's separable particle, inherently required reflexive, lexically governed preposition, and its own perfect, future or passive auxiliary (sein, haben, werden; recipient-passive bekommen, kriegen, erhalten with a participle that adds no meaning), across word-order changes and intervening free words: ist ... aufgefunden worden is one unit",
		"a lexically selected nonreferential subject es with its verb: es gibt, es gab, es regnet, es geht um, es handelt sich um, across word order",
		"the one overt definite or indefinite article (der, die, das, den, dem, des, ein, eine, einen, einem, einer, eines) that opens a common noun's own phrase, even across adjectives: der steile Aufstieg gives [der, Aufstieg]",
		"every anchor of a fixed correlator, never its payload: entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch, je/desto, um/zu, ohne/zu, statt/zu, so/dass, einerseits/andererseits, teils/teils",
		"every fixed word of an established noncompositional expression in this contextual meaning, including its fixed article or preposition",
		"a modal's own scoped auxiliary: hat ... schreiben müssen gives [hat, müssen]; wird ... geschrieben haben müssen gives [wird, müssen] and [geschrieben, haben]",
		"the fixed anchors of was für einer, was für welche and was für ein, which may be discontinuous",
	],
	exclude: [
		"free arguments, modifiers, fillers, punctuation and opaque text; mere proximity, frequency or ordinary compositional collocation never establishes fixedness",
		"an optional reflexive object and an adjunct preposition; an adposition with its own nominal complement is not a separable particle; distinguish repeated equal spellings by their contextual role",
		"referential es, positional es (Es kamen Gäste), anticipatory es (Es freut mich, dass du kommst) and object es (Sie meint es gut mit dir): each is its own unit apart from the verb; never invent omitted es",
		"a modal and the lexical infinitive it governs are different units; a copula (sein, bleiben) and its predicate are different units; an auxiliary is never a unit on its own",
		"a second article, or an article separated from the noun by a verb, a clause boundary or another noun: clicking Weg in Der Weg ist das Ziel gives [Der, Weg], never das; in compatible coordination only the closest eligible noun owns the article (der Aufstieg und Abstieg gives [der, Aufstieg] and [Abstieg]); ties are unresolved",
		"mein, dieser, kein and other determiners, and fused im, zum, ins: they never join a noun (kein Haus is [kein] and [Haus])",
		"the article of an article-bound possessive (der meine, der meinige) and the noun after attributive dessen, deren, wessen or was für ein",
		"identical literal wording of an idiom used literally; lexical bekommen with an object and resultative bekommt ... geöffnet keep the participle outside",
	],
	unresolved:
		"When membership is uncertain or contradictory, answer Unresolved instead of repairing, trimming or extending the unit.",
};

/** Route rules as structured option descriptions; routes without rules keep the inventory text. */
const routeRules: Record<string, unknown> = {
	"Lexeme/VERB": {
		is: "One whole lexical verb with its own fixed members",
		includes:
			"its separable particle, required reflexive, governed preposition, lexically selected es, and its own perfect, future or passive auxiliaries; productive perfect and passive complexes are one verbal unit (ist ... aufgefunden worden); productive state passive when an active or werden-passive paraphrase preserves meaning and participants",
		also: "modals (dürfen, können, mögen, müssen, sollen, wollen) with or without an infinitive, owning their scoped auxiliaries; copular sein and bleiben; lexical change-of-state werden; the recipient passive bekommt ... geliefert as one unit on the participle's verb; sich lassen, gehören with a participle, brauchen, scheinen, drohen, versprechen or pflegen with zu",
		not: "an auxiliary alone (it joins the verb it serves); an established property predicate participle (ADJ); a substantivized participle (NOUN); Funktionsverbgefüge (Collocation)",
	},
	"Lexeme/NOUN": {
		is: "A common noun with its one absorbed overt article, including substantivized participles",
		includes:
			"the definite or indefinite article opening its own phrase, even across adjectives; article clicks resolve the same noun",
		not: "mein, dieser, kein and fused im, zum, ins are never members; a bare noun stays bare",
	},
	"Lexeme/DET": {
		is: "A determiner directly modifying a noun, as its own unit",
		includes:
			"adnominal mein, dieser, kein, welcher, jeder and the like; was für ein before a noun; plural or mass was für; attributive comparatives",
		not: "a free substantive form (PRON); the true article der, die, das or ein of a noun (part of the NOUN unit)",
	},
	"Lexeme/PRON": {
		is: "A pronoun used substantively",
		includes:
			"free interrogatives, demonstratives, relatives, quantifiers and negatives; genitive jedermanns; attributive genitive dessen, deren, wessen with external DET function; meine or meinige after a separate article; was für einer and was für welche; referential, positional, anticipatory and object es",
		not: "an adnominal form directly modifying a noun (DET); a lexically selected nonreferential es (part of its VERB unit)",
	},
	"Lexeme/ADJ":
		"Adjective, including adjectival participles, established property predicates, comparative and adverbially used adjectives",
	"Lexeme/ADV":
		"Adverb, including a whole adverbial correlator (einerseits/andererseits, teils/teils)",
	"Lexeme/CCONJ":
		"Coordinating conjunction, including a complete fixed correlator (entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch, je/desto)",
	"Lexeme/SCONJ":
		"Subordinating conjunction, including fixed multi-member conjunctions and correlators (um/zu, ohne/zu, statt/zu, so/dass)",
	"Phraseme/Idiom": {
		is: "An established noncompositional expression in this contextual meaning; an anchor, fixed article or preposition click selects the whole expression",
		not: "identical literal wording used literally; ordinary conventional verb/noun combinations have no larger route",
	},
	"Phraseme/Collocation":
		"Conventional multiword expression with restricted lexical choices and a compositional overall meaning, including Funktionsverbgefüge (zur Verfügung stellen, in Frage kommen)",
	"Construction/Fusion":
		"One fused preposition/article source word (im, zum, ins, am, beim, vom, zur, ans) unless inside a larger fixed expression",
	Unresolved:
		"No defensible complete unit contains this occurrence: the exact members would omit a present fixed member, add free material, or contradict each other",
};

/** State is the tagged sentence only; rules ride in the questions. */
export const questionsShape: Shape = {
	id: "questions",
	summary:
		"state is the tagged sentence; membership rules in instructions, route rules in option descriptions",
	chunk: 30,
	state(sentence) {
		return { sentence: tagged(sentence), notation };
	},
	membership(_sentence, anchor, other) {
		return choice(
			{
				judgment: `Does occurrence <s${other}> in \`sentence\` belong to the same complete fixed unit as occurrence <s${anchor}>?`,
				...membershipRules,
			},
			{
				Include: "It is a fixed member of that same unit",
				Exclude:
					"It belongs to another unit or is free contextual material",
				Unresolved: "Its membership cannot be defensibly decided",
			},
		);
	},
	route(_sentence, index, inventory) {
		return choice(
			`What is the Family/Kind of the complete fixed unit that contains occurrence <s${index}> in \`sentence\`? Classify the whole unit (the word together with its fixed members), not the standalone part of speech of this word alone. A unit is defensible only when its exact realized members form the complete fixed unit.`,
			Object.fromEntries(
				Object.entries(inventory).map(([route, description]) => [
					route,
					(routeRules[route] as string | undefined) ?? description,
				]),
			) as Record<string, string>,
		);
	},
};

// ------------------------------------------------------------ layered

/**
 * The realization rules of `targetCriteria`: which Segments realize one
 * Lexeme. Nothing here is about multiword expressions; a word that sits
 * inside an idiom or a Funktionsverbgefüge is still one word with its own
 * grammatical members.
 */
export const realizationCriteria = `A word is one Lexeme occurrence: one dictionary word together with the Segments that realize its grammatical form. Identity is occurrence position, never spelling. Every grammatical member of a word selects exactly the same word; most words have exactly one Segment. Whether a word is also part of a larger established expression is not asked here and must not change its members.
A German lexical verb includes, across word-order changes and intervening free words: its separable particle (steht ... auf); its inherently required reflexive (schämt sich, erinnert sich), not an optional reflexive object; its lexically governed preposition (wartet auf, erinnert sich an), not an adjunct preposition, and an adposition with its own nominal complement is not a separable particle; its own perfect, future or passive auxiliaries sein, haben, werden (ist ... aufgefunden worden is one word) and recipient-passive bekommen, kriegen, erhalten with a participle that adds no meaning; its lexically selected nonreferential subject es (es gibt, es gab, es regnet, es geht um, es handelt sich um). Referential es, positional es (Es kamen Gäste), anticipatory es (Es freut mich, dass du kommst) and object es (Sie meint es gut mit dir) are their own words; never invent omitted es.
Modals (dürfen, können, mögen, müssen, sollen, wollen) are words of their own with their own scoped auxiliaries, and the lexical infinitive they govern is a separate word: hat ... schreiben müssen gives [hat, müssen] and [schreiben]. Copular sein and bleiben are words; copula and predicate are separate words. Lexical change-of-state werden is a word; future or passive werden joins the verb it marks. An auxiliary is never a word on its own. Lexical bekommen with an object, and resultative bekommt ... geöffnet, keep the participle outside. Verbs adding a meaning beside a construction (sich lassen, gehören plus participle, brauchen, scheinen, drohen, versprechen or pflegen plus zu) are words like modals.
A German common noun includes the one overt definite or indefinite article (der, die, das, den, dem, des, ein, eine, einen, einem, einer, eines) that opens its own phrase, even across adjectives: der steile Aufstieg gives [der, Aufstieg] and [steile]. At most one article; an article separated from the noun by a verb, a clause boundary or another noun belongs to that other noun: Der Weg ist das Ziel gives [Der, Weg] and [das, Ziel]. In compatible coordination only the closest eligible noun owns the article (der Aufstieg und Abstieg gives [der, Aufstieg] and [Abstieg]); ties are Unresolved. mein, dieser, kein and other determiners never join a noun (kein Haus is [kein] and [Haus]); the article of an article-bound possessive (der meine) and the noun after attributive dessen, deren, wessen or was für ein stay separate. Bare nouns stay bare. The article inside a fused im, zum, ins, zur is the noun's article.
Fixed correlators are one word made of their anchors only, never the payload: entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch, je/desto (CCONJ); um/zu, ohne/zu, statt/zu, so/dass (SCONJ); einerseits/andererseits, teils/teils (ADV). was für einer and was für welche are one PRON word; was für ein before a noun is one DET word; their anchors may be discontinuous.
Free substantive interrogatives, demonstratives, relatives, quantifiers and negatives are PRON; adnominal forms directly modifying a noun are DET. Attributive genitives dessen, deren, wessen are PRON. Comparative and adverbially used adjectives remain ADJ. Established property predicate participles are ADJ; substantivized participles are NOUN. Do not infer lemma or inflection here.
A word is defensible only when its exact realized Segments form the complete word, with no omitted grammatical member and no added free material. Uncertainty or contradictory membership must remain Unresolved; do not repair, trim, extend or replace the group.`;

/**
 * The fixedness rules: which words are fixed lexical members of one
 * established multiword expression. Members are words, so an expression
 * never lists an article, auxiliary or particle on its own; those come with
 * the word that realizes them.
 */
export const fixednessCriteria = `An expression is an established multiword unit with its own dictionary identity, made of words that are its fixed lexical members. A word is a fixed lexical member when the expression requires this particular word or a narrow set of alternatives in this slot: replacing it with an ordinary synonym would break the expression. A fixed preposition or fixed article of the expression counts as a member through the word that carries it (ins Feuer, zur Verfügung, das Eis). Free arguments, modifiers and fillers are never members, however close they stand: in stellt den Schülern Material zur Verfügung the expression is stellt ... zur Verfügung and den Schülern and Material are free.
Degrees of fixedness. A free combination lets every word be replaced by a synonym (ein Buch kaufen). A preferred combination is conventional but freely replaceable and has no expression of its own (starker Regen). A collocation restricts the lexical choice while the meaning stays compositional: German Funktionsverbgefüge (zur Verfügung stellen, in Frage kommen, eine Entscheidung treffen, Abschied nehmen). An idiom is established and noncompositional in this contextual meaning (den Faden verlieren, das Eis brechen, Öl ins Feuer gießen); identical literal wording used literally is not an idiom. A discourse formula is a fixed conversational routine (Guten Morgen, Herzlichen Dank, Wie geht's). A proverb is a traditional complete saying (Morgenstund hat Gold im Mund); an aphorism is an established attributed maxim (Zeit ist Geld).
Mere proximity, frequency or ordinary compositional combination never establishes an expression. When membership is uncertain or contradictory, answer Unresolved instead of repairing, trimming or extending the expression.`;

/**
 * Two layers (`layers.ts`): the state carries the realization rules under
 * `criteria` so the Lexeme layer's membership and route questions keep their
 * shape, and the fixedness rules under `fixedness` for the Phraseme layer.
 * Each question references only the field it needs.
 */
export const layeredShape: Shape = {
	id: "layered",
	summary:
		"realization rules in `criteria` for the Lexeme layer, fixedness rules in `fixedness` for the Phraseme layer",
	chunk: 220,
	state(sentence) {
		return {
			sentence: tagged(sentence),
			criteria: `${notation} ${realizationCriteria}`,
			fixedness: fixednessCriteria,
		};
	},
	membership(_sentence, anchor, other) {
		return choice(
			`Under \`criteria\`, does occurrence <s${other}> in \`sentence\` realize the same word as occurrence <s${anchor}>: is one of them a grammatical member (article, auxiliary, separable particle, required reflexive, governed preposition, lexically selected es, correlator anchor) of the word the other heads?`,
			{
				Include: "Both Segments realize the same one word",
				Exclude:
					"They realize different words, or one is free material",
				Unresolved: "Its membership cannot be defensibly decided",
			},
		);
	},
	route(_sentence, index, inventory) {
		return choice(
			`Under \`criteria\`, what is the Kind of the word that occurrence <s${index}> in \`sentence\` realizes? Classify the whole word with its grammatical members, not this Segment alone, and ignore any larger expression the word may be part of.`,
			inventory,
		);
	},
};

/**
 * The control for `layeredShape`: the shipped criteria and the shipped
 * membership and route wording, with only the Lexeme-only inventory and the
 * `fixedness` field added. Separates "the layering hurts" from "the new
 * wording hurts".
 */
export const layeredOriginalShape: Shape = {
	id: "layered-original",
	summary:
		"shipped targetCriteria and wording for the Lexeme layer, fixedness rules in `fixedness` for the Phraseme layer",
	chunk: 220,
	state(sentence) {
		return {
			...stateShape.state(sentence),
			fixedness: fixednessCriteria,
		};
	},
	membership: stateShape.membership,
	route: stateShape.route,
};

/**
 * The shipped `targetCriteria` with only its Phraseme and Fusion sentences
 * removed and one sentence added: inside an expression every word is its own
 * unit. The membership and route wording stay verbatim. This is the smallest
 * change that stops the Lexeme layer from grouping whole idioms and proverbs
 * as one word.
 */
export const trimmedCriteria = targetCriteria
	.replace(
		"Select the largest complete fixed learner-facing unit containing the clicked occurrence.",
		"Select the complete fixed unit containing the clicked occurrence: one dictionary word together with its fixed grammatical members. A multiword expression (an idiom, a collocation, a Funktionsverbgefüge, a proverb, a formula) is not a unit here: every word inside it is its own unit with its own grammatical members, and the expression is judged separately.",
	)
	.replace(
		"; Funktionsverbgefüge (zur Verfügung stellen, in Frage kommen) are Collocation.",
		".",
	)
	.replace(
		/An established noncompositional expression is an Idiom;[^\n]*?Ordinary conventional verb\/noun combinations have no larger classification route\.\n/u,
		"A fused preposition and article (im, zum, ins, zur) is one ADP unit whose article part belongs to the following noun.\n",
	)
	.replace(
		"im/zum/ins remain Fusion and do not join nouns. Their internal article may supply noun grammar later without adding the Fusion to noun membership.",
		"im/zum/ins do not join nouns as a whole.",
	)
	.replace(
		" These noun rules preserve any larger established idiom boundary.",
		"",
	);

export const layeredTrimmedShape: Shape = {
	id: "layered-trimmed",
	summary:
		"shipped wording; targetCriteria minus its Phraseme and Fusion sentences for the Lexeme layer, fixedness rules in `fixedness` for the Phraseme layer",
	chunk: 220,
	state(sentence) {
		return {
			sentence: tagged(sentence),
			criteria: `${notation} Every occurrence belongs to exactly one complete fixed unit; most units have exactly one member. ${trimmedCriteria}`,
			fixedness: fixednessCriteria,
		};
	},
	membership: stateShape.membership,
	route: stateShape.route,
};

export const shapes: Record<string, Shape> = {
	state: stateShape,
	questions: questionsShape,
	layered: layeredShape,
	"layered-original": layeredOriginalShape,
	"layered-trimmed": layeredTrimmedShape,
};
