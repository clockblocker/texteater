# Emoji Description conventions

How to write a Reading's Emoji Description in dumcorpus's gold and Authored
Inventories. Drafters, the spec-review app and Dumgen's generator prompt
follow it. [ADR 0031] holds the principles. This page holds the conventions
the user ruled or finished drafting batches settled (#700, #595). A case they
don't decide goes to the user.

Examples are German gold unless marked. "Being applied" marks a ruling that
the inventory or gold doesn't show yet.

## What a description is

- An identity label. It tells the Readings of one Lemma apart ([ADR 0002],
  [ADR 0031]). The app shows it beside the Lemma, but it is not a learner
  mnemonic.
- 1–4 emoji.
- The target's meaning in the sentence, not the sentence's scene. `öffnen` is
  🔓. A 🪟 taken from *Sie öffnete das Fenster* would tie the Reading to
  windows.
- The Reading's function. It repeats no grammar the Lemma or its Surfaces
  carry: every personal pronoun is 👈, and `sein` the possessive is 🔐, not
  👨🔐 ([ADR 0044]).
- Stored without variation selectors (U+FE0E, U+FE0F) or skin-tone modifiers:
  `🕰`, not `🕰️`. Order and ZWJ sequences count: `🏠➡` is leaving, `➡🏠`
  arriving.

## When to split a Lemma into Readings

Split only when the meanings are distinct enough that an emoji-generating
model would tell them apart from the sentence. Functional or grammatical
shades of one meaning stay one Reading. When in doubt, fold. The test holds
for authored, drafted and generated Readings alike.

| Lemma | Readings | |
| --- | --- | --- |
| `noch` | ⏳ 'still', ➕ 'in addition' | split |
| `Mutter` | 👩‍👧 'mother', 🔩 'nut' | split |
| `stehen bleiben` | 🛑 'stop working', 📌 'be left unchanged' | split |
| `Uhr` | 🕐🔢 'o'clock', ⌚ 'clock, watch' | split: the numbered hour is no instrument |
| `weh` | ⚠ 'warning' (*Wehe dir!*), 😖 'lament' (*Weh mir!*) | split |
| `hinauslaufen` | 🏃🚪 'run out', ➡🎯 'amount to' (*auf etwas hinauslaufen*) | split, one Lemma: `auf` is valency |
| `lassen` (VERB) | 👐 'let', 🗣👉 'have done' (causative, as the AUX), 🤝 'let's' (*lass uns*) | split |
| `so` | 🔧 | fold: manner and degree are one Reading |
| `lang` (ADJ) | 📏 | fold: length in space and in time |
| `leidtun` | 😔 | fold: regret and pity; the sentence says what one is sorry about |

When a Lemma gains a second Reading, name the Duden or DWDS sense you picked
in the target's rationale. When you fold dictionary senses, cite ADR 0031.

## Judge the sense on the record's sentence

Only the Spec Record's own sentence decides which Reading a target takes.
Context outside it, such as the novel a quote comes from, doesn't count, just
as a record judges a pronoun's referent by its own sentence ([ADR 0046]).
When the sentence leaves the sense open, take the broadest Reading: `ein Ende
machen` in a Schnitzler quote stays 🔚.

Look the word up in Duden or DWDS whenever a sense or a Lemma is unclear.
Wiktionary is a secondary source.

## Reuse

- Reuse the gold description when the sense is the same. Search the gold for
  the Lemma and its word family before you write a new one.
- Keep a word family consistent across Kinds: `Arbeit` and `arbeiten` are
  both 💼. An ADJ and an ADV of one concept share a description:
  `wahrscheinlich` 🤔👍, `viel` 🔢.
- Different Lemmas may share an emoji. A description only has to separate the
  Readings of one Lemma, so near-synonyms can match: `mild` and `sanft` 🪶,
  `selbst` and `selber` 🫵.

## Stand-ins and pins

- An object may stand for a property or a body part only when nothing better
  exists and the object reads unambiguously as it. Stand-ins are the weakest
  labels (`Rücken` 🎒, `Nacken` 🧣), so say in the rationale why you used one.
- When the nearest emoji carries a misleading extra meaning, add a second
  that pins the meaning down. 🫃 alone reads "pregnant", so `Bauch` is 🫃🍽.

## Person nouns

A noun's lexical sex shows in its figure. A pronoun's grammatical gender never
does.

| Noun | Figure | Gold |
| --- | --- | --- |
| `-in` nouns and inherently female nouns | female | `Ärztin` 👩‍⚕, `Chefin` 👩‍💼👑, `Frau` 👩 |
| generic masculines, which cover everyone | neutral 🧑 | `Arzt` 🧑‍⚕, `Chef` 🧑‍💼👑, `Bewohner` 🏠🧑, `Nachbar` 🏘🧑 |
| inherently male nouns | male | `Mann` 👨, `Vater` 👨‍👧 |

Kinship nouns follow `Mutter` 👩‍👧: `Vater` 👨‍👧, `Bruder` 👬, `Schwester`
👭, `Oma` 👵, `Onkel` 👪👨.

## Mentioned words

A word quoted for its spelling or form takes its ordinary Reading: in *Als
Grundform wird mild angegeben*, `mild` is 🪶. When the sentence gives the word
no sense, take its first dictionary sense or its merged core sense (ADR 0031)
and say which in the rationale.

## Locutions and Sayings

- Describe the meaning of the whole unit: `auf den Arm nehmen` 😜, *Der Apfel
  fällt nicht weit vom Stamm* 👪🧬.
- Keep the unit's own image only when it is transparent: *Wo Rauch ist, ist
  auch Feuer* 💨🔥.
- A modified or truncated Saying gets the whole Saying's description, its
  Lemma's. *Kaffee oder Tee, das ist hier die Frage* attests *Sein oder
  Nichtsein, das ist hier die Frage* ⚖🤔.
- Judge on the recorded route. Whether the unit should be a Locution or Saying
  at all is a review question (#668, #633), not the description's.
- A sense that needs fixed words of its own is a Locution, not a Reading of
  its verb: *Da kann ich nichts für* is `nichts dafür können` 🫵😬, and
  `können` keeps 💪. A sense that only governs a free complement stays a
  Reading: *auf einen Kompromiss hinauslaufen* is `hinauslaufen` ➡🎯 (#877).
- In a Breakdown Record each word takes its literal Reading. The whole
  meaning belongs to the Locution or Saying: in `so oder so` 🔁, `so` is 🔧.

## Closed-class units

A Lemma in the [Authored Inventory][inventory] takes one of its authored
Readings when one fits. Look it up there before you draft one. On a Closed
Route (German AUX, DET, PRON and PART) its authored Readings are all it has.
On an Open Route they may miss a sense: that sense gets a Reading of its own
beside them (ADR 0021, #877).

One set of series markers runs through the German adverbs, pronouns and
determiners ([ADR 0029]). The marker comes first, then the emoji of what the
word asks about or stands for.

| Marker | Series | Examples |
| --- | --- | --- |
| ❓ | interrogative | `wann` ❓🕰, `wer` ❓👤, `worauf` ❓🔝, `welcher` ❓ |
| 🧩 | relative | `wo` 🧩📍, `was` 🧩📦, relative `der` 🧩 |
| ❔ | indefinite: the `irgend-` adverbs, `irgendein`, `irgendwelcher` | `irgendwann` ❔🕰, `irgendein` ❔ |
| 🚫 | negative | `nie` 🚫🕰, `nirgends` 🚫📍, `keineswegs` 🚫🔧, `kein` 🚫, `niemand` 🚫, `nicht` 🚫 |
| 🌐 | total | `alle` 🌐, `jeder` 🌐, `jedermann` 🌐 |
| none | demonstrative adverb | `da` 📍, `dann` 🕰, `so` 🔧, `dafür` 🎁, `hierfür` 🎁 |
| 🤝 | reciprocal pronominal adverb (being applied) | `miteinander` 🤝🔗, `aufeinander` 🤝🔝 |

`irgendwer` and `irgendetwas` carry no ❔: they are 👤 and 📦, like `jemand`
and `etwas`.

| After the marker | Meaning | Examples |
| --- | --- | --- |
| 🕰 | time (it replaced ⏰) | `wann` ❓🕰, `dann` 🕰, `damals` 🕰 (being applied) |
| 📍 | place | `wo` ❓📍, `hier` 📍, `dort` 📍 |
| 🛬 and 🛫 | direction to and from | `wohin` ❓🛬, `dahin` 🛬, `woher` ❓🛫, `dorther` 🛫 |
| 🔧 | manner | `wie` ❓🔧, `irgendwie` ❔🔧 |
| 🤔 | reason | `warum` ❓🤔; causal `darum` and `daher` 🤔 (being applied) |
| 👤 and 📦 | person and thing | `wer` ❓👤, `was` ❓📦 |
| the preposition's emoji | pronominal adverbs | `darauf` 🔝, `damit` 🔗, `wofür` ❓🎁 |

Other authored units have one emoji for the whole Reading:

| Emoji | Units |
| --- | --- |
| 👈 | every personal pronoun, in every person, case and number: `ich`, `dich`, `Sie` |
| 🔐 | possessives: `mein`, `sein`, `meiner` |
| 👉 | the definite article and demonstrative PRON and DET: `der`, `dieser`, `jener` |
| 1⃣ | the indefinite article `ein` and PRON `einer` |
| 2⃣ | `beide`, PRON and DET |
| 🪞 | reflexive `sich` (`einander` is 🤝) |
| 🏁 | perfect AUX `haben` and `sein` |
| 🔗 | infinitive `zu` and the preposition `mit` only. An ADP's governed-preposition Reading will take 🔗 too when the ADP stage authors it. |

## Time units

- `Tag`, `Woche`, `Monat`, the weekdays and similar units are plain 📅, with
  no count or ordinal. `Samstag` is 📅. Being applied: its gold still holds
  📅6⃣.
- Day adverbs in gold: `heute` 👇📅, `gestern` 🔙📅, `morgen` 📅.

## Numerals

German numerals from `null` to `zwölf` are authored as a closed set, and every
other numeral is 🔢.

| Numeral | Description |
| --- | --- |
| `null` … `zehn` | 0⃣ … 🔟 |
| `elf`, `zwölf` | 1⃣1⃣, 1⃣2⃣ |
| every other: `dreizehn`, `siebenhundert`, `Tausend`, `Million`, years, fractions, `Komma` decimals, ranges, `-fach` | 🔢 |
| ordinals up to `zwölfte` | the cardinal's: `erste` 1⃣, `zweite` 2⃣ |
| ordinals from `dreizehnte` | 🔢 |
| Roman numerals such as `XIV` | their own NUM Lemma, 🔢 |

`Hunderte`, `Tausende`, `Million`, `Milliarde` and their kin stay 🔢 as
NOUNs.

Being applied: the inventory doesn't hold `null` to `zwölf` yet, and gold
still carries the older digit-by-digit labels (`dreizehn` 1⃣3⃣, `Million`
🔟⬆6⃣).

## Proper nouns

Start from the kind, drawn as its common noun is (🏙 city, 🛣 street, 🎭 play).

| Name | Description | Gold |
| --- | --- | --- |
| city with a mainstream specific emoji | that one emoji | `Berlin` 🐻, `München` 🥨, `New York` 🗽 |
| any other city | 🏙 | `Köln`, `Hamburg`, `Kyjiw`, Hebrew `ירושלים` |
| country | its flag | `Schweiz` 🇨🇭, `Niederlande` 🇳🇱 |
| person of a country | figure, emblem and flag | `Angela Merkel` 👩🏛🇩🇪, `Johann Wolfgang von Goethe` 👨✍🇩🇪 |
| national institution | kind and flag | `SPD` 🗳🇩🇪, `ZDF` 📺🇩🇪, `Deutsche Bank` 🏦🇩🇪, Hebrew `צה"ל` 🪖🇮🇱 |
| region, river, street, island | the kind alone | `Saarland` 🗺, `Rhein` 🏞, `Vorderreihe` 🛣, `Balearen` 🏝 |
| first name | its lexical sex | `Anna` 👩, `Peter` 👨 |
| surname | 🧑 | `Schwarzkopf` 🧑, `Treibel` 🧑 |
| work | kind and motif | `Prozess` 📖⚖, `Zauberflöte` 🎭🪈, `Nibelungenlied` 📜🐉 |
| character | figure and motif | `Gregor Samsa` 👨🪲, `Odradek` 🧵⭐ |

Flags appear only for countries, people of a country and national
institutions.

A proper noun's Core gender may be null. Its Surface then takes gender from
an owned article or an agreeing adjective in the sentence ([ADR 0040]).

## Interjections and formulas

| Function | Emoji | Gold |
| --- | --- | --- |
| thanks | 🙏 | `danke`, `vielen Dank`, Hebrew `תודה` |
| greeting or farewell | 👋 | `hallo`, `guten Morgen`, `auf Wiedersehen`, Hebrew `שלום` |
| apology | 🙇 | `Entschuldigung`; the Locution VERB `um Verzeihung bitten` too |

[ADR 0002]: ../../../../docs/adr/0002-lemma-is-grammatical-identity-and-reading-is-semantic-identity.md
[ADR 0029]: ../../../../docs/adr/0029-keep-preposition-government-out-of-lemma-identity.md
[ADR 0031]: ../../../../docs/adr/0031-resolve-readings-through-the-emoji-description-alone.md
[ADR 0040]: ../../../../docs/adr/0040-make-the-article-a-satellite-of-its-phrase-head.md
[ADR 0044]: ../../../../docs/adr/0044-identify-german-pronouns-by-pillar-stem-and-referent.md
[ADR 0046]: ../../../../docs/adr/0046-generate-a-syncretism-for-each-form-only-its-referent-resolves.md
[inventory]: ../../src/inventories/de/
