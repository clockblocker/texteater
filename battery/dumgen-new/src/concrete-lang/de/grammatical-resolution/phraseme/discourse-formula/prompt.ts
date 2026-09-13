import { z } from "zod";
import { grammarSchemas } from "../../../../../generated/schemas.js";
import {
	defineLinguisticPrompt,
	grammarInputSchema,
} from "../../../authoring.js";
import cases from "./corpus.json";
export const inputSchema = grammarInputSchema;
export const outputSchema = z.union([
	grammarSchemas["de/Phraseme/DiscourseFormula"],
	z.strictObject({ decision: z.literal("Unresolved") }),
]);
export const promptSource = defineLinguisticPrompt({
	route: "grammatical-resolution/de/phraseme/discourse-formula",
	inputSchema,
	outputSchema,
	body: `<agent_role>
Resolve one already-classified German Phraseme/DiscourseFormula occurrence to
its Surface and Lemma grammar. The operation is total: always resolve
the supplied target.
</agent_role>

<input_contract>
Input is exactly { markedContext: string, members: string[] }. Every TARGET span
marks one supplied fixed member, and members repeats those exact texts in source
order. Both projections are authoritative. The caller has already proved the
route, occurrence, and complete membership.

Never reject, repair, add, remove, merge, split, reorder, or reclassify
membership. Names, vocatives, modifiers, punctuation, complements, and nearby
expressions outside TARGET are context only. Return exactly one
memberOrthographies and one normalizedMembers entry for every supplied member,
including repeated members and members separated by unmarked context.
</input_contract>

<route_contract>
This route contains conventionalized interactional formulas that perform a
discourse act in context: greetings, leave-taking, thanks, apologies, wishes,
responses, refusals, requests, reactions, initiations, transitions, and other
already-classified formulas. A valid target may have one or several members,
may be discontinuous, and may be followed or interrupted by free material.

Unmarked context may contain an Interjection, Idiom, Proverb, Aphorism,
Collocation, arbitrary quotation, compositional phrase, or another occurrence.
Those contrasts do not reopen the upstream route decision and never enter the
output arrays.
</route_contract>

<lemma_identity>
lemma contains canonicalForm and coreFeatures.discourseFormulaRole.
canonicalForm is the complete current dictionary wording of the formula in
lowercase, including German nouns, with words joined by single spaces and no
punctuation. It may contain words not realized by an explicitly Partial
occurrence. An abbreviation or licensed orthographic variant maps to the full
current wording.

For Full coverage with Canonical spelling, derive canonicalForm mechanically:
lowercase every normalizedMembers entry and join all entries with single
spaces. Preserve repeated positions. Never absorb unmarked context, and never
invent or restore a word that is absent from the supplied Full occurrence.
Only an explicitly Partial occurrence or a licensed Variant may depart from
that mechanical equality.

discourseFormulaRole is exactly one of Greeting, Farewell, Apology, Thanks,
Acknowledgment, Refusal, Request, Reaction, Initiation, or Transition, or null.
Choose the identity established by this context. The same canonical wording
with a different scalar role is a different grammatical Lemma: bitte schön can
be Request in an order but null when presenting an object; tut mir leid can be
Apology when the speaker caused harm but null when expressing sympathy.
Acknowledgment covers conventional replies to thanks. Reaction covers an
expressive response to an event, not every conversational response. Use null
when the classified formula has a supported function such as wish,
congratulation, presentation, or sympathy that no enum value names. Never emit
an array or invent a nearby role.
</lemma_identity>

<coverage>
realizationCoverage is Full when the occurrence realizes all entity-owned
lexical material. A conventional abbreviation such as MfG may fully realize
the formula and is Full.

Use Partial only when fixed lexical material is genuinely unrealized and the
exact full formula remains recoverable, normally from an explicitly broken-off
or ellipsis-marked beginning such as Es tut mir … for es tut mir leid. Return
only realized supplied members in normalizedMembers and the complete wording
in canonicalForm. Partial never repairs membership: it cannot excuse an overt
unmarked word, delete a supplied member, or combine occurrences.

Without an explicit ellipsis or broken-off signal, an unbroken supplied formula
is Full even when a longer related formula exists. Treat its supplied wording
as the complete identity; never infer an unspoken prefix or tail merely because
another formula shares most of its words.
</coverage>

<orthography_and_surface>
Standard means exact conventional spelling, ordinary utterance-initial
capitalization, a licensed abbreviation, or a licensed historical spelling.
Typo means a genuine selected-member spelling or inappropriate-casing error.
Repair only Typo positions in normalizedMembers. Normalize ordinary
utterance-initial capitalization to citation casing without calling it a Typo:
Guten Morgen yields guten and Morgen. Preserve required German noun
capitalization such as Morgen, Dank, Güte, Reise, Verzeihung, and Ursache. A
lowercase noun such as morgen in Guten morgen is Typo and normalizes to Morgen.

Apply initial-casing normalization equally to Canonical and Variant Surfaces.
Never preserve a first member's capital merely because it begins a quoted
utterance: lowercase a non-noun, non-abbreviation first member in
normalizedMembers, while keeping its member orthography Standard. Preserve
lexically required noun and abbreviation capitals.

surface contains exactly spelling and surfaceFeatures. spelling is Canonical
for current wording and Typo repair. Use Variant for a licensed orthographic or
abbreviated realization of the same Lemma, such as Auf Wiedersehn or MfG; keep
its attested licensed spelling in normalizedMembers. surfaceFeatures is null
unless the formula's grammatical use itself is archaic, then return
{ historicalStatus: "Archaic" }. Historical spelling alone is not an archaic
use.
</orthography_and_surface>

<output_contract>
Return the exact supplied response schema. A resolved answer has exactly five
fields: memberOrthographies, normalizedMembers, surface, lemma, and
realizationCoverage. Both arrays have one entry per supplied member in source
order. lemma contains canonicalForm and coreFeatures, including every required
nullable key; use {} when this route has no Core Features.

surface contains exactly spelling and surfaceFeatures. This route is
uninflected: omit inflectionalFeatures. Do not emit a Surface discriminator.

Set realizationCoverage to Full for a complete realization, or Partial only
where the route's coverage policy permits unrealized lexical material. Keep
Surface and Lemma separate. The application supplies language, family, kind,
unitKind, normalized Surface construction and Surface-to-Lemma linkage; omit
those fields, target indices, confidence, candidates, and explanations.
</output_contract>`,
	cases,
	demonstrationIds: [
		"grammar-de-discourse-formula-demo-guten-morgen",
		"grammar-de-discourse-formula-demo-es-tut-mir-leid-discontinuous",
		"grammar-de-discourse-formula-demo-vielen-dank-complement",
		"grammar-de-discourse-formula-demo-ach-du-meine-guete-vocative",
		"grammar-de-discourse-formula-demo-mfg-variant",
		"grammar-de-discourse-formula-demo-es-tut-mir-partial",
	],
	source: import.meta.url,
});
