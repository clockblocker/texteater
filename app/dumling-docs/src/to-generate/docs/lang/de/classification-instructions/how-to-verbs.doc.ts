import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description:
		"Classification rules for German verb-shaped forms and participles.",
	family: "scope",
	order: 112,
	subject: "how-to-verbs",
	title: "How To Handle Verb-Shaped Forms",
	body: `
A productive participle stays verbal in every use. Only a lexicalized one
becomes an adjective.

## Participles

- A productive Partizip I or II is \`VERB\` whether it is attributive
  (\`die gekochten Kartoffeln\`), adverbial (\`kam lachend herein\`) or part of
  a perfect, passive or state passive. Its Canonical Form is the infinitive:
  \`kochen\`, \`lachen\`.
- Its Surface has \`verbForm: "Part"\` and \`participleForm\` \`Present\` or
  \`Past\`. An attributive participle also carries the \`case\`, \`number\`
  and \`gender\` it agrees in; a predicative or adverbial one leaves them
  null.
- A lexicalized participle is \`ADJ\` with the participial Canonical Form. One
  test is enough: its meaning comes from no sense of the verb (\`spannend\`
  'exciting', \`gebildet\` 'educated'), it takes \`un-\` (\`ungelesen\`), or it
  takes \`sehr\` or comparison (\`sehr gebildet\`, \`spannender\`).
- One spelling can be both: \`ein gebildeter Mann\` is \`ADJ\` \`gebildet\`, while
  \`ein aus Ton gebildeter Krug\` is \`VERB\` \`bilden\`.
- A participle of an auxiliary Lemma is \`AUX\`.

For \`sein + Partizip II\`, a productive state passive (\`Die Tür ist
geschlossen\`) is one \`VERB\` target that includes \`ist\`. A lexicalized
predicate (\`Der Brief ist ungelesen\`) is \`ADJ\`, with the copula outside
that target. Make one decision for the occurrence so clicks on the auxiliary
and participle cannot disagree.

Adverbially used plain adjectives stay \`ADJ\` (\`er läuft schnell\`).

## Auxiliaries And Nominalized Forms

Finite German modals are \`AUX\` with an overt infinitive and \`VERB\` when
they are the main predicate of an elliptical clause. Finite \`werden\` is
\`AUX\` when it marks another verbal form and \`VERB\` when it carries its own
change-of-state meaning.

Substantivized infinitives and participles are \`NOUN\`. Participial form labels
such as P1 and P2 do not introduce standalone Dumling Kinds.
`,
});

export default document;
