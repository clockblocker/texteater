import * as Effect from "effect/Effect";
import type { Questions } from "promptsmith/typesafe";
import type {
	AnalysisTarget,
	DumgenOptions,
	SegmentedSentence,
} from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { abbreviationEntry } from "../../../universal/fusion-table.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { type OperationScope, recordEvent } from "../../../universal/trace.js";
import { validateEncounter } from "../../../universal/validation.js";
import { germanFusionTable } from "../fusion-entries.js";
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
A Lexeme may be discontinuous: include separable particles, inherently required reflexives, lexically governed prepositions, and its own perfect/future/passive auxiliaries. Exclude optional reflexive objects and adjunct prepositions. A governed preposition joins the verb, adjective or noun that governs it, also apart from it: Er ist stolz auf seinen Sohn and Auf ihn bin ich stolz give [stolz,auf] ADJ, aus Angst vor Hunden gives [Angst,vor] NOUN. A copula never joins its predicative adjective: ist stays a singleton VERB. A pronominal adverb (darauf, davon, dazu, damit, worauf, hierfür) stands for a whole prepositional phrase: it is always a singleton ADV and never joins a verb or adjective, even when that verb governs the preposition inside it: wartet darauf gives [wartet] VERB and [darauf] ADV. Distinguish repeated equal spellings by their contextual role; an adposition with its own nominal complement is not a separable particle.
Modals (dürfen, können, mögen, müssen, sollen, wollen) are VERB with their own meaning, with or without an overt infinitive, and own their scoped grammatical auxiliaries; the lexical infinitive is a separate VERB target: hat ... schreiben müssen gives [hat,müssen] VERB and [schreiben] VERB; wird ... geschrieben haben müssen gives [wird,müssen] VERB and [geschrieben,haben] VERB. Copular sein and bleiben are VERB; copula and predicate remain separate. Lexical change-of-state werden is VERB; future/passive werden joins the verb whose realization it marks. An auxiliary (sein, haben, werden marking perfect, future or passive) is never a target on its own; it joins the verb it serves.
Perfect and passive complexes are complete verbal targets: ist ... aufgefunden worden includes all three. A participle is verbal only there: in a perfect with haben or sein (hat gebacken, ist abgereist) or in a passive with werden, bekommen, kriegen or erhalten (wird gebacken). Every other participle is a singleton ADJ, whatever its sense and whatever depends on it: attributive (die gebratenen Zwiebeln, der von allen gelobte Koch, das weinende Baby, der das Kind tragende Vater), adverbial (ging pfeifend davon), and predicative after sein, bleiben or another verb it describes the subject with (wirkte erschöpft, kam überraschend, kommt ungelegen); that verb is a separate VERB. sein plus a participle is a perfect only when the clause reports the verb's own event, so the simple past says the same (ist abgefahren: fuhr ab; ist eingeschlafen: schlief ein); the subject stays outside. Otherwise sein is the copula and the participle an ADJ describing a state, including a state passive with an agent or adverbs and the resulting state of a reflexive verb: Das Fenster ist geöffnet gives [ist] VERB and [geöffnet] ADJ, never one target, and Sie ist verärgert gives verärgert ADJ with no reflexive. A click on that copula selects [ist] alone. The participle's own objects, adverbs, agents and prepositional phrases are free material, never members, and a participle with its own object is still an ADJ: in der von allen gelobte Koch only gelobte is the target (von, allen and Koch are Exclude), and in Sie lief los, den Koffer mit großer Mühe hinter sich herziehend only herziehend is (den, Koffer, mit, großer, Mühe, hinter and sich are Exclude, even though mit großer Mühe is a set phrase). An attributive participle never takes the article before it: in der wartende Kunde, der belongs to [der,Kunde] NOUN and wartende is a singleton ADJ. Lexicalization does not matter: a lexicalized participle (überzeugend 'convincing', gelassen 'calm') and a productive one are both ADJ. Substantivized participles are NOUN. bekommen, kriegen and erhalten with a Partizip II and no lexical contribution form the recipient passive: the auxiliary joins the participle's verb (bekommt ... geliefert is one VERB target). Lexical bekommen with an object, and the resultative bekommt ... geöffnet (manages to open it), keep bekommen as the VERB and leave the participle outside. Verbs that add a meaning beside a construction (sich lassen, gehören plus participle, brauchen, scheinen, drohen, versprechen or pflegen plus zu, copula bleiben) are VERB like modals. A Funktionsverbgefüge, a support verb with its predicate noun (zur Verfügung stellen, in Frage kommen, eine Entscheidung treffen, eine Frage stellen, zur Kenntnis nehmen, Angst haben, Bescheid wissen), is one Collocation target whose members are the verb, the noun and the noun's own article or both pieces of its fused word, plus a preposition the noun or the expression governs; free arguments and adverbs stay outside (stellt den Schülern Material zur Verfügung gives [stellt,zu,r,Verfügung], hat Angst vor Hunden gives [hat,Angst,vor]).
Fixed correlators include only anchors, never payload: entweder/oder, weder/noch, sowohl/als/auch, nicht nur/sondern auch, je/desto are CCONJ; um/zu, ohne/zu, statt/zu, so/dass are SCONJ; einerseits/andererseits and teils/teils are ADV. Classify the whole identity, not the clicked anchor's standalone POS.
An established noncompositional expression is an Idiom; identical literal wording is separate. An anchor or fixed article/preposition click selects the same complete expression. A fused word is split into adjacent occurrences, one per word it holds, and \`fusedWords\` says what each stands for: im is <sN>i</sN> standing for in and <sN+1>m</sN+1> standing for dem, zur is zu and r (der), geht's is geht and 's (es). Each piece belongs to the unit of the word it stands for. Outside a larger fixed expression, a preposition piece is a singleton ADP and an article piece is the article of the noun its phrase opens onto, joining that noun like a standalone article: in Ich bin im Wald, clicking m or Wald gives [m,Wald] NOUN and clicking i gives [i] ADP; in Er wartet aufs Ende, auf joins wartet as its governed preposition and s joins Ende. Inside a larger fixed expression (Öl ins Feuer gießen, zur Verfügung stellen, im Allgemeinen) both pieces are members. An abbreviation (z.B., usw., Dr.) is one occurrence standing for its whole expansion. An ordinary full verb with a free object (eine Cola bringen) has no larger classification route; only a support-verb predicate is a Collocation.
Free substantive interrogatives, demonstratives, relatives, quantifiers and negatives are PRON; adnominal forms directly modifying a noun are DET. Genitive jedermanns remains PRON. Attributive genitives dessen/deren/wessen are also PRON (with external DET function), not ordinary agreeing determiners: keep the following noun separate. Article-bound possessives der meine/der meinige have a separate DET article and PRON meine/meinige; do not absorb that article using the common-noun rule. Fixed was für einer/was für welche is one PRON target; was für ein before a noun, or plural/mass was für, is one DET target. These expressions can be discontinuous; preserve all fixed anchors and exclude the noun or other free material. Comparative and adverbially used adjectives remain ADJ, never ADV: sie singt laut and er fährt langsam give laut and langsam ADJ, because a word that can inflect as an attributive adjective (lauter, langsame) is an adjective. An attributive adjective or participle is a singleton: the article before it and the noun after it belong to the noun, so in ein alter Mann clicking alter gives [alter] ADJ with ein and Mann Exclude. Do not infer lemma or inflection here.
German common nouns include their overt definite/indefinite article as fixed members, even across adjectives: der steile Aufstieg gives [der,Aufstieg] NOUN and steile ADJ. A noun absorbs at most one article, the one opening its own nominal phrase; an article separated from the clicked noun by a verb, a clause boundary or another noun belongs to that other noun and never joins: clicking Weg in Der Weg ist das Ziel gives [Der,Weg], never das. Article clicks resolve the same noun. In compatible nominal coordination, only the closest eligible noun owns the overt article: der Aufstieg und Abstieg gives [der,Aufstieg] and [Abstieg]. Closest means Segment distance within that nominal scope, excluding nested phrases; ties are Unresolved. Longer compatible coordination may share the article, but another explicit article or clause boundary stops sharing. Incompatible agreement and proximity alone never license sharing. Only forms of the true definite article der/die/das or indefinite article ein are absorbed, including an article piece of a fused word (m in im, s in ins) and a shortened article ('ne, 'nen). mein/dieser/kein are NOT absorbed articles in this domain: kein Haus gives [kein] DET and [Haus] NOUN, mein Hund gives [mein] DET and [Hund] NOUN. Clicking either does not include the other. mein/dieser/kein remain independent DETs. Bare nouns stay bare. These noun rules preserve any larger established idiom boundary.
A target is defensible only when the exact assembled members form the complete realized fixed unit, with no omitted present fixed member and no added free material. Uncertainty or contradictory membership must remain Unresolved; do not repair, trim, extend or replace the assembled group.`;

export function classifyGermanTarget(
	options: DumgenOptions,
	input: { sentence: SegmentedSentence; clickedSegmentIndex: number },
	scope: OperationScope,
) {
	return Effect.gen(function* () {
		// An abbreviation is one Segment standing for its whole expansion, and
		// the table names the Kind of the unit that expansion is.
		const abbreviation = abbreviationEntry(
			germanFusionTable,
			input.sentence.segments[input.clickedSegmentIndex]?.text ?? "",
		);
		if (abbreviation?.kind) {
			recordEvent(scope, "AbbreviationTable", {
				text: abbreviation.text,
				kind: abbreviation.kind,
			});
			return validateEncounter(
				{
					sentence: input.sentence,
					target: {
						family: "Lexeme",
						kind: abbreviation.kind,
						memberSegmentIndices: [input.clickedSegmentIndex],
					},
				},
				"classifyTarget",
			).target as AnalysisTarget<"de">;
		}
		const judge = judgmentCaller(options);
		const membership = membershipQuestions(input);
		// Membership and route are independent judgments over the same state, so
		// they travel in one round trip. The route is asked about the complete
		// unit containing the clicked occurrence rather than about the assembled
		// group; the grammar stage's own support question guards the assembly.
		const { output: result } = yield* judge<Questions>(
			"classifyTarget",
			"de/target",
			classificationState(input, targetCriteria),
			{ ...membership, route: routeQuestion },
			scope,
			[],
		);
		const assembly = assembleTarget(input, result.answers);
		recordEvent(scope, "JudgmentApplicability", {
			consumed: [...Object.keys(membership), "route"],
			ignored: [],
		});
		if (assembly.decision === "Unresolved")
			throw new DumgenFailure(
				"Unresolved",
				"classifyTarget",
				assembly.reason,
			);
		recordEvent(scope, "TargetAssembled", {
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
	});
}
