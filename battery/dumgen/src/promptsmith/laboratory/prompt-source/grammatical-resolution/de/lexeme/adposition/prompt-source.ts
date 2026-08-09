import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/ADP, or
return Unresolved without changing the route.

Resolve only when every TARGET pair marks lexical material belonging to one
identifiable adposition Lexeme. Multiple TARGET pairs are allowed only when all
are members of that same Lexeme. Return Unresolved when a target contains its
complement or another syntactic dependent, combines unrelated adpositions,
belongs to another route, is merely a separated verb particle, is an
article-preposition fusion, or lacks enough context to determine one
grammatical adposition identity.

Count literal opening <TARGET> tags. Emit exactly one memberOrthographies value
per opening tag in textual order. Standard includes ordinary sentence-initial
capitalization and licensed variant spelling. Typo means an actual spelling or
inappropriate-casing error. normalizedMembers is the normalized contextual
lexical material: lowercase ordinary capitalization and repair only typos, but
preserve lexical-member order and never include a complement or insert missing
members. Mark a licensed noncanonical spelling Variant rather than Typo.
Except for ordinary sentence-initial casing, if normalizedMembers changes any
marked character to repair casing or spelling, the corresponding
memberOrthographies value must be Typo.

German ADP has only Citation Surfaces in the current schema. Emit surfaceKind
Citation even when the adposition occurs in a sentence; do not invent
inflectionalFeatures. realizationCoverage is Partial only when some lexical
material of the complete adposition Lemma is not attested. surfaceFeatures must
be null unless this attested use is archaic, in which case emit
{"historicalStatus":"Archaic"}. An identifiable archaic preposition remains
Resolved; do not reject it merely because the use is obsolete.

The Lemma canonicalForm is the complete normalized citation form of the same
adposition. Core Features are stable grammatical identity, not facts copied
from one complement. adpType is Prep, Post, or Circ only when the lexical
position is established. governedCase records the case the adposition
lexically governs; it is null for ordinary two-way prepositions such as auf and
vor. Do not infer a stable governed case from the case of one local complement.
Use abbr, foreign, extPos, and partType only when they are established facts of
this Lemma; never infer them merely from spelling, a homonymous use, or a nearby
construction. A conventional abbreviated adposition is itself the citation
form: keep that abbreviated spelling as canonicalForm, emit abbr "Yes", and do
not expand it to a longer synonym. extPos is null for an ordinary preposition;
set it only when the adposition itself has established external syntactic
behavior. Use null for every unmarked nullable feature.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-adp-demo-contextual-mit-citation",
	"grammar-de-adp-demo-two-way-auf",
	"grammar-de-adp-demo-postposition-entlang",
	"grammar-de-adp-demo-sentence-initial-wegen",
	"grammar-de-adp-demo-typo-one",
	"grammar-de-adp-demo-unresolved-overbroad-mit",
	"grammar-de-adp-demo-unresolved-ambiguous-entlang",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/adposition",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
