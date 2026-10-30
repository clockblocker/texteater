# Effect playground

A sandbox for learning Effect. Type a file name, submit, and the file's
contents come back from a Bun server, once over REST (`effect/http-api`) and
once over Effect RPC (`effect/rpc`). Files live in `files/`. A name that
isn't `.txt` fails with `NotTxtFile`; a missing `.txt` fails with
`FileNotFound`.

## Run

```sh
bun run dev
```

Open <http://127.0.0.1:5200/>. The Bun server listens on 5201 and Vite
proxies `/api` and `/rpc` to it. `EFFECT_PLAYGROUND_PORT` and
`EFFECT_PLAYGROUND_SERVER_PORT` move them.

## Layout

- `src/shared/` is the contract both sides import: the errors, the REST API,
  and the RPC group.
- `src/server/` holds `FileReader` (the logic, written once) and the two
  transports mounted on one router.
- `src/client/` builds both clients and maps each outcome to UI state.

`@effect/platform-node-shared` is pinned to 4.0.0 only to match the repo's
`effect` 4.0.0. Its 4.1 release imports modules that effect 4.0 lacks.
