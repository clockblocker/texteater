# Dumrel Context

Dumrel names identityless linguistic Knowledge values applied to exact
Readings by their caller. It defines Knowledge changes and relation algebra
without owning identity, generation, persistence, synchronization, or
user-interface projections.

## Knowledge

**Knowledge**:
Identityless linguistic content that a caller applies one-to-one to one exact
Reading. Knowledge has no owner reference or separate ID, every aspect
is optional, and the empty value is valid.
_Avoid_: Note, dictionary entry

**Knowledge Change**:
One owner-agnostic change to one atomic Knowledge aspect or bucket. A Change is
exactly a Contribute, Correct, or Retract; omission never deletes Knowledge.
_Avoid_: Knowledge patch

**Contribute**:
An additive Knowledge Change that sets an absent singular or structured aspect,
or appends exact-deduplicated values to a bucket. A conflicting singular or
structured value requires Correct.

**Correct**:
A Knowledge Change that replaces one complete atomic aspect or bucket.

**Retract**:
A Knowledge Change that removes one complete atomic aspect or bucket.

**Reading Knowledge**:
Knowledge applied to one exact Reading. It may contain Transcription,
Definition, Translations, Morphological Tree, Lexical Breakdown, and direct
Semantic Relations. For a Closed Route, Dumrel owns the corresponding
hand-authored ordinary Knowledge values. They use the same DTO and persistence
plumbing as generated Knowledge. Knowledge has no independent route closure:
its production follows the closure of its exact Reading one-to-one. Dumrel's
fixed lookup associates authored coverage and an ordinary Knowledge value with
that exact Reading without adding owner, identity, or closure fields to either
DTO.

**Target Language**:
A caller-chosen language label for one Translation bucket. It does not identify
a Reading or create a cross-language relation.

**Transcription**:
One normalized literal pronunciation string stored in Reading Knowledge. It
has no Target Language bucket or list; pronunciation discovery and external
pronunciation links are not Knowledge.

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

## Applicability and selection

**Knowledge Applicability**:
The pure linguistic policy that determines which Knowledge leaves are useful
for one source-language, Family, and Kind route. German is configured;
English and Hebrew are explicitly unconfigured. Applicability does not decide
whether a caller fetches, generates, stores, or presents Knowledge.

**Knowledge Settings**:
One caller-stored global boolean choice for every Knowledge leaf and Semantic
Relation kind. Settings are not repeated by language, Family, or Kind, and all
choices are enabled by default. Dumrel validates Settings but does not persist
them.

**Knowledge Request Mask**:
A sparse recursively shaped Knowledge selection whose present leaves are
`null`. Absence means not requested. The empty mask is valid. A default mask
contains every leaf applicable to one exact Reading; intersection with
Knowledge Settings may only remove leaves and prunes empty nested branches.

**German Knowledge Applicability**:
Every configured German route selects Transcription, German Definition, and
English Translation. Family/Kind policy may additionally select Semantic
Relation kinds. Morphological Tree and Lexical Breakdown are not currently
selected for generation.

## Relations

**Grammatical Relation**:
A typed non-semantic connection between homogeneous Lemma endpoints or
homogeneous exact Reading endpoints. Case Counterpart and Person Counterpart
are symmetric, non-transitive, and non-substitutive. They never participate in
Semantic Relation propagation, Synonym substitution, Knowledge Settings, or
Reading Knowledge.

**Grammatical Series**:
An authored set of grammatical endpoints varying along one named axis while
fixed coordinates describe what is preserved. Compilation emits unique direct
peer claims without self-edges; overlapping Series do not imply closure.

**Semantic Relation**:
A direct typed connection owned by one exact source Reading. One Reading
Knowledge value targets either Lemmas or exact Readings and cannot mix them.
The target owns no copy of the direct claim. Translations and component
structure are not Semantic Relations.
_Avoid_: Lexical Relation

**Lemma Target Mode**:
The default Semantic Relation mode. Direct relation buckets contain Lemmas.
Open classes, generated relations, and routes without an explicit reviewed
policy use this mode.

**Reading Target Mode**:
An explicit `targetKind: "reading"` mode reserved for hand-maintained closed
inventories. Targets are exact Readings. The current direct vocabulary in this
mode is Synonym.

**Pending Semantic Relation**:
A transitional DTO containing a Semantic Relation and target Unit Shadow. It is
not canonical Reading Knowledge; Dumdict supplies the source Reading and owns
Lemma matching, resolution, removal, and the direct write in Lemma Target Mode.

**Direct Semantic Relation Claim**:
A durable Reading-owned relation in canonical orientation. The direct kinds are
Synonym, Near Synonym, Antonym, Near Antonym, Hypernym, and Holonym. Hyponym
and Meronym are inferred view vocabulary and cannot enter direct Knowledge.

**Relation Algebra**:
The relation-specific properties used to derive Semantic Relations, including
inverse pairing, symmetry, transitivity, and substitution through exact
Synonyms. One uniform rule engine interprets this algebra; not every Semantic
Relation has the same properties.

**Relation Propagation**:
The derivation of new edges by applying Relation Algebra to a caller-selected
finite graph. A source Reading declares its target mode, and inferred edges use
that mode. Propagation never mutates direct Knowledge or merges Knowledge
applied to different Readings.

**Inverse Relation**:
The inferred Semantic Relation projected from the target endpoint. In Lemma
Target Mode, the inverse appears on current Readings of the target Lemma and
targets the source Lemma. In Reading Target Mode, it appears on the exact target
Reading and targets the exact source Reading. It is never durable Knowledge.

**Synonym**:
An exact semantic equivalence. In Lemma Target Mode its endpoint is a Lemma; in
Reading Target Mode it is an exact Reading. Synonym is symmetric and transitive,
and members of a Synonym cluster substitute at both endpoints during Relation
Propagation without sharing owned Knowledge.

**Near Synonym**:
A symmetric similarity from a Reading to a Lemma that is not itself transitive
and does not create an equivalence cluster.

**Antonym**:
A direct symmetric opposition from a Reading to a Lemma. Antonym is not
transitive.

**Near Antonym**:
A direct symmetric conventional lexical contrast that holds for the Reading
generally, often by profiling opposite viewpoints on one event. It is neither
transitive nor substitutive, and an encounter-specific foil is not sufficient.

**Hypernym**:
A direct Semantic Relation from a narrower Reading to a broader Lemma. Its
Inverse Relation is Hyponym. Hypernym is not transitive.

**Hyponym**:
The inferred view from a broader Reading to a narrower Lemma produced by a
direct Hypernym claim in the opposite orientation. Hyponym is not transitive
and is never a durable direct kind.

**Meronym**:
The inferred view from a whole Reading to a Lemma for one of its parts,
members, or substances, produced by a direct Holonym claim in the opposite
orientation. Meronym is not transitive and is never a durable direct kind.

**Holonym**:
A direct Semantic Relation from a part, member, or substance Reading to its
whole Lemma. Its Inverse Relation is Meronym and it is not transitive.
