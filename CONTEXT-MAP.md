# Context Map

## Contexts

- [Dumling](./battery/dumling/CONTEXT.md) — names and describes the grammatical entities to which learner text resolves
- [Dumrel](./battery/dumrel/CONTEXT.md) — names typed Lemma and Reading Knowledge and its relation algebra
- [Dumdict](./battery/dumdict/CONTEXT.md) — manages learner-owned dictionary records over Dumling entities
- [Dumgen](./battery/dumgen/CONTEXT.md) — resolves learner text through the generation and prompt pipeline

## Relationships

- **Dumgen → Dumling**: Dumgen resolves learner text into Dumling grammatical entities and uses Dumling schemas at their boundary.
- **Dumdict → Dumling**: Dumdict stores learner-owned records whose grammatical identities are Dumling Lemmas and Surfaces.
- **Dumrel → Dumling**: Dumrel attaches Lemma Knowledge to Dumling Lemmas and uses Dumling's language, Canonical Form, Family, and Kind to describe Unit Shadows.
- **Dumdict → Dumrel**: Dumdict stores Knowledge and applies Unit-Shadow cleanup workflows using Dumrel's Knowledge vocabulary and relation algebra.
- **Dumgen → Dumrel**: Dumgen produces model-backed Knowledge Contributions that satisfy Dumrel's domain contracts.
- **Dumgen → Dumdict**: Dumgen resolves an encountered Lemma against learner Reading candidates; Dumdict owns the resulting learner dictionary records and storage changes.
