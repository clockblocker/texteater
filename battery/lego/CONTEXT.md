# lego Context

lego owns the shared visual language of Texteater applications: the token
palette, the theme choice, and the reusable pieces that Notes and reading text
are assembled from. Applications own what a Note means; lego owns how its parts
look.

## Language

**Token**:
A named design value exposed to Tailwind through `lego/styles.css`, such as an
ink step, a surface, a line, or a linguistic tone. Applications style with
tokens, never with literal colours or lengths.

**Ink**:
The four-step text scale from body text to the faintest legible mark: ink,
soft, muted, faint.

**Surface**:
A background level. The canvas sits behind Panes, paper is what a Sheet or Card
rests on, and raised is one step above paper for hover and popups.

**Line**:
A hairline rule. The strong line marks a separator or a Card edge.

**Gender tone**:
The colour of a headword by grammatical gender: feminine, masculine, neuter.

**Segment tone**:
The colour of a reader segment by its state: unknown, known, selected,
unresolved, failed. Selected is the word whose Cards are open; known words
resolved earlier sit one chroma step below it.

**Atom**:
A shadcn-derived primitive with no product opinion, such as `Button` or
`Dialog`.

**Molecule**:
An opinionated composition of atoms and tokens that carries the reading
experience, such as `NoteSection`, `NoteTitle`, `QuoteButton`, or
`ReaderSegment`.

**Density**:
Whether a subtree has comfortable or compact room. `DensityScope` declares it;
molecules read it through the `compact:` variant. A Card is compact, a Sheet is
comfortable.
_Avoid_: presentation mode, card mode

**Theme**:
The persisted appearance choice: dark, light, or system. `ThemeProvider` keeps
the document in sync with it. The light theme currently reuses the dark palette.
