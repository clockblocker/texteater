# `dumgen`

Composable generation helpers with the same Bun and Biome stack as `dumdict`.

## Core idea

`dumgen` provides a server-side GPT-5 nano runtime with structured output:

- the OpenAI Responses API
- automatic prompt caching for repeated prompt prefixes
- Zod-backed structured output

Example usage:

<!-- README_BLOCK:basic-usage -->

## Scope

- Runtime: `Node >= 24`
- Package format: ESM
- Tooling: Bun, TypeScript, Biome

Set `OPENAI_API_KEY` in the server environment. Never expose it to browser
code or commit it to source control.
