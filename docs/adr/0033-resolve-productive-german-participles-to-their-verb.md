---
status: accepted
---

# Resolve productive German participles to their verb

A productive German participle resolves to its VERB Lemma, or its AUX Lemma
for an auxiliary, in every use. Its Canonical Form is the infinitive:

- attributive: *die gekochten Kartoffeln*, *der von allen bewunderte Lehrer*,
  *das lachende Kind* resolve to `kochen`, `bewundern`, `lachen`
- adverbial: *Er kam lachend herein* resolves to `lachen`
- state passive: *Die Tür ist geschlossen* resolves to `schließen`, and `ist`
  joins the target as its auxiliary

The Surface has `verbForm: Part` and `participleForm` Present or Past. An
attributive participle also carries the case, number and gender it agrees in.
A predicative or adverbial one leaves them null. The participle Surface
carries `degree` too, but it stays null for a productive participle, since
comparison is one of the lexicalization tests below. Grundform is unchanged
because a participle never realizes the infinitive.

A lexicalized participle is its own ADJ Lemma with the participial Canonical
Form: *spannend*, *gebildet*, *ausgezeichnet* 'excellent', *erfahren*
'experienced', *gelegen* 'convenient', *verrückt*, *verlegen* 'embarrassed',
*begabt*. One test is enough:

- its meaning comes from no sense of the verb
- it takes *un-*: *ungelesen*, *unbekannt*
- it takes *sehr* or comparison: *sehr gebildet*, *spannender*

One spelling can be both. *ein aus Ton gebildeter Krug* and *das am See
gelegene Haus* are VERB because 'formed' and 'situated' are senses of
`bilden` and `liegen`. Substantivized participles stay NOUN. Adverbially used
plain adjectives stay ADJ (*er läuft schnell*); adverbial use never makes an
ADV.

This supersedes [ADR 0007](./0007-use-the-tiger-boundary-for-german-participles.md),
which followed TIGER in tagging attributive and adverbial participles ADJ. That
gave every productive participle an ADJ Lemma of its own, so a learner who
clicked *gekochten* met an entry for *gekocht* that is only *kochen* again. The
new boundary follows UD German-HDT, where part of speech follows use but the
lemma is the verb (*gegründeter* → *gründen*), and grammis, where Partizip II
is a verb form and a participle counts as a full adjective only once it is
lexicalized. The cost is that adjectival agreement now also lives on verbal
Surfaces. Resulting states of reflexive verbs (*verheiratet*, *betrunken*,
*verliebt*, *aufgeregt*, *beleidigt*) and *geschlossene Gesellschaft* are
labeled ADJ provisionally until the user rules on them.

The golden set for this boundary is the
`target-classification/de/high-level-whole-unit:participle-boundary` slice of
the Canonical Classification Corpus. Map:
[#595](https://github.com/clockblocker/texteater/issues/595).
