# Can `codec-builder` use Zod v4 native codecs?

Date: 2026-07-28

## Conclusion

Yes, for the **schema-backed codec abstraction**. The v4 implementation's

```ts
{
  inputSchema,
  outputSchema,
  fromInput,
  fromOutput,
}
```

has the same broad direction as:

```ts
z.codec(inputSchema, outputSchema, {
  decode: fromInput,
  encode: fromOutput,
});
```

Zod added `z.codec()` in 4.1. It provides a real schema with typed
decode/encode, validation on both sides, safe and async variants, object/array
nesting, and reversible pipe execution. ([codec documentation][zod-codecs],
[4.1 release][zod-4-1-release], [constructor source][zod-codec-source],
[runtime source][zod-codec-runtime])

This does **not** eliminate the package's domain conversions or builders:

- Zod explicitly says that its documented string/number/date/JSON/etc. codec
  implementations are examples to copy and customize, not first-class APIs.
  ([useful codecs][zod-useful-codecs])
- `z.stringbool()` is the relevant concrete built-in; it is internally a codec,
  accepts custom truthy/falsy spellings, and encodes to the first configured
  spelling. ([stringbool codec][zod-stringbool-codec], [stringbool API][zod-stringbool-api])
- `buildReshapeCodec`, strict shape checking, null/default policies, filtering,
  and schema-less adapters are application behavior rather than missing Zod
  primitives.

Recommended scope: use native `ZodCodec` as the v4 representation wherever
both schemas exist, while retaining the higher-level builders and the
schema-less `CodecPair`. This removes duplicated codec plumbing without
pretending that Zod supplies the project's conversion policy.

## Contract decision

The v4 API should adopt Zod's contract directly:

- call the directions `decode` and `encode`;
- run the input and output schemas in the order Zod defines;
- treat Zod's validation failures as authoritative;
- do not preserve unchecked `fromInput` / `fromOutput` as compatibility
  aliases.

Consequently this is an intentional v4 API and behavior change, not an
internal refactor. Inputs that the declared schema rejects must fail; if a
conversion is deliberately forgiving, its input schema must say so.

## Implementation status

Implemented on 2026-07-28:

- schema-backed v4 field codecs, helpers, `buildReshapeCodec`, and
  `buildStrictFieldAdapterCodec` now return native `ZodCodec` instances;
- the v4 interface uses `decode` / `encode` and `.in` / `.out`, with no
  `fromInput` / `fromOutput` compatibility aliases;
- the schema-less adapter uses `{ decode, encode }`;
- the local v4 `Codec` and `SchemaCodec` type aliases were removed;
- the v4 dependency floor is Zod 4.4 so native `z.invertCodec()` is available.

## What maps directly

The custom `SchemaCodec` stores two schemas and two opposite functions
([local type][local-types]). A native codec has public `.in` and `.out` schemas,
and its constructor types the callbacks as:

- decode: `output<inputSchema> -> input<outputSchema>`
- encode: `input<outputSchema> -> output<inputSchema>`

The resulting schema itself has `input<inputSchema>` and
`output<outputSchema>`. This is slightly more general than the local type
because either side may itself contain transformations.
([classic type source][zod-codec-source], [core type source][zod-codec-runtime])

The replacements are:

| Current v4 mechanism | Native mechanism | Assessment |
| --- | --- | --- |
| `SchemaCodec` | `z.ZodCodec<A, B>` | Replace |
| `inputSchema` / `outputSchema` | codec `.in` / `.out` | Replace and adopt the native names |
| `fromInput` / `fromOutput` | `z.decode(codec, value)` / `z.encode(codec, value)` | Replace and adopt validated native semantics |
| `pipeCodecs(ab, bc)` | `ab.pipe(bc)` | Replace for schema-backed codecs |
| `toArrayOf(codec)` | `z.array(codec)` | Replace |
| symmetric optional/nullable/nullish lifting | `codec.optional()`, `.nullable()`, `.nullish()` | Replace where the two directions preserve the same sentinel |
| `reverseCodecDirections` | `z.invertCodec(codec)` | Replace only with Zod 4.4.0+ |

Pipes decode left-to-right and encode right-to-left, which is exactly the
composition currently implemented in `pipeCodecs`
([local implementation][local-pipe], [Zod pipe semantics][zod-pipes]).
Native codecs can also be placed directly inside objects and arrays
([composability][zod-composability]).

`z.invertCodec()` swaps the schemas and transforms but does not recursively
invert nested codecs. It was added in 4.4.0, later than `z.codec()`.
([invert documentation][zod-invert], [4.4.0 release][zod-4-4-0-release])

## What remains custom

### The builders

`buildStrictFieldAdapterCodec` derives an output object schema from a
project-specific shape, recursively maps values, and returns the schema pair
plus the conversion pair ([local builder][local-strict-builder]). It can return
a native codec around the derived schemas, but Zod does not replace the shape
DSL, compile-time compatibility checks, or output-schema construction.

`buildReshapeCodec` adds a constructed field, removes selected fields, and
reconstructs them in reverse ([local reshape builder][local-reshape]). Its
return value can likewise become a native codec, but `construct`,
`reconstruct`, and the field/drop type machinery remain.

`buildStrictFieldAdapter` intentionally accepts only TypeScript types and a
shape, with no runtime input/output schemas ([schema-less adapter][local-schema-less]).
A `ZodCodec` requires both schemas, so this API must either remain a
schema-less `CodecPair` or become a different, schema-requiring API.

### Domain conversion rules

The scalar and molecule codecs still need project definitions:

- number -> floored integer;
- number <-> the project's definition of “numeric string”;
- ISO date-or-datetime <-> `Date`;
- nullish -> nullable normalization and default selection;
- invalid/empty date -> `null`;
- array filtering;
- allowed-union string -> nullable union.

Zod's useful-codec page offers reference implementations for some adjacent
conversions, but states that they are not exported APIs
([useful codecs][zod-useful-codecs]). The date example accepts an ISO
**datetime**, while this package accepts a union of ISO date and datetime, so it
is not an exact replacement ([ISO datetime example][zod-iso-date-codec]).

The yes/no conversion is the exception. A case-sensitive:

```ts
z.stringbool({
  truthy: ["Yes"],
  falsy: ["No"],
  case: "sensitive",
})
```

represents `"Yes" | "No" -> boolean`; invert it for the package's
`boolean -> "Yes" | "No"` direction. Zod encodes with the first configured
truthy/falsy values, so the output remains exactly `"Yes"` or `"No"`.
([stringbool API][zod-stringbool-api], [encoding behavior][zod-stringbool-codec])

### Asymmetric null/default helpers

The local `toNullable` maps both `null` and `undefined` to `null` while using a
nullish input schema and nullable output schema. `toNonNullishWithDefault`
accepts nullish input and substitutes a domain default only in the forward
direction. These are not equivalent to simply calling `.nullable()` or
`.default()`.

Zod defaults, prefaults, and catches apply only while decoding, not while
encoding. A default also handles `undefined`, not the package's combined
null/undefined policy. ([defaults and prefaults][zod-defaults],
[catch behavior][zod-catch]) These helpers should remain, but should construct
native codecs.

## The important behavior change: validation

The current conversion functions call transforms directly. For example,
`pipeCodecs` composes functions without parsing either schema
([local implementation][local-pipe]); the strict and reshape builders likewise
invoke their conversion functions without parsing
([strict conversion][local-strict-builder], [reshape conversion][local-reshape]).

A native codec instead:

1. validates/parses the input schema;
2. calls the decode transform;
3. validates/parses the output schema;

and does the mirror image during encoding. It aborts later stages when a stage
has issues. ([runtime source][zod-codec-runtime]) Checks and refinements run in
both directions. ([refinement behavior][zod-refinements])

That is a desirable strengthening at a boundary, but it is observably
different:

- the current nullable date codec deliberately turns `""` or another invalid
  ISO string into `null`, even though its exposed input schema rejects that
  value;
- current raw reverse functions can receive values that their output schema
  rejects and still return a result;
- the filtered-array codec intentionally accepts nullish/empty items on its
  permissive side and emits items satisfying a stricter non-empty output
  schema. That maps well to a native codec only if the permissive schema stays
  on the pre-transform side; using the strict item schema there would reject
  values before the filter can remove them;
- native pipes validate the intermediate schema between stages, while the
  current `pipeCodecs` only calls two functions. Every composed helper must
  therefore be audited to ensure the first codec's actual result satisfies the
  second codec's declared input schema;
- native `safeDecode` / `safeEncode` return structured `ZodError` results for
  schema failures rather than running the conversion anyway.

The chosen contract is to make decode/encode the validated boundary and adjust
schemas to describe intentionally tolerated inputs. For example, if invalid
strings are meant to become `null`, the codec's input side must accept them and
the decode callback must implement that policy. Otherwise the value should
fail before the callback, as Zod specifies.

Codec callbacks may report domain failures by pushing issues to the callback
context and returning `z.NEVER`, as the official JSON codec example does
([JSON codec example][zod-json-codec]). Async callbacks and safe/async
decode/encode variants are supported natively
([async and safe variants][zod-async-codecs]).

## Version/package implications

The package's peer range currently accepts `zod@^4.0.0`
([local package manifest][local-package]), but `z.codec()` was introduced in
4.1. Therefore the v4 native implementation must raise its guaranteed Zod
floor to at least 4.1. ([codec documentation][zod-codecs],
[4.1 release][zod-4-1-release])

There are two reasonable floors:

- **4.1:** enough for `z.codec`, top-level encode/decode, nesting, arrays, and
  pipes. Keep a small local inversion helper.
- **4.4.0:** also provides `z.invertCodec`, allowing
  `reverseCodecDirections` to disappear. ([4.4.0 release][zod-4-4-0-release])

The workspace installation inspected during this research was Zod 3.25.76,
whose bundled `zod/v4` surface does not expose `z.codec`; tests for the native
implementation need to run against the selected new minimum, not only that
compatibility build.

## Suggested migration sequence

1. Decide whether compatibility with Zod 4.0 is still required. If not, choose
   4.1 or 4.4.0 as the v4 peer/test floor.
2. Migrate one leaf codec to `z.codec` and expose native decode/encode directly.
3. Add tests that assert both valid round trips and invalid values on **both**
   decode and encode. Existing tests mostly exercise unchecked conversions.
4. Replace schema-backed `pipeCodecs`, `toArrayOf`, and symmetric wrappers with
   native schema composition.
5. Make `buildStrictFieldAdapterCodec` and `buildReshapeCodec` return native
   codecs while retaining their domain-specific construction logic.
6. Keep `CodecPair` and schema-less `buildStrictFieldAdapter`; do not force a
   fake Zod schema into that API.
7. Migrate the asymmetric/domain helpers to native codec constructors, remove
   the custom `SchemaCodec`, and update downstream callers to `.in`/`.out` and
   decode/encode.

## Verdict

Adopt native codecs in v4. They replace the duplicated **representation,
validation, directionality, and composition infrastructure**. They do not
replace most of the package's concrete mappings, strict-adapter/reshape DSLs,
or schema-less adapter. The migration is worthwhile, but it should be treated
as a behavior/API migration—not a mechanical rename—because native
decode/encode validates both sides.

[zod-codecs]: https://zod.dev/codecs
[zod-4-1-release]: https://github.com/colinhacks/zod/releases/tag/v4.1.0
[zod-codec-source]: https://github.com/colinhacks/zod/blob/v4.1.0/packages/zod/src/v4/classic/schemas.ts#L1886-L1913
[zod-codec-runtime]: https://github.com/colinhacks/zod/blob/v4.1.0/packages/zod/src/v4/core/schemas.ts#L3588-L3721
[zod-useful-codecs]: https://zod.dev/codecs#useful-codecs
[zod-stringbool-codec]: https://zod.dev/codecs#stringbool
[zod-stringbool-api]: https://zod.dev/api#stringbools
[zod-pipes]: https://zod.dev/codecs#pipes
[zod-composability]: https://zod.dev/codecs#composability
[zod-invert]: https://zod.dev/codecs#inverting-codecs
[zod-4-4-0-release]: https://github.com/colinhacks/zod/releases/tag/v4.4.0
[zod-iso-date-codec]: https://zod.dev/codecs#isodatetimetodate
[zod-defaults]: https://zod.dev/codecs#defaults-and-prefaults
[zod-catch]: https://zod.dev/codecs#catch
[zod-refinements]: https://zod.dev/codecs#refinements
[zod-json-codec]: https://zod.dev/codecs#jsonschema
[zod-async-codecs]: https://zod.dev/codecs#async-and-safe-variants
[local-types]: ../../src/v4/core/types.ts
[local-pipe]: ../../src/v4/core/pipe-codecs.ts
[local-strict-builder]: ../../src/v4/codec-builders/strict-field-adapter/build-strict-field-adapter-codec.ts
[local-schema-less]: ../../src/v4/codec-builders/strict-field-adapter/build-strict-field-adapter-codec.ts#L70
[local-reshape]: ../../src/v4/codec-builders/build-reshape-codec.ts
[local-package]: ../../package.json
