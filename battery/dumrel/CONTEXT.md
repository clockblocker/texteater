# Dumrel

Dumrel defines identityless linguistic Knowledge values and relation algebra
that callers apply to exact Readings.

## Language

### Knowledge

**Knowledge**:
Identityless linguistic content applied one-to-one to an exact Reading. Every
aspect is optional and the empty value is valid.
_Avoid_: Note, dictionary entry

**Knowledge Change**:
One Contribute, Correct, or Retract operation on an atomic Knowledge aspect or
bucket. Omission never deletes Knowledge.
_Avoid_: Knowledge patch

**Contribute**:
A Knowledge Change that sets an absent singular aspect or adds deduplicated
values to a bucket.

**Correct**:
A Knowledge Change that replaces one complete atomic aspect or bucket.

**Retract**:
A Knowledge Change that removes one complete atomic aspect or bucket.

**Reading Knowledge**:
Knowledge applied to one exact Reading. It may contain Transcription,
Definition, Translations, Morphological Tree, Lexical Breakdown, and direct
Semantic Relations.

**Target Language**:
The language label for one Translation bucket. It does not identify a Reading
or create a relation.

**Transcription**:
One normalized pronunciation string in Reading Knowledge.

**Translation**:
A literal string in one Target Language. It does not identify or connect a
target-language Reading.
_Avoid_: Translation Relation

**Morphological Tree**:
A Reading-owned ordered hierarchy whose leaves point to Morpheme Readings or
lexical Unit Shadows.

**Lexical Breakdown**:
A Reading-owned ordered list of Lexeme Unit Shadows.
_Avoid_: Morphological Tree

**Unit Shadow**:
An identityless grammatical descriptor containing language, Canonical Form,
Family, and Kind.
_Avoid_: Pending Target, provisional Reading

### Knowledge selection

**Knowledge Applicability**:
The linguistic policy that determines which Knowledge leaves are useful for a
source-language, Family, and Kind route.

**Knowledge Settings**:
A caller's global boolean choices for Knowledge leaves and Semantic Relation
kinds.

**Knowledge Request Mask**:
A sparse Knowledge selection whose present leaves are `null`; absent leaves are
not requested.

### Relations

**Grammatical Relation**:
A typed non-semantic connection between homogeneous Lemma endpoints or
homogeneous exact Reading endpoints. It is symmetric, non-transitive, and
non-substitutive.

**Grammatical Series**:
An authored set of grammatical endpoints that vary along one named axis while
preserving fixed coordinates.

**Semantic Relation**:
A direct typed connection owned by one exact source Reading. Its targets are
all Lemmas or all exact Readings.
_Avoid_: Lexical Relation

**Lemma Target Mode**:
The default Semantic Relation mode, in which direct relation buckets target
Lemmas.

**Reading Target Mode**:
A Semantic Relation mode for reviewed closed inventories, in which direct
Synonym claims target exact Readings.

**Pending Semantic Relation**:
A direct Semantic Relation proposal whose target is a Unit Shadow awaiting
dictionary-scoped resolution.

**Direct Semantic Relation Claim**:
A durable Reading-owned relation in canonical orientation. The direct kinds are
Synonym, Near Synonym, Antonym, Near Antonym, Hypernym, and Holonym.

**Relation Algebra**:
The inverse, symmetry, transitivity, and substitution properties used to derive
Semantic Relation views.

**Relation Propagation**:
The derivation of relation views from direct claims in a finite graph. Derived
views never become direct Knowledge.

**Inverse Relation**:
A relation view projected from the target endpoint of a direct claim.

**Synonym**:
Exact semantic equivalence. It is symmetric and transitive and supports
substitution during Relation Propagation.

**Near Synonym**:
A symmetric similarity that is neither transitive nor substitutive.

**Antonym**:
A symmetric strict opposition that is not transitive.

**Near Antonym**:
A symmetric conventional lexical contrast that is neither transitive nor
substitutive.

**Hypernym**:
A direct relation from a narrower Reading to a broader Lemma. Its inverse view
is Hyponym.

**Hyponym**:
The inferred view from a broader Reading to a narrower Lemma.

**Holonym**:
A direct relation from a part, member, or substance Reading to its whole Lemma.
Its inverse view is Meronym.

**Meronym**:
The inferred view from a whole Reading to a part, member, or substance Lemma.
