# German Semantic Relation acceptance reservation: primary-source proposal

## Status and scope

This is an agent-owned proposal for a **hidden, human-gated acceptance reservation**. It is not a production prompt, a demonstration, a retained corpus change, or a verdict. No provider was called while preparing it. The reservation contains exactly twelve binary cases: two for each directly requestable relation kind (`synonym`, `nearSynonym`, `antonym`, `nearAntonym`, `hypernym`, and `holonym`).

The freshness audit compared source identities, target identities, marked contexts, and contamination keys against:

- `src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/retained-cases.ts`;
- `docs/german-semantic-relation-primary-sources.md`;
- the 50-case development/acceptance collection used by #192.

All twelve source identities and all proposed accepted or harmful target identities below are disjoint from those artifacts. Every marked context and contamination key is new. This is a reservation proposal only: a human should repeat that audit immediately before materializing the cases, because #192 may add retained material later.

## Exact notation

The following constructors are notation for exact DTO values, not abbreviations that leave fields unspecified:

```ts
N(canonicalForm, emojiDescription, gender) = {
  lemma: {
    language: "de", canonicalForm, family: "Lexeme", kind: "NOUN",
    coreFeatures: { gender, hyph: null },
  },
  emojiDescription,
}

A(canonicalForm, emojiDescription) = {
  lemma: {
    language: "de", canonicalForm, family: "Lexeme", kind: "ADJ",
    coreFeatures: { abbr: null, foreign: null, numType: null, variant: null },
  },
  emojiDescription,
}

V(canonicalForm, emojiDescription) = {
  lemma: {
    language: "de", canonicalForm, family: "Lexeme", kind: "VERB",
    coreFeatures: {
      hasGovPrep: null, hasSepPrefix: null,
      lexicallyReflexive: null, verbType: null,
    },
  },
  emojiDescription,
}

T(canonicalForm, kind) = {
  language: "de", canonicalForm, family: "Lexeme", kind,
}
```

Each `request` below is deliberately sparse and contains only the leaf under test. `accepted alternatives` lists the complete acceptable target sets for that leaf; `[null]` means a required-null verdict. A target listed as harmful is a false positive for the requested leaf, not necessarily unrelated under every possible relation.

## Reserved cases

### Synonym

#### SYN-1 — exact positive: *Streichholz* → *Zündstäbchen*

- **source Reading:** `N("Streichholz", "🔥", "Neut")`
- **marked context:** `Sie entzündete die Kerze mit einem <TARGET>Streichholz</TARGET>.`
- **contamination key:** `acceptance-reservation-de-streichholz-candle-2026`
- **request:** `{ semanticRelations: { synonym: null } }`
- **accepted output:** `{ semanticRelations: { synonym: [T("Zündstäbchen", "NOUN")] } }`
- **accepted alternatives:** `[[T("Zündstäbchen", "NOUN")]]`
- **harmful targets:** `T("Zündholz", "NOUN")` — Duden marks this otherwise equivalent form as technical or southern German/Austrian/Swiss, so it is unsafe as an exact, unrestricted synonym.
- **primary evidence and rationale:** Duden defines *Streichholz* as the familiar ignition stick and lists *Zündstäbchen* as a synonym; the reciprocal *Zündstäbchen* entry points back to *Streichholz* without a usage label. [Duden: Streichholz](https://www.duden.de/rechtschreibung/Streichholz), [Duden: Zündstäbchen](https://www.duden.de/rechtschreibung/Zuendstaebchen), [Duden: Zündholz](https://www.duden.de/rechtschreibung/Zuendholz)
- **project judgment:** Reciprocal unlabeled lexicographic synonymy supports exact `Synonym`; Duden does not publish Dumrel labels.

#### SYN-2 — required null: *Apfelsine* must not yield exact *Orange*

- **source Reading:** `N("Apfelsine", "🍊", "Fem")`
- **marked context:** `Zum Frühstück schälte Mara eine saftige <TARGET>Apfelsine</TARGET>.`
- **contamination key:** `acceptance-reservation-de-apfelsine-breakfast-2026`
- **request:** `{ semanticRelations: { synonym: null } }`
- **accepted output:** `{ semanticRelations: { synonym: null } }`
- **accepted alternatives:** `[null]`
- **harmful targets:** `T("Orange", "NOUN")` — same fruit denotation is not sufficient for exact interchangeability when the distribution is regionally and compositionally restricted.
- **primary evidence and rationale:** Duden's dictionary equates the fruit sense with *Orange*, while Duden's synonym dictionary explicitly uses *Apfelsine/Orange* to show regional and collocational differences, including the general preference for *Orange* in compounds such as *Orangensaft*. That sourced restriction makes exact `Synonym` a required null. [Duden: Apfelsine](https://www.duden.de/rechtschreibung/Apfelsine), [Duden – Das Synonymwörterbuch, sample](https://shop.duden.de/media/af/fa/e3/1687342120/Leseprobe_9783411912766_Duden_%E2%80%93_Das_Synonymw%C3%B6rterbuch.pdf)
- **project judgment:** The evidence strongly supports non-exactness; whether a separately requested `Near Synonym` should accept *Orange* is deliberately outside this binary case.

### Near Synonym

#### NSYN-1 — regional positive: *Semmel* → *Brötchen*

- **source Reading:** `N("Semmel", "🥖", "Fem")`
- **marked context:** `In München bestellte er zum Frühstück eine <TARGET>Semmel</TARGET>.`
- **contamination key:** `acceptance-reservation-de-semmel-munich-2026`
- **request:** `{ semanticRelations: { nearSynonym: null } }`
- **accepted output:** `{ semanticRelations: { nearSynonym: [T("Brötchen", "NOUN")] } }`
- **accepted alternatives:** `[[T("Brötchen", "NOUN")]]`
- **harmful targets:** `T("Brot", "NOUN")` — a broader baked-food category is taxonomy, not near synonymy.
- **primary evidence and rationale:** Duden defines *Semmel* as *Brötchen* but marks its use especially Austrian and Bavarian; the *Brötchen* entry reciprocally names *Semmel*. The central denotation is shared and the regional distribution is a material difference. [Duden: Semmel](https://www.duden.de/rechtschreibung/Semmel), [Duden: Brötchen](https://www.duden.de/rechtschreibung/Broetchen)
- **project judgment:** The sourced regional restriction is mapped to `Near Synonym` under the frozen project contract.

#### NSYN-2 — required null: *Geige* is not near-synonymous with *Bratsche*

- **source Reading:** `N("Geige", "🎻", "Fem")`
- **marked context:** `Die Solistin stimmte ihre <TARGET>Geige</TARGET> vor dem Konzert.`
- **contamination key:** `acceptance-reservation-de-geige-concert-2026`
- **request:** `{ semanticRelations: { nearSynonym: null } }`
- **accepted output:** `{ semanticRelations: { nearSynonym: null } }`
- **accepted alternatives:** `[null]`
- **harmful targets:** `T("Bratsche", "NOUN")` — it is a distinct, larger instrument tuned a fifth lower, not a usage variant of *Geige*.
- **primary evidence and rationale:** Duden identifies *Geige* with *Violine* and defines *Bratsche* as a separate string instrument, larger than the violin and tuned a fifth lower. Shared instrument family and visual similarity do not create near synonymy. [Duden: Geige](https://www.duden.de/rechtschreibung/Geige), [Duden: Bratsche](https://www.duden.de/rechtschreibung/Bratsche)
- **project judgment:** None beyond applying the frozen “same central meaning” rule; the distinct referent classes make the null high-confidence.

### Antonym

#### ANT-1 — complementary positive: *lebendig* → *tot*

- **source Reading:** `A("lebendig", "🫀")`
- **marked context:** `Der gerettete Käfer war noch <TARGET>lebendig</TARGET>.`
- **contamination key:** `acceptance-reservation-de-lebendig-beetle-2026`
- **request:** `{ semanticRelations: { antonym: null } }`
- **accepted output:** `{ semanticRelations: { antonym: [T("tot", "ADJ")] } }`
- **accepted alternatives:** `[[T("tot", "ADJ")]]`
- **harmful targets:** `T("krank", "ADJ")` — illness can coexist with being alive and is not the complement.
- **primary evidence and rationale:** Duden's first *lebendig* sense is “living/alive” and explicitly contrasts it with *tot*; Duden's first *tot* sense is “no longer living, without life.” This is a direct complementary opposition in the marked biological reading. [Duden: lebendig](https://www.duden.de/rechtschreibung/lebendig), [Duden: tot](https://www.duden.de/rechtschreibung/tot)
- **project judgment:** Mapping the directly contrasted complementary meanings to exact `Antonym` is high-confidence.

#### ANT-2 — scalar-end positive: *nass* → *trocken*

- **source Reading:** `A("nass", "💧")`
- **marked context:** `Nach dem Wolkenbruch war der Mantel völlig <TARGET>nass</TARGET>.`
- **contamination key:** `acceptance-reservation-de-nass-raincoat-2026`
- **request:** `{ semanticRelations: { antonym: null } }`
- **accepted output:** `{ semanticRelations: { antonym: [T("trocken", "ADJ")] } }`
- **accepted alternatives:** `[[T("trocken", "ADJ")]]`
- **harmful targets:** `T("feucht", "ADJ")` — it lies on the same moisture scale and overlaps with low wetness rather than opposing it.
- **primary evidence and rationale:** Duden defines the relevant *nass* sense by penetration or coating with moisture; the matching *trocken* sense is explicitly free of moisture/wetness and lists “nicht feucht, nicht nass” among its equivalents. [Duden: nass](https://www.duden.de/rechtschreibung/nass), [Duden: trocken](https://www.duden.de/rechtschreibung/trocken)
- **project judgment:** The endpoints are conventional lexical opposites; intermediate degrees do not prevent exact antonymy under the frozen contract.

### Near Antonym

#### NANT-1 — converse inheritance perspectives: *erben* → *vererben*

- **source Reading:** `V("erben", "📜")`
- **marked context:** `Nora wird das Haus von ihrer Tante <TARGET>erben</TARGET>.`
- **contamination key:** `acceptance-reservation-de-erben-house-2026`
- **request:** `{ semanticRelations: { nearAntonym: null } }`
- **accepted output:** `{ semanticRelations: { nearAntonym: [T("vererben", "VERB")] } }`
- **accepted alternatives:** `[[T("vererben", "VERB")]]`
- **harmful targets:** `T("vermachen", "VERB")` — it shares the bequeather's direction and is a synonym of *vererben*, not the reversed participant perspective requested here.
- **primary evidence and rationale:** Duden defines *erben* as receiving another person's property after that person's death and *vererben* as leaving it as an inheritance. Fabricius-Hansen's Konrad-Duden-Prize lecture treats *erben/beerben/vererben* as describing, in a sense, the same event while assigning different perspectives and participant roles. [Duden: erben](https://www.duden.de/rechtschreibung/erben), [Duden: vererben](https://www.duden.de/rechtschreibung/vererben), [Fabricius-Hansen: *Das Wunder des Verbs*](https://cdn.duden.de/public_files/2018-11/Konrad-Duden-Preis_Fabricius_Hansen_Das_Wunder_des_Verbs_2004.pdf)
- **project judgment:** The sources establish converse perspective, not antonymy terminology. Mapping that relation to Dumrel `Near Antonym` is a project-level decision fixed by the judgment contract.

#### NANT-2 — converse transfer perspectives: *geben* → *bekommen*

- **source Reading:** `V("geben", "🎁")`
- **marked context:** `Die Großmutter wird dem Kind ein Buch <TARGET>geben</TARGET>.`
- **contamination key:** `acceptance-reservation-de-geben-gift-2026`
- **request:** `{ semanticRelations: { nearAntonym: null } }`
- **accepted output:** `{ semanticRelations: { nearAntonym: [T("bekommen", "VERB")] } }`
- **accepted alternatives:** `[[T("bekommen", "VERB")]]`
- **harmful targets:** `T("wegnehmen", "VERB")` — removal is an opposing event, not the same transfer viewed from the recipient.
- **primary evidence and rationale:** Duden's relevant *geben* sense profiles someone transferring something to another person; the first *bekommen* sense profiles receiving something from another person. IDS grammis defines converse relations as one relation with exchanged argument assignment and perspective. [Duden: geben](https://www.duden.de/rechtschreibung/geben), [Duden: bekommen](https://www.duden.de/rechtschreibung/bekommen), [IDS grammis: Konverse](https://grammis.ids-mannheim.de/terminologie/1005)
- **project judgment:** Treating this well-supported converse as Dumrel `Near Antonym` is project-owned. The case does not claim that German lexicography calls the verbs antonyms.

### Hypernym

#### HYP-1 — nearest useful category: *Amsel* → *Drossel*

- **source Reading:** `N("Amsel", "🐦", "Fem")`
- **marked context:** `Im Garten zog eine <TARGET>Amsel</TARGET> einen Wurm aus dem Rasen.`
- **contamination key:** `acceptance-reservation-de-amsel-garden-2026`
- **request:** `{ semanticRelations: { hypernym: null } }`
- **accepted output:** `{ semanticRelations: { hypernym: [T("Drossel", "NOUN")] } }`
- **accepted alternatives:** `[[T("Drossel", "NOUN")]]`
- **harmful targets:** `T("Vogel", "NOUN")` — true but needlessly remote when the directly evidenced, useful nearer category *Drossel* is available; `T("Singvogel", "NOUN")` is also a farther level than *Drossel* here.
- **primary evidence and rationale:** Duden defines *Amsel* as a larger songbird belonging to the thrushes; the *Drossel* entry names *Amsel* as an example of that category. The reciprocal category/member wording directly supports the taxonomy. [Duden: Amsel](https://www.duden.de/rechtschreibung/Amsel), [Duden: Drossel](https://www.duden.de/rechtschreibung/Drossel_Singvogel)
- **project judgment:** Selecting *Drossel* rather than a more remote ancestor applies the frozen nearest-useful-category rule.

#### HYP-2 — required null: a containing assembly is not a category

- **source Reading:** `N("Zylinderkopf", "🔧", "Masc")`
- **marked context:** `Die Werkstatt ersetzte den gerissenen <TARGET>Zylinderkopf</TARGET> des Motors.`
- **contamination key:** `acceptance-reservation-de-zylinderkopf-engine-2026`
- **request:** `{ semanticRelations: { hypernym: null } }`
- **accepted output:** `{ semanticRelations: { hypernym: null } }`
- **accepted alternatives:** `[null]`
- **harmful targets:** `T("Zylinder", "NOUN")` — Duden explicitly calls the head the upper part of a cylinder, so returning the whole under `Hypernym` confuses taxonomy with part–whole.
- **primary evidence and rationale:** Duden defines *Zylinderkopf* as the uppermost part of the technical *Zylinder* sense; its *Zylinder* entry defines that engine component as the hollow body in which the piston moves. “Part of” does not entail “kind of.” [Duden: Zylinderkopf](https://www.duden.de/rechtschreibung/Zylinderkopf), [Duden: Zylinder](https://www.duden.de/rechtschreibung/Zylinder)
- **project judgment:** The null follows directly from the frozen taxonomy-versus-part-whole boundary.

### Holonym

#### HOL-1 — anatomical whole: *Zeh* → *Fuß*

- **source Reading:** `N("Zeh", "🦶", "Masc")`
- **marked context:** `Beim Barfußlaufen stieß er sich den kleinen <TARGET>Zeh</TARGET>.`
- **contamination key:** `acceptance-reservation-de-zeh-barefoot-2026`
- **request:** `{ semanticRelations: { holonym: null } }`
- **accepted output:** `{ semanticRelations: { holonym: [T("Fuß", "NOUN")] } }`
- **accepted alternatives:** `[[T("Fuß", "NOUN")]]`
- **harmful targets:** `T("Schuh", "NOUN")` — a shoe may cover a toe but is neither its constitutive whole nor a generally necessary bearer.
- **primary evidence and rationale:** Duden defines *Zeh* as one of the movable members at the end of the foot. Its *Fuß* entry fixes the matching anatomical reading as the lowest part of the leg in humans and vertebrates. [Duden: Zeh](https://www.duden.de/rechtschreibung/Zeh), [Duden: Fuß](https://www.duden.de/rechtschreibung/Fusz)
- **project judgment:** The explicit anatomical “member at the end of the foot” relation maps cleanly to `Holonym`.

#### HOL-2 — architectural whole: *Kapitell* → *Säule*

- **source Reading:** `N("Kapitell", "🏛️", "Neut")`
- **marked context:** `Das korinthische <TARGET>Kapitell</TARGET> krönt die Marmorsäule.`
- **contamination key:** `acceptance-reservation-de-kapitell-column-2026`
- **request:** `{ semanticRelations: { holonym: null } }`
- **accepted output:** `{ semanticRelations: { holonym: [T("Säule", "NOUN")] } }`
- **accepted alternatives:** `[[T("Säule", "NOUN")]]`
- **harmful targets:** `T("Bauwerk", "NOUN")` — a capital may occur within a building, but that remote contextual container skips the constitutive whole.
- **primary evidence and rationale:** Duden defines the architectural *Säule* as a support typically consisting of base, shaft, and capital; the direct source entry for *Kapitell* identifies it as the upper termination of a column or pillar. [Duden: Kapitell](https://www.duden.de/rechtschreibung/Kapitell), [Duden: Säule](https://www.duden.de/rechtschreibung/Saeule_Pfeiler)
- **project judgment:** Selecting the immediate constitutive whole *Säule* rather than an incidental building applies the frozen holonym granularity rule.

## Deliberately excluded judgments

These candidates are **not** part of the twelve binary cases:

- *Vorgänger/Nachfolger*: Duden presents them as opposites, but the pair also reverses succession roles. Choosing exact `Antonym` versus project `Near Antonym` would require a fresh human judgment, so it is not safe for a hidden binary reservation. [Duden: Vorgänger](https://www.duden.de/rechtschreibung/Vorgaenger), [Duden: Nachfolger](https://www.duden.de/rechtschreibung/Nachfolger)
- *senden/empfangen*: the verbs often reverse transmission perspective, but sending does not guarantee receipt. The event identity needed for a high-confidence converse is therefore underspecified.
- *Seite/Buch*: a page can belong to a book, booklet, newspaper, or other print product. A contextually mentioned book alone must not narrow a generally valid holonym.
- *Zündholz/Streichholz*: Duden's technical/regional label on *Zündholz* makes exact synonymy unsafe; it is retained only as a harmful target in SYN-1.

## Coverage conclusion

There is no sourcing blocker: all six directly requestable kinds have two fresh, high-confidence cases. The four mappings that remain explicitly project-owned are exact-versus-near synonym boundaries, converse-to-`Near Antonym`, nearest useful taxonomy level, and immediate constitutive whole. Ambiguous classifications were excluded rather than forced into the twelve binary verdicts.
