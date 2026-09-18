import type { Questions } from "promptsmith/typesafe";
import type {
	AnalysisTarget,
	DumgenOptions,
	SegmentedSentence,
} from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { choice } from "../../../universal/questions.js";
import { recordEvent } from "../../../universal/trace.js";
import {
	indexedContext,
	validateEncounter,
} from "../../../universal/validation.js";

/** Shared semantic criteria for membership and the dependent whole-target decision. */
export const targetCriteria = `Select the largest complete fixed learner-facing unit containing the clicked occurrence. Identity is occurrence position, never spelling. All fixed-member clicks must select exactly the same unit. Include fixed function words; exclude free arguments, modifiers, fillers, punctuation and opaque text. Mere proximity, frequency or ordinary compositional collocation does not establish fixedness.
A Lexeme may be discontinuous: include separable particles, inherently required reflexives, lexically governed prepositions, and its own perfect/future/passive auxiliaries. Exclude optional reflexive objects and adjunct prepositions. Distinguish repeated equal spellings by their contextual role; an adposition with its own nominal complement is not a separable particle.
Meaning-bearing modals and their overt lexical infinitives are separate targets, each with its own grammatical auxiliaries: hat ... schreiben müssen gives [hat,müssen] AUX and [schreiben] VERB; wird ... geschrieben haben müssen gives [wird,müssen] AUX and [geschrieben,haben] VERB. A modal without an overt infinitive is VERB. Copula and predicate remain separate. Lexical change-of-state werden is VERB; future/passive werden joins the verb whose realization it marks.
Productive perfect and passive complexes are complete verbal targets: ist ... aufgefunden worden includes all three. Partizip morphology alone does not decide POS. Under TIGER, productive state passive is verbal if an active/werden-passive paraphrase preserves meaning and participants. Established property predicates are ADJ with a separate AUX copula; substantivized participles are NOUN.
Fixed correlators include only anchors, never payload: entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch, je/desto are CCONJ; um/zu, ohne/zu, statt/zu, so/dass are SCONJ; einerseits/andererseits and teils/teils are ADV. Classify the whole identity, not the clicked anchor's standalone POS.
An established noncompositional expression is an Idiom; identical literal wording is separate. An anchor or fixed article/preposition click selects the same complete expression. A Fusion is one fused preposition/article source word unless inside a larger fixed expression. Ordinary conventional verb/noun combinations have no larger classification route.
Free substantive interrogatives, demonstratives, relatives, quantifiers and negatives are PRON; adnominal forms directly modifying a noun are DET. Genitive jedermanns remains PRON. Comparative and adverbially used adjectives remain ADJ. Do not infer lemma or inflection here.
German common nouns include their overt definite/indefinite article as fixed members, even across adjectives: der steile Aufstieg gives [der,Aufstieg] NOUN and steile ADJ. Article clicks resolve the same noun. In compatible nominal coordination, only the closest eligible noun owns the overt article: der Aufstieg und Abstieg gives [der,Aufstieg] and [Abstieg]. Closest means Segment distance within that nominal scope, excluding nested phrases; ties are Unresolved. Longer compatible coordination may share the article, but another explicit article or clause boundary stops sharing. Incompatible agreement and proximity alone never license sharing. Only forms of the true definite article der/die/das or indefinite article ein are absorbed. mein/dieser/kein are NOT absorbed articles in this domain: kein Haus gives [kein] DET and [Haus] NOUN, mein Hund gives [mein] DET and [Hund] NOUN. Clicking either does not include the other. mein/dieser/kein remain independent DETs; im/zum/ins remain Fusion and do not join nouns. Their internal article may supply noun grammar later without adding the Fusion to noun membership. Bare nouns stay bare. These noun rules preserve any larger established idiom boundary.
A target is defensible only when the exact assembled members form the complete realized fixed unit, with no omitted present fixed member and no added free material. Uncertainty or contradictory membership must remain Unresolved; do not repair, trim, extend or replace the assembled group.`;

const routes = {
	"Lexeme/ADJ":
		"Adjective, including adjectival participles and adverbial adjective uses",
	"Lexeme/ADP":
		"Adposition (preposition, postposition or fixed circumposition)",
	"Lexeme/ADV": "Adverb, including a whole adverbial correlator",
	"Lexeme/AUX":
		"Meaning-bearing modal with an overt infinitive, or copula; includes its own scoped grammatical auxiliaries",
	"Lexeme/CCONJ":
		"Coordinating conjunction, including a complete fixed correlator",
	"Lexeme/DET": "Determiner modifying a noun",
	"Lexeme/INTJ": "Interjection",
	"Lexeme/NOUN": "Common noun, including substantivized participles",
	"Lexeme/NUM": "Numeral",
	"Lexeme/PART": "Particle",
	"Lexeme/PRON": "Pronoun used substantively",
	"Lexeme/PROPN": "Proper noun",
	"Lexeme/SCONJ":
		"Subordinating conjunction, including fixed multi-member conjunctions",
	"Lexeme/SYM": "Symbol",
	"Lexeme/VERB":
		"Whole lexical verb with its own scoped auxiliaries and fixed members",
	"Phraseme/Aphorism": "Established concise attributed maxim",
	"Phraseme/DiscourseFormula": "Established fixed discourse formula",
	"Phraseme/Idiom":
		"Established noncompositional expression in this contextual meaning",
	"Phraseme/Proverb": "Established traditional saying",
	"Construction/Fusion": "One fused preposition/article source word",
	Unresolved:
		"The exact assembled group is invalid, incomplete, includes free material, or has no defensible allowed route",
};

export async function classifyGermanTarget(
	options: DumgenOptions,
	input: { sentence: SegmentedSentence; clickedSegmentIndex: number },
	signal: AbortSignal,
): Promise<AnalysisTarget<"de">> {
	const judge = judgmentCaller(options);
	const state = {
		sentence: indexedContext(input.sentence),
		clickedSegmentIndex: input.clickedSegmentIndex,
		criteria:
			"In `sentence`, <sN> tags identify selectable occurrences by original segment index N. Untagged text supplies context only. " +
			targetCriteria,
	};
	const questions: Questions = {};
	for (const [index, segment] of input.sentence.segments.entries()) {
		if (
			segment.kind !== "ResolvableText" ||
			index === input.clickedSegmentIndex
		)
			continue;
		questions[`member_${index}`] = choice(
			`Does occurrence <s${index}> in \`sentence\` belong to the same complete fixed unit as the occurrence identified by \`clickedSegmentIndex\`? Use full sentence context and \`criteria\`. For ordinary noun groups, only der/die/das/ein articles join the noun; mein/dieser/kein and their noun are separate units. A larger established idiom still keeps its fixed members.`,
			{
				Include: "It is a fixed member of that same unit",
				Exclude:
					"It belongs to another unit or is free contextual material",
				Unresolved: "Its membership cannot be defensibly decided",
			},
		);
	}
	const members = [input.clickedSegmentIndex];
	let selected: string | undefined;
	const membershipQuestions = Object.keys(questions);
	if (membershipQuestions.length) {
		const result = await judge<Questions>(
			"classifyTarget",
			"de/membership",
			state,
			{
				...questions,
				singletonRoute: choice(
					`Is the exact group [${input.clickedSegmentIndex}] (only occurrence <s${input.clickedSegmentIndex}> in \`sentence\`) a defensible complete target under \`criteria\`? Choose the Family/Kind of the whole unit or Unresolved. Do not repair membership or classify a fragment of a larger unit.`,
					routes,
				),
			},
			signal,
		);
		for (const id of membershipQuestions) {
			const answer = result.answers[id];
			if (answer?.type !== "choice" || answer.choice === "Unresolved")
				throw new DumgenFailure(
					"Unresolved",
					"classifyTarget",
					"Target membership is unresolved",
				);
			if (answer.choice === "Include")
				members.push(Number(id.slice("member_".length)));
		}
		// The speculative decision is about this exact singleton, never a larger group.
		if (members.length === 1) {
			const singletonRoute = result.answers.singletonRoute;
			if (
				singletonRoute?.type === "choice" &&
				singletonRoute.choice !== "Unresolved" &&
				// Speculative PRON/DET distinctions regressed in live evaluation.
				// Keep the whole-target judgment for either side of that boundary.
				singletonRoute.choice !== "Lexeme/PRON" &&
				singletonRoute.choice !== "Lexeme/DET"
			)
				selected = singletonRoute.choice;
		}
		recordEvent(signal, "JudgmentApplicability", {
			consumed: [
				...membershipQuestions,
				...(members.length === 1 ? ["singletonRoute"] : []),
			],
			ignored: members.length === 1 ? [] : ["singletonRoute"],
		});
	}
	members.sort((a, b) => a - b);
	recordEvent(signal, "TargetAssembled", { memberSegmentIndices: members });
	if (selected === undefined) {
		const result = await judge(
			"classifyTarget",
			"de/whole-target",
			{ ...state, memberSegmentIndices: members },
			{
				route: choice(
					"Is this exact assembled group a defensible complete target? Choose the Family/Kind of the whole unit or Unresolved. Do not repair membership or classify only the click.",
					routes,
				),
			},
			signal,
		);
		selected = result.answers.route.choice;
	}
	if (selected === "Unresolved")
		throw new DumgenFailure(
			"Unresolved",
			"classifyTarget",
			"Assembled target is not defensible",
		);
	const [family, kind] = selected.split("/");
	return validateEncounter(
		{
			sentence: input.sentence,
			target: { family, kind, memberSegmentIndices: members },
		},
		"classifyTarget",
	).target as AnalysisTarget<"de">;
}
