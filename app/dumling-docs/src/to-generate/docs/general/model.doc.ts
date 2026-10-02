import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

export default defineGeneratedDocPage({
	title: "Model",
	order: 20,
	description: "Dumling units and grammatical evidence.",
	body: `
Dumling has four tagged units. A Lemma identifies grammar, a Reading pairs a
Lemma with an Emoji Description, a Surface describes a realization, and an
Attestation records occurrence evidence.

## Lemma

<!-- DOC_BLOCK:core-lemma -->

A Lemma has \`unitKind: "Lemma"\`, \`language\`, \`family\`, \`kind\`, \`canonicalForm\`,
and \`coreFeatures\`. These fields distinguish grammatical identities.
Homonyms that agree in all these fields share one Lemma, even when their
plurals differ (\`Mutter\`: \`Mütter\`, \`Muttern\`). Their Readings have different
Emoji Descriptions.

## Surface

<!-- DOC_BLOCK:core-surface -->

A Surface has \`unitKind: "Surface"\`, its Lemma, \`language\`, \`normalizedSurface\`,
\`spelling\`, and \`surfaceFeatures\`. Routes that represent inflection also have
nullable \`inflectionalFeatures\`. A marked feature bag contains at least one
non-null value; null means no marked features were supplied.

\`checkIfGrundform(surface)\` assesses canonical realization from spelling and
grammar. It returns a boolean on success or an assessment error when evidence
is missing, ambiguous, or unrepresentable. Matching spelling alone does not
establish Grundform. For example, English past-tense *read* has the same spelling
as its infinitive.

Whether a feature is Core or inflectional is chosen per language, Family and
Kind. English PRON and the German pillars (personal pronouns, the \`der\` and
\`ein\` articles, the \`der\`-series pronouns) put case, number and gender in
Lemma identity, so each paradigm cell is its own Lemma: German \`mich\` and
\`mir\`, \`dem\` and \`den\`, English \`me\` and \`my\`. A German word that puts
another paradigm's endings on its own stem, such as \`dieser\`, \`mein\` or
\`jemand\`, is one Lemma whose Surfaces carry case, number and gender:
\`diesem\` is a Surface of \`dieser\`. \`wer\` and \`was\` are stems too
(\`wem\` is a Surface of \`wer\`), but their gender is inherent, as a noun's
is: it sits in Core, Masc and Neut, and their Surfaces carry case only. German
contextual reflexiveness belongs to the Surface's inflectional features; English
\`myself\` is its own Lemma.

## Reading

A Reading has \`unitKind: "Reading"\`, a \`lemma\`, and an \`emojiDescription\` of
one to four emoji graphemes. A Foreign Lemma's one Reading has no
\`emojiDescription\`: the Lemma alone identifies it. Dictionary scope, persistence and identity keys
belong to consumers.

## Syncretism

A Syncretism is a Lemma for one spelling that realizes two or more Lemmas of
one route that only the referent tells apart, such as German \`ihm\`, the
dative of \`er\` and of \`es\`. It is the Lemma with two more fields:
\`syncretized\`, its units by value in identity order, and \`syncretic\`, the
Core Features they disagree on, in alphabetical order. Its Core keeps the
values they agree on and is null for the listed features. Without
\`syncretized\` it is still a valid Lemma: the view a classifier answers, with
the same identity, a Lemma's plus the \`syncretic\` list. A route accepts
Syncretisms only where its schema allows them; German PRON does.

## Attestation

<!-- DOC_BLOCK:core-attestation -->

An Attestation has \`unitKind: "Attestation"\`, a Surface, a non-empty ordered
\`members\` tuple, and \`realizationCoverage: "Full" | "Partial"\`. Each member
records exact \`attested\` text and \`orthography: "Standard" | "Typo" |
"Shorthand" | "Fused"\`. A \`Fused\` member is one piece of a fused word; it
also carries the \`fusion\` it belongs to and the index of the \`component\` it
realizes. German and English Attestations of a Head that can open a phrase
(NOUN, PROPN, ADJ, NUM, PRON), and Hebrew noun, proper-noun and adjective
Attestations, carry \`articleEvidence\`: an \`Owned\` article member, a
\`Shared\` article, a \`Hidden\` Fusion component, or \`null\` when the Head
has no article. Sentences and clicks belong to the consuming application.

## Validation and routing

\`parseUnit(input)\` normalizes a complete unit and returns either
\`{ success: true, chain }\` or \`{ success: false, error }\`. The chain contains
\`unitKind\`, \`language\`, \`family\`, \`kind\`, and the validated \`value\`.
Supplying a complete expected route narrows the result and rejects mismatches.

[The API page](/general/api/) shows runtime validation and schema composition.
Docs occurrence slugs identify their sentence wrappers; changing the linked
Attestation does not change the occurrence route.
`,
});
