---
status: accepted
---

# Freeze public lightweight parser interfaces across Dum packages

Every public lightweight parser is a synchronous named package-root export. It
accepts `unknown`, plus only coordinates that narrow the success type, and
returns that exact type or the shared `ParsingError`. Ordinary invalid input
does not throw. Zod composition remains confined to explicit schema entrypoints.

`tooling/dum-parser-interface-contract.ts` owns the exact parser inventory.
Changing a name, coordinate, success type, error behavior, or package-root
placement changes the public interface and requires a deliberate decision.
