---
status: accepted
---

# Spell the Pane's Sheet Stack in the URL

The URL is the Address of the one Pane (tf-demo ADR 0013): its Ground line,
then its Covers. Browser Back does what ← does, and browser Forward follows
the Sheet it names again. Decided on #1169; built in #1307.

**Address.** The Ground line comes first, one rung per segment: `/menu`,
`/library`, `/settings`, or the Library's selections as
`/section/<id>/…/scroll/<id>`, with the Menu and the Library implied. Each
Cover follows as its own segments: `/reading/<id>`, `/lemma/<id>`,
`/surface/de/<form>`, `/attestation/<id>`, `/shadow/<id>`,
`/source/<scrollId>/<attestationId>` for Go to source, and
`/step/<requestId>/<reading|attestation>`. A Section or a Scroll can only
be a Cover without a focus while splits are on; it is spelled
`/codex/<sectionId>` or `/source/<scrollId>`. Ids are the opaque ids that
`workspaceSubjectKey` reads, with no slugs. A stale id, such as a Shadow
that has since been resolved into a Lemma, opens a Cover that shows Not
found. Decks, presentation context, titles, scroll positions, the Held Card
and Settings values are never in the URL. A Deck in the URL would be dealt
on load: a Visitor Encounter, and maybe a paid Resolution, for whoever
opens the link.

**History.** Every entry the workspace writes is a Sheet Stack, and the
entry below it is the same stack less its top Sheet. After each committed
change, never while a Card is in hand, the workspace compares the new stack
with its entry:

- Sheets added on top push one entry each: following a Link, Go to source,
  opening a Card as a Cover, a Menu or Codex pick, and the rungs a
  Codex's Continue walks.
- A stack that an entry below starts with goes back to that entry, as ←,
  ×, Close all and a Cover lifted and let go do. If Sheets remain above it,
  they are pushed once the browser lands there. Next does this: it goes
  back to the Sections the following Scroll shares, then pushes the rest,
  so Back after Next steps down to the Codex, as ← does.
- The same Sheets renamed replace the entry, as when `ReconcileDeck` turns
  a Resolution Step into its Reading. So does a stack that no entry below
  leads to.
- Dealing, sweeping, BringToFront and a Lift in progress write nothing. A
  Rooted Ground lifted and let go where it came from is the same stack
  again, so its Lift writes nothing either.
  System Back on a phone does not sweep a live Deck first. A Deck still ends
  when its Sheet leaves, and a deal is a server mutation that must never be
  replayed.

Each entry keeps, in `history.state`, the Presentation ids of its Sheets
(a Menu rung counts as itself) and those of every entry below it, so the
rule still holds after a reload. `history.scrollRestoration` is `manual`.

**Back and Forward.** A `popstate` cancels any gesture, letting go of a
Held Card, then takes the Pane to the entry's stack by Presentation id.
What Back takes off goes as ← would: a Cover whose Card is in a live Deck
collapses, and a Ground steps one rung down. What Forward brings back is
followed afresh: a Cover is a fresh Link Cover with no Deck, and a rung is
walked again. The app has no Forward control, so the browser's Forward is
the only forward.

**Load.** The URL wins. The stored workspace is taken to the Address by the
same planner (`planNavigation` in compass), matching Sheets by Subject, so
the Sheets they share keep their Decks and context. A bare `/` resumes the
stored workspace, and the URL then spells it. An entry that is not the
workspace's own, as after a pasted link, becomes one entry per Sheet, so
Back walks the stack down as ← does before it leaves the app. `main.tsx`
keeps the path and drops any query or hash. In development builds,
`/playground` stays the Playground's.

`locationAtom` is the one reader and writer of `window.history` and owns
the one `popstate` listener (tf-demo ADR 0014); the Playground's pathname
derives from it. The mechanism is the plain History API with no router
dependency.

This replaces:

- [tf-demo ADR 0003]'s single URL, its statement that resource URLs and
  route-encoded workspace state are unsupported, and its statement that only
  Workspace Persistence survives a reload. The Address survives too, and
  wins. The rest of ADR 0003 stands: the workspace owns navigation, there is
  no Navigation Anchor, the sidebar keeps only the development Playground
  link, and the Library is where the workspace starts.
- [tf-demo ADR 0008]'s "There is no forward history" now reads: there is no
  in-app Forward control. Everything else in ADR 0008 stands, and ← is
  still how the app goes back.
- [tf-demo ADR 0014]'s "URL state: none" bullet. `Atom.searchParam` is
  still unused; the Address is a path written through `locationAtom`.

## Considered Options

- **Next as a plain push.** Back would land on the previous Scroll's entry
  while ← steps down to the Codex, and every Next would leave one more Back
  to press at the Menu.
- **A pasted link as one entry.** Back would leave the app from inside a
  Cover, which is what made phones' system Back and iOS's edge swipe a
  problem in the first place.
- **System Back sweeps a live Deck before it goes back.** That makes
  dealing and sweeping history entries, and a deal must never be replayed.
- **Slugs beside the ids.** They add nothing a load can trust and go stale
  when a title changes.

## Consequences

- An Address carries no titles, so a Section or Scroll opened from one loads
  its title for its Heading and the trail (`SubjectRenderer.crumb`).
- Close all keeps the id counter running, so a fresh Presentation never
  takes an id that an older entry still names.
- While splits are parked the Address spells the only Pane. Once they are
  unparked it spells the Active Pane when it is Rooted, otherwise the first
  Rooted Pane, and the other Panes stay out of the URL.
- Not yet handled: iOS Safari draws its edge-swipe snapshot over the Cover
  motion. In Hebrew, the Sweep swipe runs the same way as iOS's back swipe.

[tf-demo ADR 0003]: ./0003-make-the-workspace-own-navigation.md
[tf-demo ADR 0008]: ./0008-give-every-pane-a-ground-beneath-its-covers.md
[tf-demo ADR 0014]: ./0014-keep-shared-ui-state-in-effect-atoms.md
