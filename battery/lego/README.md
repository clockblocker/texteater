# lego

Shared presentation kit for Texteater applications: one Tailwind stylesheet with
the design tokens, the theme machinery, shadcn-derived atoms, and the Note and
reader molecules that carry the reading experience.

Import `lego/styles.css` once from the application stylesheet. It brings in
Tailwind, the shadcn base, the Geist font, the token palette, and the `compact:`
density variant. Applications keep no `@theme` block of their own.

Import components from `lego`. Atoms are the shadcn primitives (`Button`,
`Dialog`, `Sidebar`, and so on). Molecules are the opinionated pieces that give
Notes and reading text their look: `NoteSection`, `NoteTitle`, `QuoteButton`,
`ReaderSegment`, and their companions. `DensityScope` marks a subtree as
`compact` or `comfortable` so the same molecules read well as a Card or a Sheet.

`ThemeProvider` and `initializeTheme` own the persisted theme choice. The light
theme currently reuses the dark palette; a distinct light appearance is not
designed yet.

Terminology lives in [CONTEXT.md](./CONTEXT.md).
