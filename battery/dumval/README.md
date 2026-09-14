# Dumval

Shared validation machinery for the Dum batteries. Domain schemas and generated
rules belong to their respective batteries.

`dumval/compiler` compiles Zod schemas, emits structural output types and links
identical rule definitions across package dependencies. `dumval/runtime` interprets
those rules and binds generated providers using exact compatibility fingerprints.
The runtime entrypoint does not load Zod or compiler code.

A provider change requires regenerating and rebuilding its consumers. See
[the compilation decision](../../docs/adr/0013-compile-zod-authored-schemas-into-package-owned-lightweight-validators.md).
