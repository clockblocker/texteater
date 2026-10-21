---
status: accepted
---

# Accumulate a Reading's translations click by click

A Reading's first translations never cover every use of its meaning. `durch`
🚪 covers cause as well as passage (*Durch den Regen wurde es kalt*), and
English says *because of* there, but the authored English is only *through*.
Nobody hand-picks the missing ones. The translations grow as clicks come in.

**Each click checks its occurrence against the stored translations.** Dumgen's
`knowledge.accumulateTranslations` runs once per translation language the
Visitor has enabled and the Reading already has translations in:

1. jev sees the stored translations as bare options beside the marked
   Sentence, the way the Reading judge sees Emoji Descriptions
   ([ADR 0031](./0031-resolve-readings-through-the-emoji-description-alone.md)).
   It picks the option a natural translation of the Sentence renders the
   target with, or answers NoMatch. Its choice stands, as the Reading
   judge's does, with no confidence threshold on top. A pick ends the
   language.
2. After NoMatch, Luna writes the occurrence's equivalents. It writes the
   Sentence's natural translation first and then the equivalents that
   translation uses for the target: with the equivalents first, it gave the
   meaning's most common rendering, *through* for the cause sense. Luna never
   sees the stored translations.
3. What Luna wrote that the language doesn't hold yet is added, in one
   Contribute. Translations compare with letter case folded and whitespace
   collapsed. When Luna writes only stored ones, the judge was wrong, as with
   a Collision in ADR 0031, and nothing is added.

Accumulation stays inside the Reading the click resolved to. It never makes
a Reading, and it never removes or reorders a translation: a set reads in
arrival order, its first translations first.

**Translations are the one Knowledge aspect a later occurrence adds to.**
Every other stored aspect stays as the occurrence that wrote it left it
([#883](https://github.com/clockblocker/texteater/issues/883), point 5).
Translations only grow, and a wrong one is fixed through Correct or Retract.
Outside Knowledge, a later occurrence may add a Paradigm Variant to its
Lemma the same way
([ADR 0048](./0048-keep-paradigm-variants-on-the-lemma-and-license-them-per-reading.md)).

**An authored Reading accumulates in its note.** Its stored note starts as a
copy of its authored Knowledge
([ADR 0021](./0021-close-routes-in-dumgen-and-author-closed-class-inventories-in-dumcorpus.md)),
and additions land in the note on top of that seed. The dumcorpus inventory
keeps its reviewed translations, so a note may hold more translations than
its authored member. Authored members on Closed Routes accumulate like any
other.

**It runs after the click.** Committing an occurrence schedules the run, and
the note shows a new translation once the run lands. The run reads the
stored translations when it starts. A generated Reading's first occurrence
schedules none, since its own Knowledge run writes the translations from
that Sentence; an authored Reading's first occurrence schedules one. A
language with no stored translations is left to Knowledge Production. A
failed call adds nothing for its language, and the next click asks again.

## Considered Options

- Showing Luna the stored translations and asking for the missing ones.
  Rejected for the reason ADR 0031 keeps the stored descriptions from the
  generator: an answer the set already holds exposes a wrong NoMatch, and a
  writer shown the set leans toward writing something new.
- Authoring the missing translations in dumcorpus. Rejected: nobody can
  foresee every use, and the user does not want to hand-pick them.
- Running the step inside the click. Rejected: it would add a jev call, and
  after NoMatch a Luna call, to every click's wait, for a note the Visitor
  may not read at once.
- One jev call for all languages. Rejected: each judgment's options stay in
  one language, as Knowledge Production writes each language in its own
  call.

## Consequences

- A wrong NoMatch followed by a different rendering adds a near-synonym of a
  stored translation. A wrong pick misses one, which a later click may add.
- Each click on a reused or authored Reading costs one jev call per enabled
  language with stored translations, about 700 input tokens each, and a Luna
  call only after NoMatch.
