# Laboratory

> THROWAWAY PROTOTYPE — this is evidence for a future implementation, not the
> implementation itself.

Question: does the hands-on settled Dumgen topology feel coherent when every
prompt stage, resolved-unit member, cache decision, and canonical result stays
visible?

```text
Source Sentence -> Intake -> Segmentation<de>

Segmented Sentence + Click
  -> Target Classification<de, HighLevelWholeUnit>
  -> Grammatical Resolution<de, Family, Kind>
  -> Reading Resolution<de, Family, Kind>
```

Run the React/Vite UI and Bun API together:

```sh
bun run --cwd app/laboratory dev
```

Then open <http://127.0.0.1:5173/>. Enter one complete German source sentence
and run Intake plus Segmentation. Only `ResolvableText` Segments are clickable.

Set `OPENAI_API_KEY` in the server environment. The Bun API invokes the real
Dumgen laboratory prompts and Dumgen's configured OpenAI Responses API adapter;
credentials never enter the browser. Segmented sentences live in memory only.
German is the only supported language.

After a `ResolvableText` click, the result panel exposes the Target,
Grammatical, and Reading stages, including each stage's minimal prompt input and
validated model output. The canonical Grammatical result uses the matching
concrete German Dumling Selection and Surface contracts. `Unresolved` and
Reading decision mismatches remain visible as prompt-quality diagnostics. This
application and its prompts are an early WIP laboratory bench, not production
behavior.

Target Classification may group several contiguous or discontinuous Segments
into one Analysis Target. Every member is marked in the segmented sentence.
After the first complete resolution, clicking another marked member creates a
new click-local Selection while reusing the shared Surface, Lemma, and Reading;
the UI reports a **Member cache hit** and zero model calls.

Useful first probes are `Guten Morgen`, a separable verb such as
`Fritz steht sofort auf`, an ordinary word, and a typo in one member of a
multi-member unit. Press `Cmd+Enter` (or `Ctrl+Enter`) to rerun the pre-click
chain quickly while iterating on real inputs.

Each server run starts a laboratory session. Every segmentation and full
classification-chain attempt is appended as JSONL under
`battery/dumgen/.laboratory/sessions/<session-id>/events.jsonl`. **Reset
session** rotates the session ID and clears in-memory results without deleting
earlier logs.
