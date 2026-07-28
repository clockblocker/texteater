`gpt-5-nano` supports Structured Outputs and the Responses API. [Model details](https://developers.openai.com/api/docs/models/gpt-5-nano)

Schema restrictions

OpenAI supports only a subset of JSON Schema. The important rules are:

- The root must be `z.object(...)`.
- A root-level `z.union()` or `z.discriminatedUnion()` is invalid. Put the union inside an object property.
- Every property must be required.
- To represent “optional”, use `.nullable()`, not `.optional()`:

```ts
// Good: key is always present, value may be null
example: z.string().nullable()

// Bad for strict output
example: z.string().optional()
```

- Objects must reject unknown properties. The SDK generally generates `additionalProperties: false` for `z.object`.
- Avoid `z.record(...)` or open-ended dictionaries because they rely on arbitrary property names.
- Prefer homogeneous arrays. Avoid tuples.
- Nested unions are supported when each branch is itself valid.
- Recursive schemas and reusable definitions are supported.
- Supported basic shapes include strings, numbers, integers, booleans, objects, arrays, enums and nested `anyOf`.
- Supported constraints include:
  - strings: `pattern` and selected formats such as date, email, UUID and IP addresses
  - numbers: min/max, exclusive min/max and `multipleOf`
  - arrays: min/max item count
- Unsupported composition includes `allOf`, `not`, conditional schemas (`if`/`then`/`else`) and dependent schemas.
- Don’t rely on Zod transforms or complex custom refinements to constrain generation. Keep the generation schema simple, then apply additional business validation after parsing.

Hard limits:

- 10 nesting levels
- 5,000 total object properties
- 120,000 combined characters across property names, definition names, enum values and constants
- 1,000 enum values in total
- If one string enum has more than 250 values, its values may total at most 15,000 characters

The complete authoritative list is in OpenAI’s [Structured Outputs schema restrictions](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas).
