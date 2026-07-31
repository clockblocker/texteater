# German lexical-authority feasibility for Entry identity and realization

Status: primary-source feasibility research for
[`clockblocker/texteater#16`](https://github.com/clockblocker/texteater/issues/16)
and
[`clockblocker/texteater#13`](https://github.com/clockblocker/texteater/issues/13),
performed 2026-07-31. This artifact does not select or productionize an
authority. Licensing observations are engineering constraints, not legal
advice.

## Verdict

**No currently public, credential-free source satisfies the authority contract
needed to instantiate #16's authority-only and hybrid arms as
`Existing(opaque Entry ID) | ProposeNew`.** The closest source is a pinned
Wikidata Lexemes dump: it provides opaque IDs, forms, senses, revisioned APIs,
and CC0 snapshots, but its documented Lexeme-boundary policy permits either one
Lexeme with several Senses or several homograph Lexemes for the same
distinction. Its actual `Schloss` and Russian `коса` records contain overlapping
identities, and an absent result cannot prove that an Entry is new
([Wikidata Lexeme inclusion guidance](https://www.wikidata.org/wiki/Wikidata:Lexicographical_data/Documentation#Lexeme_inclusion_criteria),
[Wikidata disclaimer](https://www.wikidata.org/wiki/Wikidata:General_disclaimer)).

A pinned Wikidata snapshot **can be used now as candidate evidence in a
research adapter that may return `Abstain`**. That is not the qualified
authority resolver requested by #16: the ticket's missing-identity controls
require a defensible `ProposeNew`, not an inference from incomplete search
coverage. A project-curated exception table for the visible cases would merely
move the gold boundary into resolver configuration and would not create a
general authority.

**The same source cannot instantiate #13's authority-assisted arm.** Some
Wikidata records contain complete detached forms for separable verbs, but forms
are whole representations with grammatical features, not licensed
segment-membership rules. Coverage is inconsistent, and the model has no core
field for governed material, intervening tokens, omitted phraseme material, or
`Full` versus `Partial` realization. GermaNet exposes particle/base-verb,
frame, and example fields and is the most promising additional evidence, but
the data require a signed license and still do not supply an inflectional
paradigm or the required partial-realization contract
([Wikidata form model](https://www.wikidata.org/wiki/Wikidata:Lexicographical_data/Documentation#Lexeme_forms),
[GermaNet `LexUnit` API](https://github.com/Germanet-sfs/GermaNetApi/blob/master/src/main/java/de/tuebingen/uni/sfs/germanet/api/LexUnit.java)).

| Source and pinnable edition | Opaque identity | Boundary evidence | Realization evidence | Production reuse | Result |
|---|---|---|---|---|---|
| Wikidata Lexemes dump `2026-07-29` | Unique `L…` IDs, revisioned entities | Non-deterministic by documented policy; overlapping live records | Whole forms plus features, unevenly populated | CC0 | Candidate/abstention evidence only |
| DWDS/CLARIN headword list `2022-07-28` | `E_…` record IDs, but no documented cross-edition identity guarantee | Homograph headwords; `Schloss` is split contrary to the ADR | Headword spelling, POS, noun gender only | Snapshot is CC BY-SA 4.0 | Retrieval seed only |
| live DWDS headword/API data | Text anchors and `E_…` records | Homographs, but the API intentionally exposes only rudimentary metadata | No paradigms or realization rules | Automated reuse requires permission under current terms | Not usable as a production resolver |
| GermaNet `20.0` (Nov. 2025) | Unique Synset/LexUnit IDs | LexUnit is sense-specific, not the ADR's polysemy-preserving Entry | Particle/base verb, frames, examples; no inflectional forms | Signed academic/R&D/commercial agreement required | Technically promising licensed input; unavailable now |
| OdeNet `1.4` (`7bd6b85…`) | `w…` LexicalEntry and Sense IDs | Conflates both `Bank` paradigms; omits the lock use of `Schloss` | Lemma only | CC BY-SA 4.0 | Open but contract-incompatible |
| GWA-listed EuroWordNet German | Not publicly testable | Not publicly testable | Not publicly testable | Restricted | Unavailable |

## Required authority semantics

The accepted ADR requires Entry identity to distinguish homonymy while keeping
polysemy independent of learner Meaning. In particular, castle/lock `Schloss`
must be one Entry, financial `Bank → Banken` and bench `Bank → Bänke` must be
different Entries, and the three Russian `коса` homonyms must be different
Entries. Descriptive equality may retrieve candidates but cannot prove
identity
([repository ADR](../../../../docs/adr/0001-separate-entry-identity-from-lemma-form.md)).

For #16, a qualified resolver therefore needs all of:

1. a named immutable edition or revision closure;
2. opaque authority identities and a documented equality/canonicalization rule;
3. contextual evidence sufficient to select among homographs without making
   Sense or learner Meaning the Entry identity;
4. an explicit absence/coverage contract strong enough to distinguish
   `ProposeNew` from `Abstain`; and
5. production-compatible rights to ingest and serve the needed data.

For #13, it additionally needs evidence about the Entry's licensed
realizations: which detached or discontinuous constituents belong to the
Surface, which governed material does not, and which omissions license
`realizationCoverage: Partial`. A list of whole inflected strings alone does
not answer those questions.

## Wikidata Lexemes

### What the platform guarantees

Wikidata automatically assigns each Lexeme a unique `L` plus decimal-number
identifier. Its lemma is the human-readable dictionary form rather than the
identifier. Forms receive unique `L…-F…` IDs and contain representations plus
grammatical features; Senses receive unique `L…-S…` IDs and contain glosses plus
statements
([official Lexeme documentation](https://www.wikidata.org/wiki/Wikidata:Lexicographical_data/Documentation),
[official glossary](https://www.wikidata.org/wiki/Wikidata:Lexicographical_data/Glossary/en)).
Those are suitable opaque provider IDs and a good structural fit for candidate
hydration.

The Action API supports entity search and retrieval through
`wbsearchentities` and `wbgetentities`; Wikidata also exposes individual entity
JSON and SPARQL access
([Wikibase API](https://www.mediawiki.org/wiki/Wikibase/API/en),
[Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access)).
Individual entity data can be revision-pinned. For example,
[`L614356` revision `2322731817`](https://www.wikidata.org/wiki/Special:EntityData/L614356.json?revision=2322731817)
returns the 2025-03-10 `aufpassen` record with 31 forms.

Wikidata publishes recommended stable-interface JSON dumps weekly and
Lexeme-specific JSON/RDF dumps. All structured Lexeme-namespace data are CC0
and available for commercial and offline use
([database-download documentation](https://www.wikidata.org/wiki/Wikidata:Database_download)).
A concrete edition available during this research is:

- directory:
  [`wikidatawiki/entities/20260729`](https://dumps.wikimedia.org/wikidatawiki/entities/20260729/);
- Lexeme JSON:
  [`wikidata-20260729-lexemes.json.bz2`](https://dumps.wikimedia.org/wikidatawiki/entities/20260729/wikidata-20260729-lexemes.json.bz2);
- publisher checksum: SHA-1
  `1651a95b15bb9fac28d127f22c2d5def66e76c8c`
  ([publisher checksum file](https://dumps.wikimedia.org/wikidatawiki/entities/20260729/wikidata-20260729-sha1sums.txt)).

### Why it is not an identity authority by itself

Wikidata's own inclusion table says that a difference in Sense, etymology,
gender, singular/plural behavior, pronunciation, or spelling may be represented
as one Lexeme **or** two or more Lexemes, with homograph links where possible
([official inclusion criteria](https://www.wikidata.org/wiki/Wikidata:Lexicographical_data/Documentation#Lexeme_inclusion_criteria)).
The model therefore does not define the single boundary policy #16 needs.
Wikidata is collaboratively edited, and its official disclaimer gives no
assurance that information is complete, accurate, reliable, or expert-reviewed
([Wikidata introduction](https://www.wikidata.org/wiki/Wikidata:Introduction),
[general disclaimer](https://www.wikidata.org/wiki/Wikidata:General_disclaimer)).
Consequently, zero search results are an abstention, not evidence that an Entry
does not exist.

Lexeme merges also redirect the obsolete ID to the surviving Lexeme, so a
runtime catalog must either freeze revisions or follow provider redirects under
an edition-specific canonicalization policy
([official merge help](https://www.wikidata.org/wiki/Help:Merge/en),
[redirect help](https://www.wikidata.org/wiki/Help:Redirects)).

### Credential-free boundary probes

The probes used the public Action API with a descriptive `User-Agent`, no
account, token, or project credential. Search results were hydrated and filtered
by provider language (`Q188` for German or `Q7737` for Russian); search rank
itself was never treated as identity.

| Probe | Revision-pinned primary evidence | Observed provider behavior | Contract result |
|---|---|---|---|
| `Schloss` | [`L408582@2435486763`](https://www.wikidata.org/wiki/Special:EntityData/L408582.json?revision=2435486763), [`L941696@2435486593`](https://www.wikidata.org/wiki/Special:EntityData/L941696.json?revision=2435486593), [`homograph lexeme` property](https://www.wikidata.org/wiki/Property:P5402), [`said to be the same as lexeme` property](https://www.wikidata.org/wiki/Property:P11577) | Both IDs have the same eight-form `Schloss/Schlosses/Schlösser/Schlössern` paradigm. `L408582` contains building, fastening-device, and firearm-lock Senses; `L941696` separately contains a fastening-device Sense. They are homograph-linked, and `L941696` points to `L408582` as said-to-be-the-same. | Useful duplicate evidence, but raw `LID` equality is not a clean boundary; a frozen canonicalization decision is mandatory. |
| `Bank`, `Bänke`, `Banken` | [`L34723@1940605864`](https://www.wikidata.org/wiki/Special:EntityData/L34723.json?revision=1940605864), [`L34791@2339500927`](https://www.wikidata.org/wiki/Special:EntityData/L34791.json?revision=2339500927) | Bench/workbench `L34723` has plural `Bänke/Bänken`; financial/game-party `L34791` has plural `Banken`. | Strong positive difference evidence matching the ADR. |
| Russian `коса` | [`L144910@2182153085`](https://www.wikidata.org/wiki/Special:EntityData/L144910.json?revision=2182153085), [`L144911@2286320722`](https://www.wikidata.org/wiki/Special:EntityData/L144911.json?revision=2286320722), [`L144912@2182155088`](https://www.wikidata.org/wiki/Special:EntityData/L144912.json?revision=2182155088) | Search returns separate braid, scythe, and sand-spit IDs with the same paradigm, but the braid Lexeme `L144910` also contains a sand-spit Sense overlapping `L144912`. | Demonstrates both the desired homonym candidates and contradictory overlap; not a deterministic equality oracle. |
| `aufpassen` | [`L614356@2322731817`](https://www.wikidata.org/wiki/Special:EntityData/L614356.json?revision=2322731817) | 31 Forms include `passt auf`, `passte auf`, `pass auf`, and `aufgepasst`; no Senses are populated. | Good separable-form evidence, not identity or membership proof. |
| `heulen` | [`L671251@2306669394`](https://www.wikidata.org/wiki/Special:EntityData/L671251.json?revision=2306669394) | Only the infinitive Form `heulen` is present. | Concrete realization-coverage gap. |
| `mitheulen` / `heulte mit` | [`L898270@2401156181`](https://www.wikidata.org/wiki/Special:EntityData/L898270.json?revision=2401156181) | 31 Forms include detached `heulte mit`. | Useful for this one separable Lexeme, but says nothing about the different phraseme `mit den Wölfen heulen`. |
| `mit den Wölfen heulen` | [public Lexeme search](https://www.wikidata.org/w/api.php?action=wbsearchentities&search=mit%20den%20W%C3%B6lfen%20heulen&language=de&uselang=de&type=lexeme&limit=10&format=json) | No Lexeme result at probe time. | `Abstain`; never `ProposeNew`, and no partial-realization evidence for `heulte mit`. |

The search endpoint can also return fuzzy aliases and records in other
languages despite a German search-language preference. For example, querying
`Banken` returned the correct German `L34791` but searching `Bank` also returned
English and Scandinavian Lexemes. Every candidate must therefore be hydrated
and language/category-filtered
([public `Bank` search](https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Bank&language=de&uselang=de&type=lexeme&limit=10&format=json)).

## DWDS and the BBAW CLARIN repository

### Public APIs are intentionally narrow

DWDS documents a public `wb/snippet` endpoint for only the existence, lemma,
part of speech, and URL of dictionary entries. It states that legal constraints
prevent opening much of the word-information data and calls the exposed
information “rudimentary”
([official API documentation](https://www.dwds.de/d/api#wb-api)).
Credential-free probes returned:

- two noun records for
  [`Schloss`](https://www.dwds.de/api/wb/snippet/?q=Schloss),
  `#1` and `#2`;
- two noun records for
  [`Bank`](https://www.dwds.de/api/wb/snippet/?q=Bank),
  `#1` and `#2`;
- no record for the inflected searches
  [`Banken`](https://www.dwds.de/api/wb/snippet/?q=Banken) or
  [`Bänke`](https://www.dwds.de/api/wb/snippet/?q=B%C3%A4nke);
- one verb record each for
  [`aufpassen`](https://www.dwds.de/api/wb/snippet/?q=aufpassen) and
  [`heulen`](https://www.dwds.de/api/wb/snippet/?q=heulen); and
- one `Mehrwortausdruck` record for
  [`mit den Wölfen heulen`](https://www.dwds.de/api/wb/snippet/?q=mit%20den%20W%C3%B6lfen%20heulen).

This distinguishes some homograph headwords but provides neither opaque
identity semantics nor inflectional/realization evidence. In particular, DWDS
splits `Schloss` at the headword level where the accepted ADR deliberately
keeps castle and lock uses in one Entry.

The live download page also offers JSON and LMF headword lists. The LMF header
describes the payload as headword forms, part of speech, and noun gender; its
`WordForm` elements are headword spellings such as modern/old orthography, not
inflectional paradigms
([official API/download page](https://www.dwds.de/d/api#wb-list),
[live LMF headword list](https://www.dwds.de/dwds_static/wb/dwdswb-headwords.lmf.xml)).
At probe time the live LMF file declared creation date `2026-07-24` and gave
`mit den Wölfen heulen` the record ID `E_5519011`, but it supplied no detached,
partial, or inflected realizations.

DWDS's current general terms reserve text/data-mining rights and require
express permission for automated queries, parsing, mining, or other reuse
unless a statutory exception applies
([official terms](https://www.dwds.de/d/nutzungsbedingungen)).
The public snippet examples and offered downloads can be tested as documented,
but those terms are not a blanket production license for live dictionary data.

### The CLARIN snapshot is open and pin-able, but too shallow

The BBAW CLARIN repository publishes a long-term archived DWDS headword-list
snapshot dated `2022-07-28` under CC BY-SA 4.0, with version history and
persistent metadata/data handles
([official resource record](https://clarin.bbaw.de/de/objects/dwds%3A2/),
[LMF snapshot handle](https://hdl.handle.net/21.11120/0000-000B-17AD-9)).
The downloaded archive's LMF header declares creation date `2022-07-27` and
says it includes headword forms, POS, and noun gender.

That snapshot has opaque-looking record IDs and explicit homograph suffixes:

- `Schloss%1` / `E_s_5461` and `Schloss%2` / `E_s_5483`;
- `Bank%1` / `E_b_1231` and `Bank%2` / `E_b_1311`;
- `aufpassen` / `E_a_8493`; and
- `heulen` / `E_h_5208`.

The resource documentation does not promise those IDs as stable lexical
identities across editions. More importantly, the snapshot contains no Senses,
inflectional paradigms, or realization rules, splits `Schloss`, and predates the
live `mit den Wölfen heulen` headword. It can seed retrieval but cannot govern
Entry equality, `ProposeNew`, Surface membership, or coverage.

## GermaNet

GermaNet 20.0 (November 2025) is an explicitly released lexical-semantic
network with unique Synset and LexUnit records. It groups LexUnits that express
the same concept into Synsets and reports 179,438 Synsets and 231,500 LexUnits
([official GermaNet page](https://uni-tuebingen.de/en/142806)).

That model is useful Sense authority, but its LexUnit is not automatically the
ADR's polysemy-preserving Lexeme. The official Python API states that a LexUnit
belongs to one and only one Synset and carries its own Sense number and unique
ID
([official `germanetpy` source](https://github.com/Germanet-sfs/germanetpy/blob/master/germanetpy/lexunit.py)).
Multiple concept uses of one spelling therefore require a project boundary
layer before they can become one dumgen Entry.

GermaNet's XML/database data are released only after a license is signed. The
open Java and Python libraries load those separately supplied local data; the
API packages do not contain the licensed dataset
([official tools page](https://uni-tuebingen.de/en/142818),
[official Python API README](https://github.com/Germanet-sfs/germanetpy),
[official Java API README](https://github.com/Germanet-sfs/GermaNetApi)).
Rover displays release 20.0, but access is federated to academic institutions
or a requested CLARIN account; an unauthenticated request to its JSON API
returned HTTP 401, so no boundary-case data were extracted
([official Rover access description](https://uni-tuebingen.de/en/142818),
[Rover](https://weblicht.sfs.uni-tuebingen.de/rover/)).

The free academic license is limited to non-commercial, non-profit research and
forbids distribution/marketing of derived products; R&D and commercial uses
require their respective agreements. Commercial distribution is covered only
by the separately negotiated commercial license
([official license page](https://uni-tuebingen.de/en/142828),
[academic agreement](https://hinrichs.sfs.uni-tuebingen.de/files/GermaNet/licenses/academic_license_18.0.pdf)).
No signed agreement or GermaNet data are present in this workspace, so
GermaNet cannot be instantiated now.

Technically, GermaNet is worth revisiting after licensing. Its LexUnit model
includes a unique ID, one Synset, orthographic variants, a particle and base
verb, frames, and examples. Those fields can improve candidate retrieval and
separable-verb analysis
([official Java `LexUnit`](https://github.com/Germanet-sfs/GermaNetApi/blob/master/src/main/java/de/tuebingen/uni/sfs/germanet/api/LexUnit.java)).
They are not an inflectional-form inventory and do not themselves encode which
sentence Segments belong to a Surface or which phraseme omissions license
`Partial`.

## German WordNet alternatives

The Global WordNet Association's current “Wordnets in the World” registry lists
GermaNet as academic-use and EuroWordNet German as restricted; it does not
offer an open German production dataset through those records
([official GWA registry](https://globalwordnet.github.io/resources/wordnets-in-the-world)).

OdeNet is an open German WordNet project distributed under CC BY-SA 4.0. Its
latest tagged release is `v1.4` at commit
`7bd6b85266e9d621cdb0a173c3e73d4d9575b811`; the project repository warns that
the current resource is automatically compiled and only partly manually
checked
([official repository](https://github.com/hdaSprachtechnologie/odenet),
[v1.4 release](https://github.com/hdaSprachtechnologie/odenet/releases/tag/v1.4),
[v1.4 license](https://github.com/hdaSprachtechnologie/odenet/blob/v1.4/LICENSE)).

Direct inspection of the tagged GWA-LMF XML gives:

- `w1367` for `Bank`, with two Senses in the same LexicalEntry; there is no
  second `Bank` LexicalEntry for the `Bänke` versus `Banken` paradigms;
- `w44390` for `Schloss`, with only the palace Synset and no lock use;
- `w7233` for `aufpassen` and `w11552` for `heulen`, each with Senses but no
  inflectional Form elements; and
- no `mit den Wölfen heulen` LexicalEntry
  ([pinned v1.4 XML](https://github.com/hdaSprachtechnologie/odenet/blob/v1.4/odenet/wordnet/deWordNet.xml)).

OdeNet is legally and technically downloadable, but it fails the two decisive
German identity boundaries and has no realization inventory. Its openness does
not make it a suitable authority for either ticket.

## Minimal adapter contracts

### Safe adapter available now: candidate evidence only

The following adapter is defensible for a pinned Wikidata research snapshot.
It intentionally cannot emit `ProposeNew`.

```ts
type AuthorityEdition = {
  authority: "wikidata-lexemes"
  dumpDate: "2026-07-29"
  dumpSha1: "1651a95b15bb9fac28d127f22c2d5def66e76c8c"
  boundaryPolicyVersion: string
}

type CandidateRequest = {
  languageId: "Q188" | "Q7737"
  contextualSurface: string
  citationHint?: string
  lexicalCategoryHint?: string
}

type AuthorityCandidate = {
  authorityLexemeId: `L${number}`
  canonicalAuthorityLexemeId: `L${number}`
  authorityRevision: number
  lemma: string
  lexicalCategoryId: string
  forms: Array<{
    formId: `${string}-F${number}`
    representations: Record<string, string>
    grammaticalFeatureIds: string[]
  }>
  senses: Array<{
    senseId: `${string}-S${number}`
    glosses: Record<string, string>
  }>
  matchedFormIds: string[]
  provenance: string[]
}

type CandidateResult =
  | { kind: "Candidates"; candidates: AuthorityCandidate[] }
  | {
      kind: "Abstain"
      reason:
        | "NoCoverage"
        | "AmbiguousBoundary"
        | "ConflictingRecords"
        | "IncompleteRecord"
    }
```

The fixed policy must hydrate search results, filter actual entity language and
category, follow redirects inside the pinned edition, canonicalize only
explicitly approved provider equality relations, preserve homographs, and
return `Abstain` on missing or conflicting coverage. It must never infer
identity from a lemma/form/grammar tuple and never translate “no search hit” to
`ProposeNew`.

### Additional contract required before #16 is instantiable

An eligible authority must add a frozen mapping from its canonical identity to
the catalog's opaque Entry ID and an explicit, authoritative rejection result:

```ts
type EntryResolution =
  | {
      kind: "Existing"
      entryId: string
      canonicalAuthorityLexemeId: string
      equalityEvidence: string[]
    }
  | {
      kind: "ProposeNew"
      rejectionEvidence: string[]
      coveredSearchSpace: string
    }
  | { kind: "Abstain"; reason: string }
```

`ProposeNew` is legal only when the named authority contract states that the
relevant search space is covered and returns an explicit rejection. None of
the public sources investigated here supplies that closed-world/rejection
semantics. The hybrid may let a model rank authority-backed candidates, but the
model cannot invent equality evidence or convert `Abstain` to `ProposeNew`.

### Additional contract required before #13 is instantiable

Whole Forms are insufficient. The authority-assisted arm needs records like:

```ts
type RealizationEvidence = {
  entryId: string
  citationSegments: string[]
  licensedFullPatterns: Array<{
    memberRoles: string[]
    ordering: "fixed" | "separable" | "discontinuous"
    mayIntervene: boolean
  }>
  licensedPartialPatterns: Array<{
    presentRoles: string[]
    omittedRoles: string[]
    coverage: "Partial"
  }>
  governedNonmemberPatterns: string[]
  inflectedRealizations: Array<{
    memberStrings: string[]
    grammaticalFeatures: Record<string, string>
  }>
  provenance: string[]
}
```

No investigated source supplies this complete structure. Wikidata can fill
some `inflectedRealizations`; GermaNet can potentially add particle/base-verb,
frames, and examples after licensing; DWDS can establish the existence of a
multiword headword. None licenses membership and partial coverage without a
separate curated German realization authority.

## Unblock conditions

#16 becomes instantiable only after one of these concrete changes:

1. the project formally accepts a named Wikidata dump as a candidate authority
   **and** supplies a hidden-evaluation-independent, expert-reviewed German and
   Russian boundary/canonicalization policy plus an explicit coverage/rejection
   source for `ProposeNew`; or
2. the project obtains a GermaNet commercial/R&D agreement and data, then
   demonstrates how its sense-specific LexUnits map to the ADR's
   polysemy-preserving Entries and how absence is interpreted; or
3. another authority provides the same identity, edition, rejection, and
   licensing guarantees.

#13 additionally requires a source or curated authority that explicitly
licenses discontinuous member roles, governed nonmembers, and partial
phraseme realizations. Combining today's Wikidata Forms, DWDS headwords, and
unlicensed GermaNet API schemas does not meet that requirement.
