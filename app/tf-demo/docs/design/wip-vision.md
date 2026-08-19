# tf-demo vision (WIP)

Core wayfinder: [#159: tf-demo linked Notes and source-context navigation](https://github.com/clockblocker/texteater/issues/159)

tf-demo is the proper implementation of an idea first explored in Obsidian:

> A learner builds a map of a language from the language they actually
> encounter.

The product starts with reading, not with a prebuilt dictionary. The learner
moves through Texts, resolves unfamiliar language in context, and creates or
reuses linked Reading Notes. The dictionary and language map emerge from those
encounters.

```text
Read -> encounter -> resolve -> create or reuse a Reading Note
     -> explore -> return to reading
```

## Core experience

Texts remain continuous reading material rather than becoming worksheets.
Resolvable language is interactive in place, as in the original prototype:

![Obsidian prototype with linked language in a Text](images/obsidian-linked-text.png)

The Obsidian prototype opened a Reading Note preview without losing the reading
position:

![Reading Note preview over a Text](images/obsidian-note-preview.png)

The complete Reading Note combines the selected Reading's Knowledge with its
source encounters and links to related notes:

![Complete Reading Note in the Obsidian prototype](images/obsidian-reading-note.png)

It also allowed links inside a note to open nested previews:

![A related note previewed from inside a Reading Note](images/obsidian-nested-preview.png)

The sketches also explored stacked Notes that reveal more content as resolution
progresses:

![Early sketch of resolving language and opening stacked note previews](images/reader-note-interaction-sketch.png)

The first tf-demo implementation keeps the linked-note model while using a
simpler navigation rule: every link switches the current view to its target.
This applies uniformly to Texts, Unit Reading Notes, Route Notes, Shadow Notes,
and source encounters. Preview-on-hover, nested preview stacks, split views, and
other alternatives are deferred until the direct-navigation demo is working.

### Progressive Note resolution

Selecting a Segment switches immediately to a note-shaped resolution view. The
learner does not wait on a blank Text while the entire model pipeline finishes.
Known or cached content appears immediately, unresolved sections show a loading
state, and each section becomes usable as its result arrives:

```text
Segment selected
    -> target Note view opens
    -> available Route content appears
    -> Unit Reading identity appears
    -> Knowledge appears
    -> resolved and Shadow links appear
```

The same view represents the Note throughout this progression; loading,
partial, and complete results are states of one Note rather than separate
screens. The exact content hierarchy and Family-specific presentation are
deferred.

### Segment states

Interactive Segments use `#4d8ce6` as their single initial accent color.
Differences in opacity distinguish available, selected, resolving, and resolved
states, including every member Segment of one occurrence. Returning from a Note
to a Source Context highlights every member Segment with a one-shot emphasis
animation so the learner can reacquire the occurrence. Exact opacity values,
animation timing and easing, secondary colors, and other visual polish are
deferred.

## View inventory and navigation contract

The first demo has five learner-facing view families. These route shapes are the
initial interface; app-owned database IDs keep large linguistic fingerprints out
of URLs.

| View | Initial route shape | Primary entry | Main outgoing links |
| --- | --- | --- | --- |
| Library | `/library` | App entry | Texts |
| Text | `/text/:textId` | Library or Source Context | Unit Reading Notes; optional Route Notes |
| Unit Reading Note | `/note/reading/:readingId` | Resolved Segment or another Note | Source Contexts, related Unit Reading Notes, Route Notes, Shadow Notes |
| Route Note | `/note/route/:kind/:id` | Shortcut/settings-enabled drill-down | Adjacent Route Notes and reached Unit Reading Notes |
| Shadow Note | `/note/shadow/:shadowId` | Unresolved relation or structure link | Referring Unit Reading Notes and any resolved targets |

Every link replaces the current view with its target. Browser history remains the
way back. Resolution before a `readingId` exists is a transient state of the same
note-shaped view, not a sixth note kind; its canonical Unit Reading Note route
becomes available when the Reading is committed. The exact transient URL is
deferred until the resolution orchestration is designed.

### Return to a Source Context

A Unit Reading Note accumulates Source Contexts as new Occurrence Attestations
resolve to that Reading. Each context shows the occurrence in its surrounding
Sentence and is clickable. Its initial deep-link shape is:

```text
/text/:textId?at=:attestationId
```

The app-owned `attestationId` identifies the exact source occurrence. At the
destination, the Text view verifies that its Sentence belongs to the requested
Text, then derives the Sentence anchor and every member Segment index from the
Occurrence Attestation. Sentence and Segment coordinates remain rendering data;
they do not duplicate occurrence identity in the URL.

Opening this link must:

1. switch the current view to the originating Text;
2. scroll after layout so the target Source Context is centered in the viewport;
3. apply the focus highlight to every member Segment, including discontinuous
   members; and
4. run a one-shot emphasis animation over the highlighted members.

The locator stays in the URL so reload, browser history, and copied links preserve
the focused position. If analysis stripping has made the Occurrence Attestation
unavailable, the Text still opens and reports that the Source Context is no
longer available rather than resolving a Segment again implicitly. This also
prevents a stale link from silently targeting a new occurrence later created at
the same sentence and Segment coordinates.

## Note kinds

### Unit Reading Note

```text
Note<UnitReading>
└── UnitReading
    ├── Lexeme
    ├── Phraseme
    └── Morpheme
```

The Unit Reading Note is the primary note kind and concentrates almost all of
the learner-facing value. Its subject is a Reading whose Lemma Family is
Lexeme, Phraseme, or Morpheme: the point at which grammatical identity and one
semantic identity meet.

All three Families use the same kind of note. Their grammatical shape changes
which Knowledge and structure the note emphasizes, but does not create three
parallel note systems.

The note also accumulates one Source Context for every surviving Occurrence
Attestation that points to the Reading. These are navigable evidence of where the
learner encountered the Reading, not part of Reading identity. Following one
returns to the exact Text location under the return-to-source contract above.

A Unit Shadow whose Family is Lexeme, Phraseme, or Morpheme can eventually
resolve to a Unit Reading and become a navigable Unit Reading Note. In current
Morphological Trees, lexical leaves are Unit Shadows while Morpheme leaves are
already represented by Morpheme Readings. Construction is deliberately not
included in Unit Reading; its note projection remains to be decided.

### Route Note

```text
RouteNote
├── Note<OccurrenceAttestation>
├── Note<Surface>
└── Note<Lemma>
```

Route Notes expose how one contextual encounter reached a Unit Reading:

```text
Text / Segment
    -> Occurrence Attestation
    -> Surface
    -> Lemma
    -> Unit Reading
```

They are optional drill-down views rather than part of the default reading
flow. A learner may enable them in settings or request them with a shortcut
while selecting a Segment or following a note link.

The Lemma Route Note connects every Unit Reading that shares one grammatical
identity. A learner can use it to move among polysemous or grammatically
indistinguishable homonymous Readings. Surface and Lemma Route Notes may also
expose same-form links derived from distinct grammatical identities. Those
links are for navigation; they are not Semantic Relations.

### Shadow Note

A Shadow Note makes the unresolved frontier navigable before one exact Reading
has been identified. It presents the Unit Shadow's Canonical Form, Family, and
Kind together with every pending semantic relation and structural reference
that points to it.

The Unit Shadow owns none of those references. tf-demo may give the stored
Shadow Note projection an application-owned `shadowId`, and opening it must be
able to retrieve all related references through bounded indexed lookups. That
ID supports navigation and retrieval only; it does not give the underlying Unit
Shadow linguistic identity or turn it into a provisional Reading.

Equal-looking references collected by one Shadow Note may eventually resolve
to different Unit Readings. Resolution therefore replaces each pending
reference independently rather than converting the Shadow Note wholesale into
one Unit Reading Note.

## Implementation wayfinder

The database exists to preserve expensive analysis and resolution results so
that later Visitors can reuse them. It should retain the most precise current
result of that work, not every superseded intermediate representation as an
active fact.

This wayfinder moves the current vertical slice into the linked-note product
without replacing the accepted linguistic core or weakening the atomic
occurrence commit.

### Definition of done

The first linked-note demo is complete when a learner can:

1. open a stored Text from the Library;
2. select an unfamiliar Segment and immediately enter a progressively populated
   note-shaped resolution view;
3. arrive at the canonical Unit Reading Note after resolution;
4. follow resolved and Shadow links from that Note into other Notes;
5. inspect the optional Attestation, Surface, and Lemma Route Notes;
6. see every surviving Source Context accumulated by the Unit Reading Note; and
7. follow a Source Context back to its Text, centered and animated with every
   occurrence member highlighted.

Every active destination is directly addressable and survives reload. Browser
history supports return navigation. A graph view, preview stacks, split views,
Family-specific layouts, and visual refinement beyond the `#4d8ce6` state system
are not required for this milestone.

### Current implementation position

The current app already supplies most of the expensive and correctness-sensitive
foundation:

- `/library` and `/text/:textId` routes;
- immutable Text, Sentence, and Segment source material;
- canonical Lemma, Surface, Reading, and Occurrence Attestation records;
- exclusive Segment membership and an atomic first-valid occurrence commit;
- shared Reading and Lemma Knowledge;
- resolved and pending Semantic Relations; and
- presentation projections for the most recent resolved Visitor Click and one
  Reading selected by `readingKey`.

The current UI is still one Text workspace. It invokes one blocking
`resolveSegment` action, finds the latest resolved Click for the Visitor, and
renders the resolution path and Reading graph inline below the Text. It does not
yet have route-addressable Notes, Reading-to-Source-Context projection, focused
Text navigation, progressive server state, Route Notes, or indexed Shadow Notes.

The target flow is:

```text
route target
    -> presentation query
    -> one current View

Segment click
    -> begin Resolution Session
    -> /resolve/:requestId
    -> reactive partial Note projection
    -> atomic canonical commit
    -> replace route with /note/reading/:readingId

Note link
    -> canonical Note target
    -> switch current View

Source Context link
    -> /text/:textId?at=:attestationId
    -> centered and animated occurrence
```

### Target modules and interfaces

The implementation should concentrate joins, validation, navigation encoding,
and progressive orchestration behind four modules. Callers should not assemble
linguistic records or reconstruct occurrence membership themselves.

#### Navigation module

The Navigation module owns route construction and parsing:

```text
NavigationTarget
├── Library
├── Text { textId, focusAttestationId? }
├── UnitReadingNote { readingId }
├── RouteNote { routeKind, id }
├── ShadowNote { shadowId }
└── Resolution { requestId }       # transient; not a Note kind

hrefFor(target) -> URL
targetFromLocation(location) -> NavigationTarget | NotFound
```

All learner-facing links receive a `NavigationTarget`; view code does not build
URL strings ad hoc. Parsing rejects mismatched Route Note kinds and malformed
IDs. The `Resolution` target renders through the same Note frame but becomes a
canonical Unit Reading Note target after commit.

#### Presentation module

The Presentation module is the only read seam used by routed views:

```text
getTextView({ textId, focusAttestationId? })
    -> TextView | null

getNote({ target, contextCursor? })
    -> UnitReadingNote
     | RouteNote<Attestation | Surface | Lemma>
     | ShadowNote
     | ResolutionNote
     | null
```

`getTextView` returns ordered Sentences and Segments, their current interaction
states, and an optional validated focused occurrence. When focus is requested,
the module verifies that the Occurrence Attestation belongs to the Text and
returns its Sentence ID and complete ordered member-index set.

`getNote` returns a discriminated note projection, already containing typed
`NavigationTarget`s for every outgoing link. A Unit Reading Note includes the
first page of Source Contexts and a cursor for further pages. The UI never joins
Readings to Lemmas, expands occurrence membership, interprets raw Knowledge, or
decides whether a relation target is resolved or a Shadow.

The existing `presentation.forVisitor` latest-Click query should disappear from
the routed UI. Presentation becomes target-driven: Text routes ask for one Text,
Note routes ask for one Note, and resolution routes ask for one request.

#### Resolution Session module

Progressive Notes require an operational Resolution Session around the existing
linguistic orchestrator:

```text
beginResolution({ requestId, visitorId, sentenceId, clickedSegmentIndex })
    -> { requestId }

getNote({ target: Resolution { requestId } })
    -> current ResolutionNote projection
```

`beginResolution` validates and records the request, schedules the expensive
work, and returns immediately. The client navigates to `/resolve/:requestId` and
reactively reads its Resolution Note. Repeating the same request ID reuses the
same session and the existing Click idempotency rules.

The session exposes only learner-safe projections of completed stages:

```text
Starting
    -> RouteAvailable       # Text, Sentence, selected Segment
    -> GrammarAvailable     # members, Attestation, Surface, Lemma
    -> ReadingAvailable     # selected or proposed Unit Reading identity
    -> Committing
    -> Complete { readingId, attestationId }
     | Unresolved
     | Failed
```

These stages describe execution, not new linguistic entities. Draft stage data
is scoped to the request and must never appear in the Shared Demo Dictionary or
power reuse before the final commit. The existing atomic mutation remains the
only operation that publishes dictionary changes, the Occurrence Attestation,
Segment memberships, and the Click together. Membership or dictionary conflicts
replace provisional data with the canonical winner or an explicit failure.

On `Complete`, the client uses replace-navigation to the canonical Unit Reading
Note route. Back therefore returns to the source Text rather than to a completed
transient session.

#### Shadow projection module

The Shadow projection module hides descriptor interning and reference indexes:

```text
syncPendingShadowReference(exactPendingRecord)
syncStructuralShadowReferences(ownerReadingKey, knowledge)
removeShadowReference(exactLocator)
getShadowNote(shadowId)
    -> descriptor
    -> pending semantic references
    -> structural references
    -> null when no active references remain
```

The write operations stay internal to the atomic Dumdict and Knowledge
persistence paths. Only `getShadowNote` participates in the UI read interface.
The module owns bounded indexed lookup, active-versus-dormant status, and exact
reference removal; the Unit Shadow still owns no relations and gains no
linguistic identity.

### View projections

#### Text view

The Text projection contains:

- Text identity and source text;
- ordered Sentences and Segments;
- each Segment's resolvability and optional Attestation Membership;
- the selected/resolving state associated with the active Resolution Session;
  and
- an optional focused occurrence with its Sentence and all member indices.

The route, not Visitor-global latest-click state, determines focus. After the
focused Sentence is laid out, the view scrolls it to the viewport center and
starts the one-shot animation on all members. Discontinuous members remain one
visual focus group.

#### Unit Reading Note projection

The first generic layout contains, without yet varying by Family:

1. Reading identity: Emoji Description plus Canonical Form;
2. Lemma summary: Family, Kind, and Core Features, linked to its Route Note;
3. Reading and Lemma Knowledge already available;
4. structural links, each resolved to a Unit Reading Note or unresolved to a
   Shadow Note;
5. Semantic Relations, likewise resolved or Shadow-backed; and
6. a paginated Source Context list.

Each Source Context contains the `attestationId`, `textId`, sentence position,
renderable sentence snippet, ordered member indices, and the Text
`NavigationTarget`. Contexts are ordered newest occurrence first, use
Occurrence Attestation identity for deduplication, and disappear only when their
source analysis is stripped. They are shared source evidence, not Visitor-owned
history.

#### Route Note projections

The three Route Note projections expose only the useful adjacent steps:

| Route Note | Contents | Outgoing targets |
| --- | --- | --- |
| Occurrence Attestation | source snippet, ordered members, orthography, realization coverage | Source Context, Surface Route Note, reached Unit Reading Note |
| Surface | normalized form, spelling and Surface kind, Surface and inflectional features, source occurrences | Lemma Route Note, Attestation Route Notes, same-written-form Surface Route Notes |
| Lemma | Canonical Form, Family, Kind, Core Features, known Surfaces | every Unit Reading for the Lemma, Surface Route Notes, same-form Lemma Route Notes |

Route Notes remain hidden from the default path until enabled by settings or a
selection modifier. Enabling them changes link targets, not the stored graph.

#### Shadow Note projection

A Shadow Note contains:

- the interned Unit Shadow descriptor;
- pending Semantic Relation references grouped by their source Unit Reading;
- structural references grouped by owning Unit Reading and Knowledge aspect;
- links back to every referring Unit Reading Note; and
- candidate Unit Reading Notes, when Dumdict inspection finds matching Lemmas.

The initial Note is navigational and read-only. Pending Semantic Relation
cleanup requires explicit selection of one exact reference and one Dumdict
candidate Reading; Dumdict never auto-fans-out. The concrete selection control
can be added after the direct-navigation demo, without changing Shadow storage.

### Database adaptations

#### Current storage to note capabilities

| Note capability | Current source | Adaptation |
| --- | --- | --- |
| Unit Reading Note identity | `readings` joined to `lemmas` | Already present. |
| Unit Reading Note Knowledge | `accumulatedKnowledge` for the Reading and Lemma | Already present; add complete note projections. |
| Source Contexts | `attestations.by_reading_id`, Segment memberships, Sentences, and Texts | Add a paginated Reading-to-Source-Context projection and a focused-occurrence projection for the Text view. |
| Attestation Route Note | `attestations` plus `segments.by_attestation_id` | No schema change required. |
| Surface Route Note | `surfaces` plus `attestations.by_surface_id` | No schema change required. |
| Lemma Route Note | `lemmas`, `surfaces.by_lemma_id`, and `readings.by_lemma_id` | No schema change required. |
| Same-written-form travel | Lemma and Surface fields exist, but have no matching indexes | Add indexes by `(language, canonicalForm)` and `(language, normalizedSurface)`. |
| Pending semantic Shadow references | `pendingSemanticRelations` | Associate each row with a stored Shadow and index by `shadowId`. |
| Structural Shadow references | Unit Shadows embedded inside `accumulatedKnowledge` | Project them into indexed reference rows whenever Knowledge changes. |
| Progressive resolution | One blocking action plus final `visitorClicks` record | Add operational `resolutionSessions` keyed by request ID; canonical results still publish through the existing atomic commit. |

#### Resolution Session storage

```text
resolutionSessions
├── requestId
├── visitorId
├── sentenceId
├── clickedSegmentIndex
├── stage
├── learner-safe stage projection
├── optional terminal readingId
├── optional terminal attestationId
├── optional failure
└── updatedAt
```

The table is operational state, not language Knowledge and not a replacement for
Click history. It is indexed by `requestId`; beginning an existing request is
idempotent. Its `visitorId` is delivery data needed to commit the eventual Click;
it does not scope any canonical linguistic result or create Visitor-owned
dictionary state. Terminal rows may be removed by demo reset or an age-based
cleanup policy after their canonical target exists. Removing them never removes
the Click, occurrence, Reading, or Knowledge.

#### Target Shadow storage

```text
shadows
├── shadowId
├── shadowKey
├── language
├── canonicalForm
├── Family
└── Kind

pendingSemanticRelations
├── shadowId
├── sourceReadingKey
├── relation
└── exact pending locator

structuralShadowReferences
├── shadowId
├── ownerReadingKey
├── Knowledge aspect
└── exact structural location
```

`shadowKey` is the stable fingerprint of the normalized Unit Shadow descriptor.
The `shadows` row interns that descriptor and supplies stable application
navigation. It does not assert that equal descriptors identify one Lemma or
Reading.

Pending Semantic Relations remain their own durable Dumdict records.
Structural reference rows are an indexed projection of the authoritative
Morphological Tree or Lexical Breakdown stored in Reading Knowledge. The
projection must be updated atomically with its owning Knowledge so it cannot
drift.

#### Shadow lifecycle

```text
generated reference
    -> reuse or insert shadows row
    -> insert exact reference indexed by shadowId
    -> Shadow Note becomes active

reference resolves
    -> write the precise Reading pointer or Semantic Relation
    -> remove that exact Shadow reference
    -> keep unrelated references

last reference resolves
    -> Shadow Note becomes inactive
    -> keep the dormant shadows row for stable reuse

same descriptor appears later
    -> attach the new reference to the existing shadows row
    -> Shadow Note becomes active again
```

A full demo reset removes dormant Shadow rows. Otherwise they remain reusable;
optional age-based garbage collection is an operational policy and has no
linguistic meaning.

#### Migration order

Convex schema changes should use an optional-first transition:

1. add `resolutionSessions`, `shadows`, and `structuralShadowReferences` plus
   their indexes;
2. add optional `shadowId` to `pendingSemanticRelations` and teach every new
   write to intern and attach its Shadow;
3. backfill pending rows from their existing target descriptors;
4. scan accumulated Reading Knowledge and build structural reference rows;
5. verify every active reference reaches one descriptor-compatible Shadow;
6. switch Note reads to the new projections; and
7. make `shadowId` required once no legacy pending rows remain.

The backfill is deterministic because both pending relations and structural
Knowledge already contain complete Unit Shadow descriptors. Full demo reset is a
fallback for invalid legacy data, not the default migration strategy.

Analysis stripping must delete Source Context occurrences, structural references
owned by removed Readings, pending references removed with those Readings, and
affected operational sessions. Dormant Shadow rows remain reusable. Full demo
reset removes all Shadow and Resolution Session rows.

#### Open model dependency

Pending Semantic Relations already support the complete transition from Unit
Shadow to direct Reading relation: resolution writes the forward and inverse
edges and deletes the exact pending record.

Structural Shadows do not yet have the same transition. The current Dumrel
Morphological Tree permits resolved Morpheme Readings or lexical Unit Shadows,
and Lexical Breakdown permits only Lexeme Unit Shadows. Replacing a lexical
Shadow with a Lexeme or Phraseme Reading therefore requires a deliberate Dumrel
DTO decision before the database can persist that resolved structural state.

This does not block displaying or navigating structural Shadow Notes. It blocks
only replacing a lexical structural reference with a resolved Lexeme or
Phraseme Reading pointer.

### Delivery sequence

Each slice ends in a usable vertical path and keeps later choices reversible.

#### Slice 1: [Routed Note foundation (#160)](https://github.com/clockblocker/texteater/issues/160)

- extract the current Library and Text workspaces into routed view modules;
- add the Navigation module and canonical Note routes;
- change Reading presentation lookup from `readingKey` to app-owned `readingId`;
- add `getTextView` and the Unit Reading branch of `getNote`; and
- render the existing generic Reading content as a full current view.

Checkpoint: a stored Reading URL reloads directly, resolved Semantic Relation
links switch between Unit Reading Notes, and browser Back works.

#### Slice 2: [Source Context round trip (#161)](https://github.com/clockblocker/texteater/issues/161)

- project paginated Source Contexts from `attestations.by_reading_id`;
- render context snippets in Unit Reading Notes;
- support `/text/:textId?at=:attestationId` in `getTextView`; and
- implement centering, full-membership highlighting, and the one-shot animation.

Checkpoint: one Reading encountered in two Texts shows two contexts; either link
returns to the correct Text and highlights all and only that occurrence's
members.

#### Slice 3: [Progressive Resolution Note (#162)](https://github.com/clockblocker/texteater/issues/162)

- add `resolutionSessions` and the `/resolve/:requestId` route;
- replace the public blocking click interaction with immediate
  `beginResolution` plus scheduled orchestration;
- report route, grammar, Reading, committing, and terminal projections;
- keep the current atomic `persistResolvedClick` transaction unchanged as the
  publication point; and
- replace-navigate to the Unit Reading Note on completion.

Checkpoint: an uncached click immediately opens a Note frame, fills sections as
stages finish, and ends at a reloadable canonical Note. A cached occurrence
reaches the same destination without model work.

#### Slice 4: [Indexed Shadow Notes (#163)](https://github.com/clockblocker/texteater/issues/163)

- add and migrate Shadow storage;
- attach pending Semantic Relations to interned Shadows;
- project structural references from accumulated Knowledge atomically;
- add the Shadow branch of `getNote`; and
- make every unresolved relation or structure link navigate to its Shadow Note.

Checkpoint: one Shadow aggregates all current incoming references; resolving or
removing one exact reference leaves the others; its row becomes dormant after
the last reference and is reused when the descriptor appears again.

#### Slice 5: [Route Notes (#164)](https://github.com/clockblocker/texteater/issues/164)

- add Attestation, Surface, and Lemma branches of `getNote`;
- add the same-written-form indexes;
- add a setting and selection modifier that expose Route targets; and
- keep the ordinary Segment-to-Unit-Reading path unchanged when drill-down is
  disabled.

Checkpoint: the learner can traverse Attestation → Surface → Lemma → every Unit
Reading for that Lemma and can cross to distinct same-form grammatical nodes.

#### Slice 6: [Shadow reference resolution (#165)](https://github.com/clockblocker/texteater/issues/165)

- wire tf-demo's currently unimplemented Dumdict relation-cleanup storage
  interfaces;
- expose matching candidate Unit Reading Notes on the Shadow Note;
- add an explicit per-reference candidate selection and conflict refresh; and
- after the Dumrel DTO decision, support the equivalent exact replacement for
  lexical structural references.

Checkpoint: semantic cleanup writes forward and inverse relations and deletes
only the chosen pending record. A stale selection reports a conflict and does
not partially write. Structural replacement remains gated until the Dumrel
contract exists.

### Acceptance scenarios

The complete wayfinder is verified by these product stories:

1. **First encounter:** an unresolved Segment opens a progressive Note and ends
   at a Unit Reading Note with its new Source Context.
2. **Occurrence reuse:** clicking any member of an already committed occurrence
   skips model work and opens the same Unit Reading Note.
3. **Cross-Text accumulation:** occurrences in different Texts that resolve to
   the same Reading appear as distinct Source Contexts on one Note.
4. **Discontinuous occurrence:** returning to a multi-member discontinuous
   occurrence centers its Sentence and animates every member, not intervening
   Segments.
5. **Direct relation travel:** a resolved Semantic Relation switches to its
   target Unit Reading Note and Back returns to the source Note.
6. **Shadow travel:** an unresolved semantic or structural link switches to one
   Shadow Note containing all indexed incoming references.
7. **Independent Shadow resolution:** two equal-looking references may resolve
   to different Unit Readings without converting the Shadow wholesale.
8. **Lemma travel:** a Lemma Route Note exposes all polysemous or grammatically
   indistinguishable homonymous Readings sharing that Lemma.
9. **Same-form travel:** same-written-form navigation can cross distinct Lemmas
   without creating a Semantic Relation.
10. **Stale Source Context:** after analysis stripping, an old focused Text URL
    opens the Text and reports the missing context without starting resolution.
11. **Conflict safety:** concurrent overlapping proposals still publish only the
    first valid occurrence; progressive state converges on the winner.
12. **Deep-link durability:** every Text, Unit Reading Note, Route Note, active
    Shadow Note, and active Resolution Session has defined reload and not-found
    behavior.

### Verification gates

Each slice should add tests at the module interface it introduces:

- pure route encode/decode tests for every `NavigationTarget`;
- presentation tests for note discrimination, bounded Source Context paging,
  focused membership, and no raw Knowledge leakage;
- orchestration tests for stage order, idempotent begin, cached reuse, conflict
  convergence, failure, and canonical replace target;
- storage tests for descriptor interning, exact reference removal, dormancy,
  reactivation, backfill, stripping, and reset; and
- rendered-flow checks for direct navigation, scroll centering, multi-member
  highlighting, animation replay, and browser history.

The package gate remains:

```text
bun --cwd app/tf-demo test
bun --cwd app/tf-demo check
bun --cwd app/tf-demo lint
bun --cwd app/tf-demo build
```

### Explicitly deferred

- graph visualization;
- preview-on-hover, nested stacks, and split views;
- Family-specific Unit Reading Note layouts;
- final opacity values, animation timing, and visual polish;
- automatic Semantic Relation cleanup without explicit candidate selection; and
- resolved lexical structural references until Dumrel accepts resolved
  Lexeme/Phraseme Reading pointers in those structures.

## The language map

Reading Notes are the learner-facing nodes of a network grown through reading.
Source encounters, linguistic structure, and semantic relations connect them.
The learner explores this network but does not curate it by hand.

The map has a known region and a frontier. Resolved Readings are navigable
notes. Unit Shadows point toward useful language not yet resolved into a
Reading. A later encounter can turn part of that frontier into another note.

For now, the learner experiences the map by moving from link to link: from a
Text into a Reading Note, from that note into another note, and back to a source
encounter. Every link switches the current view to its target; alternative
preview and multi-view behavior is deferred.

The map is the network made tangible through this navigation, not a separate
destination. A graph visualization is out of scope for tf-demo.

## What the linguistic core changes

Obsidian bundled every connection into a generic note link. tf-demo preserves
the fluid linked experience while giving each connection a formal meaning:

```text
Text -> Sentence -> Segment

Occurrence Attestation -> Surface -> Lemma
Occurrence Attestation -> Reading -> Lemma
Reading -> Knowledge
Reading --Semantic Relation--> Reading
```

An encounter is distinct from its Surface; a grammatical Lemma is distinct
from a semantic Reading; source encounters are not semantic relations;
Translations are literal Knowledge; morphology and lexical breakdown are
structured; and a Unit Shadow is a frontier pointer rather than a half-created
note.

The interface uses these distinctions to behave correctly without making the
learner operate the linguistic machinery.

## tf-demo scope

- hosted shared-service model only;
- German (`de`) target language only;
- English (`en`) translation language only;
- no authentication or payments.

Reading Notes and Knowledge belong to the Shared Demo Dictionary. A Visitor
owns only Click history, so their growing language map is a projection of their
resolved encounters over the shared linguistic network.
