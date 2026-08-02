# Structured Output Schema Restrictions

Stable Dumgen rules for OpenAI Structured Outputs:

- Use `z.strictObject(...)` at the root and for nested objects.
- Do not use a root `z.union(...)` or `z.discriminatedUnion(...)`. Put unions
  inside an object property.
- Require every property. Represent optional values with `.nullable()`, not
  `.optional()`.
- Avoid open-ended dictionaries, tuples, transforms, and complex refinements in
  the generation schema.
- Keep generation schemas simple. Apply business validation after parsing.

Provider support and limits change. Check OpenAI's
[Structured Outputs restrictions](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas)
instead of copying them here.
