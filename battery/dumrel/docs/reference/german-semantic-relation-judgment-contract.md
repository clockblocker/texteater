# German Semantic Relation judgment contract

This contract defines review decisions for German Semantic Relation proposals.
Prompt wording, model behavior, persistence, and publication thresholds are
outside its scope.

It covers the complete Dumrel vocabulary: Synonym, Near Synonym, Antonym, Near
Antonym, Hypernym, Hyponym, Meronym, and Holonym.

## What a judgment means

A judgment starts with:

- one exact German source Reading;
- one relation kind;
- either one proposed target Unit Shadow or `null`;
- the encounter context that identified the source Reading.

The context disambiguates the source Reading. It does not license a relation
that holds only in that sentence, quotation, comparison, metaphor, or
temporary situation. A non-null proposal is acceptable only when the relation
holds for that source Reading generally.

The source side is sense-specific; the target representation is deliberately
Lemma-specific. For audit, the reviewer must be able to state a conventional
target Reading or short target gloss for which the relation holds. That gloss
is evidence, not part of the Unit Shadow or canonical edge. Other Readings of
the same target Lemma do not by themselves invalidate the proposal. Selection
of an exact target Reading is outside this contract.

A Unit Shadow that matches more than one grammatical Lemma remains pending and
inert. That is a resolution outcome, not permission to guess. A shadow that
matches exactly one Lemma can be judged semantically even when that Lemma has
multiple Readings.

## Acceptance procedure

Review every proposed target in this order:

1. Fix the source Reading. State the source Lemma and Emoji Description.
   Reject reasoning that silently switches to another Reading of the same
   Lemma.
2. Check target identity. The target must be German and must give its
   Canonical Form, Family, and Kind. It must be a lexical Unit Shadow: Lexeme
   or Phraseme, never Morpheme, Construction, Surface, or inflected text.
3. Check route eligibility. The source and target must fit the relation
   shapes below.
4. Apply the relation-specific test. The proposal must meet every required
   condition, not merely resemble a positive example.
5. Apply the general-truth test. The relation must survive ordinary uses of
   the exact source Reading outside the encounter.
6. Apply the precision tests. Reject a self-target, morphology-only claim,
   cross-kind duplicate, distant redundant target, or merely associated word.
7. Record decisive evidence. An acceptance or rejection explanation must
   name the intended target gloss and the decisive relation test. "Sounds
   related" is not evidence.

If no candidate passes all seven steps, `null` is required. A conservative
`null` is a successful semantic result, not a model failure.

## Permitted source and target shapes

All targets are German Lexeme or Phraseme Unit Shadows. The narrower rules in
this table also apply.

| Relation | Permitted source | Permitted target | Direction |
| --- | --- | --- | --- |
| Synonym, Near Synonym, Antonym, Near Antonym | A Lexeme or Phraseme selected by German applicability | A semantically and grammatically compatible Lexeme or Phraseme | Symmetric |
| Hypernym | `Lexeme/NOUN`, `Lexeme/PROPN`, or `Lexeme/VERB` | `NOUN → NOUN`, `PROPN → NOUN`, or `VERB → VERB` | narrower or instance → broader category or action |
| Hyponym | `Lexeme/NOUN` or `Lexeme/VERB` | `NOUN → NOUN/PROPN` or `VERB → VERB` | broader category or action → narrower or instance |
| Meronym | `Lexeme/NOUN` or `Lexeme/PROPN` | `Lexeme/NOUN` or `Lexeme/PROPN` | whole → part, member, or constitutive substance |
| Holonym | `Lexeme/NOUN` or `Lexeme/PROPN` | `Lexeme/NOUN` or `Lexeme/PROPN` | part, member, or constitutive substance → whole |

Kind equality is not a blanket requirement for similarity and opposition. A
Phraseme can, for example, relate to a `VERB` Lexeme when their meanings and
grammatical roles pass the relevant test. Grammatical incompatibility that
prevents the semantic test from being applied is grounds for rejection.

Multiple written members do not determine Family. A fixed multi-member proper
name remains a `Lexeme/PROPN` when Dumling classifies it that way; it is not a
Phraseme merely because its Canonical Form contains spaces. Conversely, an
Idiom or Collocation is one Phraseme target, not a set of member Lexemes.
Judgments relate the complete Lemma and never emit its individual Surfaces or
members as substitutes for that target.

Dumgen requests Hypernym and Holonym in the upward direction. Hyponym and
Meronym are canonical Dumrel relations obtained as their inverses, not direct
model outputs. Human judgments still apply the same contract to both inverse
kinds.

## Shared precision rules

### Exact source semantics

Polysemy never leaks across Readings. For `Bank 🏦`, evidence about a financial
institution is relevant; evidence about `Bank 🪑` is not. Encounter-specific
co-occurrence is also insufficient: a dog having a `Pfote` does not make
`Hund` a synonym or hypernym of `Pfote`.

### Register, dialect, connotation, and collocation

These dimensions are semantic evidence, not cosmetic metadata:

- a systematic regional restriction prevents exact Synonymy;
- a systematic formal, colloquial, archaic, technical, approving, pejorative,
  humorous, or euphemistic difference prevents exact Synonymy;
- a stable difference in intensity, presupposition, participant structure, or
  favored collocation prevents exact Synonymy;
- such a difference can support Near Synonymy only when the expressions still
  share the same central denotation or proposition;
- overlap in one collocation does not establish a relation for the Reading as a
  whole.

Inflectional and syntactic adjustment needed to place two Lemmas in the same
sentence is allowed. Changing the proposition, participant roles, stance, or
information structure to force substitution is not.

### Granularity

Taxonomic and part-whole targets use the **nearest useful** lexical level:

- prefer a conventional immediate learner-useful category or whole;
- reject a more distant ancestor when an accepted useful intermediate exists;
- reject microscopic, temporary, accidental, or encyclopedic decompositions;
- do not emit an entire chain such as `Pudel → Hund → Tier` in one Hypernym
  result;
- conceptual usefulness, not physical distance alone, controls part-whole
  granularity. For ordinary body-part Readings, the bearer organism can be the
  useful whole; an uncertain anatomical intermediate is not mandatory.

### Sets and duplicates

Each directly generated relation value is `null` or an unordered set of one to
five independently defensible targets.

- Multiple targets are desirable only when they are non-redundant, equally
  direct alternatives or express independent conventional axes.
- A farther ancestor or containing whole is redundant when a nearer useful
  target already expresses the same axis.
- Exact duplicates are removed.
- If the same target passes both Synonym and Near Synonym, keep it only as
  Synonym.
- The same target under any other pair of relation kinds is an invalid
  cross-kind collision; do not guess a precedence.
- A source may never target its own Lemma, including an attempt to connect two
  Readings of that Lemma.

### Morphology and form

Shared roots, affixes, derivation, spelling, or inflection are not Semantic
Relations by themselves. `gegangen` is a Surface of `gehen`, not a target
Lemma. A morphologically negated pair such as `sichtbar` and `unsichtbar` is
acceptable as Antonym only because it independently passes the semantic
opposition test.

## Relation-specific contracts

### Synonym

The orientation is symmetric exact equivalence.

Accept a target if and only if:

1. source and intended target Reading have the same central denotation or
   truth-conditional contribution;
2. ordinary substitution preserves entailments, presuppositions, participant
   roles, register, dialect, stance, connotation, and material intensity;
3. any required inflectional or syntactic adjustment does not change the
   proposition.

Reject a target when there is a systematic ordinary context in which the
substitution changes one of those dimensions. Put it under Near Synonym if it
passes that weaker contract. Shared topic, derivational relationship,
hypernymy, and contextual paraphrase are not enough.

### Near Synonym

The orientation is symmetric similarity and is non-transitive.

Accept a target if and only if:

1. source and intended target share the same central denotation or proposition
   closely enough to be ordinary paraphrases in a meaningful range of uses;
2. at least one stable restriction prevents exact Synonymy, such as dialect,
   register, connotation, intensity, collocation, breadth, aspect, or
   participant framing;
3. neither expression is merely a broader category, narrower category,
   associated concept, co-member, cause, result, instrument, or participant of
   the other.

Near Synonym is not a miscellaneous "related word" bucket. If the common core
cannot be stated independently of the encounter, reject it.

### Antonym

The orientation is symmetric strict opposition and is non-transitive.

Accept a target if and only if the pair is a conventional lexical opposition
on the same semantic dimension and in parallel roles. Strict opposition can
be:

- complementary: one excludes the other in the relevant domain;
- scalar: the pair names conventional opposing poles of one scale;
- reversive: one action conventionally reverses the state produced by the
  other.

Simple incompatibility, a different value on a multi-way scale, co-membership
in a topic, or contrast invented by the sentence is insufficient.

### Near Antonym

The orientation is symmetric established contrast. It is non-transitive and
non-substitutive.

Accept a target if and only if German convention strongly pairs the two
expressions as contrasts on one frame, while the Antonym test fails. Typical
cases are converses with exchanged participant viewpoints or paired roles in
one conventional relation.

Reject arbitrary co-hyponyms and contextual foils. `Hund` and `Katze` can be
contrasted, but German does not thereby lexicalize them as Near Antonyms.

### Hypernym

A narrower source Reading or named instance points to a broader target Lemma.

Accept a target if and only if:

- for a NOUN source, every ordinary source instance is a kind of the intended
  target Reading;
- for a PROPN source, the referent is conventionally an instance of the target
  category and the category is informative rather than trivial;
- for a VERB source, every source event is a kind of the broader target action;
- the target is the nearest useful category on that axis.

A containing whole, part, material, participant, purpose, location, cause, or
frequent co-occurrence is not a Hypernym.

### Hyponym

A broader source Reading points to a narrower target Lemma or named instance.

Accept a target if and only if the inverse target-to-source proposal would pass
the Hypernym contract. A NOUN target can be a narrower common-noun category or
a PROPN instance; a VERB target must be a narrower action. Keep the same
nearest-useful granularity.

A part of the source is a Meronym, not a Hyponym. A named thing located inside
a category member is not thereby a Hyponym.

### Meronym

A whole source Reading points to a part, member, or constitutive-substance
target Lemma.

Accept a target if and only if the target has one conventional relation to the
source:

- part: a structural or functional component of the whole;
- member: an element of a conventional collective, organization,
  geopolitical unit, or named whole;
- substance: constitutive material of the whole Reading.

The relation must be inherent or conventional for the exact source Reading,
not merely true of the encountered individual. Contents, possessions,
occupants, tools, products, ingredients that are merely optional, and things
temporarily attached or located inside are rejected.

### Holonym

A part, member, or constitutive-substance source Reading points to its whole
target Lemma.

Accept a target if and only if the inverse target-to-source proposal would pass
the Meronym contract. Select the nearest useful conventional whole on each
independent axis. Geographic or administrative containment between proper
nouns is acceptable when stable and definitional; temporary residence,
employment, travel, or event membership is not.

A broader kind is a Hypernym, not a Holonym. The fact that an instance is often
found at a location does not make that location its Holonym.

## Required `null`

Return `null` for a requested kind when no target passes its complete test,
including when:

- only a loosely related, associated, or contextually contrasted word exists;
- a candidate belongs to another relation kind;
- the only candidate is the source Lemma itself or an inflected Surface;
- all candidates depend on another source Reading;
- the category is too trivial to be useful, such as `John → Person`;
- a supposed whole is contingent rather than inherent or conventional;
- uncertainty remains between relation kinds or target identities.

Precision dominates recall. Do not fill a requested slot merely to avoid
`null`.

## Auditable evidence format

A benchmark or human review record should make these fields recoverable even
when its serialized schema differs:

```text
source: <Canonical Form> <Emoji Description>, <Family>/<Kind>
context: <encounter sentence>
relation: <kind>
verdict: accept <target Unit Shadow> | reject <target Unit Shadow> | null
target gloss: <intended conventional Reading, absent for null>
decisive evidence: <one relation test and any failed competing test>
```

Exact target-set equality is not the semantic metric. Evaluation must allow
documented alternative targets, while scoring every accepted target for
precision, relation-kind confusion, material omissions, Family/Kind
correctness, source-Reading consistency, and defensible `null` independently.
