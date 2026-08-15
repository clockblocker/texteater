# Dumrel Context

Dumrel names identityless linguistic Knowledge values applied to Lemmas and
Readings by their caller. It defines Knowledge changes and relation algebra
without owning identity, generation, persistence, synchronization, or
user-interface projections.

## Knowledge

**Knowledge**:
Identityless linguistic content that a caller applies one-to-one to one exact
Lemma or Reading. Knowledge has no owner reference or separate ID, every aspect
is optional, and the empty value is valid.
_Avoid_: Note, dictionary entry

**Knowledge Change**:
One owner-agnostic change to one atomic Knowledge aspect or bucket. A Change is
exactly a Contribute, Correct, or Retract; omission never deletes Knowledge.
_Avoid_: Knowledge Contribution, Knowledge patch

**Contribute**:
An additive Knowledge Change that sets an absent singular or structured aspect,
or appends exact-deduplicated values to a bucket. A conflicting singular or
structured value requires Correct.

**Correct**:
A Knowledge Change that replaces one complete atomic aspect or bucket.

**Retract**:
A Knowledge Change that removes one complete atomic aspect or bucket.

**Lemma Knowledge**:
Knowledge applied to one Lemma. It may contain non-empty literal Transcription
lists keyed by Target Language.

**Reading Knowledge**:
Knowledge applied to one Reading. It may contain Definition, Translations,
Morphological Tree, Lexical Breakdown, and direct Semantic Relations.

**Target Language**:
A caller-chosen language label for one bucket of learner-facing literal
Knowledge. It does not identify a Reading or create a cross-language relation.

**Transcription**:
A literal pronunciation string in one Target Language bucket of Lemma
Knowledge. Pronunciation discovery and external pronunciation links are not
Knowledge.

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
A Reading-owned ordered list of Lexeme Unit Shadows. Order and repeated entries
carry the whole breakdown; component roles are not Knowledge.
_Avoid_: Morphological Tree

**Unit Shadow**:
An identityless grammatical descriptor consisting of language, Canonical Form,
Family, and Kind. Its containing structure or Pending Semantic Relation owns
the contextual connection in which the Unit Shadow appears.
_Avoid_: Pending Target, provisional Reading

## Relations

**Semantic Relation**:
A direct typed connection from one Reading to another Reading. Semantic
Relations are owned by the source Reading Knowledge; Translations and
component structure are not Semantic Relations.
_Avoid_: Lexical Relation

**Pending Semantic Relation**:
A transitional DTO containing a Semantic Relation and target Unit Shadow. It is
not canonical Reading Knowledge; Dumdict supplies the source Reading and owns
matching, resolution, removal, and the forward/inverse writes.

**Relation Algebra**:
The relation-specific properties used to derive Semantic Relations, including
inverse pairing, symmetry, transitivity, and substitution through exact
Synonyms. One uniform rule engine interprets this algebra; not every Semantic
Relation has the same properties.

**Relation Propagation**:
The derivation of new edges by applying Relation Algebra to a caller-selected
finite graph. Propagation never mutates direct Knowledge or merges Knowledge
applied to different owners.

**Inverse Relation**:
The Semantic Relation that points back from a target Reading to its source. It
may be the same Relation, as with Synonym, or a paired counterpart, as with
Hypernym and Hyponym.

**Synonym**:
An exact semantic equivalence between Readings. Synonym is symmetric and
transitive, and members of a Synonym cluster substitute for one another during
Relation Propagation without sharing owned Knowledge.

**Near Synonym**:
A symmetric similarity between Readings that is not itself transitive and does
not create an equivalence cluster.

**Antonym**:
A direct symmetric opposition between Readings. Antonym is not transitive.

**Hypernym**:
A transitive Semantic Relation from a narrower Reading to a broader Reading.
Its Inverse Relation is Hyponym.

**Hyponym**:
A transitive Semantic Relation from a broader Reading to a narrower Reading.
Its Inverse Relation is Hypernym.

**Meronym**:
A direct Semantic Relation from a Reading to a Reading for one of its parts,
members, or substances. Its Inverse Relation is Holonym and it is not treated
as generically transitive.

**Holonym**:
A direct Semantic Relation from a part, member, or substance Reading to its
whole Reading. Its Inverse Relation is Meronym and it is not treated as
generically transitive.
