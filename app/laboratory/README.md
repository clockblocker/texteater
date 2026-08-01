# Laboratory

> THROWAWAY PROTOTYPE — this is evidence for a future implementation, not the
> implementation itself.

Question: does the hands-on `text selection -> Dumgen segmentation -> segment
click -> Dumgen Selection / Surface / Reading inspection` flow feel coherent
when the whole state is visible?

Three structural UI variants live on the same route and are selected with
`?variant=A`, `?variant=B`, or `?variant=C`.

Run the React/Vite UI and Bun API together:

```sh
bun run --cwd app/laboratory dev
```

Then open <http://127.0.0.1:5173/?variant=A>.

Set `OPENAI_API_KEY` in the server environment. The Bun API invokes the real
Dumgen laboratory prompts and Dumgen's configured OpenAI Responses API adapter;
credentials never enter the browser. Segmented sentences live in memory only.

Each server run starts a laboratory session. Every segmentation and click
resolution attempt is appended as JSONL under
`battery/dumgen/.laboratory/sessions/<session-id>/events.jsonl`. **Reset
session** rotates the session ID and clears in-memory results without deleting
earlier logs.
