# Dumspec

Dumspec connects the Dumling model to real language. It owns all the gold
Dumgen is scored against: annotated sentences, with their Knowledge and Emoji
Description gold, raw texts for intake, and the classification Rules (ADR
0037). It also owns the Authored Inventories (ADR 0021). Dumling holds only
the model's types and schemas. Dumgen and the docs site read Dumspec; neither
owns it.

## Language

**Authored Inventory**:
The closed-class units of a language that are authored instead of generated,
each Reading with its reviewed Knowledge: in German the AUX Readings, the PRON
and DET pillar cells and stems, the reflexivity unit, the pronominal adverbs,
the interrogative and relative w-adverbs (`wo`, `wann`, `wie`, `warum`), the
indefinite `irgend-` adverbs, the demonstrative `dahin`, `daher`, `hierhin` and
`hierher`, and the directional her- and hin- adverbs (`heraus`, `hinaus`,
`herein`, `hinein`, `herüber`, `hinüber`, `herunter`, `hinunter`, `herauf`,
`hinauf`, `heran`; colloquial `raus`, `rein`, `rüber`, `runter`, `rauf` and
`ran` are their Shorthands), the negation particle `nicht`, and the softening
particle `mal`, with every spelling that realizes them. They are the
model's content, not gold: a run is not scored against them. A Note's
drill-down reaches an article, auxiliary or reflexive here without generation;
a reflexive reaches the reflexivity unit, never a case cell of `sich`. An attested article reaches the
`der` or `ein` cell its spelling names for its Head's case, number and gender
(`m` before `Wald` is `dem` Dat.Masc.Sg), and Dumspec fails an article that
names none (`ein Häuser`, ADR 0041).
_Avoid_: Fixed Catalog (Dumgen's term for the members that bound a Closed
Route), closed set, catalog member

**ADP Case Table**:
The closed, authored list of a language's adpositions with the cases each
takes: the allowed cases, a preferred case where the others are colloquial,
and whether it is two-way. German keys it by Canonical Form and, where
position changes the case, by `adpType`: `für` {Acc}, `auf` {Acc, Dat}
two-way, `wegen` {Gen, Dat} preferring Gen, `entlang` Post {Acc} and Prep
{Gen, Dat}. Case is not ADP Core, since no two German ADPs differ by case
alone. It is a fact about the language, so Dumling types a frame's
preposition and case without it (ADR 0041). Dumspec checks that a
governor's Preposition Slot and an ADP occurrence's realized case, in its
records and inventories, are cases the table allows. The table lists the
circumpositions too (`um … willen`), but they are Locution ADPs and record
no case until #652 decides, so no check reads those entries yet.
_Avoid_: governed case, governedCase, case government feature

**Spec Record**:
One sentence of the golden corpus with its Segments, its targets and their
notes. A target is the Segment each member is, its route (Family and Kind),
and a full Dumling Attestation whose Lemma has that route. It may lack the
Attestation only while the record is reviewed no deeper than Segmentation.
A target also names its Reading by the Reading's Emoji Description; a record
reviewed through Reading names every one.
The Reading may carry its Reading Knowledge (Dumrel). A record's path is its
identity.
_Avoid_: case, example, gold case, fixture

**Breakdown Record**:
One Locution's or Saying's Breakdown, the gold for `segment.inLexemes`: the
Lemma, its Canonical Form as the sentence with its Segments, and the Lexeme
targets the wording breaks down into, each naming its Reading. Every
ResolvableText Segment is in exactly one target, and no target returns the
whole Lemma. Its path, `breakdown/<language>/<name>`, is its identity.
_Avoid_: inner layer, component record

**Coverage**:
How much of a Spec Record's sentence its Segmentation annotates. Full means
every ResolvableText Segment is in exactly one target or one No Target entry;
Partial leaves some Segments unannotated. Not to be confused with an
Attestation's Realization Coverage (Dumling).
_Avoid_: completeness

**No Target**:
A ResolvableText Segment with no defensible route, and the authored reason:
unintelligible text, a nonce word (`glorpen`), a word broken off (`trans…`),
or a suspended-compound fragment without a right conjunct. Foreign-language
material has a route, Foreign. It is annotation, not a gap, so it counts toward Full Coverage.
_Avoid_: Unresolved, skipped Segment

**Rule**:
A classification rule written for people: a statement, the ADRs it rests on,
the routes it applies to and the Spec Records that show it, minimal pairs
included. Dumgen's prompts implement Rules and cite them; they do not share
their wording. A Rule states a principle in a few sentences; its boundary
cases are the records it links, each rationale saying why the principle lands
there.
_Avoid_: criterion, judgment, prompt paragraph

**Rule Citation**:
A Rule as a record or a Dumgen prompt paragraph cites it: the Rule's id and
the hash of its statement when the record was reviewed or the paragraph last
checked against it. Rewording the Rule makes the citation stale until someone
re-checks the citing text and cites the new hash.

**Annotation Layer**:
One of the parts of a sentence record's annotation that a person reviews on
its own, each resting on the ones before it: Segmentation (each target's
member Segments and route, the No Target entries and the Coverage),
Attestation (each target's Attestation and Grundform verdict), Reading (each
target's Emoji Description) and Knowledge (each Reading's Knowledge).
Segmentation is what `segment.inUnits` returns, not a morpheme segmentation.
_Avoid_: level, tier

**Review Depth**:
The deepest Annotation Layer a person has checked against the ADRs and Rules
the record cites, every layer before it included. A record with none is a
Draft; a Text Record is Draft or Reviewed as a whole. A reviewed layer must
pass the current Dumling model, and a layer past the depth may fail or be
missing. A reviewed record cites at least one Rule and reopens whole when one
of them is superseded or changed. A model change that breaks a reviewed layer
lowers the depth to the deepest layer that still passes.
_Avoid_: verified, isVerified, Review Status

**Text Record**:
One raw text as a reader supplies it, before intake makes a Segmented
Sentence of it, and what intake should make of it. Its path is its identity.
_Avoid_: intake item, intake case

**Imported Case**:
A Dumgen case a Spec Record or Text Record keeps as it was, until it is
reshaped into the record's own fields.
_Avoid_: migrated case, fixture

**Worklist**:
The records that need work: those whose Draft layers fail a check against
the current Dumling model or lack a target's Attestation or Reading, and
those holding Imported Cases.
_Avoid_: backlog, review queue

**Provenance**:
Where a Spec Record's sentence comes from: Authored for the corpus, or Quoted
from a work with its author and year.
_Avoid_: source, which names the ADRs and Rules a record cites
