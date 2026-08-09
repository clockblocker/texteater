import { definePromptSource } from "../../../../../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `Target Classification has already fixed this request to German
Construction/PairedFrame and supplied the marked lexical frame members. Resolve
the Surface and Lemma grammar for that fixed route. Do not flatten the complete
frame into one of its member Lexemes and do not absorb its intervening fillers.

A PairedFrame is one conventionalized discontinuous grammatical unit whose two
or more lexical arms jointly organize intervening or following material. The
prototype's source-backed inventory includes multi-part coordinators,
proportional linkages, and marked infinitive frames: entweder ... oder, weder ... noch,
sowohl ... als auch, sowohl ... wie, sowohl ... wie auch, je ... desto (also
je ... umso), and um/ohne/anstatt ... zu. This list is closed for this
prototype. A single
conjunction, preposition, particle, or infinitive marker belongs to its Lexeme
route, not here.

Apply these gates in order and stop at the first failure:

1. One occurrence: every marked member must belong to one occurrence of one
   licensed frame. Return Unresolved for mixed occurrences, mismatched arms, or
   words that merely happen to resemble different frame members.
2. All-member marking: all and only the lexical frame members must be marked.
   Return Unresolved when one arm is unmarked or when a conjunct, infinitive,
   modifier, or other filler is marked. In sowohl ... als auch and sowohl ...
   wie auch, als/wie and auch are two separate members, so there are three
   marked members. In the independently licensed sowohl ... wie frame, wie is
   the complete second arm and there are two members.
3. Full realization: every accepted Surface is Full. Never repair scope and
   never return Partial.

The shared input preflight has already proved that every TARGET pair contains
exactly one word-like member. Emit exactly one memberOrthographies value per
TARGET pair in textual order. Typo means a real spelling or inappropriate-
casing error. Ordinary sentence-initial capitalization is Standard.

This route is Citation-only under the current Dumling codec, including when the
frame appears in an ordinary sentence. Every Resolved output has surfaceKind
Citation, realizationCoverage Full, and no inflectionalFeatures.
surfaceFeatures is null unless the grammatical use itself is archaic. The
complete Lemma coreFeatures object is exactly {}.

normalizedMembers is the normalized space-separated projection of marked frame
members in textual order. Lowercase ordinary sentence-initial capitalization
and repair only actual typos. It excludes all fillers and punctuation.
canonicalForm writes the exact lexical frame inventory with a spaced ellipsis
between its arms: entweder … oder, weder … noch, sowohl … als auch, sowohl …
wie, sowohl … wie auch, je … desto, je … umso, um … zu, ohne … zu, or anstatt
… zu.

Alternative lexical arms or member inventories create separate empty-Core
Lemmas: je ... desto and je ... umso do not share a Lemma, nor do sowohl ...
als auch, sowohl ... wie, and sowohl ... wie auch. Every licensed frame in this
closed inventory therefore uses spelling Canonical. Reserve Variant for
licensed orthographic variation of the same lexical members; no such Variant
is established here. A repaired typo remains a Canonical Surface because typo
status belongs to memberOrthographies.

Resolved has a non-null resolution. Unresolved has resolution null. Return only
the model fields: never language, family, kind, a linked Lemma inside Surface,
target indices, Reading data, confidence, candidates, sources, or explanations.`;

export const demonstrations = corpus.select([
	"grammar-de-paired-frame-anstatt-zu",
	"grammar-de-paired-frame-sowohl-als-auch",
	"grammar-de-paired-frame-sowohl-wie-auch",
	"grammar-de-paired-frame-unresolved-overselected-determiner",
]);

export const promptSource = definePromptSource({
	route: "grammatical-resolution/de/construction/paired-frame",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
