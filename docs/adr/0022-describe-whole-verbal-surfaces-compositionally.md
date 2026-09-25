---
status: accepted
---

# Describe whole verbal Surfaces compositionally

A German verbal Surface describes its complete target. Finite tense belongs
to that construction; perfect and future composition are independent
coordinates. Passive voice distinguishes process and state constructions.
The same dimensions apply to VERB, AUX and verbal Phrasemes.

For `ist ... geschrieben worden`, the Surface is finite present, perfect,
process passive, indicative third singular. Under a separate modal,
`geschrieben worden sein` is a perfect passive infinitive with no finite
tense, mood, person or agreement inherited from the modal.

Meaning-bearing modals remain separate targets and own their scoped
grammatical auxiliaries: `hat ... schreiben müssen` has `[hat, müssen]` and
`[schreiben]`. Selecting a reviewed modal identity does not force a singleton.
The contextual VERB/AUX/ADJ boundary in [ADR 0033](./0033-resolve-productive-german-participles-to-their-verb.md) determines the route.

`perfect` and `future` use `Yes` for a present construction and null for its
absence. `passive` names the process or state construction when voice is
passive. `tense` describes the finite verb only. `participleForm` describes a
whole participial Surface; it replaces the German use of `aspect: Perf` as
past-participle morphology. A participle alone does not establish a perfect
construction. Universal Aspect retains its existing meaning for other routes.

This replaces head-only verbal extraction, which could not represent compound
tense and voice together. It preserves Lemma identity and the occurrence
alignment and Full coverage contracts in ADRs 0003 and 0004. Member roles are
analysis evidence; they do not require a public grammatical tree.

The accepted amendment is recorded in
[the grammar decision](https://github.com/clockblocker/texteater/issues/442#issuecomment-5709380853).
The remaining lexical-participle questions in issue 360 remain separate.

A realized, lexically selected nonreferential subject `es` joins the verbal
Analysis Target and sets `expletive: Subject`. Its occurrence spelling is retained
as `expletiveEvidence`, aligned with an owned member. `es gibt` and `es gab` retain
Lemma `geben`; `es regnet` retains `regnen`. Referential, positional, anticipatory
and object `es` remain outside this composition rule. Word order does not change
these boundaries. Person and number remain verbal features; existential meaning
belongs to a Reading. The derived pronoun uses an exact authored nonreferential
Reading of the existing nominative `es` Lemma.
