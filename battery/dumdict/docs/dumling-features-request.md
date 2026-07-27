# `dumling` Export Requests From `dumdict`

`dumdict` keeps a small adapter layer around `dumling` in `src/dumling.ts`.
As of `dumling@0.1.5`, most of the original high-value requests here are now
available from `dumling` itself. The adapter remains to preserve dumdict's
existing public names, especially `makeDumlingIdFor` and `inspectDumlingId`,
and to keep public DTO types sourced from `dumling/types`.

This note records the helpers, builders, and types that would make sense to
export from `dumling`.

## Status After `dumling@0.1.5`

Implemented upstream:

- `DumlingId`
- `EntityValue`
- `EntityForKind`
- `SelectionOptionsFor`
- `supportedLanguages`
- `getLanguageApi(language)`
- `inspectId(id)`

Still local or not yet exposed in the requested shape:

- package-level `encodeId(language, value)`; `dumdict` still exposes
  `makeDumlingIdFor(language, value)` as a compatibility wrapper around
  `getLanguageApi(language).id.encode(value)`
- named create input types
- lemma identity descriptor including `canonicalLemma`
- ID assertion helpers

## High Value

### `DumlingId<K, L>`

Implemented in `dumling@0.1.5`.

Before that, `dumling.id.encode()` returned `string`, so `dumdict` defined its
own branded ID type:

```ts
export type DumlingId<
	K extends DumlingEntityKind = DumlingEntityKind,
	L extends SupportedLanguage = SupportedLanguage,
> = string & {
	readonly __dumlingIdKind?: K;
	readonly __dumlingIdLanguage?: L;
};
```

This should live in `dumling/types` because stable IDs are part of the core
cross-package contract.

### Generic ID encode helper

Partially implemented by `dumling@0.1.5`.

Language-specific `id.encode` now returns `DumlingId`, and callers can obtain a
language-specific API through `getLanguageApi(language)`. `dumdict` still wraps
that as `makeDumlingIdFor(language, value)` to preserve its existing public API
and overloads.

Suggested `dumling` shape:

```ts
function encodeId<L extends SupportedLanguage>(
	language: L,
	value: Lemma<L>,
): DumlingId<"Lemma", L>;
function encodeId<L extends SupportedLanguage>(
	language: L,
	value: Surface<L>,
): DumlingId<"Surface", L>;
function encodeId<L extends SupportedLanguage>(
	language: L,
	value: Selection<L>,
): DumlingId<"Selection", L>;
```

This is useful whenever a host stores one language-bound service but receives
the language as runtime data.

### `inspectId` / `decodeAnyId`

Implemented in `dumling@0.1.5` as `inspectId(id)`.

Previously, `dumdict` probed each supported language to inspect an ID:

```ts
for (const language of supportedLanguages) {
	const result = getLanguageApi(language).id.decode(id);
	// ...
}
```

Since `dumling` IDs already contain both language and entity kind in the payload,
`dumling` could expose a package-level helper that returns metadata without the
caller knowing the language up front.

Suggested shape:

```ts
type DumlingIdInspection = {
	kind: EntityKind;
	language: SupportedLanguage;
};

function inspectId(id: string): DumlingIdInspection | undefined;
```

or a fuller `decodeAnyId(id)` returning the decoded DTO as well.

### `getLanguageApi(language)`

Implemented in `dumling@0.1.5`.

Previously, `dumdict` kept a local language switch:

```ts
function getLanguageApi<L extends SupportedLanguage>(language: L) {
	switch (language) {
		case "de":
			return dumling.de;
		case "en":
			return dumling.en;
		case "he":
			return dumling.he;
	}
}
```

This belongs in `dumling` so consumers do not hardcode the supported language
set or lose the `LanguageApi<L>` type relationship.

### `supportedLanguages`

Implemented in `dumling@0.1.5`.

Previously, `dumdict` maintained its own `["de", "en", "he"]` list. That list
must track `dumling` exactly, so it should be exported by `dumling`.

Suggested shape:

```ts
const supportedLanguages: readonly SupportedLanguage[];
```

## Medium Value

### `EntityValue<L>` and `EntityForKind<L, K>`

Implemented in `dumling@0.1.5`.

Downstream packages often need to name `Lemma<L> | Surface<L> | Selection<L>`
and map entity kinds back to DTOs.

Suggested exports:

```ts
type EntityValue<L extends SupportedLanguage> =
	| Lemma<L>
	| Surface<L>
	| Selection<L>;

type EntityForKind<
	L extends SupportedLanguage,
	K extends EntityKind,
> = K extends "Lemma"
	? Lemma<L>
	: K extends "Surface"
		? Surface<L>
		: Selection<L>;
```

### `SelectionOptionsFor<OS>`

Implemented in `dumling@0.1.5`.

`convert.lemma.toSelection()` and `convert.surface.toSelection()` accept this
shape. Consumers writing wrappers need to name it directly.

Suggested export:

```ts
type SelectionOptionsFor<OS extends OrthographicStatus> = {
	orthographicStatus?: OS;
	selectionCoverage?: SelectionCoverage;
	spelledSelection?: string;
	spellingRelation?: SpellingRelation;
};
```

### Named create input types

The create API exposes inline parameter types. Named input types would make it
easier for hosts to type LLM boundaries and builder functions without using
`Parameters<typeof dumling.en.create...>`.

Current downstream code has to derive those shapes from a concrete language API:

```ts
type EnglishLemmaInput = Parameters<typeof dumling.en.create.lemma>[0];
type GermanTypoSelectionInput = Parameters<
	typeof dumling.de.create.selection.typo
>[0];
```

That works when the host has already selected a concrete runtime API. It is less
good for generic service boundaries, test fixtures, and staged LLM outputs where
the language is itself a type parameter:

```ts
function buildPendingLemma<L extends SupportedLanguage>(
	language: L,
	input: Parameters<ReturnType<typeof getLanguageApi<L>>["create"]["lemma"]>[0],
) {
	// ...
}
```

The type can be forced out of the API, but the expression is noisy and ties the
host's input vocabulary to the exact nested function layout of `LanguageApi`.

Candidate names:

- `LemmaInput<L, LK, LSK>`
- `LemmaSurfaceInput<L, LK, LSK>`
- `InflectionSurfaceInput<L, LK, LSK>`
- `StandardSelectionInput<L, SK, LK, LSK>`
- `TypoSelectionInput<L, SK, LK, LSK>`

Proposed usage:

```ts
type PendingLemmaInput<
	L extends SupportedLanguage,
	LK extends LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK>,
> = LemmaInput<L, LK, LSK>;

function createPendingLemma<
	L extends SupportedLanguage,
	LK extends LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK>,
>(language: L, input: LemmaInput<L, LK, LSK>) {
	return getLanguageApi(language).create.lemma(input);
}
```

The exact trade-off is API stability. Exporting these names would let consumers
depend on input DTO shapes without depending on `LanguageApi`'s nested method
structure. But it also means `dumling` must preserve those names, defaults, and
generic parameter order across releases. It also makes builder inputs feel more
like first-class domain objects, even though they are still just trusted
constructor payloads rather than parsed or normalized user input.

For that reason this is useful, but not as strict a benefit as exporting
`EntityValue` or `SelectionOptionsFor`. The stronger case is when multiple
consumers need to type pre-parse boundaries. If only `dumdict` needs it, local
aliases around `Parameters<...>` may be enough until the create surface settles.

### Lemma identity descriptor including `canonicalLemma`

`dumling` exports `LemmaDescriptor`, but it contains only:

```ts
{
	language: L;
	lemmaKind: LK;
	lemmaSubKind: LSK;
}
```

`dumdict` needs a lookup identity that also includes `canonicalLemma`. It
currently defines similar local shapes as `LemmaDescription` and
`PendingLemmaIdentity`.

Suggested shape:

```ts
type LemmaIdentity<
	L extends SupportedLanguage,
	LK extends LemmaKindFor<L> = LemmaKindFor<L>,
	LSK extends LemmaSubKindFor<L, LK> = LemmaSubKindFor<L, LK>,
> = {
	language: L;
	canonicalLemma: string;
	lemmaKind: LK;
	lemmaSubKind: LSK;
};
```

This is useful for search, pending references, and user workflows that have
resolved a lemma identity but have not selected a stored sense.

## Lower Priority

### ID assertion helpers

Once `DumlingId`, `inspectId`, and generic ID encoding exist, downstream
packages can easily build their own assertions. Still, these could be useful as
small runtime helpers:

```ts
function assertIdLanguage(
	expectedLanguage: SupportedLanguage,
	id: string,
): void;

function assertIdKind(
	expectedKind: EntityKind,
	id: string,
): void;
```

`dumdict` currently owns equivalent checks in its slice validation and service
language guard code.

## Recommended First PR

The highest-impact `dumling` export set for `dumdict` would be:

- `supportedLanguages`
- `getLanguageApi`
- `DumlingId`
- `EntityValue`
- `EntityForKind`
- `encodeId`
- `inspectId`

That set would remove most of `dumdict`'s local `src/dumling.ts` adapter and
make the dependency on `dumling`'s public API more explicit.
