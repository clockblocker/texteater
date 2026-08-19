# Laboratory

> EARLY-WIP LABORATORY. This is a prompt-development surface, not a production
> prompt namespace or a claim that the prompts are ready for production.

This laboratory answers one question: does the current Dumgen topology still
make sense when every prompt stage, resolved-unit member, cache decision, and
canonical result is visible?

```text
Source Text -> Selected Sentence -> Intake -> Segmentation<de>

Segmented Sentence + Click
  -> Target Classification<de, HighLevelWholeUnit>
  -> Grammatical Resolution<de, Family, Kind>
  -> Reading Resolution<de>
```

Run the React/Vite UI and Bun API together:

```sh
bun run --cwd app/laboratory dev
```

Then open <http://127.0.0.1:5173/>. Paste a longer German source text, select one
complete sentence, and run Intake plus Segmentation. Only `ResolvableText`
Segments are clickable.

Intake and Segmentation are two distinct sequential model calls. The server
calls `Segmentation<de>` only after Intake returns `Accepted`; they are never
combined into one prompt or call.

Set `OPENAI_API_KEY` in the server environment. The Bun API invokes the real
Dumgen laboratory prompts and Dumgen's configured OpenAI Responses API adapter;
credentials never enter the browser. Segmented sentences live in memory only.
German is the only supported language.

After a `ResolvableText` click, the result panel shows the Target, Grammatical,
and Reading stages. For each stage, it includes the minimal prompt input and the
validated model output. The Grammatical result uses the matching concrete
German Dumling Attestation and Surface contracts. The panel also shows
`Unresolved` results and Reading decision mismatches, which are useful when
debugging prompts. A valid non-noun Target stops at
`ResolutionRouteNotImplemented` before another model call. Only German
Lexeme/NOUN currently reaches Grammatical and Reading Resolution.

Target Classification may group several contiguous or discontinuous Segments
into one Analysis Target. Every member is marked in the segmented sentence.
After the first complete resolution, clicking another marked member reuses the
same click-independent Attestation, Surface, Lemma, and Reading. Click state
stays in the Dumgen-owned interaction envelope. The UI reports a **Member cache
hit** and makes no model calls.

Useful first probes are `Guten Morgen`, a separable verb such as
`Fritz steht sofort auf`, an ordinary word, and a typo in one member of a
multi-member unit. Select a sentence and press `Cmd+Shift+S` to segment it.

Each server run starts a laboratory session. Every segmentation and full
classification-chain attempt is appended as JSONL under
`battery/dumgen/.laboratory/sessions/<session-id>/events.jsonl`. **Reset
session** rotates the session ID and clears in-memory results without deleting
earlier logs.
