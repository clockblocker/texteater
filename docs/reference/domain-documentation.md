# Domain documentation

Before domain work:

1. Read `CONTEXT-MAP.md`.
2. Follow it to the relevant scoped `CONTEXT.md` files.
3. Read applicable system ADRs in `docs/adr/` and scoped ADRs in the owning app
   or battery.
4. Apply `writing-for-agents` and `unslop` to every retained or rewritten
   agent-facing domain document.

A Context is a glossary. Use its canonical terms and avoid the rejected
synonyms it names. Record implementation decisions in ADRs only when they are
hard to reverse, surprising without context, and the result of a real
trade-off. If a needed file does not exist, proceed; create Contexts and ADR
directories only when they earn content.

Flag a contradiction with an accepted ADR instead of silently overriding it.
