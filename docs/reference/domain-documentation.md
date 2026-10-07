# Domain documentation

Before domain work:

1. Read `GLOSSARY-MAP.md`.
2. Follow it to the relevant scoped `GLOSSARY.md` files.
3. Read applicable system ADRs in `docs/adr/` and scoped ADRs in the owning app
   or battery.
4. Apply `writing-for-agents` and `unslop` to every retained or rewritten
   agent-facing domain document.

A glossary gives a high-level overview of each term and links the ADR that
holds the term's precise definition, edge cases and examples. Use its
canonical terms and avoid the rejected synonyms it names.

Keep each glossary entry to a short definition, its `_Avoid_` aliases, its
relationships to other terms, and links to the ADRs that decide it. Concrete
definitions, edge cases, examples and rationale belong in ADRs, or in
Dumcorpus Rules and records; implementation detail belongs in code. Record
implementation decisions in ADRs only when they are hard to reverse,
surprising without context, and the result of a real trade-off. If a needed
file does not exist, proceed; create glossaries and ADR directories only when
they earn content.

Flag a contradiction with an accepted ADR instead of silently overriding it.
