Build a useful tool for motivated language learners.

The core value proposition is: learners build their own dictionary from the
language they actually encounter.

Accepted text is replaced by an immutable, forgiving Segmented Sentence.
Malformed but intelligible material may remain as written, and locally
unintelligible material may remain as `OpaqueText`. Every Segment is indexed;
for now, only `ResolvableText` is clickable.

When a learner clicks `up` in `I got up at 4:00 am`, we:

- create a Selection identified by the Segmented Sentence and clicked index;
- resolve the participating Segments to the contextual Surface `got up`;
- resolve that Surface to the Lemma whose Canonical Form is `get up`;
- reuse or create the learner-owned Reading `⏰ get up`; and
- attach the attestation to that Reading in the learner's dictionary.

The reusable grammatical Lemma and Surface may be shared, while Selections,
Readings, and their attestations remain learner- or context-owned as
appropriate.

We deliberately avoid an “all possible meanings” infodump. When a learner
clicks `chairs` in `We have 4 chairs in our kitchen`, the chain may resolve:

`Selection(chairs) → Surface(chairs) → Lemma(chair) → Reading(🪑 chair)`

The leadership Reading `👨🏻‍💼 chair` need not exist in that learner's
dictionary until they encounter a context such as `The chair called the
meeting to order.` Both learner Readings can refer to the same Lemma.

---

The tool should be language-agnostic and extensible with arbitrary linguistic
relations, including semantic and morphological relations. Universal
Dependencies is the starting point for the grammatical feature vocabulary, not
an identity authority.

---

Standalone linguistic entities are first-class. A click should produce the
largest defensible learner-facing gain while retaining the structure needed to
drill down later.

For example, clicking `heulte` in
`Obwohl er anderer Meinung war, heulte er mit` user-provided text will resolve to:
the idiom `mit den Wölfen heulen`, with Reading `🐺🗣️🤝`.

When in the dictonary note for the `mit den Wölfen heulen` user click on `heulen`, we will resolve to:
the verb `heulen`

When in the dictonary note for the `heulen` user click on `heul`, we will resolve to:
the morpheme root `heul`

This is how we do the drilldown to the atoms, while keeping all in one system.

---

UD is a base for our feature sets and avaliale POSes for lang

wordnet is a base for our relations