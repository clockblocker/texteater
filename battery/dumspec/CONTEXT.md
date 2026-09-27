# Dumspec

Dumspec owns all the gold Dumgen is scored against: annotated sentences, with
their Knowledge and Emoji Description gold, raw texts for intake, and the
classification Rules (ADR 0037). Dumgen and the docs site read it; neither
owns it.

## Language

**Spec Record**:
One sentence of the golden corpus with its Segments, its targets and their
notes. A target is a full Dumling Attestation plus the Segment each member
is; it is never only a Family and Kind. A record's path is its identity.
_Avoid_: case, example, gold case, fixture

**Coverage**:
How much of a Spec Record's sentence is annotated. Full means every
ResolvableText Segment is in exactly one target or one No Target entry;
Partial leaves some Segments unannotated. Not to be confused with an Attestation's
Realization Coverage (Dumling).
_Avoid_: completeness

**No Target**:
A ResolvableText Segment with no defensible route, and the authored reason:
unintelligible text, or a suspended-compound fragment without a right
conjunct. It is annotation, not a gap, so it counts toward Full Coverage.
_Avoid_: Unresolved, skipped Segment

**Rule**:
A classification rule written for people: a statement, the ADRs it rests on,
the routes it applies to and the Spec Records that show it, minimal pairs
included. Dumgen's prompts implement Rules and cite them; they do not share
their wording.
_Avoid_: criterion, judgment, prompt paragraph

**Rule Citation**:
A Rule as a record or a Dumgen prompt paragraph cites it: the Rule's id and
the hash of its statement when the record was reviewed or the paragraph last
checked against it. Rewording the Rule makes the citation stale until someone
re-checks the citing text and cites the new hash.

**Review Status**:
Draft or Reviewed. A Reviewed record has been checked by a person against the
ADRs and Rules it cites, and turns stale when one of them is superseded or
changed. A Draft may fail the current Dumling model; a Reviewed record may
not, and a model change that breaks one demotes it to Draft.
_Avoid_: verified, isVerified

**Text Record**:
One raw text as a reader supplies it, before intake makes a Segmented
Sentence of it, and what intake should make of it. Its path is its identity.
_Avoid_: intake item, intake case

**Imported Case**:
A Dumgen case a Spec Record or Text Record keeps as it was, until it is
reshaped into the record's own fields.
_Avoid_: migrated case, fixture

**Worklist**:
The records that need work: Drafts failing a check against the current
Dumling model, and records holding Imported Cases.
_Avoid_: backlog, review queue

**Provenance**:
Where a Spec Record's sentence comes from: Authored for the corpus, or Quoted
from a work with its author and year.
_Avoid_: source, which names the ADRs and Rules a record cites
