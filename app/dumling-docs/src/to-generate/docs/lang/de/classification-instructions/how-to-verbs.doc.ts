import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description:
		"Classification rules for German verb-shaped forms and participles.",
	family: "scope",
	order: 112,
	subject: "how-to-verbs",
	title: "How To Handle Verb-Shaped Forms",
	body: `
A participle is verbal only in a perfect or passive. Every adjectival use is an
adjective linked to its verb.

## Participles

- A Partizip I or II used as an adjective is \`ADJ\`: attributive
  (\`die gekochten Kartoffeln\`), adverbial (\`kam lachend herein\`) or
  predicative after \`sein\` (\`Die Tür ist geschlossen\`). Its Canonical
  Form is the uninflected participle, \`gekocht\` or \`lachend\`, whether
  or not it is lexicalized: \`ein gebildeter Mann\` and \`ein aus Ton
  gebildeter Krug\` are both \`gebildet\`.
- Its Reading's Knowledge names the verb as \`participleSource\`
  (\`gekocht\` from \`kochen\`, \`verliebt\` from \`sich verlieben\`). A
  plain adjective or an \`un-\` form (\`ungelesen\`) has none.
- A participle in a perfect with \`haben\` or \`sein\` (\`hat gekocht\`,
  \`ist gekommen\`) or in a passive with \`werden\`, \`bekommen\`,
  \`kriegen\` or \`erhalten\` (\`wurde gekocht\`) is \`VERB\` with its
  auxiliary. Its Surface has \`verbForm: "Part"\` and \`participleForm\`
  \`Present\` or \`Past\`, with no agreement.
- A participle of an auxiliary Lemma is \`AUX\`.

For \`sein + Partizip II\`, ask whether the simple past says the same.
\`Er ist gekommen\` is \`Er kam\`: a perfect, one \`VERB\` target with
\`ist\`. \`Die Tür ist geschlossen\` is not \`Die Tür schloss\`: the copula
\`VERB\` \`sein\` and a separate \`ADJ\`. Make one decision for the
occurrence so clicks on \`sein\` and the participle cannot disagree.

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
