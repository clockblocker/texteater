import { defineGeneratedDocPage } from "../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "A learner-facing lexical classification framework.",
	order: 0,
	title: "dumling docs",
	body: `
**dumling** is a UD-inspired, learner-facing, lexi-semantic classification framework.

Its goal is to provide a language-independent structure for answering questions like:
"Teacher, what is '[give]' in \`If they can't deliver them they'll just [give] up\`?"
in the most dummy-friendly way possible, while stil being strict and consistent.

---

For a learner, the useful answer is not only that [give] is a verb token.

dumling classifies it as:

- a **Selection** whose clicked Segment is _"give"_ and whose Surface occurrence
  also includes _"up"_
- the normalized **Surface** _"give up"_, which points to
- the **Lemma** _"give up"_: a phrasal English \`VERB\`

That is the core job of Dumling: resolve one learner click through its
contextual grammatical form to a normalized grammatical identity.

## Why It Exists

Classical linguistic segmenters are usually built around tokens and grammar. That is useful, but it is too granular for many learner-facing explanations.

In a UD-style analysis, _"give up"_ is split into parts: **give** is the verbal head, and **up** is a particle attached to it. Dumling can still borrow that POS vocabulary, but it also gives applications a way to treat _"give up"_ as one lexical unit when that is the meaning-bearing unit the learner needs.

This also matters for phrasemes:

- _During my [walk] in a park, I saw a squirrel._

    Here the click resolves through the noun Surface _"walk"_ to the noun
    Lemma _"walk"_.

- _This exam was a [walk] in the park._

    Here the click resolves through the multi-segment Surface _"walk in the
    park"_ to the idiomatic Phraseme Lemma _"walk in the park"_.

The clicked Segment is not forced to be the whole Surface occurrence. A click
on one Segment can record all participating Segment indices and still resolve
to the larger Surface and Lemma.

That alone does not make the Surface partial. \`realizationCoverage: "Partial"\`
is for an attested form that omits part of the Lemma, such as _"heulte mit"_
for _"mit den Wölfen heulen"_.

## What It Focuses On

Dumling focuses on lexical classification for learning tools:

- **Lemma**: normalized grammatical identity, such as _"walk"_, _"give up"_, or _"walk in the park"_
- **Surface**: the normalized contextual form, such as _"gave up"_
- **Selection**: sentence-local click evidence, including the clicked Segment and every Segment participating in the Surface occurrence
- Lemma family: \`Lexeme\`, \`Morpheme\`, \`Phraseme\`, or \`Construction\`
- Selection orthography: whether the clicked Segment is standard text or a typo
- Surface spelling and realization coverage: licensed variants and genuinely partial realizations
- learner-relevant Surface features, such as archaic status
- language-specific lexical inventories built on a shared cross-language model

The framework is implemented as a TypeScript and Zod package so apps can validate, serialize, search, and round-trip these objects through identities.

## What It Omits

Dumling intentionally does not try to be a full grammar model.

It does not model syntactic dependency relations, phrase structure, or sentence-level grammar. It also does not try to explain every grammatical relation between words in a sentence.

The scope is narrower: resolve a learner click to a Surface and its Lemma, then
describe that grammatical chain in a stable, language-aware shape. A learner's
semantic Reading—one Lemma plus one emoji description—belongs outside Dumling.

## Runtime Scope

The current implemented runtime languages are:

- \`en\`: English
- \`de\`: German
- \`he\`: Hebrew

The language inventory is curated by the package. Consumers can choose a supported language dynamically with \`getLanguageApi(language)\`, but arbitrary user-defined language packs are not part of the public runtime API.
`,
});

export default document;
