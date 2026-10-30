# Dumtext

Text in, Extracted Text and its paragraphs and Sentences out, in code and
with no model. Dumgen and tf-demo read text through it, and so can a host
such as the Obsidian plugin that needs Sentences without Dumgen's runtime.

```ts
import { extractedTextFromMarkdown, splitScroll } from "dumtext";

const text = extractedTextFromMarkdown("# Kapitel 1\n\nEr kam spät. Sie wartete.");
const scroll = text.contents[0];
if (scroll?.kind === "Scroll") splitScroll(scroll).paragraphs;
// [{ sentences: ["Kapitel 1"] }, { sentences: ["Er kam spät.", "Sie wartete."] }]
```

- The readers make Extracted Text: `extractPastedText` from pasted text,
  `extractTextFile` from a `.txt` file, `scrollFromHtml` from a parsed HTML
  tree and `extractedTextFromMarkdown` from a Markdown document.
  `parseScroll` checks a stored Scroll without Zod.
- `splitScroll` splits a Scroll into paragraphs and Sentences with
  `splitText`, which splits any text by one set of rules for every
  language ([Dumgen ADR 0007](../dumgen/docs/adr/0007-segment-text-into-biggest-units-and-break-multiword-lemmas-down-apart.md)).

Everything under `src/` reads no files and loads no Zod, so it runs in a
Convex isolate or a plugin; `tests/purity.test.ts` holds it there.
