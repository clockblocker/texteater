import { defineLanguageOverlayPage } from "../../../../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineLanguageOverlayPage({
	description:
		"Classification rules for German verb-shaped forms and participles.",
	family: "scope",
	order: 112,
	subject: "how-to-verbs",
	title: "How To Handle Verb-Shaped Forms",
	body: `
Use the conservative TIGER boundary for German forms that could be verbal,
adjectival, auxiliary, or nominal.

## Participles

- An adjectivally used Partizip I is \`ADJ\`, whether attributive, predicative,
  or adverbial. Its adjective Lemma uses the participial canonical form, such
  as \`lachend\`, rather than the source verb.
- An attributive or adverbial Partizip II is \`ADJ\` when it behaves as an
  adjective. Lexicalized property meanings, adjective-only intensification or
  comparison, \`un-\` formation, and coordination with ordinary adjectives are
  evidence for this analysis.
- A Partizip II in a productive perfect, \`werden\`-passive, \`sein\`-perfect,
  or perfect-passive construction is \`VERB\` and keeps the source verb Lemma.
- A participle of an auxiliary Lemma is \`AUX\`.

For \`sein + Partizip II\`, first ask whether an active or
\`werden\`-passive paraphrase preserves the contextual meaning and verbal
participants. If it does, classify the productive state passive as \`VERB\`
and include the fixed realized auxiliary in the same high-level Analysis
Target. Otherwise, lexicalized or idiomatic property behavior supports
\`ADJ\`, with the copula outside that target. Make one decision for the
occurrence so clicks on the auxiliary and participle cannot disagree.

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
