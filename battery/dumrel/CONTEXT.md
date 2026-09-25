# Dumrel

Dumrel defines identityless Knowledge and pure operations over it.

## Language

**Reading Knowledge**:
optional linguistic content owned by one exact Reading.
An empty value contains no authored aspects.

**Knowledge Change**:
a Contribute, Correct, or Retract operation on one atomic
aspect or bucket. Omission does not delete an aspect.

**Knowledge Settings**:
enabled or disabled preferences applied to the aspects
applicable to a source route. Omitted preferences are enabled.

**Knowledge Request Mask**:
the applicable, enabled aspects requested for
production. Present leaves carry null; absent leaves are not requested.

**Unit Shadow**:
a target described by Language, Family, Kind and Canonical Form
without choosing a Lemma's Core Features or an exact Reading.

**Pending Semantic Relation**:
a direct relation proposal whose target is a
Unit Shadow awaiting downstream matching.

**Governed Preposition**:
a preposition a Reading lexically selects: a Preposition Slot of the Reading's
Valency Frame, naming an ADP Lemma and the case it assigns in that
construction (`warten`: `auf` + Acc). An adjunct the sentence happens to
contain is not one.
_Avoid_: govPrep, prepositional object, valency note

**Governor**:
the Reading whose Valency Frame holds a Governed Preposition. The
preposition's side of the link is projected, never stored.
_Avoid_: governing verb (adjectives, nouns and Phrasemes govern too)
