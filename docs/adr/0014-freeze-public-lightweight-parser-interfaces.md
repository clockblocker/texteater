---
status: accepted
---

# Freeze public lightweight parser interfaces across Dum packages

Every public lightweight parser is a synchronous named package-root export. It
accepts `unknown`, plus only coordinates that narrow the success type, and
returns that exact type or the shared `ParsingError`. Ordinary invalid input
does not throw. Zod composition remains confined to explicit schema entrypoints.

`tooling/tests/dum-parser-interface-contract.test.ts` pins each package
root's exports, and `tooling/dumdict-parser-interface.ts` holds Dumdict's
parser signatures. Changing a name, coordinate, success type, error behavior,
or package-root placement changes the public interface and requires a
deliberate decision.

[Dumling ADR 0001](../../battery/dumling/docs/adr/0001-compile-unit-validation-and-consumer-types.md)
replaced Dumling's parser inventory with one `parseUnit`, whose success value
is a correlated `chain`.
