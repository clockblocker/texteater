import type { Questions } from "promptsmith/typesafe";
import type {
	AnalysisTarget,
	DumgenOptions,
	SegmentedSentence,
} from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { recordEvent } from "../../../universal/trace.js";
import { validateEncounter } from "../../../universal/validation.js";
import {
	assembleTarget,
	classificationState,
	membershipQuestions,
	routeQuestion,
} from "./assembly.js";

// LEO distinguishes standalone/attributive pronouns and article-bound possessives.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/RelPron-der-die-das.xml?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Posses/index.html?lang=de
/** Shared semantic criteria for membership and the dependent whole-target decision. */
export const targetCriteria = `Select the largest complete fixed learner-facing unit containing the clicked occurrence. Identity is occurrence position, never spelling. All fixed-member clicks must select exactly the same unit. Include fixed function words; exclude free arguments, modifiers, fillers, punctuation and opaque text. Mere proximity, frequency or ordinary compositional collocation does not establish fixedness.
German lexically selected nonreferential subject es belongs to its complete verbal target: es gibt/es gab/gibt es (Lemma geben), es regnet (regnen), es geht um, and es handelt sich um. Include es across word-order changes and intervening free modifiers, retaining governed prepositions and required reflexives. Exclude free complements and preserve separate modal boundaries. Referential es, positional es in Es kamen Gäste, anticipatory es in Es freut mich, dass du kommst, and object es in Sie meint es gut mit dir are independently resolvable singleton PRON targets; exclude their neighboring verb when they are clicked, and exclude them when the verb is clicked. Do not invent omitted es.
A Lexeme may be discontinuous: include separable particles, inherently required reflexives, lexically governed prepositions, and its own perfect/future/passive auxiliaries. Exclude optional reflexive objects and adjunct prepositions. Distinguish repeated equal spellings by their contextual role; an adposition with its own nominal complement is not a separable particle.
Modals (dürfen, können, mögen, müssen, sollen, wollen) are VERB with their own meaning, with or without an overt infinitive, and own their scoped grammatical auxiliaries; the lexical infinitive is a separate VERB target: hat ... schreiben müssen gives [hat,müssen] VERB and [schreiben] VERB; wird ... geschrieben haben müssen gives [wird,müssen] VERB and [geschrieben,haben] VERB. Copular sein and bleiben are VERB; copula and predicate remain separate. Lexical change-of-state werden is VERB; future/passive werden joins the verb whose realization it marks. An auxiliary (sein, haben, werden marking perfect, future or passive) is never a target on its own; it joins the verb it serves.
Productive perfect and passive complexes are complete verbal targets: ist ... aufgefunden worden includes all three. Partizip morphology alone does not decide POS. Under TIGER, productive state passive is verbal if an active/werden-passive paraphrase preserves meaning and participants. Established property predicates are ADJ with a separate VERB copula; substantivized participles are NOUN. bekommen, kriegen and erhalten with a Partizip II and no lexical contribution form the recipient passive: the auxiliary joins the participle's verb (bekommt ... geliefert is one VERB target). Lexical bekommen with an object, and the resultative bekommt ... geöffnet (manages to open it), keep bekommen as the VERB and leave the participle outside. Verbs that add a meaning beside a construction (sich lassen, gehören plus participle, brauchen, scheinen, drohen, versprechen or pflegen plus zu, copula bleiben) are VERB like modals; Funktionsverbgefüge (zur Verfügung stellen, in Frage kommen) are Collocation.
Fixed correlators include only anchors, never payload: entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch, je/desto are CCONJ; um/zu, ohne/zu, statt/zu, so/dass are SCONJ; einerseits/andererseits and teils/teils are ADV. Classify the whole identity, not the clicked anchor's standalone POS.
An established noncompositional expression is an Idiom; identical literal wording is separate. An anchor or fixed article/preposition click selects the same complete expression. A Fusion is one fused preposition/article source word unless inside a larger fixed expression. Ordinary conventional verb/noun combinations have no larger classification route.
Free substantive interrogatives, demonstratives, relatives, quantifiers and negatives are PRON; adnominal forms directly modifying a noun are DET. Genitive jedermanns remains PRON. Attributive genitives dessen/deren/wessen are also PRON (with external DET function), not ordinary agreeing determiners: keep the following noun separate. Article-bound possessives der meine/der meinige have a separate DET article and PRON meine/meinige; do not absorb that article using the common-noun rule. Fixed was für einer/was für welche is one PRON target; was für ein before a noun, or plural/mass was für, is one DET target. These expressions can be discontinuous; preserve all fixed anchors and exclude the noun or other free material. Comparative and adverbially used adjectives remain ADJ. Do not infer lemma or inflection here.
German common nouns include their overt definite/indefinite article as fixed members, even across adjectives: der steile Aufstieg gives [der,Aufstieg] NOUN and steile ADJ. A noun absorbs at most one article, the one opening its own nominal phrase; an article separated from the clicked noun by a verb, a clause boundary or another noun belongs to that other noun and never joins: clicking Weg in Der Weg ist das Ziel gives [Der,Weg], never das. Article clicks resolve the same noun. In compatible nominal coordination, only the closest eligible noun owns the overt article: der Aufstieg und Abstieg gives [der,Aufstieg] and [Abstieg]. Closest means Segment distance within that nominal scope, excluding nested phrases; ties are Unresolved. Longer compatible coordination may share the article, but another explicit article or clause boundary stops sharing. Incompatible agreement and proximity alone never license sharing. Only forms of the true definite article der/die/das or indefinite article ein are absorbed. mein/dieser/kein are NOT absorbed articles in this domain: kein Haus gives [kein] DET and [Haus] NOUN, mein Hund gives [mein] DET and [Hund] NOUN. Clicking either does not include the other. mein/dieser/kein remain independent DETs; im/zum/ins remain Fusion and do not join nouns. Their internal article may supply noun grammar later without adding the Fusion to noun membership. Bare nouns stay bare. These noun rules preserve any larger established idiom boundary.
A target is defensible only when the exact assembled members form the complete realized fixed unit, with no omitted present fixed member and no added free material. Uncertainty or contradictory membership must remain Unresolved; do not repair, trim, extend or replace the assembled group.`;

export async function classifyGermanTarget(
	options: DumgenOptions,
	input: { sentence: SegmentedSentence; clickedSegmentIndex: number },
	signal: AbortSignal,
): Promise<AnalysisTarget<"de">> {
	const judge = judgmentCaller(options);
	const membership = membershipQuestions(input);
	// Membership and route are independent judgments over the same state, so
	// they travel in one round trip. The route is asked about the complete
	// unit containing the clicked occurrence rather than about the assembled
	// group; the grammar stage's own support question guards the assembly.
	const result = await judge<Questions>(
		"classifyTarget",
		"de/target",
		classificationState(input, targetCriteria),
		{ ...membership, route: routeQuestion },
		signal,
	);
	const assembly = assembleTarget(input, result.answers);
	recordEvent(signal, "JudgmentApplicability", {
		consumed: [...Object.keys(membership), "route"],
		ignored: [],
	});
	if (assembly.decision === "Unresolved")
		throw new DumgenFailure(
			"Unresolved",
			"classifyTarget",
			assembly.reason,
		);
	recordEvent(signal, "TargetAssembled", {
		memberSegmentIndices: assembly.memberSegmentIndices,
	});
	return validateEncounter(
		{
			sentence: input.sentence,
			target: {
				family: assembly.family,
				kind: assembly.kind,
				memberSegmentIndices: assembly.memberSegmentIndices,
			},
		},
		"classifyTarget",
	).target as AnalysisTarget<"de">;
}
