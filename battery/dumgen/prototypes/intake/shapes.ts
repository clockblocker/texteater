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

export const shapes: Record<string, Shape> = {
	state: stateShape,
	questions: questionsShape,
};
