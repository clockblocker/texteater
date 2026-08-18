---
status: accepted
partially-supersedes: 0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md
refines: "texteater#138"
---

# Make Reading a foundational Dumling value

Dumling owns the foundational `Reading` DTO, schema, value equality, and stable
identity operation. A Reading remains exactly one Lemma plus one Emoji
Description, and equality remains the pair `(Lemma, emojiDescription)` within
one dictionary scope. This supersedes ADR 0002 only where it kept the Reading
DTO and identity operation outside Dumling; it preserves ADR 0002's semantic
identity and no-splitting-semantic-pennies policy.

Dumdict continues to establish learner or hosted-dictionary scope and owns
`ReadingEntry`, Reading Knowledge, candidate lookup, planning, persistence
workflows, and reconciliation. Moving the value contract does not make Dumling
a dictionary, repository, or owner of learner data. In tf-demo's hosted
shared-service mode the Shared Demo Dictionary is the one scope, so its
derived Reading identity key is globally indexed inside that demo. This
decision does not define local-to-hosted reconciliation; issue #117 owns it.

The canonical Emoji Description is a compact sequence of one to four RGI emoji
graphemes. Legacy v0 Dumdict values that contain prose or longer sequences are
not silently coerced because that would invent semantic identity. The v0→v1
migration reports those Readings through `DumdictV0MigrationError`; operators
must explicitly remap them to a valid Emoji Description or reset the affected
demo dictionary before retrying migration.

Reading remains a separate node from grammatical Attestation:

```text
Attestation -> Surface -> Lemma
Reading ----------------> Lemma
```

The public Dumling Attestation DTO therefore does not contain a Reading or a
Reading ID. Grammatical Resolution can produce Attestation, Surface, and Lemma
before Reading Resolution selects a Reading. A host may persist canonical
Reading records under database IDs, but those IDs belong to the host and do
not enter the foundational Reading DTO or its dictionary-scoped equality.

This refines #138 by placing the stable Reading identity operation beside the
value and schema it identifies, rather than exporting a Dumdict-private key.
