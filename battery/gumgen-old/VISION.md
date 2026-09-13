# Working with user-provided text

### Original: 
We are given a string containing a sentence in unknown language.

The 99% of the cases here is valid and grammatiocally correct prose from a book or script.

But the 1% is nosely transcribed speech or the slang-heavy message from whatsup or 4chan.

The system shall work with both. 

To do this we build a pipeline

Example:
```
br a w tkae a w. u 

r hmi frfr
```


## 1. Split in clickable segments aka "Segmentation"

DumXXX's notion of the "Segmentation" differs from the general linguistiscs. 

As a learner-facing tool, we present the text as the sequence of smallest clickable units that can point to the biggest applicable grammatical unit in Dumling.

For example, in "[אֲנִי] [בַּ][בַּיִת]" the "בַּ" deserves to be a separate clickable unit (leading to the fusion of "בְּ־" and  "הַ")

Or in "[Что] [поделать], [придется] [по-волчьи] [выть]" both "по-волчьи" and "выть" are separable units unlimatly leading to the Idiom "С волками жить — по-волчьи выть"

The goal of Segmentation is limited to splitting the input string into the normalised-to-the-space clickable segments:

Input: ```
br a w tkae a w. u 

r hmi frfr
```

Semantic Output: ```
[braw] [tkae] [a] [w]. [u] [r] [hmi] [frfr]
```
TS Output: ```
{ decision: "Accepted", language: "en", segments: [
    { kind: "ResolvableText", text: "braw" },
	{ kind: "Whitespace", text: " " },
    { kind: "ResolvableText", text: "tkae" },
    ...
] }
```


### 1.1 Intake: "Stiching" + Target Language Resolution

#### 1.1.1 Stiching
In order to combat possible noise in the input, Dumling supports typo evidence, variant Surfaces, and Partial Attestations.

To do that, however it expects all clickabe Segments to be "resolvable" as standalong unit.

For example, "w" in "br a <target>w</target> tkae a w" is not a valid stadalone unit. It is not a Morpheme, Lexeme, etc. It's a "blown-off" finger from the valid unit of "braw"

"w" in "w" in "br a w tkae a <target>w</target>" is a standalone unit. Target Classification can decide whether it points to the word itself or participates with the segments for "tkae" and "a" in the incorrectly spelled slang phrase "take a w". Grammatical Resolution later records typo and realization-coverage evidence in an Attestation.

The "stiching" is a step to make from 
Input: ```
br a w tkae a w. u 

r hmi frfr
```

Stiched Output: ```
braw tkae a w. u r hmi frfr
```

The policy of the stiching is: "Do the minimal sticing of the blown-off fingers"

#### 1.1.2 Target Language Resolution
Dumling will eventually support all UD-compatible languages. For now it supports 3. But the dumbgen targrts only de for now.

We do not know the lang of the input. But the later resolution is hardcore depenent on <TagertLang>

This is why, the first step of the Segmentation is an llm call string -> {stiched text with the resolved language}

The stiched text here is just string. So the output lengths it: ~len(orig) + const (for lang and resolutoin housekeeping)


### 1.2 Segmentation

We need to find a way for non-lmm split of ths stitched text into the "clickable segments": ```
[   { kind: "ResolvableText", text: "braw" },
    { kind: "Whitespace", text: " " },
    { kind: "ResolvableText", text: "tkae" }, ...]
```

For most of the langs, this might me a simple split by space / punctuation. But:
A) ideally, we d need to know if one of the "segments" is just unparsable jipbberish (like "awfwtgfs")
B) ideally, we d like to have an escape hatch for mixed langs
C) DEFINETELY we need to split collapced together units in diff segments "[אֲנִי] [בַּ][בַּיִת]" 

Although we would prefer to have A and B here, they could be later handeled in LLM calls responcible for the classifiaction of a clicked segment. 

C is a core reason this step exists. Hopefully, Intl.Segmenter (or some like Stanza) can help here


## 2. Dumgen resolution of a clicked segemnt

### 2.1 Target Classification

As a learner-facing tool, the initial high-level policy resolves the biggest sufficiently fixed grammatical unit first.

Click on "Good" in "[Good] [morning], [mother]" and the Analysis Target contains both "Good" and "morning", routed as Phraseme / DiscourseFormula.

Click on `heulte` in `Obwohl er anderer Meinung war, heulte er mit` and the Analysis Target contains `heulte` and `mit`, routed as Phraseme / Idiom. It does not yet resolve the Lemma `mit den Wölfen heulen`.

Conventionality alone is not enough. In `Der Ausschuss trifft eine Entscheidung`, `trifft`, `eine`, and `Entscheidung` are separate Lexeme targets. The high-level policy groups governed prepositions, idioms, and other genuinely fixed expressions, but not ordinary non-idiomatic Collocations.

Target Classification is one policy-specific prompt after deterministic Source Segmentation. It receives the Segmented Sentence and clicked ResolvableText index, then returns exactly one internal Analysis Target or Unresolved.

At the end of 2.1, the Analysis Target contains only:
- Family / Kind of the targeted biggest applicable grammatical unit
- ordered indices of the ResolvableText Segments that participate in that unit, including the clicked Segment

It contains no Surface, Lemma, Attestation, sentence identity, or click provenance. The high-level policy never selects a Morpheme; lower-level drill-down uses a separate Target Classification policy.

### 2.2 Dumling (Grammatical) resolution 
The system selects the appropriate prompt for the resolved {Lang, Family, Kind}, passes in the marked context `Obwohl er anderer Meinung war, <TARGET>heulte</TARGET> er <TARGET>mit</TARGET>`, and receives the structured grammatical output used to construct a click-independent Attestation linked to its Surface and Lemma.

The Lemma's canonical form (for example, `mit den Wölfen heulen`) is resolved in 2.2, not in Target Classification.

### 2.3 Reading (Meaning) resolution 
This is how we resolve holonyms / plasemy. The "emoji as semantic identity" + "do not split semntic penneis policy".

The only piece, that we have working prompt for (as per 8 Aug 2026).

Read
`battery/dumgen/src/promptsmith/production/prompt-source/reading-resolution/de/prompt-source.ts`
`battery/dumgen/src/promptsmith/production/prompt-source/reading-resolution/de/golden-corpus/cases/hand-verivied/adp.ts`


## 3 Relations 
// out of scope for now
// how we treat the traslations, definitions, synonyms, etc


---
---

# Drill down into the resolved dummling unit 

// out of scope for now, but we do keep it in mind

TLDR: "Intake" is skipped. "Segmentation" and "Target Classification" will be done differently: in Phrasemes' notes, the lexemes will become the targetes. In Lexemes' notes the morphenmes will become the targets.

The rest of teh resolution is the same
