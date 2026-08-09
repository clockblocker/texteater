import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/PART, or
return Unresolved without changing the route.

Resolve only when exactly one balanced TARGET pair marks exactly one complete
particle Lexeme and the context establishes that particle identity. German
particles are uninflected under the current Dumling codec, so every Resolved
result uses surfaceKind Citation, even for an ordinary contextual occurrence.
Never invent an Inflection Surface or inflectional features.

This draft uses the IDS lexical taxonomy for route ownership: it includes the
negative particle nicht, infinitival zu, and traditional German modal or
attenuation particles such as the demonstrated halt and eben when their clause
use is clear. Universal Dependencies supplies the representable Core Feature
values but does not override that draft IDS ownership decision for modal
particles. Homographic spelling alone is not enough. A modal particle is
clause-dependent, typically occurs in the middle field, and contributes speaker
stance without serving as a standalone answer or linking clauses.

Return Unresolved for a German separable-verb prefix: Universal Dependencies
excludes those so-called verb particles from PART, and the current Dumling
codec exposes PartType=Vbp on ADP instead. Also return Unresolved for an ADV,
INTJ response, CCONJ, SCONJ, ADP, or a member of a larger discourse Phraseme;
for an isolated homograph without context; when the target includes another
particle, verb, complement, punctuation, or other non-lexical material; or when
there is more than one TARGET pair. An earlier unmarked occurrence does not
invalidate one later correctly marked particle occurrence.

Emit exactly one memberOrthographies value for a Resolved result. Standard
includes canonical spelling and ordinary sentence-initial capitalization.
Typo means a real spelling or inappropriate-casing error. normalizedMembers is
the normalized contextual particle: lowercase ordinary capitalization and
repair only typos, while preserving the attested lexical item. Never substitute
a synonym or copy a different Lemma form. A spelling repair requires Typo.
Because this route requires one complete single-word particle,
realizationCoverage is Full; incomplete and overbroad targets are Unresolved.

surfaceFeatures is null unless this exact attested use is archaic, in which
case emit {"historicalStatus":"Archaic"}. The Lemma canonicalForm is the
normalized dictionary form of the same particle.

Core Features are stable grammatical identity. Use exactly these rules:
- infinitival zu has partType Inf and polarity null;
- negative nicht has polarity Neg and partType null;
- modal particles have both partType and polarity null because the current
  German codec does not expose PartType=Mod, and an affirmative-looking modal
  use is not thereby a positive-polarity response;
- ordinary German particles have abbr and foreign null.

Although the schema can represent polarity Pos, foreign Yes, and abbr Yes, do
not infer them from meaning, spelling, or code-switching. Use those values only
when the context establishes the corresponding particle Lemma. Keep every
unsupported Core Feature null.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-part-demo-modal-halt",
	"grammar-de-part-demo-typo-ebn",
	"grammar-de-part-demo-unresolved-verb-particle-auf",
	"grammar-de-part-demo-unresolved-response-nein",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/particle",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
