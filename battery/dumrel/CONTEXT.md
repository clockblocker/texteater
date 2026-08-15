# Dumrel Context

Dumrel names typed linguistic Knowledge owned by Lemmas and Readings. It
defines Knowledge accumulation and relation algebra without owning generation,
persistence, synchronization, or user-interface projections.

## Knowledge

**Knowledge**:
The identityless linguistic content owned one-to-one by one exact Lemma or
opaque Reading. The owner supplies identity; Knowledge has no separate ID.
_Avoid_: Note, dictionary entry

**Knowledge Contribution**:
A partial, additive proposal for the Knowledge of one exact owner. Omitted
aspects do not delete existing Knowledge; correction and retraction are
separate operations.
_Avoid_: Knowledge replacement, Knowledge patch

**Lemma Knowledge**:
The Knowledge owned by one Lemma. It contains exactly one default
Transcription.

**Reading Knowledge**:
The Knowledge owned by one Reading. It contains the Definition, Translations,
Morphological Tree, Lexical Breakdown, and direct Semantic Relations of that
Reading.

**Transcription**:
The single default pronunciation stored in Lemma Knowledge. Alternative
pronunciation discovery and external pronunciation links are not Knowledge.

**Translation**:
A literal string in one Target Language stored in Reading Knowledge. A
Translation never identifies or connects a target-language Reading.
_Avoid_: Translation Relation

**Morphological Tree**:
A Reading-owned hierarchy whose leaves point to resolved Morpheme Readings or
lexical Unit Shadows. Its ordered nesting is the complete structural claim;
parallel operation, role, alignment, and alternative-analysis labels are not
Knowledge.

**Lexical Breakdown**:
A Reading-owned ordered list of Lexeme Unit Shadows for Phrasemes and selected
Lemma kinds where a learner-facing lexical split is useful. Order and repeated
entries carry the whole breakdown; component roles are not Knowledge.
_Avoid_: Morphological Tree

**Unit Shadow**:
An identityless grammatical sketch of a not-yet-resolved Reading, consisting
of language, Canonical Form, Family, and Kind. Its containing structure owns
the contextual connection in which the Unit Shadow appears.
_Avoid_: Pending Target, provisional Reading

## Relations

**Semantic Relation**:
A direct typed connection from one Reading to another Reading. Semantic
Relations are owned by the source Reading Knowledge; Translations and
component structure are not Semantic Relations.
_Avoid_: Lexical Relation

**Pending Relation**:
The transitional form of a Semantic Relation whose target is a Unit Shadow.
Resolving it consumes the Unit Shadow and leaves the canonical Reading-to-
Reading Relation together with its required inverse.

**Relation Algebra**:
The relation-specific properties used to derive Semantic Relations, including
inverse pairing, symmetry, transitivity, and substitution through exact
Synonyms. One uniform rule engine interprets this algebra; not every Relation
has the same properties.

**Relation Propagation**:
The derivation of additional Semantic Relations by applying Relation Algebra
to a chosen graph of Readings. Propagation never merges Knowledge owned by
different Lemma or Reading identities.

**Inverse Relation**:
The Semantic Relation that points back from a target Reading to its source. It
may be the same Relation, as with Synonym, or a paired counterpart, as with
Hypernym and Hyponym.

**Synonym**:
An exact semantic equivalence between Readings. Synonym is symmetric and
transitive, and members of a Synonym cluster substitute for one another during
Relation Propagation without sharing owned Knowledge.

**Near Synonym**:
A direct symmetric similarity between Readings that is not transitive and does
not create an equivalence cluster.

**Hypernym**:
A transitive Semantic Relation from a narrower Reading to a broader Reading.
Its Inverse Relation is Hyponym.

**Hyponym**:
A transitive Semantic Relation from a broader Reading to a narrower Reading.
Its Inverse Relation is Hypernym.
