# tf-demo vision (WIP)

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

Selecting linked language opens a Reading Note preview without losing the
reading position:

![Reading Note preview over a Text](images/obsidian-note-preview.png)

The complete Reading Note combines the selected Reading's Knowledge with its
source encounters and links to related notes:

![Complete Reading Note in the Obsidian prototype](images/obsidian-reading-note.png)

Links inside a note can be previewed in the same way, allowing exploration to
continue without unnecessary navigation:

![A related note previewed from inside a Reading Note](images/obsidian-nested-preview.png)

The intended interaction is therefore one continuous movement between Texts,
previews, and full Reading Notes:

![Early sketch of resolving language and opening stacked note previews](images/reader-note-interaction-sketch.png)

## The language map

Reading Notes are the learner-facing nodes of a network grown through reading.
Source encounters, linguistic structure, and semantic relations connect them.
The learner explores this network but does not curate it by hand.

The map has a known region and a frontier. Resolved Readings are navigable
notes. Unit Shadows point toward useful language not yet resolved into a
Reading. A later encounter can turn part of that frontier into another note.

For now, the learner experiences the map by moving from link to link: from a
Text into a Reading Note, from that note into another note, and back to a
source encounter. Previews make it possible to explore without losing the
current place; opening a link continues the path in a full note.

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
