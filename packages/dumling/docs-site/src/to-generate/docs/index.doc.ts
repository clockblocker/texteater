import { defineGeneratedDocPage } from "../../lib/docs/source-mirrored-doc-pages.ts";

const document = defineGeneratedDocPage({
	description: "A learner-facing lexical classification framework.",
	order: 0,
	title: "dumling docs",
	body: `
**dumling** is a UD-inspired, learner-facing, lexi-semantic classification framework.

It's goal is to provides a language-independent structure for answering questions like:
"Teacher, what is '[give]' in `If they can't deliver them they'll just [give] up`?"
in the most dummy-friendly way possible, while stil being strict and consistent.

---

For a learner, the useful answer is not only that [give] is a verb token.

dumling classifies it as:

- a \`Partial\` **Selection** of the normalized full
- **Surface** _"give up"_, which points to the
- **Lemma** _"give up"_: a phrasal English \`VERB\`

That is the core job of dumling: keep the learner's highlighted text connected to the full lexical item that carries the meaning.

## Why It Exists

Classical linguistic segmenters are usually built around tokens and grammar. That is useful, but it is too granular for many learner-facing explanations.

In a UD-style analysis, _"give up"_ is split into parts: **give** is the verbal head, and **up** is a particle attached to it. Dumling can still borrow that POS vocabulary, but it also gives applications a way to treat _"give up"_ as one lexical unit when that is the meaning-bearing unit the learner needs.

This also matters for phrasemes:

- _During my [walk] in a park, I saw a squirrel._

    Here [dumdict classifies it](/en/selection/djEscyxjLHdhbGssbCxlbixsLG4sd2Fsayzwn5q2LA/) as a \`Full\` **Selection** of the noun **Lexeme** _"walk"_.

- _This exam was a [walk] in the park._

    Here [dumdict classifies it](/en/selection/djEscyxjLHdhbGsgaW4gdGhlIHBhcmssbCxlbixwLGlkLHdhbGsgaW4gdGhlIHBhcmss8J-YjCw/) as a \`Partial\` **Selection** of the idiomatic **Phraseme** _"walk in the park"_.

The spelling on the page is not forced to be the whole lexical object. A small learner highlight can still point to the larger surface and lemma that explain the meaning.

## What It Focuses On

Dumling focuses on lexical classification for learning tools:

- **Lemma**: the lexical item behind the expression, such as _"walk"_, _"give up"_, or _"walk in the park"_
- **Surface**: the normalized full form in context, such as _"gave up"_
- **Selection**: the exact text the learner highlighted, such as **give**, **up**, or **walk**
- lexical kind: \`Lexeme\`, \`Morpheme\`, \`Phraseme\`, or \`Construction\`
- learner-relevant selection features: partial coverage, licensed spelling variants, and typos when those facts are marked
- learner-relevant surface features: properties of the resolved full surface, such as archaic status
- language-specific lexical inventories built on a shared cross-language model

The framework is implemented as a TypeScript and Zod package so apps can validate, serialize, search, and round-trip these objects through IDs.

## What It Omits

Dumling intentionally does not try to be a full grammar model.

It does not model syntactic dependency relations, phrase structure, or sentence-level grammar. It also does not try to explain every grammatical relation between words in a sentence.

The scope is narrower: identify the meaning-bearing lexical unit behind a learner's selection, and describe that unit in a stable, language-aware shape.

## Runtime Scope

The current implemented runtime languages are:

- \`en\`: English
- \`de\`: German
- \`he\`: Hebrew

The language inventory is curated by the package. Consumers can choose a supported language dynamically with \`getLanguageApi(language)\`, but arbitrary user-defined language packs are not part of the public runtime API.
`,
});

export default document;
