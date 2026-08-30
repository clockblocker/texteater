# Dumling

Dumling names the language-specific grammatical entities and foundational
semantic values that learner text resolves to.

## Language

### Grammatical identity

**Lemma**:
An identity-bearing grammatical entity defined by language, Canonical Form,
Family, Kind, and Core Features.
_Avoid_: Linguistic Entry, Lemma Form, dictionary entry

**Lexeme**:
A lexical Lemma whose fixed realization may have one or more members. Lexeme is
one Family, not a synonym for Lemma.

**Canonical Form**:
The normalized form that names a Lemma and participates in its identity.
_Avoid_: Citation Form, Lemma Form

**Family**:
The broad grammatical class of a Lemma: Lexeme, Phraseme, Morpheme, or
Construction.
_Avoid_: Entry Family

**Kind**:
The concrete subtype of a Lemma within its Family, such as NOUN, VERB, Prefix,
or Idiom.
_Avoid_: Entry Subkind

**Core Features**:
The stable grammatical features that complete a Lemma's identity.
_Avoid_: Inherent Features

**Surface**:
A reusable grammatical form that realizes exactly one Lemma under one analysis.
It carries its normalized form, spelling status, Surface Kind, and applicable
inflectional features.

**Attestation**:
A fleeting occurrence of one Surface, represented by ordered attested members
and Full or Partial Realization Coverage. It has value equality but no durable
identity.
_Avoid_: Selection, click result, selected Surface

### Semantic identity

**Reading**:
A foundational semantic value made from one Lemma and one Emoji Description.
Its equality applies within one dictionary scope.
_Avoid_: Meaning, Sense, Semantic Unit, dictionary entry

**Emoji Description**:
The stable dictionary-scoped semantic label that distinguishes Readings of the
same Lemma.

### Production policy

**Route Closure**:
The policy that classifies a language, Family, and Kind production route as
Open or Closed. Closure is not part of Lemma or Reading identity.
_Avoid_: DTO closure flag, Knowledge closure

**Fixed Catalog**:
A package-owned collection of ordinary linguistic values for a route, with
Complete or deliberately Curated coverage for a named scope.
_Avoid_: Seed table, Closed DTO collection

**Fixed Population**:
A Curated package-owned set of ordinary Lemmas and Readings inside an Open
Route. A non-member continues through the Open Route.
_Avoid_: Partially Closed Route, fallback catalog

**Catalog Miss**:
The result produced when a Closed Route has no fixed member for a candidate. It
is catalog-growth evidence, not an Unresolved result.

### German classifications

**Verbal Participle**:
A participial Surface whose contextual use belongs to a VERB or AUX Lexeme. Its
Canonical Form is the verbal dictionary form.

**Participial Adjective**:
A participial form that resolves to an ADJ Lexeme rather than its source verb.
Its Canonical Form is the adjectival participial form.

**Collocation**:
A conventional multiword Phraseme with restricted lexical choices and a
non-idiomatic overall meaning.
_Avoid_: Idiom, free phrase

**Free `sich`**:
The independently resolvable personal or reflexive pronoun `sich`, distinct
from a verb-owned reflexive member.
_Avoid_: Reciprocal `sich`, `pronType=Rcp` `sich`

**Standalone `einander`**:
The invariant German reciprocal pronoun `einander` treated as one Lemma and one
Reading.
_Avoid_: Case-specific `einander`

**Reciprocal Pronominal Adverb**:
A German ADV Lexeme whose whole form combines a prepositional element with
`einander`, such as `miteinander` or `voneinander`.
_Avoid_: `preposition + einander` PRON, reciprocal PRON compound
