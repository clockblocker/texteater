---
status: accepted
---

# Use Reading-owned, Lemma-targeted Semantic Relations

A Semantic Relation is a direct claim stored on one exact source Reading. This
keeps relation Knowledge Reading-owned. ADR 0012 owns storage orientation.

**Target modes.** One Reading Knowledge value targets either Lemmas or exact
Readings and never mixes them. Lemma Target Mode is the default, for open and
generated relations: generated Unit Shadows resolve to Lemmas or stay pending.
Reading Target Mode is explicit and reserved for reviewed closed inventories.
Projections and navigation keep the chosen endpoint kind, so an exact target
never expands by accident to every Reading of a Lemma.

**Projections close only over links that reach exactly one Reading**: an exact
Reading target, or a Lemma target whose Lemma has exactly one Reading. The
count covers every Reading of the Lemma, not only those one projection loads.
On a homonymous Lemma, a Lemma target stays a direct edge with no inverse,
synonym component or substitution, so `Burg` 🏰 synonym `Schloss` does not
give `Burg` the hypernym of `Schloss` 🔒. Resolving Lemma targets to Readings
(issue 176) will widen closure without a schema change. Until 2026-09-27
(#641), all Readings of a target Lemma took part in projections.

The target-mode rule was recorded apart as ADR 0016 and merged here on
2026-09-28.

**Shadow Relations resolve at write time and stay current.** A generated
relation names its target as a Unit Shadow: language, Family, Kind and
Canonical Form, with no Core Features. Its resolution is decided when it is
written and kept current as Lemmas change. Nothing is decided at read time.

**The match rule.** A Shadow resolves to a Lemma when exactly one stored
Lemma matches it: same language, Family and Kind, and the same
`canonicalFormKey` (`shadowMatchesLemma`). If no Lemma matches, or several
do, it stays pending. Uniqueness is judged on whatever the Shadow carries, so
no language, Family or Kind gets a "precise enough" table. Dumdict exports
the rule as the pure, total function `resolveShadow(shadow, lemmas)`. It
returns a `Lemma` Link Target for one match and the Shadow's `Spelling` Link
Target otherwise, and never a `Reading` or a `Surface`.

**The relation keeps its Shadow.** Dumdict stores a Shadow relation as a
Pending Semantic Relation record for as long as the relation lives. When the
Shadow resolves, the record keeps the Shadow and gains `resolvedLemma`, and
the source Reading's Knowledge holds the plain direct claim to that Lemma.
While it is pending, the record has no `resolvedLemma` and the source holds no
claim. Dumrel's relation schema and the claim are unchanged. The resolution
is one optional field on a record kind hosts already store, and it changes by
deleting and recreating the record under its one locator. Hosts that list
pending relations or Shadow references, such as tf-demo's Reading and Shadow
Notes, skip resolved records.

**Lemma changes re-evaluate every Shadow they match, in the same plan.**
Re-evaluation reads only the record's Shadow, never its previous resolution.
A unique match resolves to that Lemma, and anything else goes back to
pending. The source's claim moves with the record:

- der See alone: a relation to some `See` resolves to der See;
- die See added: the plan that adds it retracts the claim on der See, and the
  record goes back to pending;
- die See removed: the claim on der See comes back.

Every plan that creates a Lemma re-evaluates the stored Shadows it matches:
`addNewNote`, and `ensureReadingEntry` when it creates its Reading's Lemma.
A Lemma leaves the dictionary in two ways. Its host removes it, as when a
user deletes its note or tf-demo prunes one. Or Dumdict's `removeOccurrence`
removes it with its last Reading
([ADR 0043](./0043-correct-identity-by-moving-occurrences.md)) and lists it
among the plan's removed Lemmas. Either way the host plans
`reevaluateShadows` with the removed Lemmas, in the commit that removes them
or right after. The removed Lemmas are never
candidates, and stored claims may still name them until the plan moves them.
Re-evaluation is deterministic and idempotent: planning it again after its
commit plans nothing.

**An exactly named relation never moves.** A claim whose target was named
exactly has no record, so nothing re-evaluates it. That covers an existing
Lemma target in a draft, a generated Knowledge Change naming a Lemma, and any
Reading target. When a Shadow and an exact naming meet on one claim (same
source, relation and Lemma), the exact naming absorbs the Shadow: its record
is deleted and the claim stays. That holds whichever came first: a Shadow
resolving to a claim the source already holds, or a draft or Knowledge
Change naming the Lemma a Shadow resolved to. Retracting a Shadow's claim
retracts its relation: while its Lemma stays, the next re-evaluation deletes
the record instead of restoring the claim, unless a proposal names the Shadow
again. Two cases can't resolve:

- the match is the source Reading's own Lemma, which no relation targets;
- the source already claims the match under another relation.

A stored Shadow in either case stays pending when it is re-evaluated, so one
record never blocks a Lemma change. A plan that proposes such a Shadow is
refused (`selfRelation`, `relationConflict`).

**Going back to pending removes projections.** Inverse, synonym-closure and
substitution edges come from claims at read time (ADR 0012). So when a second
matching Lemma un-resolves a Shadow, the inverse the first Lemma showed goes
with the retracted claim, and no cleanup is written. It returns when the
claim does.

**Hosts link through Link Targets.** `LinkTarget` is `Spelling { language,
key }`, `Lemma { lemma }`, `Reading { reading }` or `Surface { surfaceId }`.
`Spelling` names a Spelling Crossroad by `canonicalFormKey`. Lemma and Reading
targets carry Dumling values, compared by their identity keys. `Surface`
names one met Surface of one Lemma. A host renders a stored relation's
current resolution (`pendingRelationTarget`). It maps each variant to a place
of its own, such as a Crossroad note, a Lemma note, a Reading note or a
Surface's entry in its Lemma note.

**Migration.** Records written before relations kept their Shadow have no
`resolvedLemma` and read as pending, which they are: the old planner deleted
every record it resolved. A store runs `reevaluateShadows` once over every
stored Shadow. That resolves each record that now has exactly one match,
such as one whose Lemma came through `ensureReadingEntry`, which did not
resolve Shadows before. The sweep is deterministic, and running it again
changes nothing. A relation resolved before the change was stored as a plain
claim without its Shadow. No migration can recover that Shadow, so such a
relation reads as exactly named and never moves.

## Considered Options

- **Deciding Shadow targets at read time, with no fan-out.** Rejected: hosts
  render stored resolutions, and every reader would repeat the match over
  the whole dictionary.
- **A separate stored Shadow-resolution record or storage slice.** Rejected:
  re-evaluation already reads the records the matching-Lemma lookup loads,
  and a new kind would need its own lookups in every host.
- **A Dumdict Lemma-removal mutation.** Rejected: a host removes a Lemma for
  its own reasons, often before Dumdict hears of it. The one removal Dumdict
  plans is the cascade of an occurrence's removal (ADR 0043), which decides
  what happens to the Lemma's Readings and Surfaces. The re-evaluation is the
  same either way, so the host requests it.
