# Playground

Small visual demos of layout concepts for the tf-demo layout redesign
(#1166). Each demo shows one idea on shared fake data, so concepts can be
judged by looking at them. Static fixtures only: no Convex, no backend.

This app is separate from tf-demo's internal dev Playground sidebar and its
`test:e2e:playground` suite. Turbo filters name it `@texteater/playground`.

## Run

```sh
bun run playground
```

Open <http://127.0.0.1:5190/>. `PLAYGROUND_PORT` moves it. Inside
`app/playground`, `bun run dev` does the same.

## The frame

A demo renders inside a frame under a toolbar. The toolbar sets the frame's
width (Phone 390, Tablet 800, Desktop 1440, or Fill), its direction (LTR or
RTL), a light or dark palette, and reduced motion. A grip on the frame's edge
drags it to any width. The settings live in the URL hash
(`#/<slug>?w=390&dir=rtl&theme=light&motion=reduced`), so a view can be
linked and reloaded.

The frame is a CSS size container (`@container/frame`), not an iframe. Demos
share the page's React tree, styles and hot reload, and lay out against the
frame's width:

- Use container query variants, not viewport breakpoints: `@md:`, or
  `@min-[480px]/frame:` for the frame itself. `md:` and other media queries,
  `vw`/`vh`, `window.innerWidth` and `matchMedia` measure the window. For
  container query units, use `cqi`. Use `useFrameSize()` when logic needs the
  frame's width.
- The frame's layout containment makes it the containing block for
  `position: fixed`, so `fixed inset-x-0 bottom-0` pins a sheet to the
  frame's bottom.
- The frame clips and does not scroll. A demo owns its scrolling and usually
  starts with an `h-full` root.
- Portals into `document.body` escape the frame. Portal into
  `usePlaygroundEnv().frame` instead.
- `dir` is set on the frame. Use logical classes only (`ms-`, `ps-`,
  `start-`, `border-s`, `text-start`). Text in another language than the
  frame's carries its own `lang` and `dir`: `WordText` sets them from the
  text's language, and `CardView` on each run of a Card (English glosses,
  the target-language title and quote, a mixed caption as a `dir="auto"`
  `<bdi>`), so punctuation stays on the right side in an RTL frame while the
  chrome mirrors. Do the same for text a demo renders itself, with
  `langAttrs(lang)` and `cardLang(card)`.
- Reduced motion sets Motion's `MotionConfig` to `reducedMotion="always"` and
  finishes CSS animations and transitions immediately inside the frame.
  `usePlaygroundEnv().reducedMotion` gives the same setting to code that
  needs it.
- Light theme is a rough palette scoped to the frame (`src/styles.css`),
  not a designed appearance. Use lego's tokens (`bg-paper`, `bg-canvas`,
  `text-ink`, `text-ink-soft`, `border-line`, `text-link`) and both themes
  follow.

## Add a demo

Every demo is already registered in `src/demos/index.ts`, with its slug,
title, one-line description and inspiration apps. A demo is the default
export of `src/demos/<slug>/index.tsx`. Keep its other files in the same
folder, and don't edit the registry, the fixtures or the shell. A new demo
adds a folder and a registry entry, and `src/demos/registry.test.ts` checks
that each folder has an entry and each entry a folder.

Demos import from two barrels: `@/fixtures` and `@/shell`. The shared
fixtures page, `#/fixtures`, uses every fixture and shows how they fit
together.

## Fixtures (`@/fixtures`)

- `germanText`: four paragraphs set at a train station. It contains
  `auf der Bank`, `ging`, the separable `fängt … an`, `zum Bahnhof` and
  `detaillierte`. `hebrewText`: one sentence, `הילד הלך לבית הספר בבוקר.`
  A text is paragraphs of sentences of tokens. A word token (`FixtureWord`)
  has an `id`, its `text`, its `sentenceId`, the whole `sentence` and, for a
  multi-word unit such as `fängt … an`, a shared `unitId`.
- `wordsOf(text)` lists a text's words. `textFromParagraphs(id, lang, title,
  paragraphs)` builds a text, for example to make a definition clickable for
  nested lookups. In its paragraph strings, `{word|unit}` marks unit members.
- `<WordText text selectedWordId? onWordClick? className? />` renders a text
  as clickable words. A click reports a `WordClick`: `word`, its `element`
  and `rect`, and its sentence's `sentenceElement` and `sentenceRect`, all
  viewport rects. `rectWithin(rect, container)` converts a rect to
  `container` coordinates. The selected word and the other members of its
  unit are underlined. Each word and the punctuation touching it (`Kiosk.`,
  `„Wann`) sit in one no-break span, so a line never starts with
  punctuation; only the word is a button.
- `resolveWord(word | string)` returns a `FakeResolution`: `{ word, cards }`,
  with one `FakeCard` each for Attestation, Surface, Lemma and Reading, in
  deal order. A Card has `id`, `kind`, `title`, a one-line `caption`
  (`ging · past of`), `emoji`, `ipa`, `translations`, `definition`, the
  sentence `quote` with its `quoteMarks`, and `links`. Attestation and Surface
  Cards link to their lemma as `{ relation: "lemma", word: "gehen" }`.
  Resolving that string returns the lemma's entry. Cards are written for
  ging/gehen, Bank, fängt … an/anfangen, zum, Bahnhof,
  detaillierte/detailliert and הלך. Every other word gets generic Cards.
- `<CardView card collapsed? onTailClick? onLinkClick? className? />` shows
  one Card. When collapsed, only its tail is shown: emoji and caption.
- `<CardStack cards frontIndex? onFront? onLinkClick? className? />` shows
  the front Card in full and the Cards behind it as tails above it, like
  tf-demo's Deck. Cards after `frontIndex` are hidden. Clicking a tail calls
  `onFront(index)`. Cards enter and move with Motion layout animations.
- `<CardSkeleton kind collapsed? />` is a Card that hasn't arrived yet.
- `useFakeResolution(word | string | null, delaysMs?)` reveals the Cards one
  at a time, by default after 250, 700, 1300 and 2100 ms. It returns
  `{ resolution, cards, pending, done }`, where `pending` lists the kinds
  still on their way. A new word starts the reveal over.
- `cardKinds` lists the four kinds in deal order.
- `langAttrs(lang)` returns `{ lang, dir }` for a run in `"de"`, `"he"` or
  `"en"`. `cardLang(card)` is the Card's target language, `"he"` when its
  title is Hebrew and `"de"` otherwise.

## Shell (`@/shell`)

- `usePlaygroundEnv()` returns `{ width, dir, theme, reducedMotion, frame }`.
- `useFrameSize()` returns `{ inlineSize, blockSize }` of the frame.
- `useDemoParam(name)` returns `[value, set]` for one URL hash param. Call
  `set(value, { push: true })` to add a history entry, so browser back walks
  the change. `w`, `dir`, `theme` and `motion` belong to the toolbar.

## Checks

`src/fixtures/index.ts` and `src/shell/index.ts` are the API for demo folders,
so `knip.json` doesn't report their unused exports. Don't add playground
lines to `tooling/knip-baseline.json`. Delete an unused export in a demo
folder instead.
