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
import { validateEncounter } from "../../../universal/validation.js";

/** Shared semantic criteria for membership and the dependent whole-target decision. */
export const targetCriteria = `Select the largest complete fixed learner-facing unit containing the clicked occurrence. Identity is occurrence position, never spelling. All fixed-member clicks must select exactly the same unit. Include fixed function words; exclude free arguments, modifiers, fillers, punctuation and opaque text. Mere proximity, frequency or ordinary compositional collocation does not establish fixedness.
A Lexeme may be discontinuous: include separable particles, inherently required reflexives, lexically governed prepositions, and its own perfect/future/passive auxiliaries. Exclude optional reflexive objects and adjunct prepositions. Distinguish repeated equal spellings by their contextual role; an adposition with its own nominal complement is not a separable particle.
Meaning-bearing modals and their overt lexical infinitives are separate targets, each with its own grammatical auxiliaries: hat ... schreiben müssen gives [hat,müssen] AUX and [schreiben] VERB; wird ... geschrieben haben müssen gives [wird,müssen] AUX and [geschrieben,haben] VERB. A modal without an overt infinitive is VERB. Copula and predicate remain separate. Lexical change-of-state werden is VERB; future/passive werden joins the verb whose realization it marks.
Productive perfect and passive complexes are complete verbal targets: ist ... aufgefunden worden includes all three. Partizip morphology alone does not decide POS. Under TIGER, productive state passive is verbal if an active/werden-passive paraphrase preserves meaning and participants. Established property predicates are ADJ with a separate AUX copula; substantivized participles are NOUN.
Fixed correlators include only anchors, never payload: entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch, je/desto are CCONJ; um/zu, ohne/zu, statt/zu, so/dass are SCONJ; einerseits/andererseits and teils/teils are ADV. Classify the whole identity, not the clicked anchor's standalone POS.
An established noncompositional expression is an Idiom; identical literal wording is separate. An anchor or fixed article/preposition click selects the same complete expression. A Fusion is one fused preposition/article source word unless inside a larger fixed expression. Ordinary conventional verb/noun combinations have no larger classification route.
Free substantive interrogatives, demonstratives, relatives, quantifiers and negatives are PRON; adnominal forms directly modifying a noun are DET. Genitive jedermanns remains PRON. Comparative and adverbially used adjectives remain ADJ. Do not infer lemma or inflection here.
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
		sentence: input.sentence.segments.map((segment, index) => ({
			...segment,
			index,
		})),
		clickedSegmentIndex: input.clickedSegmentIndex,
		criteria: targetCriteria,
	};
	const questions: Questions = {};
	for (const [index, segment] of input.sentence.segments.entries()) {
		if (
			segment.kind !== "ResolvableText" ||
			index === input.clickedSegmentIndex
		)
			continue;
		questions[`member_${index}`] = choice(
			`Does occurrence ${index} (${JSON.stringify(segment.text)}) belong to the same complete fixed unit as the clicked occurrence? Use full sentence context and the shared criteria.`,
			{
				Include: "It is a fixed member of that same unit",
				Exclude:
					"It belongs to another unit or is free contextual material",
				Unresolved: "Its membership cannot be defensibly decided",
			},
		);
	}
	const members = [input.clickedSegmentIndex];
	if (Object.keys(questions).length) {
		const result = await judge(
			"classifyTarget",
			"de/membership",
			state,
			questions,
			signal,
		);
		for (const [id, answer] of Object.entries(result.answers)) {
			if (answer.type !== "choice" || answer.choice === "Unresolved")
				throw new DumgenFailure(
					"Unresolved",
					"classifyTarget",
					"Target membership is unresolved",
				);
			if (answer.choice === "Include")
				members.push(Number(id.slice("member_".length)));
		}
	}
	members.sort((a, b) => a - b);
	recordEvent(signal, "TargetAssembled", { memberSegmentIndices: members });
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
	const selected = result.answers.route.choice;
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
