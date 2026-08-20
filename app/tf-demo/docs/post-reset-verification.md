# tf-demo direct-only reset verification

## One-time reset record

On 2026-08-20, the bounded application-owned reset was run once against the
local `anonymous:anonymous-agent` deployment served at `127.0.0.1:3210`:

```sh
bun run --cwd app/tf-demo reset
```

The reset reported 89 deleted application rows. A read-only inventory
immediately afterward found zero rows in all 21 tf-demo schema tables. No old
data was exported, translated, re-imported, or retained. This is a greenfield
demo reset, not a migration.

The local backend is not required to remain running after the reset. Do not
repeat the destructive command merely to reproduce the evidence above.

## Regression contract

`tests/post-reset-smoke.test.ts` compares the bounded reset inventory to the
actual Convex schema table names, seeds one row in every owned table, and proves
that the batching operation empties every table. Adding a schema table without
adding it to the reset inventory therefore fails the test.

The same test starts the Shared Demo Dictionary from an empty database and
proves the direct-only storage contract end to end:

- fresh Readings and base Knowledge are persisted without importing old data;
- a direct Hypernym is the only durable Semantic Relation edge;
- its Hyponym inverse is projected at read time and is not stored;
- an ambiguous exact-Lemma target remains a pending Unit Shadow; and
- that pending Shadow contributes no direct or inferred relation view.

Run the focused verification from `app/tf-demo`:

```sh
bun test tests/post-reset-smoke.test.ts
```

## Live post-verdict smoke

Once the production publication policy from `texteater#194` is deployed, start
the same local deployment, submit only fresh source text through the normal
demo flow, and confirm that its Reading Note presents base Knowledge and the
direct-only projections above. The initial empty promotion allowlist must not
publish model-generated Semantic Relations; a human verdict is still required
before any relation kind is promoted. This live presentation check is not a
reason to seed fixtures, import pre-reset data, or add a compatibility path.
