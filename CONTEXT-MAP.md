# Context Map

## Contexts

- [Dumling](./battery/dumling/CONTEXT.md) — names and describes the grammatical entities to which learner text resolves
- [Dumdict](./battery/dumdict/CONTEXT.md) — manages learner-owned dictionary records over Dumling entities
- [Dumgen](./battery/dumgen/CONTEXT.md) — resolves learner text through the generation and prompt pipeline

## Relationships

- **Dumgen → Dumling**: Dumgen resolves learner text into Dumling grammatical entities and uses Dumling schemas at their boundary.
- **Dumdict → Dumling**: Dumdict stores learner-owned records whose grammatical identities are Dumling Lemmas and Surfaces.
- **Dumgen → Dumdict**: Dumgen resolves an encountered Lemma against learner Reading candidates; Dumdict owns the resulting learner dictionary records and storage changes.
