---
status: accepted
---

# Keep shared UI state in Effect atoms

UI state that more than one component reads, or that outlives the component
that sets it, lives in Effect atoms: `effect/reactivity` with the
`@effect/atom-react` hooks. Convex reads stay on TanStack Query through
`@convex-dev/react-query`, and mutations and actions stay on `convex/react`.
Map [#1298] tracks the move.

State becomes an atom when it is shared by components that are not parent
and child, derived from other atoms, kept beyond a mount, or set by one
component and reacted to by another. State that one component owns and
nobody else reads stays in `useState`: hover, focus, drafts and pending
flags. A context that tells a component where it sits in the tree stays a
context, because an atom cannot express "my nearest ancestor".

Atoms never read Convex and never call a mutation. A component joins its
query results with atom values when it renders.

## Conventions

- **Registry:** one `RegistryProvider`, outermost in `AppProvider`, with the
  default scheduler. A test that renders an atom user wraps it in its own
  `RegistryProvider`.
- **Tests:** an atom's unit test sits next to its file, as
  `foo-atoms.test.ts` beside `foo-atoms.ts`, and drives the atoms through
  `AtomRegistry.make()`. It cannot live in `tests/`, because
  `tf-demo-notes-hide-their-internals` keeps `tests/` out of Notes
  internals.
- **Placement and naming:** atoms live in a `*-atoms.ts` file next to their
  consumer, are created only at module level, and carry an `Atom` suffix.
  Keyed state uses `Atom.family`. A façade `use…` hook is optional; it earns
  its place when it keeps a component's interface stable.
- **Lifetime:** the registry disposes an atom shortly after its last
  subscriber leaves. State that must outlive its component uses
  `Atom.keepAlive`.
- **Persisted state:** state kept across reloads is a `localStorageAtom`
  (`src/lib/local-storage-atoms.ts`), an `Atom.kvs` on the one shared
  `localStorage` runtime. Values are stored as JSON.
- **URL state:** none. [tf-demo ADR 0003] keeps state out of the URL, so
  `Atom.searchParam` is not used.
- **Gestures:** gesture and per-frame state stays on refs and Motion values.
  Atom subscribers are notified at low priority on React's scheduler, which
  is too late for a frame.

## Consequences

- Every Atom and atom-react export is `@stability unstable`. `effect` and
  `@effect/atom-react` are pinned to one exact version, and
  `tsconfig.app.json` lets exactly `effect/reactivity`,
  `effect/persistence` and `@effect/atom-react` through the Effect language
  service.
- Atom and atom-react cost a one-time +46 kB gzip, and `kvs` with its
  `KeyValueStore` and the Schema it decodes with about another +5 kB.

[#1298]: https://github.com/clockblocker/texteater/issues/1298
[tf-demo ADR 0003]: ./0003-make-the-workspace-own-navigation.md
