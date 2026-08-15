# Context Map

## Contexts

- [tf-demo](./app/tf-demo/CONTEXT.md) — presents one shared linguistic graph while Visitors own only Click history
- [Dumling](./battery/dumling/CONTEXT.md) — names and describes the grammatical entities to which learner text resolves
- [Dumrel](./battery/dumrel/CONTEXT.md) — names typed Lemma and Reading Knowledge and its relation algebra
- [Dumdict](./battery/dumdict/CONTEXT.md) — manages learner-owned dictionary records over Dumling entities
- [Dumgen](./battery/dumgen/CONTEXT.md) — resolves learner text through the generation and prompt pipeline

## Relationships

- **Dumgen → Dumling**: Dumgen resolves learner text into Dumling grammatical entities and uses Dumling schemas at their boundary.
- **Dumdict → Dumling**: Dumdict stores learner-owned records whose grammatical identities are Dumling Lemmas and Surfaces.
- **Dumrel → Dumling**: Dumrel validates identityless Knowledge values and Unit Shadows with concrete Dumling Lemma DTOs, languages, Canonical Forms, Families, and Kinds.
- **Dumdict → Dumrel**: Dumdict stores Knowledge and cleans up Pending Semantic Relations using Dumrel's Knowledge vocabulary and relation algebra; structural Unit Shadows remain durable pointers.
- **Dumgen → Dumrel**: Dumgen projects private model results into Dumrel-validated Knowledge Changes containing pointer-only structures, or Pending Semantic Relations.
- **Dumgen → Dumdict**: Dumgen resolves an encountered Lemma against learner Reading candidates; Dumdict owns the resulting learner dictionary records and storage changes.
