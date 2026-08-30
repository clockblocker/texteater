# Context Map

## Contexts

- [tf-demo](./app/tf-demo/CONTEXT.md): presents one shared linguistic graph and
  records occurrence-specific Attestations and Visitor Encounter history.
- [Dumling](./battery/dumling/CONTEXT.md): names the grammatical entities to
  which learner text resolves.
- [Dumrel](./battery/dumrel/CONTEXT.md): defines Reading Knowledge and relation
  algebra.
- [Dumdict](./battery/dumdict/CONTEXT.md): manages dictionary records over
  Dumling entities.
- [Dumgen](./battery/dumgen/CONTEXT.md): resolves learner text through the
  generation and prompt pipeline.

## Relationships

- **Dumgen -> Dumling**: Dumgen resolves learner text into Dumling grammatical
  values.
- **Dumdict -> Dumling**: Dumdict stores scoped records over Dumling Lemmas,
  Surfaces, and Readings.
- **Dumrel -> Dumling**: Dumrel uses Dumling values as the endpoints and
  descriptors in Knowledge.
- **Dumdict -> Dumrel**: Dumdict stores direct Knowledge and relation claims and
  supplies the dictionary inventory for projections.
- **Dumgen -> Dumrel**: Dumgen projects model results into Knowledge Changes and
  Pending Semantic Relations.
- **Dumgen -> Dumdict**: Dumgen resolves encountered Lemmas against dictionary
  Reading candidates; Dumdict owns the resulting records and changes.
- **tf-demo -> Dumling**: tf-demo persists host records and reconstructs
  identityless Dumling Attestations from occurrence memberships.
- **tf-demo -> Dumdict**: tf-demo supplies one Shared Demo Dictionary and
  commits Dumdict plans with host records.
- **tf-demo -> Dumgen**: tf-demo persists Segmented Sentences and resolution
  results.
- **tf-demo -> Dumrel**: tf-demo stores Knowledge Settings and direct relation
  claims, and uses Dumrel's pure policies and projections.
