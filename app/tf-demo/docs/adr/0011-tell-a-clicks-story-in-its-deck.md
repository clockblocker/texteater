---
status: accepted
---

# Tell a click's story in its Deck

A click deals a Deck. Back to front, it holds the Attestation, Surface, Lemma
and Reading Cards, with the Reading in front. Each Card behind the front one
shows only its Heading Block, as a Card Tail. Read from top to bottom, those
tails tell how the clicked text led to the Reading:

```
zum Bahnhof · zum = zu dem
Bahnhof · dative of der Bahnhof
🚉 Bahnhof
```

**Which Cards are dealt.** A Card is dealt only when its step says something. The dealt Cards keep the
fixed order. `shared/click-story.ts` holds the rules:

- **Attestation:** dealt when the unit is more than the single clicked word,
  or has a member that is not `Standard` (a Typo, a Shorthand or a Fused
  piece). A split unit has more than one member.
- **Surface:** dealt unless it is its Lemma's Grundform in the Canonical
  spelling. Grundform is the stored assessment, never a comparison of
  strings: dative `Wald` is spelled like its Lemma and still says `dative`.
  An assessment that could not be made counts as not Grundform.
- **Lemma:** dealt when it holds more than one stored Reading.
- **Reading:** always dealt, so a plain `Hund` deals only the Reading.

A Card is dealt only once its step is known to say something, and is never
taken back:

- The Attestation is dealt at the click when the stored unit has more than
  one Segment, and otherwise once Grammar's reading shows that it says
  something.
- The Surface and Lemma are dealt at commit.
- Each stage ORs everything the earlier stages knew, so the Deck only grows.

A Variant spelling is a fact about the Surface, not about a member, so the
Surface Card names it (`daß · older spelling of dass`). A Variant alone does
not deal the Attestation; if it did, two Cards would say the same thing.

**The Attestation's title.** An Attestation is titled with its whole unit
as written. A fused word is spelled whole (`zum Bahnhof`, not `m Bahnhof`),
and words of other units between the members show as `…` (`fängt … an`).
The click's Deck gives the stored Attestation Card the clicked Segment as
presentation context, and the title emphasises that piece.

**Captions.** A Heading's caption follows its title: `<title> · <relation> <next title>`.
The next title is the title of the next Card dealt in front of it, so a
skipped Card leaves no gap in the story.

- **Same rules as the Deck:** each Note computes its caption from its own
  data with the rules above, so the caption also holds when the Card is
  opened as a Sheet, or outside a click's Deck.
- **The next Card's title:**
  - An Attestation names its Surface's title when the Surface says
    something; otherwise it names the canonical form, which titles both the
    Lemma and the Reading.
  - A Surface names its Lemma's canonical form. A noun's title carries its
    article (`der Bahnhof`), because the caption is drawn without the title's
    gender tone.
- **Emphasis:** the next title is drawn dimmer than the relation, so that
  Card's own title stays the strong one.
- **The Reading** ends the story and has no caption.
- **Fit:** the title never truncates. When the full caption does not fit
  beside it, the caption drops the next title, which is visible on the Card
  in front. Only after that does it truncate.

**Wording.** Captions are generated deterministically from structured features, with no
LLM, in plain learner words.

- **Templates:** relation words come from a per-UI-language template table,
  and target-language words such as pronouns and articles from a
  per-target-language table (`src/notes/universal/caption/wording.ts`). Code
  never glues words together itself.
- **Bidirectional text:** each target-language run is its own token,
  rendered in a `<bdi>`.
- **Verbs:** tense or mood in plain words (`past`, `perfect`,
  `subjunctive`, `imperative`, `participle`, plus `passive`), and person and
  number as the target-language pronoun (`er/sie/es`, `wir`).
- **Nouns:** the case is named unless it is nominative, and the number only
  when it is plural (`dative`, `plural`, `dative plural`). A noun's gender
  is never named, because the article in the next title carries it.
- **DET, PRON and NUM:** the same rule, with the gender added for a singular
  form that is not masculine (`dative feminine of dieser`).
- **ADJ and ADV:** `comparative` or `superlative`. Any other
  non-Grundform Surface says `form of`.
- **Variant tags:** `also correct`, `older spelling`, `regional` and
  `stretched for effect`, named before the inflection.
- **Attestation:** the first relation that applies wins:
  - a Typo: `typo of`;
  - a Shorthand: `short for`;
  - a fused word: `zum = zu dem`;
  - a verb whose own form words are split by other words: `split form of`.

  A governed preposition is a member but not part of the verb's form
  ([ADR 0034](../../../../docs/adr/0034-store-valency-as-e-valbu-frames-on-the-reading.md)),
  so `um Hilfe bitten` is not split. A noun's article member is left out of
  the Typo and Shorthand checks: the Attestation does not store the word the
  article stands for (`'ne Kiste`). A unit with none of these has no
  relation; its title, the whole unit, carries that step.

## Considered Options

- **Dealing all four Cards on every click.** Rejected: for `Hund` the tails
  read `Hund`, `Hund`, `Hund` and add nothing.
- **Passing the next Card to each Card as presentation context.**
  Rejected: the caption would hold only inside the Deck that dealt it, and
  Workspace Persistence would have to keep the extra context.
- **Generating the wording with a model.** Rejected: the features already
  determine it, and the same click must always read the same way.
