---
status: accepted
---

# Select noun article identities by agreement

German noun article composition selects the authored singular definite DET
Lemma by noun gender: masculine `der`, feminine `die`, neuter `das`; plural
definite forms use `die`, and indefinite forms use `ein`.
Thus `der` in `der Frau` is a contextual Surface of authored DET `die`, rather
than a reference to authored DET `der` chosen by spelling, keeping case
inflection within the selected determiner's paradigm.
The agreement policy applies to deterministic component derivation under
[ADR 0019](./0019-separate-grammatical-relations-from-semantic-relations.md).
Only the noun's stored grammatical coordinates participate in its Surface
identity; the derived DET Reading does not.
