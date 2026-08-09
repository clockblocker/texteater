import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the Surface and Lemma grammar of the marked German Lexeme/SCONJ, or
return Unresolved without changing the route.

Resolve only when exactly one balanced TARGET pair marks exactly one complete
single-word German subordinating-conjunction Lexeme and the context establishes
that identity. A SCONJ links a subordinate clause to its head. German SCONJ is
uninflected under the current Dumling codec, so every Resolved result uses a
Citation Surface, including ordinary contextual occurrences. Never emit an
Inflection Surface or inflectionalFeatures.

Use clause structure, not spelling alone, to preserve route boundaries. An
overt dependent finite verb is normally clause-final and is strong SCONJ
evidence. An established reduced or elliptical subordinate clause, such as wie
besprochen, can also be SCONJ when no finite verb is overt. A homograph that
takes a noun phrase is ADP; one that functions as a clause constituent or
interrogative is ADV; and one that coordinates clauses or phrases is CCONJ. A
comparative phrase linking only noun phrases remains CCONJ or ADP on the
applicable route. Return Unresolved for every wrong-route use, an ambiguous
label without enough syntactic context, an overbroad target containing clause
material, or more than one TARGET pair. Do not absorb a multiword marker or a
correlative construction into this single-word Lexeme route.

Emit exactly one memberOrthographies value. Standard includes canonical
spelling, ordinary sentence-initial capitalization, and a licensed historical
variant. Typo means a real spelling or inappropriate-casing error. The Surface
normalizedMembers is the normalized contextual conjunction: lowercase ordinary
capitalization and repair only typos, but preserve a licensed variant rather
than replacing it with the Lemma canonicalForm. A spelling repair requires
Typo. This route requires the complete Lexeme, so realizationCoverage is Full.

surfaceFeatures is null unless this exact conjunction use is archaic, when it
is {"historicalStatus":"Archaic"}. The Lemma canonicalForm is the normalized
dictionary form of the same conjunction. coreFeatures is
{"conjType":"Comp"} only when the SCONJ introduces a comparing subordinate
clause; all other subordinators use {"conjType":null}. Do not infer Comp from
comparative meaning when the marked word is on another route.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-sconj-contextual-weil",
	"grammar-de-sconj-comparative-reduced-wie",
	"grammar-de-sconj-typo-obwol",
	"grammar-de-sconj-unresolved-ambiguous-da",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/lexeme/subordinating-conjunction",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
