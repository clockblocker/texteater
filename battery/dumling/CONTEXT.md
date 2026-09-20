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
It carries its normalized form, spelling status, and applicable inflectional
features. German common-noun articles and verbal subject expletives are
composition expressed by grammatical features. Their component values are
derived separately. The Lemma remains the bare noun or ordinary verb.

**Grundform**:
A Surface's realization of its particular Lemma's canonical grammatical form.
An accepted spelling variant may realize Grundform. The applicable inflectional
features depend on the language, Family, Kind, and sometimes the particular
Lemma.
_Avoid_: Surface Kind, stored Citation/Inflection discriminator

**Attestation**:
A fleeting occurrence of one Surface, represented by ordered attested members
and Full or Partial Realization Coverage. It has value equality but no durable
identity. German noun Attestations retain article source orthography separately
from their members when an article is included. A shared article or an article supplied by a Fusion gives Partial
coverage without becoming a second owned member. Fusion evidence retains the
fused source spelling; noun grammar determines its DET component. German verbal
Attestations retain subject-expletive source orthography as evidence for an owned
member.
_Avoid_: Selection, click result, selected Surface

### Semantic identity

**Reading**:
A foundational semantic value made from one Lemma and one Emoji Description.
Its equality applies within one dictionary scope.
_Avoid_: Meaning, Sense, Semantic Unit, dictionary entry

**Emoji Description**:
The stable dictionary-scoped semantic label that distinguishes Readings of the
same Lemma and helps a learner recognize the intended meaning beside it.
It is an emoji mnemonic whose associations or combinations preserve that meaning.

### German classifications

**Verbal Participle**:
A participial Surface whose contextual use belongs to a VERB or AUX Lexeme. Its
Canonical Form is the verbal dictionary form.

**Modal Verb**:
One of `dürfen`, `können`, `mögen`, `müssen`, `sollen`, `wollen` as a VERB
Lexeme with `verbType: Mod`, one Lemma whether it governs an infinitive or an
object.
_Avoid_: Modal auxiliary, modal AUX

**Auxiliary**:
`sein`, `haben` or `werden` serving another verb's perfect, future or passive
composition. An AUX Lexeme is one such grammatical use with its own Reading;
the same verb standing alone is a VERB Lexeme.
_Avoid_: lone auxiliary, copula AUX, per-form AUX Lemma

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
