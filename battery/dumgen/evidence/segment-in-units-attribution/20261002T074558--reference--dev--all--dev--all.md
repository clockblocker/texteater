# Membership attribution: 20261002T074558--reference--dev--all, dev all

Reference policy `idiom=0.6,fixed=0.3,saying=0.4` replayed behind the lab's stages: 3492 of 3492 case-repetitions reproduce the cached outputs exactly, with 0 fresh jev calls (model jev-1.13.0). 112 cases whose run failed a repetition are left out.

Units counted under a cause are the wrong-by-majority or flipping ones outside the records in review (#739); those are counted apart, not relabelled. Headroom counts those whose exact gold arrangement was nominated and that failed later, in judgment or assembly.

| Bucket | Gold units | Wrong by majority | Flipping | not nominated | rejected | accepted | assembly | ambiguous | Disputed gold (#739) | Headroom for #754 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| one piece | 1126 | 46 | 6 | 0 | 0 | 47 | 2 | 2 | 0 | 51 |
| multi-piece Lexeme | 265 | 45 | 7 | 7 | 20 | 14 | 2 | 7 | 0 | 43 |
| contiguous Locution | 83 | 20 | 5 | 1 | 17 | 3 | 0 | 3 | 0 | 23 |
| discontinuous Locution | 105 | 26 | 7 | 1 | 15 | 12 | 0 | 3 | 0 | 30 |
| Saying | 63 | 11 | 1 | 0 | 8 | 2 | 1 | 0 | 0 | 11 |
| all | 1642 | 148 | 26 | 9 | 60 | 78 | 5 | 15 | 0 | 158 |

## How near the rejected judgments came

Per rejected unit, the highest share or Noul among the unsupported judged connections inside it, over its wrong repetitions. The floors are 0.5 to 0.7.

| Bucket | under 0.1 | 0.1 to 0.3 | 0.3 to 0.5 | 0.5 and over |
|---|---|---|---|---|
| one piece | 0 | 0 | 0 | 0 |
| multi-piece Lexeme | 4 | 3 | 10 | 3 |
| contiguous Locution | 4 | 3 | 2 | 8 |
| discontinuous Locution | 1 | 1 | 6 | 7 |
| Saying | 0 | 3 | 3 | 2 |
| all | 9 | 10 | 21 | 20 |

## Examples

### not nominated

- discontinuous Locution: gold [bleibt stehen] → [bleibt] [stehen] (de/der-alte-aufzug-bleibt-nie-zwischen-den-etagen-stehen)
- multi-piece Lexeme: gold [stand gegenüber] → [stand] [gegenüber] (de/der-musiktempel-zwischen-nadelbaeumen-versteckt-stand)
- multi-piece Lexeme: gold [den Schweizerhäusern] → [den] [Schweizerhäusern] (de/der-musiktempel-zwischen-nadelbaeumen-versteckt-stand)
- contiguous Locution: gold [blieb stehen] → [blieb] [stehen] (de/die-abk-blieb-stehen-obwohl-der-satz-ueberarbeitet-wurde)
- multi-piece Lexeme: gold [lasse schneiden] → [lasse] [schneiden] (de/ich-lasse-mir-morgen-die-haare-schneiden)
- multi-piece Lexeme: gold [schneiden lassen] → [schneiden] [lassen] (de/ich-will-mir-morgen-die-haare-schneiden-lassen)

### rejected

- multi-piece Lexeme: gold [zu dich stellen] → [zu] [dich] [stellen] (de/aber-wie-es-auch-liegen-mag-marcell-wir-muessen-uns-nun)
- multi-piece Lexeme: gold [übrig blieb] → [übrig] [blieb] (de/als-er-die-treppe-hinunterging-wusste-er-dass-ihm-nichts-zu)
- contiguous Locution: gold [bitte schön] → [bitte] [schön] (de/am-schalter-bestellte-sie-zwei-fahrkarten-nach-bonn-bitte)
- contiguous Locution: gold [und so weiter] → [und] [so weiter] (de/anna-kauft-obst-gemuese-und-so-weiter-auf-dem-markt)
- discontinuous Locution: gold [Blase Trübsal] → [Blase] [Trübsal] (de/blase-jetzt-nicht-laenger-truebsal)
- multi-piece Lexeme: gold [Da für] → [Da] [für] (de/da-kann-ich-nichts-fuer)

### accepted

- one piece: gold [schlüssig] → [schlüssig machen] (de/aber-wie-es-auch-liegen-mag-marcell-wir-muessen-uns-nun)
- one piece: gold [machen] → [schlüssig machen] (de/aber-wie-es-auch-liegen-mag-marcell-wir-muessen-uns-nun)
- one piece: gold [Ziel] → [eine Ziel] (de/alles-was-stirbt-hat-vorher-eine-art-ziel-eine-art)
- one piece: gold [Tätigkeit] → [eine Tätigkeit] (de/alles-was-stirbt-hat-vorher-eine-art-ziel-eine-art)
- multi-piece Lexeme: gold [trifft zu] → [trifft bei zu] (de/alles-was-stirbt-hat-vorher-eine-art-ziel-eine-art)
- one piece: gold [bei] → [trifft bei zu] (de/alles-was-stirbt-hat-vorher-eine-art-ziel-eine-art)

### assembly

- multi-piece Lexeme: gold [lief auf hinaus] → [lief hinaus] [auf] (de/die-verhandlung-lief-schliesslich-auf-einen-kompromiss)
- one piece: gold [Nein] → [Nein danke] (de/moechten-sie-noch-kuchen-nein-danke-ich-bin-satt)
- one piece: gold [danke] → [Nein danke] (de/moechten-sie-noch-kuchen-nein-danke-ich-bin-satt)
- Saying: gold [Nicht jene die streiten sind zu fürchten sondern jene die ausweichen] → [Nicht jene die streiten] [sind] [zu] [fürchten] [sondern jene die ausweichen] (de/nach-dem-grammatikbeispiel-eine-entscheidung-treffen-folgte)
- multi-piece Lexeme: gold [Pass auf auf] → [Pass auf] [auf] (de/pass-auf-dich-auf)

### ambiguous

- multi-piece Lexeme: gold [eine Art] → [eine Ziel] [Art] (de/alles-was-stirbt-hat-vorher-eine-art-ziel-eine-art)
- multi-piece Lexeme: gold [eine Art] → [eine Tätigkeit] [Art] (de/alles-was-stirbt-hat-vorher-eine-art-ziel-eine-art)
- multi-piece Lexeme: gold [danke für] → [Danke für] [danke] (de/als-beide-kisten-endlich-oben-standen-erwiderte-der)
- multi-piece Lexeme: gold [Da hin] → [Da gehe hin] (de/da-gehe-ich-morgen-hin)
- multi-piece Lexeme: gold [des Kinder‐] → [des Jugendbuchs] [Kinder‐] (de/die-seiten-des-kinder-und-jugendbuchs-fehlen)
- one piece: gold [in] → [biss in den Rasen] (de/er-biss-in-den-rasen)

