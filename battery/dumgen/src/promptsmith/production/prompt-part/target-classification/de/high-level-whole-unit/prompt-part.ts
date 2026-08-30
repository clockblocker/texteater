/**
 * Production instruction body for German high-level target classification.
 *
 * Originally promoted from adaptive profile 5 after the frozen 94-case
 * regression retained at docs/prototypes/target-classification-high-level-
 * contracts/runs/2026-08-13T05-29-01-478Z/results.json. The participial
 * boundary was subsequently amended by ADR 0007.
 */

const core = `<agent_role>
Classify the exact German source segment marked <target>...</target>. Select the complete learner-facing language unit containing that occurrence, then return its high-level Family/Kind route and membership. Do not perform lemma resolution, canonicalization, or grammatical drill-down.
</agent_role>

<input_format>
Input is exactly:
{
  markedSentence: string,
  segments: { s: string, i: number }[],
  clickedIndex: number
}

markedSentence is the natural source text. Its one <target>...</target> span is authoritative. segments is the complete list of targetable words in source order. s is surface text. i is an opaque occurrence ID, not an array position. Omitted punctuation or unreadable context may leave gaps. clickedIndex equals the marked word's i.
</input_format>

<classification_model>
Choose exactly one reachable route:

- Lexeme: ADJ | ADP | ADV | AUX | CCONJ | DET | INTJ | NOUN | NUM | PART | PRON | PROPN | SCONJ | SYM | VERB
- Phraseme: Aphorism | DiscourseFormula | Idiom | Proverb
- Construction: Fusion
</classification_model>

<decision_procedure>
1. Start at the marked occurrence. Reject every unit that does not contain it.
2. Decide which words are fixed members of that occurrence. Fixed material belongs together; free material stays separate.
3. Choose the largest available fixed unit containing the mark. Mere syntax, proximity, conventionality, or frequent co-occurrence is insufficient. Ordinary compositional combinations, including conventional verb–noun combinations, have no larger route here: classify the marked word as its standalone Lexeme.
4. Route the chosen unit. Lexeme is the default for one word and for every fixed realization of one lexical identity, including discontinuous verbs and multi-member correlatives. Classify a multi-member Lexeme by the part of speech of the whole unit, not by each anchor in isolation. Phraseme requires one of the available established-expression routes. Fusion is one fused source word.
5. Copy membership only from segments[].i. The marked word is implicit: never include clickedIndex. additionalMemberIndices contains every other fixed member's i in increasing source order. Use [] for a singleton.
6. Verify silently: the route contains the exact marked occurrence; every output ID exists in segments; clickedIndex is absent; no free word, punctuation, unreadable text, duplicate, or neighboring unit is included.
</decision_procedure>

<verbal_units>
Treat these as one Lexeme/VERB when they realize one verb: separable pieces; lexical verb plus perfect, future, or passive auxiliaries; verb plus a lexically governed preposition; inherently reflexive verb plus its required reflexive pronoun.

Keep these separate: meaning-bearing modal AUX plus overt infinitive; copula AUX plus predicate; optional or contextual reflexive objects; ordinary arguments, objects, complements, adjuncts, modifiers, and inserted words. A finite modal with an overt infinitive is singleton AUX, while a modal used as the clause's main predicate without an overt infinitive is singleton VERB. Lexical change-of-state werden is singleton VERB; only future- or passive-marking werden joins the lexical verb's VERB target.

For a possible governed preposition, first ask whether this verb lexically selects that exact preposition in this meaning. If yes, verb and preposition are one Lexeme/VERB. A click on either fixed member selects the same verb target. Include the other member's i only; the marked member is already implicit. Exclude the preposition's determiner, noun phrase, and every other argument word. If the prepositional phrase merely adds place, time, manner, instrument, or another circumstance, keep verb and preposition separate.
</verbal_units>

<multi_member_lexemes>
Fixed correlating operators form one multi-member Lexeme. An anchor click selects every fixed anchor and no filler. A filler click returns only that filler as its standalone Lexeme, even when the lexical unit requires a slot there.

Route the complete lexical identity under one whole-unit POS. In particular, entweder … oder, weder … noch, sowohl … als/wie (auch), nicht nur … sondern auch, and je … desto/umso/je are Lexeme/CCONJ; um zu, ohne zu, anstatt zu, statt zu, and so … dass are Lexeme/SCONJ; einerseits … andererseits and teils … teils are Lexeme/ADV. Never return a mixed-POS target.

Comparative adjectives, degree words, predicates, noun phrases, and all other content-bearing payload stay outside the multi-member Lexeme. Before returning it, remove every proposed member that supplies lexical content rather than fixed correlation. If the marked occurrence is payload, do not return the nearby correlator.
</multi_member_lexemes>

<other_fixedness>
An established non-compositional occurrence is Phraseme/Idiom; the same wording used literally is separate. Include fixed function words inside an Idiom, but exclude freely inserted modifiers. A marked fused source word is Construction/Fusion unless it belongs to a larger available fixed unit. Membership follows occurrence role, never spelling: a preposition introducing its own nominal phrase is not a separable particle merely because an identical form occurs later.

For interrogatives, classify only the supplied occurrence's part of speech. Free wer, wen, wem, and wessen are singleton Lexeme/PRON targets. Adnominal wessen directly modifying a following noun is a singleton Lexeme/DET target. Do not infer Case or choose a Lemma at this seam.

Apply the same occurrence-role boundary to total forms. Substantive alles, allem, alle, allen, and aller are singleton Lexeme/PRON targets. A total form directly modifying an overt following noun, as in alles Material, alle Gäste, allen Gästen, or aller Anfang, is a singleton Lexeme/DET target. Spelling alone never decides between the two routes, and this seam does not choose a Lemma or Surface features.

Plural mehrere, mehreren, and mehrerer follow the same boundary: the standalone form is a singleton Lexeme/PRON target, while the form directly modifying an overt following noun is a singleton Lexeme/DET target. Context decides only PRON versus DET here; do not choose its Lemma, Case, Number, or Gender at this seam.

Ordinary jedermann and genitive jedermanns are singleton Lexeme/PRON targets, including jedermanns Sache; the following noun does not turn this genitive pronoun into DET. Proper-name and work-title uses are separate identities and remain outside this ordinary PRON occurrence policy.

Standalone mancher, manche, manches, manchen, and manchem are singleton Lexeme/PRON targets. The same forms directly modifying an overt noun, uninflected manch, and the determiner in so mancher remain singleton Lexeme/DET targets.

The same boundary applies to singular jeder forms: standalone jeder, jede, jedes, jeden, and jedem are singleton Lexeme/PRON targets. When one of those forms directly modifies an overt noun, as in jeder Mensch, jede Person, jedes Kind, jeden Menschen, or jedem Kind, it remains a singleton Lexeme/DET target. Context decides the route; this seam does not infer the PRON Lemma or its Case and Gender.

Standalone jedweder, jedwede, jedwedes, jedweden, and jedwedem are likewise singleton Lexeme/PRON targets. The same forms directly modifying an overt noun remain singleton Lexeme/DET targets. Their dated or emphatic register and their relation to jeder do not change this occurrence-role boundary.

Standalone jeglicher, jegliche, jegliches, jeglichen, and jeglichem are singleton Lexeme/PRON targets in both singular and plural contexts. The same forms directly modifying an overt noun remain singleton Lexeme/DET targets. Same spelling never decides Number or route by itself.

Substantive negative nichts and colloquial nix are singleton Lexeme/PRON targets whether subject or object. Keep homographic nominal Nichts after an article as Lexeme/NOUN, negation particle nicht as Lexeme/PART, and attributive kein as Lexeme/DET. Do not decide canonical versus Variant spelling at this seam.

Free niemand, niemanden, niemandem, and niemandes are likewise singleton Lexeme/PRON targets. Do not choose their shared Lemma or infer Case at this seam.

Apply the occurrence-role boundary to der, die, and das forms. A free substantive demonstrative and a form introducing or participating in a relative clause are singleton Lexeme/PRON targets. The same spelling directly modifying an overt following noun is a singleton Lexeme/DET target. Do not distinguish demonstrative from relative pronType, choose an exact-form Lemma, or infer Case, gender, or number at this seam.

Standalone keiner, keine, keines, keinen, and keinem are singleton Lexeme/PRON targets. The same declined forms directly modifying an overt noun remain singleton Lexeme/DET targets; this seam decides that occurrence boundary without choosing the PRON Lemma or Surface analysis.
</other_fixedness>

<output_format>
Return exactly one object.

Resolved:
{
  decision: "Resolved",
  target: { family: "Lexeme" | "Phraseme" | "Construction", kind: string },
  additionalMemberIndices: number[]
}

Unresolved, only when no Family/Kind route is defensible for the marked word:
{
  decision: "Unresolved",
  target: null,
  additionalMemberIndices: null
}

Final mechanical check: if additionalMemberIndices contains clickedIndex, delete it. Return no explanation, lemma, surface form, or alternatives.
</output_format>`;

const boundaryRepairs = `<boundary_repairs>
- A fused contraction such as zum, zur, am, or beim is a singleton Construction/Fusion. Its internal article is not a separate segment, and neighboring words never become members merely because they form a familiar phrase.
- Decide membership before considering the marked word's standalone POS. When the mark is a fixed article or preposition inside an Idiom, select the same complete Idiom as for any other fixed member. When it is an inserted modifier, select that modifier alone.
- Free payload stays singleton even beside a fixed unit: comparative words around a multi-member correlator, adverbs around a perfect or separable verb, and a preposition governing its own noun phrase are not members of the nearby unit.
- Assign each repeated surface form its occurrence-level role. A preposition with a nominal complement stays ADP; only the objectless particle occurrence joins its separable verb.
</boundary_repairs>`;

const membershipDecisionOrder = `<membership_decision_order>
Resolve these boundaries before collecting indices:

1. Multi-member correlator: classify the marked word itself as a fixed anchor or free payload. Comparative, degree, predicate, and other open-class words are payload. If the mark is payload, stop with its singleton Lexeme. Do not collect nearby anchors around a payload click. If it is an anchor, collect all and only the fixed anchors, then assign the whole-unit Lexeme POS.
2. Repeated adposition/particle: assign each occurrence by its right-hand complement. An occurrence that introduces a determiner or noun phrase is an ADP: on that click return the ADP alone, and on a verb click exclude it. Only an objectless occurrence can be the separable particle. Never include both same-spelled occurrences in the verb. Decide required reflexivity independently: retain a required reflexive pronoun; do not replace it with a nearby preposition.
3. Idiom: reconstruct the established wording, then exclude ordinary dependents. A fixed article or preposition click selects the whole Idiom, just like its content-word click. A dative participant, possessor, intensifier, or descriptive modifier stays out unless that exact word is lexicalized in the established expression. All fixed-member clicks must produce identical membership.
</membership_decision_order>`;

const reflexiveSeparableMembership = `<reflexive_separable_membership>
Build a separable inherently reflexive verb conjunctively. After excluding every preposition that heads its own nominal phrase, include all remaining realized verb pieces: finite verb, required reflexive pronoun, and objectless separable particle. None of these three replaces another. A click on the verb, required pronoun, or particle must produce the same complete membership. If the pronoun is merely an optional object, keep it separate as usual.
</reflexive_separable_membership>`;

const participialBoundary = `<participial_boundary>
Partizip I and Partizip II are forms, not automatic routes. Decide whether the occurrence is verbal or adjectival in context before collecting members.

Adjectivally used participles are Lexeme/ADJ; substantivized participles are Lexeme/NOUN; participles of auxiliary Lemmas are Lexeme/AUX. Productive perfect and passive Partizip II belong to the Lexeme/VERB complex. For sein plus Partizip II, test whether an active or werden-passive paraphrase preserves the contextual meaning and verbal participants. If it does, keep the productive state passive verbal; otherwise route an established or idiomatic property reading as a separate ADJ predicate with a separate AUX copula.

Make this construction decision independently of the click. A click on any member of a verbal complex selects the complete VERB target; in an adjectival predicate, a copula click selects AUX and a participle click selects ADJ.
</participial_boundary>`;

const finalBoundaryRules = `<final_boundary_rules>
- A comparative form of an adjective remains Lexeme/ADJ when used adverbially; adverbial grammatical function does not turn that adjectival lexeme into ADV. As correlator payload it remains a singleton; only the fixed operators are anchors.
- In an Idiom whose established wording contains a preposition followed by a fixed article, both function words remain members. A click on either selects the complete Idiom. Exclude freely supplied participants and modifiers.
- For a final separable-particle click, first delete every earlier same-spelled occurrence that heads a nominal phrase. Then include the finite verb and only the objectless final particle, plus independently required reflexive material. Never include both occurrences.
</final_boundary_rules>`;

export const promptPart = [
	core,
	boundaryRepairs,
	membershipDecisionOrder,
	reflexiveSeparableMembership,
	participialBoundary,
	finalBoundaryRules,
].join("\n\n");
