import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/ADV, or
return Unresolved without changing the route.

Resolve only when every TARGET pair marks lexical material belonging to one
identifiable lexical adverb. Multiple TARGET pairs are allowed only when all
marked members together realize that same adverb Surface. Return Unresolved
when the target includes a syntactic modifier or dependent, combines unrelated
adverbs, belongs to another route, or lacks enough context to distinguish one
grammatical adverb identity. Productive adverbial use of an adjective remains
Lexeme/ADJ; do not reclassify it as ADV merely because it modifies a verb.
Particles, conjunctions, adpositions, and larger discourse formulas likewise
remain on their own routes.

Use clause structure to distinguish homographs across routes. A pronominal
adverb can occupy the prefield of a verb-second matrix clause, with the finite
verb immediately following it. A homographic form that introduces a
subordinate clause whose finite verb is clause-final is a Lexeme/SCONJ, not an
ADV, and is Unresolved on this route.

Before resolving, count literal opening and closing TARGET tags. They must be
balanced, and emit exactly one memberOrthographies value per opening tag in
textual order. A single TARGET pair does not prove valid scope: if it encloses
a syntactic modifier together with its adverb head, such as an intensifier plus
adverb, the target is overbroad and must be Unresolved rather than collapsed
into one orthography member. Standard includes canonical spelling and ordinary
sentence-initial capitalization. Typo means an actual spelling or
inappropriate-casing error. normalizedMembers is the normalized contextual
adverb: lowercase ordinary capitalization and repair only typos, while
preserving the complete attested morphology and the order of marked members.
Never substitute a synonym or silently add unmarked lexical material. Except
for ordinary sentence-initial casing, a changed marked spelling requires Typo.

Use Citation for an uninflected adverb, including its ordinary contextual use;
the current Dumling Inflection schema requires a non-null Degree. Use
Inflection only for a degree-marked Surface, with degree Cmp for a comparative,
Sup for a superlative, or Pos only for an explicitly degree-marked positive
form. Never emit an Inflection Surface with degree null. Preserve irregular
forms: for example lieber is a comparative Surface of gern. A periphrastic
superlative such as am liebsten is Full only when both lexical members are
marked. Resolve a degree-marked Surface only when the context identifies one
Lemma canonicalForm. If regular and suppletive analyses remain equally
defensible, return Unresolved rather than guessing one Lemma. Citation Surfaces
never carry inflectionalFeatures.

surfaceFeatures is null unless the attested use is archaic, when it is
{"historicalStatus":"Archaic"}. The Lemma canonicalForm is the dictionary form
of the same adverb. Lemma coreFeatures are stable grammatical identity:
pronType is Dem, Ind, Int, Neg, or Rel only for the corresponding pronominal
adverb identity under German annotation policy: true pronominal adverbs such as
damit are Dem, etwas is Ind, wo and warum are Int, and keineswegs is Neg. When
the lexical identity establishes one of these classes, pronType is mandatory;
nullable does not mean optional. Determine the lexical class before filling the
feature bag.
Ordinary locatives such as hier, dort, and nirgends have pronType null; wo stays
Int even in a relative use because Core Features are stable grammatical
identity. numType is Mult for an occurrence count, especially productive
n-mal forms such as zweimal, and Card for a cardinal-quantity adverb. When the
lexical numerical class applies, numType is mandatory; otherwise it is null.
foreign is Yes only for an established foreign Lemma. Do not infer any Core
Feature from meaning alone or from a homonymous non-ADV use. Use null only for
features that the established lexical identity does not mark.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-adv-demo-contextual-heute",
	"grammar-de-adv-demo-citation-hier",
	"grammar-de-adv-demo-demonstrative-dazu",
	"grammar-de-adv-demo-indefinite-genug",
	"grammar-de-adv-demo-negative-nie",
	"grammar-de-adv-demo-comparative-lieber",
	"grammar-de-adv-demo-superlative-am-liebsten",
	"grammar-de-adv-demo-typo-gester",
	"grammar-de-adv-demo-unresolved-adverbial-adjective",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/adverb",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
