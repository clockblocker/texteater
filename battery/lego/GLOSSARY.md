# lego Context

lego owns the shared visual language of Texteater applications: the token
palette, the theme choice, and the reusable pieces that Notes and reading text
are assembled from. Applications own what a Note means; lego owns how its parts
look.

## Language

**Token**:
A named design value exposed to Tailwind through `lego/styles.css`, such as an
Ink step, a Surface, a Line or a linguistic tone. Applications style with
Tokens, never with literal colours or lengths.

**Ink**:
The text colour scale, from body text to the faintest legible mark.

**Surface**:
A background level that Panes, Sheets, Cards and popups sit on.

**Line**:
A hairline rule, such as a separator or a Card edge.

**Gender tone**:
The link colour variant for a noun or pronoun whose gender is a marked Core
Feature.

**Segment tone**:
The colour of a reader segment by its state: unknown, known, selected,
unresolved, failed. Selected is the word whose Cards are open; known words
resolved earlier sit one chroma step below it.

**Atom**:
A shadcn-derived primitive with no product opinion, such as `Button` or
`Dialog`.

**Molecule**:
An opinionated composition of Atoms and Tokens that carries the reading
experience, such as `NoteTitle` or `ReaderSegment`.

**Density**:
Whether a subtree has comfortable or compact room: a Sheet is comfortable, a
Card compact. Molecules adapt to it.
_Avoid_: presentation mode, card mode

**Theme**:
The persisted appearance choice: dark, light or system.
