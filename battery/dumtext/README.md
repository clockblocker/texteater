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

A host that keeps its own text, such as an editor's note, asks the span API
where each Sentence stands in it:

```ts
import { splitMarkdown } from "dumtext";

const note = "# Kapitel 1\n\nEr kam *spät*. Sie wartete.";
splitMarkdown(note).paragraphs;
// [{ kind: "Heading", sentences: [{ text: "Kapitel 1", start: 2, end: 11 }] },
//  { kind: "Paragraph", sentences: [{ text: "Er kam spät.", start: 13, end: 27 },
//                                   { text: "Sie wartete.", start: 28, end: 40 }] }]
```

- `splitMarkdown(markdown)` reads and splits as `extractedTextFromMarkdown`
  and `splitScroll` do, Scroll after Scroll. `splitTextSpans(text)` splits
  as `splitText` does, reading the text as NFC.
- Each Sentence's `start` and `end` are UTF-16 offsets into the string the
  host passed in, so `input.slice(start, end)` is its source: the Sentence
  apart from whitespace and NFC, plus any Markdown markup inside it.
- A paragraph's `kind` is `Heading` for a Markdown Heading or a plain-text
  title line, so a host can skip it, and `Paragraph` otherwise.

Everything under `src/` reads no files and loads no Zod, so it runs in a
Convex isolate or a plugin; `tests/purity.test.ts` holds it there.
