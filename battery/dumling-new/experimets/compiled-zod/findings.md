# Compiling the 100 actual Zod feature-bag schemas

Historical prototype evidence; further comparison experiments were stopped.
Production now uses `../../codegen/generate.ts` and the public package entrypoint.
`measure-production.ts` measures that full implementation and writes
`production-rss.json`; the feature-bag-only figures below do not measure it.
The prototype's source-text check predates the extracted production predicate
and will reject the current source. Its generated artifacts retain the original
experiment; use the production generator for current schemas.

This experiment compiles all 100 existing concrete-language feature-bag schemas in `dumling-new` into package-owned validation artifacts and emits flat consumer types. Production source, manifests, and lockfiles are unchanged. It uses the repository's existing compiler and interpreter, not a new general-purpose Zod compiler.

The benchmark envelope is `{unitKind, language, family, kind, value}`. `value` is the complete existing feature-bag object, including `core` and `inflectional` where defined. All four unit tags accept the same bag envelope. This deliberately tests actual feature-schema semantics; it is **not** a final Lemma/Surface/Reading/Attestation representation and is not equivalent to the separate full-wrapper toy comparison.

## Results and limits

- 100 actual schemas compile, with 27 explicitly registered nonempty-bag checks.
- Compilation without registrations fails at `de/Lexeme/ADJ`, `$.value.inflectional`, explaining that no named custom-operation registration matched. The generator requires that failure before continuing.
- Each registered check matches the actual Zod check-function identity. The generator additionally verifies that its serialized implementation matches the known closure-free nonempty-bag predicate, then emits that original predicate into the runtime. A source change or different custom check fails generation. This is a bounded prototype technique. A production version should extract this predicate into a named pure source function shared by schema authoring and the generated operation catalog.
- `artifact.json` is 72,904 bytes; `dto.ts` is 32,903 bytes. The former contains shared definitions plus route roots, not 100 copied validator implementations. Generation timings are recorded in `generation.json` and vary across runs.
- Four tests pass, including 4,403 differential cases against canonical Zod plus focused all-null refinement, strictness, scalar/tuple-rest union, unsupported-check, and expected-route checks. Differential success values are compared structurally. Error text is not globally asserted identical, but the custom issue code/path is checked.
- The generated flat `DumlingUnit<"Lemma", "de", "Lexeme", "NOUN">` resolves to concrete feature fields. Its dependency graph contains no Zod declarations. `public.d.ts` demonstrates the emitted parser interface without importing the generated artifact JSON into the consumer's type graph. `consumer.ts` checks precise field access, impossible coordinates, and a known-route parser result. Its recorded TypeScript 7.0.2 run used about 30 MB compiler-reported memory and 0.008 s check time; these are one-process compiler diagnostics, not runtime RSS or a benchmark median.
- Fully bundled controls produced approximately 97.3 KiB compiled JavaScript versus 1.1 MiB direct Zod JavaScript with the local esbuild invocation. Bundle bytes are not resident memory. Use the shared benchmark harness for RSS comparison.

The declaration emitter only accepts the actual compiler vocabulary used here. It treats the registered non-mutating refinement as retaining its input structure. It is not a transform-aware general DTO emitter. The compiler rejects unsupported operations rather than silently dropping them. The existing compiler's tuple path additionally requires identity-compatible homogeneous items/rest; the actual `featureValueSetSchema` uses the same schema instance and satisfies that restriction. Separately constructed but structurally equal item/rest schemas can be rejected.

## Reproduce and integrate

Run from the repository root:

```sh
bun battery/dumling-new/experimets/compiled-zod/generate.ts
bun test battery/dumling-new/experimets/compiled-zod/verify.test.ts
node node_modules/typescript/bin/tsc --ignoreConfig --strict --skipLibCheck --noEmit --target esnext --module preserve --moduleResolution bundler --allowImportingTsExtensions --resolveJsonModule --extendedDiagnostics battery/dumling-new/experimets/compiled-zod/consumer.ts
./node_modules/.bin/esbuild battery/dumling-new/experimets/compiled-zod/index.ts --bundle --platform=node --format=esm --outfile=battery/dumling-new/experimets/compiled-zod/compiled.bundle.mjs
./node_modules/.bin/esbuild battery/dumling-new/experimets/compiled-zod/direct.ts --bundle --platform=node --format=esm --outfile=battery/dumling-new/experimets/compiled-zod/direct.bundle.mjs
```

Both `index.ts` and the generated `direct.ts` export `parseUnit(input: unknown)` and `schemaCount`. The result is `{success:true,data}` or `{success:false,issues}`. `fixtures.ts` exports `sample()` and `samples`; load fixtures separately so they do not inflate the measured parser import. The compiled parser additionally accepts `{route,unitKind}` as a second argument and checks those coordinates before returning the exact declared output.

The runtime imports only generated data, generated pure operations, and the `common-utils` parsing/error leaf modules. Zod, schema modules, filesystem discovery, and the compiler are confined to generation and the direct control. `source.ts` discovers actual files for generation, while `direct.ts` uses generated static imports so the runtime comparison does not measure filesystem discovery or dynamic source imports.

## Other ahead-of-time approaches

Ajv can emit standalone JavaScript during build and run it without initializing Ajv. That satisfies the architecture of expensive build work followed by a small runtime, but it operates on JSON Schema and has limitations for custom keywords. It does not automatically preserve arbitrary Zod callbacks. [Ajv standalone validation](https://ajv.js.org/standalone.html), [Ajv custom keywords](https://ajv.js.org/keywords.html).

A direct conversion of the installed German noun inflectional schema with `z.toJSONSchema` produced required nullable `case` and `number` fields and `additionalProperties:false`, but **no rule requiring a marked field**. Thus its JSON Schema accepts `{case:null,number:null}` while the actual Zod schema rejects it. This was reproduced with installed Zod 4.4.3; converting to JSON Schema and compiling with Ajv would need an explicit translation of this refinement. Zod also documents schema kinds that JSON Schema cannot represent. [Zod JSON Schema](https://zod.dev/json-schema).

Typia emits validators from TypeScript types at compile time and supports explicit validation tags. An inferred Zod output type does not carry the runtime nonempty-bag predicate, so feeding only `z.output` into Typia cannot preserve that rule. Adding an equivalent custom tag or registered operation is another translation layer that must be maintained and checked. [Typia documentation](https://typia.io/docs/), [Typia validation tags](https://typia.io/docs/validators/tags/).

The existing compiler is therefore a viable way to retain Zod as the source of truth while removing Zod from both operational runtime and consumer declarations. This experiment establishes feasibility for the landed feature bags, not a complete production unit compiler. Citation/Inflection wrapper choices do not change that feature-bag result; full unit cross-field rules and wrappers would need the same fail-closed compilation and differential checks.
