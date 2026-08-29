# TanStack layer

## Status

Proposed implementation specification.

## Objective

The tf-demo frontend communicates with Convex through one deep TanStack Query
module. The module owns operation definitions, frontend-facing network types,
query policy, mutation policy, production Convex transport, and playground
mocks.

The module has two concrete adapters at one seam:

- the production adapter uses Convex; and
- the mock adapter executes typed handlers supplied by a playground or test.

Both adapters drive the same public TanStack query and mutation definitions.
Views do not know which adapter is active.

The external seam is the single file:

```text
src/tanstack-layer/interface.ts
```

Production frontend code, playground code, and external tests must not import
any other file inside `src/tanstack-layer`. Frontend code outside the module
must not import Convex clients, hooks, generated function references, generated
data-model types, or frontend-facing types from files under `convex/`.

Consumer code remains ordinary TanStack Query:

```ts
import { useMutation, useQuery } from "@tanstack/react-query";

import { mutations, queries } from "@/tanstack-layer/interface";

const textQuery = useQuery(
	queries.text({
		textId: target.textId,
		focusAttestationId: target.focusAttestationId,
	}),
);

const selectSegment = useMutation(mutations.selectSegment());
```

TanStack Query remains available for composition through `useQuery`,
`useMutation`, `useQueries`, `select`, `useQueryClient`, and `QueryClient`
operations. Only definitions that can cause application network communication
come from the TanStack layer.

## Adapter use

Production bootstrap creates the Convex-backed layer explicitly and only on
the production application path:

```tsx
const layer = await createConvexTanStackLayer();

root.render(
	<TanStackLayerProvider layer={layer}>
		<App />
	</TanStackLayerProvider>,
);
```

`createConvexTanStackLayer()` is the only operation that reads
`VITE_CONVEX_URL` or constructs a Convex client. Merely importing
`interface.ts`, a view, a query definition, or a mutation definition must not
read the environment, instantiate a client, open a connection, or require a
Convex provider.

Playgrounds receive typed mocks and render the connected production views:

```tsx
const layer = createMockTanStackLayer({
	queries: {
		text: ({ textId, focusAttestationId }) =>
			fixtureText({ textId, focusAttestationId }),
	},
	mutations: {
		selectSegment: async (selection) =>
			fixtureSegmentSelection(selection),
	},
});

<TanStackLayerProvider layer={layer}>
	<TextView target={fixtureTarget} />
</TanStackLayerProvider>;
```

A playground supplies only the operations its fixture exercises. Calling an
operation without a supplied mock fails with an `Error` naming that frontend
operation. Mocks use frontend inputs and results; they never receive generated
Convex references, Convex IDs, Convex transport results, or raw query keys.

After a successful mock mutation, the mock adapter refreshes its active mock
queries so closure-backed fixture state can converge like a production
subscription. This invalidation is private mock-adapter machinery. Production
Convex queries are never invalidated after writes.

## Non-goals

- Do not change Convex schemas, persistence, authorization, or orchestration.
- Do not rename backend Convex functions solely to match frontend terminology.
- Do not replace production reactive Convex queries with polling or manual
  invalidation.
- Do not move presentation behavior, workspace state, or Note rendering into
  the TanStack layer.
- Do not expose the generated Convex `api` object, raw Convex clients,
  `QueryClient`, operation keys, or adapter implementation through the public
  interface.
- Do not implement a fake `ConvexReactClient`. Playground mocks satisfy the
  frontend operation interface instead of imitating Convex internals.
- Do not allow production code to select individual mock handlers or mix the
  production and mock adapters in one layer.
- Do not initialize a default global layer at module evaluation time.
- Do not add ports beyond the one adapter seam justified by the production and
  mock implementations.

## Module layout

The initial implementation should use this layout:

```text
src/tanstack-layer/
├── interface.ts
├── adapters/
│   ├── convex-loader.ts
│   ├── convex.ts
│   ├── mock.ts
│   └── mock.test.ts
├── common/
│   ├── layer.ts
│   ├── provider.tsx
│   ├── query-options.ts
│   └── types.ts
├── queries/
│   ├── index.ts
│   ├── texts.ts
│   ├── knowledge-settings.ts
│   └── notes.ts
└── mutations/
    ├── index.ts
    ├── texts.ts
    ├── resolution.ts
    ├── knowledge.ts
    ├── shadows.ts
    └── demo-data.ts
```

`common/layer.ts` owns the opaque layer value, operation descriptor machinery,
and stable internal operation identity shared by both adapters.

`adapters/convex-loader.ts` contains no static Convex import. It dynamically
loads `adapters/convex.ts` only when `createConvexTanStackLayer()` is called.
This keeps production client construction out of fixture-only routes and
import-only tests.

`queries/index.ts` and `mutations/index.ts` assemble private operation
registries as well as their public option factories. They are not additional
public entrypoints. Only the root `interface.ts` may be imported from outside
the module.

The implementation is grouped by cohesive frontend use case:

- `queries/texts.ts` owns Library listing and Text detail reads.
- `queries/knowledge-settings.ts` owns Visitor Knowledge Settings reads.
- `queries/notes.ts` owns Resolution, Unit Reading, Route, and Shadow Note
  reads, including cursor-bearing page definitions.
- `mutations/texts.ts` owns Text submission and Analysis Stripping.
- `mutations/resolution.ts` owns Segment Selection and Resolution retry.
- `mutations/knowledge.ts` owns Knowledge Settings updates and Reading
  Knowledge changes.
- `mutations/shadows.ts` owns pending Shadow relation cleanup.
- `mutations/demo-data.ts` owns shared and Visitor data reset operations.

The `adapters/` folder is justified immediately because two real adapters use
the operation descriptors. Do not add another adapter until a third concrete
runtime requires one.

## Public interface

`interface.ts` contains exports only. It contains no operation implementation,
client construction, environment access, or generated Convex reference.

```ts
export { createConvexTanStackLayer } from "./adapters/convex-loader";
export { createMockTanStackLayer } from "./adapters/mock";
export { TanStackLayerProvider } from "./common/provider";
export { mutations } from "./mutations";
export { queries } from "./queries";

export type { TanStackLayerMocks } from "./adapters/mock";
export type { TanStackLayer } from "./common/layer";
export type {
	KnowledgeSettings,
	LibraryText,
	NoteData,
	ResolutionNote,
	RouteNote,
	SegmentSelection,
	SentenceId,
	ShadowCleanupResult,
	ShadowNote,
	TextDetail,
	TextId,
	UnitReadingNote,
} from "./common/types";
```

`TanStackLayer` is opaque. Callers can create one through a public factory and
pass it to `TanStackLayerProvider`, but they cannot inspect its clients,
operation keys, or adapter.

`TanStackLayerMocks` is the only public mock surface. It mirrors frontend
operation names with optional typed handlers. It does not expose a generic
transport method or backend terminology.

The public interface must expose frontend names and TanStack option types. Its
inferred types must not require a caller to name a generated Convex function
reference, `FunctionArgs`, `FunctionReturnType`, `Id`, or an exact query or
mutation key tuple.

## Query registry

The `queries` registry exposes these factories:

| Factory | Input | Data |
| --- | --- | --- |
| `libraryTexts()` | none | `readonly LibraryText[]` |
| `text(args)` | `{ textId, focusAttestationId? }` | `TextDetail \| null` |
| `knowledgeSettings(args)` | `{ visitorId }` | `KnowledgeSettings` |
| `resolutionNote(args)` | `{ requestId }` | `ResolutionNote \| null` |
| `unitReadingNote(args)` | `{ readingId, contextCursor? }` | `UnitReadingNote \| null` |
| `routeNote(args)` | `{ routeKind, id, contextCursor? }` | `RouteNote \| null` |
| `shadowNote(args)` | `{ shadowId, contextCursor? }` | `ShadowNote \| null` |

Each factory returns explicit frontend-facing TanStack query options suitable
for `useQuery`, `useQueries`, and `QueryClient.fetchQuery`. The factory hides
the generated Convex function reference and exact key tuple from callers while
preserving data inference and `select` inference.

The production adapter recognizes the private query descriptors, installs the
Convex adapter hash and query functions, and connects the Convex subscription
client to its TanStack `QueryClient`.

The mock adapter recognizes the same descriptors and invokes the matching
frontend mock handler. It does not import or construct a Convex client.

All query options share these invariants:

- `staleTime` is infinite.
- `gcTime` is 10 seconds unless a later measured use case changes the shared
  policy.
- Optional arguments omit absent values rather than passing `undefined` across
  either adapter.
- Consumers may add presentation-level `select`, placeholder, or composition
  options, but must not replace `queryKey` or `queryFn`.

Production query behavior has these additional invariants:

- active values update through Convex subscriptions;
- writes do not cause query invalidation;
- polling and window-focus refetching are not added; and
- consumers do not add retry or refetch behavior to reactive Convex queries.

`common/query-options.ts` owns the shared policy and explicit
frontend-facing option return type. Individual query files own operation
arguments, generated function references, and data-type selection.

## Mutation registry

The `mutations` registry exposes these factories:

| Factory | Variables | Data |
| --- | --- | --- |
| `submitText()` | `{ sourceText }` | `{ textId: TextId }` |
| `selectSegment()` | Segment Selection input | `SegmentSelection` |
| `retryResolution()` | `{ requestId, visitorId }` | `{ retried: boolean }` |
| `updateKnowledgeSettings()` | `{ visitorId, settings }` | `KnowledgeSettings` |
| `applyReadingKnowledgeChange()` | Reading Knowledge change input | `void` |
| `cleanupPendingRelation()` | Shadow cleanup input | `ShadowCleanupResult` |
| `clearSharedData()` | `void` | `{ deleted: number }` |
| `clearVisitorData()` | `{ visitorId }` | `{ deleted: number }` |
| `stripTextAnalysis()` | `{ textId }` | Analysis Stripping counts |

Each factory returns explicitly typed TanStack mutation options containing a
stable private mutation key. Before any view renders, the active layer installs
the matching mutation functions as `QueryClient` mutation defaults. This
allows the same `useMutation(mutations.operation())` call to use either the
production or mock adapter without React context leaking into operation
factories.

Convex mutations and Convex actions are both mutations at this frontend seam.
Their backend execution kind does not affect consumer code.

Mutation behavior follows these rules:

- mutation keys are stable and owned by the operation implementation;
- production mutation functions use the same private `ConvexReactClient` as
  the query adapter;
- production mutations do not invalidate reactive Convex queries after
  success;
- Convex failures surface as `Error` values through TanStack mutation state;
- domain outcomes such as `retried: false` or Shadow cleanup conflict remain
  typed data rather than transport failures;
- the UI remains responsible for presentation-specific fallback messages;
- empty Convex argument objects are hidden behind `void` variables;
- results that the UI does not consume are normalized to `void`; and
- idempotency keys remain explicit when they represent caller-owned
  interaction identity, while deterministic transport keys derived solely
  from normalized input are generated inside the production operation.

Consumers never call `useAction`, Convex's `useMutation`,
`useConvexMutation`, `useConvex`, `client.query`, `client.mutation`, or
`client.action`.

## Mock contract

`TanStackLayerMocks` contains optional `queries` and `mutations` records whose
fields use the public operation names and frontend contracts. Conceptually:

```ts
type Awaitable<Value> = Value | Promise<Value>;

type TanStackLayerMocks = {
	readonly queries?: {
		readonly libraryTexts?: () => Awaitable<readonly LibraryText[]>;
		readonly text?: (
			args: TextQueryInput,
		) => Awaitable<TextDetail | null>;
		// The remaining public query operations follow the same rule.
	};
	readonly mutations?: {
		readonly submitText?: (
			variables: { readonly sourceText: string },
		) => Awaitable<{ readonly textId: TextId }>;
		readonly selectSegment?: (
			variables: SegmentSelectionInput,
		) => Awaitable<SegmentSelection>;
		// The remaining public mutation operations follow the same rule.
	};
};
```

The real definition may derive these handler signatures from private operation
descriptors so they cannot drift. Callers name only the one aggregate mock
type; do not export one public mock type per operation.

Mock handlers may be synchronous or asynchronous. They may close over mutable
fixture state. After a successful mock mutation, the mock adapter refreshes
active mock queries so those handlers can project the new fixture state.

The mock adapter must preserve the same frontend normalization and result
contracts as production. It must not reproduce Convex-specific rejection
unions, empty argument objects, action-versus-mutation distinctions, or
generated ID types.

## Text submission

`orchestration.submitText` already has a precise validator:

```ts
type SubmitTextTransportResult =
	| { readonly status: "Accepted"; readonly textId: Id<"texts"> }
	| { readonly status: "Rejected"; readonly message: string };
```

The production `submitText` operation:

1. trims and NFC-normalizes `sourceText`;
2. rejects an empty normalized value;
3. derives the deterministic submission key from that normalized value;
4. calls the Convex action;
5. returns `{ textId }` for `Accepted`; and
6. throws an `Error` carrying the backend message for `Rejected`.

No unknown-value decoder or `submit-result.ts` is needed. The implementation
must use the generated precise return type and an exhaustive status switch. If
the backend ever regresses to an imprecise validator, improve the backend
contract instead of adding a compatibility decoder to the frontend.

The mock `submitText` handler receives the normalized frontend input and
returns the minimal frontend result directly.

## Public types

`common/types.ts` is the only module file that derives frontend names from
generated Convex data-model or function types. It may reuse stable types from
Texteater batteries where those types already describe the returned value.

At minimum it defines:

- `TextId` and `SentenceId` for branded identifiers used in mutation inputs or
  returned frontend values;
- `LibraryText` and `TextDetail` for Text reads;
- `KnowledgeSettings` for the Visitor preference query and mutation;
- `ResolutionNote`, `UnitReadingNote`, `RouteNote`, and `ShadowNote` for Note
  queries;
- `NoteData` as the union of stable renderable Note kinds;
- `SegmentSelection` for the result of selecting a Segment;
- `ShadowCleanupResult` for pending relation cleanup feedback.

`common/layer.ts` separately owns the opaque `TanStackLayer` type. The mock
adapter derives the aggregate `TanStackLayerMocks` handler signatures from the
private query and mutation registries. `common/types.ts` must not import those
registries, because that would invert the dependency and create a cycle.

Type ownership points outward from the TanStack layer. In particular,
`src/notes/note-data.ts` must import `NoteData` from
`@/tanstack-layer/interface` and derive `NoteDataFor` from it. The TanStack
layer must not import `src/notes`, which would invert ownership and create a
cycle.

Do not export an operation argument or result alias merely because one can be
generated. Public option factories carry consumer inference. A named type is
public only when production or playground callers need to refer to it
independently.

The migration must remove direct frontend type imports from
`convex/_generated`, `convex/model`, and `convex/server`, including the current
imports used by Note composition and Resolution deck logic.

Keep `common/types.ts` as one file initially. Split it only after at least two
cohesive type families can be named independently. Do not create
`common/types/types.ts`.

## Layer construction and provider

`createConvexTanStackLayer()` dynamically loads the production adapter and
creates exactly one of each client for the returned layer:

- one `ConvexReactClient`;
- one `ConvexQueryClient`; and
- one TanStack `QueryClient`.

The production adapter owns:

- validation of `VITE_CONVEX_URL` at factory-call time;
- the Convex adapter's query-key hash function;
- the Convex adapter's default query function;
- connection of the Convex query adapter to the TanStack client;
- production mutation functions; and
- the temporary peer-type cast required by the current Bun dependency graph.

`createMockTanStackLayer(mocks)` creates one TanStack `QueryClient`, installs
mock query dispatch and mutation defaults, and creates no Convex object.

`TanStackLayerProvider` accepts an opaque layer and renders its TanStack
`QueryClientProvider`. It does not render `ConvexProvider`: after this
migration, no descendant is permitted to consume Convex React context.

Theme, tooltip, workspace, and other presentation providers remain outside the
module and compose around or inside `TanStackLayerProvider`.

The production bootstrap calls `createConvexTanStackLayer()` once. A
playground constructs a mock layer from its fixture mocks. No fallback global
layer exists.

## Pagination

The first page of every Note query remains a reactive production `useQuery`
subscription. Continuation pages use the same public query factory and the
active TanStack `QueryClient`:

```ts
const queryClient = useQueryClient();
const next = await queryClient.fetchQuery(
	queries.unitReadingNote({
		readingId,
		contextCursor: cursor,
	}),
);
```

The existing pagination composition module continues to own page merging,
deduplication, stale-request suppression, removed-Note handling, and
presentation state. It receives a page loader whose operation definition comes
from the TanStack layer.

No view may call `useConvex`, `client.query`, or a generated Convex query
reference for continuation pages. Cursor-bearing options must have a distinct
key from the first page and every other cursor. The mock adapter must dispatch
cursor-bearing calls to the same typed mock handler so playgrounds can provide
multi-page fixtures.

The current explicit Shadow Note `refetch` is removed. Successful production
writes update active queries through subscription pushes. Conflict feedback
may use the mutation result while the active Shadow Note query converges to the
latest server value.

## Internal growth rules

When a helper is used by one query, mutation, or adapter file, colocate it with
that implementation. Move it to `common/` only after a second concrete
consumer appears.

Do not add a shared codecs folder. The current backend functions have precise
validators, and the frontend needs no transport decoder.

Do not split the mock adapter into one file per operation. Its purpose is to
dispatch the shared operation descriptors to supplied handlers, not to
duplicate the production operation layout.

## Dependency enforcement

Dependency Cruiser must enforce implementation privacy in package-relative
validation:

```js
{
	name: "tanstack-layer-implementation-is-private",
	comment: "Frontend callers must cross tanstack-layer/interface.ts.",
	severity: "error",
	from: {
		pathNot: "^src/tanstack-layer/",
	},
	to: {
		path: "^src/tanstack-layer/",
		pathNot: "^src/tanstack-layer/interface\\.ts$",
	},
},
```

A second rule prevents frontend code from bypassing the module:

```js
{
	name: "frontend-convex-access-is-owned-by-tanstack-layer",
	comment: "Frontend Convex references and clients belong to tanstack-layer.",
	severity: "error",
	from: {
		path: "^src/",
		pathNot: "^src/tanstack-layer/",
	},
	to: {
		path: [
			"^convex/",
			"(^|/)node_modules/(?:convex|@convex-dev/react-query)(?:/|$)",
		],
	},
},
```

The current package configuration excludes every `node_modules` dependency
before rules run. That makes npm import rules ineffective. Change the package
configuration so top-level build output remains excluded while npm modules are
retained as direct, non-followed dependencies. The intended shape is:

```js
options: {
	doNotFollow: { path: "node_modules" },
	exclude: "^(?:dist|\\.astro)(?:/|$)",
	// existing resolver options remain
},
```

`doNotFollow` prevents traversal into npm implementations while keeping the
resolved dependency visible to rules. The npm path expression is deliberately
unanchored before `node_modules` so it matches Bun's
`../../node_modules/.bun/.../node_modules/<package>/...` resolution.

The repository-level Dependency Cruiser configuration mirrors the private
implementation rule and the local `app/tf-demo/convex/` restriction with
repository-relative prefixes. Package validation owns npm import enforcement.

Verify the rules against Dependency Cruiser JSON output. The completed graph
must visibly contain `convex/react` and `@convex-dev/react-query` edges from
TanStack-layer implementation files, and a temporary outside-layer Convex
import must fail validation before it is removed.

Imports from `@tanstack/react-query` remain legal outside the module. Imports
from `@convex-dev/react-query`, `convex/react`, `convex/server`, local
`convex/_generated`, and local `convex/model` do not.

## Migration sequence

1. Add the opaque layer value, provider, explicit option types, public network
   types, and root interface without changing existing consumers.
2. Add the lazy production adapter loader, production Convex adapter, and mock
   adapter. Prove that importing the public interface constructs no client.
3. Add all seven query descriptors and public query factories.
4. Add all nine mutation descriptors and public mutation factories. Implement
   typed Text submission normalization without an unknown-value decoder.
5. Give each playground the typed mocks needed by its fixture and wrap its
   connected production views in a mock layer. Do this before production views
   stop importing Convex directly.
6. Replace component-level `convexQuery` calls with the public query registry.
7. Replace the three imperative continuation queries with
   `QueryClient.fetchQuery` and public query options.
8. Replace direct Convex mutation and action hooks in views and controls.
9. Move frontend type derivation into `common/types.ts`; point Note composition
   and Resolution deck logic outward to the public interface.
10. Move production client construction into the explicit production bootstrap
    and remove `ConvexProvider` from the React tree.
11. Remove obsolete frontend parsers, duplicate submission-key helpers, direct
    Shadow Note `refetch`, and unused Convex imports.
12. Enable the package and repository Dependency Cruiser rules and run the full
    validation, mock-playground, and production end-to-end suites.

The migration may temporarily violate the final import policy on an
intermediate branch, but the completed change enables every rule and test
rather than documenting future enforcement.

## Verification

The completed implementation must pass:

```sh
cd app/tf-demo
bun run check
bun run lint
bun run test
bun run build
bun run validate
bun run test:e2e
```

`test:e2e` must start the environment required by each suite rather than rely
on a previously running process:

- fixture-only playground tests run with `VITE_CONVEX_URL` deliberately absent
  and use a mock layer; and
- production application flow tests run against an isolated local Convex
  deployment and Vite instance.

Focused verification must cover:

- importing `interface.ts`, production views, and playground modules without
  calling `createConvexTanStackLayer()` does not read `VITE_CONVEX_URL` or
  instantiate a Convex client;
- a playground renders a connected production `TextView` through supplied
  query and mutation mocks;
- an invoked operation with no supplied mock fails with the frontend operation
  name;
- a successful mock mutation refreshes active mock queries from closure-backed
  fixture state;
- public query factories preserve data and `select` inference in `useQuery`,
  `useQueries`, and `QueryClient.fetchQuery`;
- public mutation factories preserve variable and result inference in
  `useMutation` under both adapters;
- typed Text submission normalizes input, returns the accepted Text ID, and
  throws the precise rejected message;
- pagination still merges pages, suppresses stale requests, and handles a
  removed Note through both production and multi-page mocks;
- active production queries update after mutations without invalidation or
  manual refetch;
- no production frontend or playground file outside `tanstack-layer` imports
  Convex or a private layer file;
- Dependency Cruiser actually includes and rejects forbidden npm Convex edges;
  and
- a new production application workspace end-to-end flow covers Text
  submission, Segment Selection, Resolution progress, Note navigation,
  Knowledge updates, Shadow cleanup, and demo-data controls.

The last flow is new coverage. The current application-workspace Playwright
tests cover shell and workspace behavior but do not yet cover the operations
listed above.

## Acceptance criteria

The work is complete when all of the following are true:

- `src/tanstack-layer/interface.ts` is the only imported path into the module
  from production frontend code, playground code, and external tests.
- Production bootstrap explicitly creates one Convex-backed layer.
- Importing the public interface has no client-construction or environment
  side effect.
- Every playground receives typed mocks through `createMockTanStackLayer` and
  creates no Convex client.
- Connected views use the same public query and mutation definitions under
  production and mock adapters.
- All Convex network calls made by the frontend are defined inside the module.
- All frontend queries use TanStack Query options from `queries`.
- All frontend mutations and actions use TanStack mutation options from
  `mutations`.
- No frontend consumer imports generated Convex function references or types.
- Production query subscription and cache policy is defined once.
- Continuation-page requests use public query options rather than a raw Convex
  client.
- Production reactive queries are not invalidated or manually refetched after
  writes.
- `ConvexProvider` and every Convex React hook are absent from frontend
  consumers.
- Dependency Cruiser rejects private layer imports, direct local Convex access,
  and npm Convex access from outside the module.
- The precise Text submission contract is used without a compatibility
  decoder.
- The full tf-demo validation and both end-to-end environments pass.

## Reference

The Convex TanStack Query adapter setup and reactive query semantics are
documented at <https://docs.convex.dev/client/tanstack/tanstack-query/>. The
adapter is currently beta, so the focused inference, subscription, and
adapter-isolation tests are required contract coverage rather than optional
examples.
