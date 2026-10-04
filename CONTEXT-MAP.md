# Context Map

## Contexts

- [tf-demo](./app/tf-demo/CONTEXT.md): presents one shared linguistic graph and
  records occurrence-specific Attestations, Visitor Encounter history, and
  Personal Annotations.
- [react-resizable-panels](./battery/react-resizable-panels/CONTEXT.md): owns
  workspace Presentation, Pane, Ground, Cover, Deck, and gesture terminology.
- [lego](./battery/lego/CONTEXT.md): owns the shared token palette, theme
  choice, and the atoms and molecules Notes and reading text are built from.
- [Dumling](./battery/dumling/CONTEXT.md): names, in language-neutral terms,
  the grammatical entities and semantic values to which learner text resolves.
- [Dumspec](./battery/dumspec/CONTEXT.md): owns the gold Dumgen is scored
  against, Spec Records, Text Records and classification Rules, the Authored
  Inventories of closed-class units, and each language's classification
  terms.
- [Dumrel](./battery/dumrel/CONTEXT.md): defines identityless Reading
  Knowledge and the pure operations over it.
- [Dumdict](./battery/dumdict/CONTEXT.md): manages dictionary records over
  Dumling entities.
- [Dumgen](./battery/dumgen/CONTEXT.md): groups each Sentence's Segments into
  clickable units with `segment.inUnits`, resolves a clicked unit's grammar
  and Reading, and produces Knowledge for it.
