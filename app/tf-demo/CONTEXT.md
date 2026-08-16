# tf-demo Context

tf-demo is one shared product probe over the Texteater packages. It has one
universal linguistic graph and demo dictionary; anonymous Visitors contribute
interaction history but do not partition linguistic identity or Knowledge.

## Language

**Resolved Segment Context**:
The universal result of resolving one clicked Segment in one immutable
Segmented Sentence through Grammatical Resolution and Reading Resolution. Its
identity is the Segmented Sentence identity plus the clicked Segment index.
Every Visitor reuses the same Resolved Segment Context.
_Avoid_: Visitor Context, learner resolution, click result

**Shared Demo Dictionary**:
The one universal set of Lemmas, Readings, and Knowledge presented by tf-demo.
The package-level learner scope of a Dumdict Reading is the whole demo, not an
anonymous Visitor.
_Avoid_: Visitor Dictionary, personal dictionary

**Visitor**:
A stable anonymous interaction identity. A Visitor owns only Click history;
it never participates in Text, Sentence, Segment, Grammatical Resolution,
Lemma, Reading, relation, or Knowledge identity.
_Avoid_: Learner, User, account

**Click**:
One Visitor interaction with a Segment. A Click may point to a universal
Resolved Segment Context. Its request identifier provides delivery
idempotency, never linguistic identity or resolution reuse.
_Avoid_: Resolution, Resolved Segment Context

## Text-scoped analysis stripping

A Text and its Sentences are preserved source material. Stripping analysis
removes the Sentences' Segments, grammatical resolutions, Resolved Segment
Contexts, and every Visitor Click on those contexts. It never removes the Text
or Sentence records.

An attestation is identified by its `(Sentence ID, Text ID)` pair, encoded as an
opaque Dumdict attestation key. A Resolved Segment Context is the durable link
from the attested Reading use to its linguistic resolution. When stripping
leaves a Reading with no surviving attestation or context, the Shared Demo
Dictionary also removes that Reading, its Reading Knowledge and relations,
and—when no other Reading or grammatical resolution uses it—its Lemma,
Surfaces, and Lemma Knowledge. Readings sourced by another Text remain shared;
only the stripped Text's exact composite attestations are removed from them.
