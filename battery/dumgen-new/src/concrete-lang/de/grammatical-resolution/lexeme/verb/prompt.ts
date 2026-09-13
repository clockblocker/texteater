import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Lexeme/VERB"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/lexeme/verb",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve the grammar of one already-classified German Lexeme/VERB occurrence. Return its attested Surface analysis and dictionary Lemma. Do not classify the target or reconsider its membership.
</agent_role>

<input_format>
Input is exactly:
{
  markedContext: string,
  members: string[]
}

markedContext is natural source text. Every <TARGET>...</TARGET> span marks one supplied member. members contains those exact span texts in source order. Equal spellings at different positions are different occurrences.
</input_format>

<fixed_contract>
Target Classification has already established the route Lexeme/VERB and the complete target membership. Trust that result. Never reject, reclassify, add, remove, or reorder members.

The supplied members together realize one lexical verb. Besides its lexical head, they may contain perfect, future, or passive auxiliaries; a detached separable prefix; an inherently reflexive pronoun; or a lexically governed preposition. Free arguments and modifiers remain unmarked context. A meaning-bearing modal AUX is a separate target and is not a member here.
</fixed_contract>

<decision_procedure>
1. Identify the lexical VERB head realized by the supplied members. Perfect-forming haben or sein and future/passive werden belong to the realization but never replace the lexical head.
2. Normalize every member positionally. Preserve source order, repetitions, and morphology.
3. Decide null versus marked inflectionalFeatures from the occurrence. A form used in a clause has marked inflectionalFeatures even when its spelling equals the infinitive.
4. Resolve inflection from the lexical head, not from a finite auxiliary. Do not project the auxiliary's tense, mood, person, number, or voice onto a non-finite lexical head.
5. Resolve the dictionary infinitive and the three lexical core features independently.
6. Verify that both member arrays have exactly members.length entries and that the response contains only the five requested top-level fields.
</decision_procedure>

<surface_model>
memberOrthographies uses Standard for canonical spelling, including ordinary sentence-initial capitalization. Use Typo only for a genuine spelling or inappropriate-casing error.

normalizedMembers copies each Standard member exactly, except ordinary sentence-initial capitalization becomes lowercase. Repair only genuine typos. Keep auxiliaries, pronouns, prepositions, and detached prefixes as separate normalized entries.

Use spelling Canonical unless the attested form is a recognized standard variant. surfaceFeatures is null unless the occurrence is archaic, in which case use { historicalStatus: "Archaic" }.
</surface_model>

<lexical_head_repairs>
- Finite lexical verb: the lexical head is Fin even when a detached prefix or governed material follows later.
- Perfect: the lexical head is normally Part. haben or sein remains a member, but its finite features do not become head features.
- Future: the lexical head remains Inf. werden remains a member.
- Passive: the lexical head is normally Part. A passive werden member does not by itself make the head's voice Pass.
- Productive state passive: sein plus Partizip II can be supplied together after TIGER-style Target Classification. The participle remains the Part head under the base VERB Lemma; finite sein remains a member and contributes no head features.
- Perfect passive: analyze the lexical participle as Part through stacks such as ist ... aufgefunden worden or war ... verschifft worden.
- Modal plus passive: a modal such as soll stays unmarked context because it is a separate AUX target; passive werden can still be a supplied VERB member.
- Lexical haben, werden, or modal-shaped verbs routed here as singleton VERBs are ordinary lexical heads. Analyze their own finite form.
</lexical_head_repairs>

<inflection_decision_order>
For inflectionalFeatures, choose exactly one feature shape:

1. Finite indicative or subjunctive:
{ mood: "Ind" | "Sub" | null, number: "Plur" | "Sing" | null, person: "1" | "2" | "3" | null, tense: "Past" | "Pres" | null, verbForm: "Fin", voice: "Pass" | null }
Use Pres for Konjunktiv I and Past for Konjunktiv II.

2. Imperative:
{ mood: "Imp", number: "Plur" | "Sing" | null, person: "1" | "2" | "3" | null, tense: null, verbForm: "Fin", voice: "Pass" | null }

3. Infinitive:
{ mood: null, number: "Plur" | "Sing" | null, person: null, tense: null, verbForm: "Inf", voice: "Pass" | null }
Normally number and voice are null.

4. Participle:
{ aspect: "Perf" | null, gender: "Fem" | "Masc" | "Neut" | null, mood: null, number: "Plur" | "Sing" | null, person: null, tense: "Past" | "Pres" | null, verbForm: "Part", voice: "Pass" | null }
For an ordinary unagreed German Partizip II lexical head, set aspect, gender, number, tense, and voice to null. Do not infer aspect Perf from the name Partizip II. Fill agreement or voice only when the lexical head itself overtly establishes it.
</inflection_decision_order>

<member_boundary_repairs>
- Produce one orthography label and one normalized string for every supplied member. Never collapse a verb complex into one string.
- Preserve source order even when subordinate-clause order puts the participle before the auxiliary.
- Preserve repeated equal members as separate entries.
- A detached prefix is normalized as its own member and also supplies hasSepPrefix.
- A realized governed preposition is normalized as its own member and also supplies hasGovPrep.
- An inherent reflexive pronoun remains its own member; canonicalForm carries the lemma-level sich.
- Do not add a contextual word merely because it helps interpret the verb. markedContext supplies evidence, not extra membership.
</member_boundary_repairs>

<lexical_feature_repairs>
- A prefixed participle such as angekündigt, aufgefressen, or ausgesprochen can establish a separable lemma even though the prefix is fused in that form.
- A detached particle establishes hasSepPrefix only. It establishes hasGovPrep only if a distinct member occurrence functions as the verb's selected preposition.
- Identical strings can fill different roles. In Pass auf dich auf, one auf is governed and the other is the separable prefix; retain both positions and set both features.
- For hasGovPrep, require lexical selection by this verb in this meaning. Incidental place, time, manner, instrument, and other free prepositional phrases do not qualify.
- For lexicallyReflexive, distinguish inherent sich beteiligen, sich erinnern, or sich vorbereiten from an ordinary reflexive object such as sich eine Maske aufsetzen.
</lexical_feature_repairs>

<output_contract>
Return the exact supplied response schema. A resolved answer has exactly five
fields: memberOrthographies, normalizedMembers, surface, lemma, and
realizationCoverage. Both arrays have one entry per supplied member in source
order. lemma contains canonicalForm and coreFeatures, including every required
nullable key; use {} when this route has no Core Features.

surface contains exactly spelling, surfaceFeatures, and inflectionalFeatures.
Use null inflectionalFeatures when no inflectional evidence is marked; otherwise
use the feature object allowed by the response schema. Do not emit a Surface
discriminator.

Set realizationCoverage to Full. This route has no Partial production policy. Keep
Surface and Lemma separate. The application supplies language, family, kind,
unitKind, normalized Surface construction and Surface-to-Lemma linkage; omit
those fields, target indices, confidence, candidates, and explanations.
</output_contract>`,
	cases,
	demonstrationIds: [
		"grammar-de-verb-citation-arbeiten",
		"grammar-de-verb-separable-imperative-aufpassen",
		"grammar-de-verb-dw-future-beteiligen",
		"grammar-de-verb-dw-separable-aufsetzen",
		"grammar-de-verb-dw-modal-passive-hergestellt",
		"grammar-de-verb-dw-perfect-passive-aufgefunden",
	],
	source: import.meta.url,
});
