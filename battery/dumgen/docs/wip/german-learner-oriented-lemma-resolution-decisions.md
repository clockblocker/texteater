# German learner-oriented Lemma-resolution decisions

Status: working decision record  
Last updated: 2026-08-23

## Purpose

Capture accepted decisions and unresolved questions about German grammatical
resolution when the ordinary dictionary Lemma is less useful to a learner than
the encountered closed-class form.

This document records product and resolution policy while the design is still
evolving. It is not an ADR and does not silently supersede an accepted ADR.

## Existing architectural tension

[ADR 0002](../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md)
defines Lemma as grammatical identity and says that inflectional features stay
on Surface rather than splitting Lemmas. Promoting forms such as `bin`, `ist`,
and `die` to peer Lemmas deliberately pushes against that rule for
learner-facing closed routes.

Before this policy is generalized broadly, the project must either amend ADR
0002 or explain why these promoted closed-class forms are grammatical
identities rather than ordinary inflectional splits.

## Accepted decisions

### Definite articles

German `Lexeme/DET` is treated as a closed route.

- `der`, `die`, and `das` are separate fixed Lemmas.
- An exact occurrence of one of those forms resolves to the matching Lemma.
- Each fixed Lemma has one fixed Reading.
- Each Reading lists the other two Lemmas as Synonyms.

```text
der -> der
die -> die
das -> das
```

This policy is implemented by commit `ea6c31d`.

### Present-tense forms of `sein`

The following German `Lexeme/AUX` forms are separate peer Lemmas:

```text
sein, bin, bist, ist, sind, seid
```

- An exact occurrence resolves to the identically spelled Lemma.
- Each Lemma has one fixed Reading.
- Each Reading lists the other five Lemmas as Synonyms.
- Other paradigm members retain ordinary routing; for example, `war`, `sei`,
  and `gewesen` resolve to `sein`.

This policy is implemented by commit `2893a5b`.

### Fusion is not a Reading-bearing Lemma

A German Fusion is a route-only structural node.

- It does not resolve to a Reading.
- It references at least two component Lemmas belonging to other grammatical
  classes.
- Its component relationship is structural composition, not Synonymy.
- Fusion work is deferred and must not be mixed into closed-class Lemma
  promotion.

The implementation and remaining topology decisions are tracked by
[`texteater#234`](https://github.com/clockblocker/texteater/issues/234). The
broader cross-language boundary remains tracked by
[`texteater#157`](https://github.com/clockblocker/texteater/issues/157).

### Substantive possessive pronouns

A substantive possessive `Lexeme/PRON` resolves to its possessive base, not to
the personal pronoun naming its possessor.

| Contextual forms | Lemma |
| --- | --- |
| `meiner`, `meine`, `meins`, `meines`, `meinem`, `meinen` | `mein` |
| `deiner`, `deine`, `deins`, `deines`, `deinem`, `deinen` | `dein` |
| `seiner`, `seine`, `seins`, `seines`, `seinem`, `seinen` | `sein` |
| `ihrer`, `ihre`, `ihres`, `ihrem`, `ihren` | `ihr` |
| `unserer`, `unsere`, `unseres`, `unserem`, `unseren` | `unser` |
| `eurer`, `eure`, `eures`, `eurem`, `euren` | `euer` |
| `Ihrer`, `Ihre`, `Ihres`, `Ihrem`, `Ihren` | `Ihr` |

The Lemma has `PronType=Prs`, `Poss=Yes`, and the possessor Person when it is
established.

```text
Der rote Schirm ist meiner.
meiner -> Lexeme/PRON mein
Poss=Yes, Person=1
```

The corresponding attributive use remains `Lexeme/DET`:

```text
Das ist mein Schirm.
mein -> Lexeme/DET mein
```

The possessive Lemma is not a Synonym of the personal Lemma. `mein` is a
possessive identity associated with a first-person possessor; it is not an
exact semantic equivalent of `ich`.

### Archaic personal genitive exception

The same spelling can instead be a personal pronoun when an archaic governor
selects a genitive argument. Grammar resolution owns this contextual
distinction.

```text
Er gedachte meiner.
meiner -> Lexeme/PRON ich
Poss=null, Case=Gen, HistoricalStatus=Archaic
```

Resolution precedence is:

1. A substantive possessive resolves to the possessive base and sets
   `Poss=Yes`.
2. A personal genitive selected by an archaic governor resolves to the ordinary
   personal Lemma, keeps `Poss=null`, realizes `Case=Gen`, and is marked
   `Archaic`.

The PRON Golden Corpus should contain the contrastive pair:

```text
Der rote Schirm ist meiner. -> mein, Poss=Yes
Er gedachte meiner.        -> ich, Poss=null, Case=Gen, Archaic
```

The existing `Euer gedenke ich` case remains useful as a second-person plural
example of the exception.

## Known implementation mismatch

The current German PRON prompt says that every first-person substantive
possessive such as `meiner` resolves to `ich`. That instruction contradicts the
accepted possessive-base decision above and must change when PRON is
implemented.

## Accepted relation policy

### Realization remains stored in one direction

Realization is an asymmetric structural link, not a hand-authored relation
claim.

```text
Attestation -> Surface -> Lemma
```

- Surface stores the one Lemma it realizes under one grammatical analysis.
- Lemma does not store a collection of Surfaces.
- All accumulated Surfaces for one Lemma are an inverse database view derived
  from stored Surface-to-Lemma links.
- The same normalized spelling may participate in several distinct Surface
  identities because Surface identity also contains its Lemma and
  inflectional features.

The inverse view must not be duplicated as durable Lemma-to-Surface claims.

### Grammatical relations may use Lemma or Reading endpoints

A Grammatical Relation is distinct from a Semantic Relation. Its endpoints may
be either:

- one Lemma and another Lemma; or
- one exact Reading and another exact Reading.

One claim uses one endpoint level. A claim does not connect a Lemma directly to
a Reading, and the same fact should not be stored redundantly at both levels.

For the fixed German PRON population, grammatical relations should connect
exact Readings. The route intentionally has one fixed Reading for each fixed
Lemma, so Reading endpoints preserve the learner-facing identities without
losing the grammatical connection.

Fixed grammatical relations are package-owned and hand-authored. Models do not
generate, correct, or retract them.

### Series authoring may remove repetition

A Grammatical Series is acceptable as the hand-authored representation for a
closed set when it avoids repeating the same counterpart lists on every
member. It describes one grammatical axis and its fixed members. The runtime
may project ordinary typed grammatical relations from that one authored
series; Series need not replace the general relation model exposed to callers.

Candidate axes for German personal pronouns are Case, Person, Number, Gender,
and Politeness. Their exact inventories remain unresolved.

## Accepted feature policy

The project is UD-based but not restricted to the universal UD feature
inventory.

- A language-specific feature may be added when full grammatical resolution
  or stable identity requires it.
- Prefer fewer features only after the representation can express the complete
  distinctions required by the supported population.
- Every proposed feature must be justified by an actual identity,
  disambiguation, relation-selection, or learner-projection access.
- Prompt instructions, schemas, Golden Cases, fixed catalogs, and downstream
  validation must agree on every accepted feature.

## Unresolved PRON questions

The following suggestions have not been accepted yet:

- which personal, reflexive, reciprocal, interrogative, demonstrative,
  relative, indefinite, negative, and total forms become fixed Lemmas;
- whether an exact personal case form such as `mich`, `mir`, `ihm`, or `euch`
  resolves to itself;
- whether productive forms such as `irgendjemandem` belong in any fixed
  catalog;
- how homographic and syncretic forms such as `sie`, `ihr`, and `ihm` divide
  Lemmas and Readings;
- whether `mich`, `mir`, and archaic personal-genitive `meiner` are separate
  fixed Lemmas or Surfaces of another personal-pronoun Lemma;
- the concrete grammatical relation vocabulary and algebra for the accepted
  Case, Person, Number, Gender, and Politeness axes.

These questions cannot be answered casually with `Synonym`. Dumrel defines
exact Synonym as symmetric and transitive. For example, treating both
`er <-> ihm` and `es <-> ihm` as exact Synonyms would incorrectly imply
`er <-> es`. A distinct grammatical relationship such as `Paradigm Peer` may
be required, or the forms may need no explicit relation.
