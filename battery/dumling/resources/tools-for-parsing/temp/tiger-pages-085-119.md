<!-- PDF page 85 -->

# 7 Adjunkte

## 7.1 Klassifikation von Adjunkten

Vorläufig wird allen Adjunkten und Präpositionalobjekten das Label MO zugewiesen (ausgenommen: die MNRs in der NP, s.o.).

## 7.2 Komparativ-als

Die Konjunktion *als* kann zwei Funktionen erfüllen:

Die als-Phrase wird von einem Adjektiv im Komparativ lizensiert:

```text
(NP (NK:PIAT jemand) (NK:AP (HD:ADJA Besseres) (CC:NP (CM:KOKOM als) (HD:PPER ich))))
```

Die als-Phrase wird als Komparativdependent (CC) des Adjektivs annotiert. Als bekommt das Label CM (Komparativkonjunktion) und hat keinen Einfluß auf die syntaktische Kategorie der Phrase:

```text
(NP (NK:PIAT jemand) (NK:AP (HD:ADJA Besseres) (CC:S (CM:KOKOM als) (SB:PPER ich) (HD:VVFIN dachte))))
```

Ebenso:

```text
(NP (NK:PIS nichts) (CC:NP (CM:KOKOM als) (NK:ART eine) (NK:NN Hülle)))
```

<!-- PDF page 86 -->

## 7.3 Nichtkomparativ-als

Nichtkomparative als-Phrasen werden als PP annotiert und entweder als MO an den VP/S-Knoten angebunden, oder als MNR an einen NP/PP-Knoten. Wichtig: In diesen Fällen wird *als* als APPR getaggt.

### 7.3.1 MO-als

als-PPs, die sich anaphorisch auf das Subjekt- bzw. Akkusativobjekt beziehen, werden als MO annotiert, wenn sie echte Verbargumente sind oder das Verb modifizieren.

#### Echte Verbargumente

Die als-PP kann nicht weggelassen werden, ohne daß der Satz ungrammatisch wird oder sich die Bedeutung des Verbs ändert. Beispiele:

(68) a. er gilt [als guter Student]~MO~  
     b. ≠ er gilt

(69) a. er bezeichnete dich [als seinen besten Freund]~MO~  
     b. \*er bezeichnete dich

(70) a. er sieht sie als Repräsentanten derselben Archetypen, die…  
     b. ≠ er sieht sie

Ähnlich: j-n als etw. ansehen, beschimpfen, …

Die als-PP und ihre Bezugs-NP können nicht beide ins Vorfeld gestellt werden:

(71) \*dich als Verräter bezeichnete er

(72) \*er als guter Student gilt

#### Verbmodifikatoren

(73) Er kam als blinder Passagier an die Spree.

### 7.3.2 MNR-als

als-PPs werden als MNRs annotiert, wenn sie nur die Bezugs-NP und nicht das Verb modifizieren. Das ist insbesondere der Fall, wenn:

- die Bezugs-NP/PP ein relationales Substantiv ist und die als-PP zu seinem Argumentrahmen gehört oder diesen modifiziert:

<!-- PDF page 87 -->

```text
(S (SB:NP (NK:PPOSAT sein) (NK:NN Job) (MNR:PP (AC:APPR als) (NK:NN Kellner))) (HD:VVFIN gefällt) (DA:PPER ihm))
```

Begründung:

(74) Er jobbt als Kellner

```text
(S (SB:NP (NK:PPOSAT sein) (NK:NN Überleben) (MNR:PP (AC:APPR als) (NK:NN Gehilfe) (AG:NP (NK:ART eines) (NK:NN Schamanen)))) (HD:VVFIN erschien) (DA:PPER uns) (MO:ADJD unwahrscheinlich))
```

Begründung:

(75) Er überlebt als Gehilfe eines Schamanen

```text
(PP (AC:APPR in) (NK:PPOSAT Ihrer) (NK:NN Eigenschaft) (MNR:PP (AC:APPR als) (NK:NN Ministerpräsident)))
```

<!-- PDF page 88 -->

```text
(PP (AC:APPRART im) (NK:NN Wege) (AG:NP (NK:ART einer) (NK:NN Verpflichtung) (MNR:PP (AC:APPR als) (NK:NN Reisekader))))
```

Wichtig: Solche als-PPs sind fast immer adjazent zur Bezugs-NP:

(76) \*Sein Job gefällt als Kellner ihm sehr gut

- die Bezugs-NP ein Pronomen attribuiert:

(77) a. Sie dankten [ihm als ihrem Vertreter]~DA~  
     b. Das ist [für mich als CL-Studenten]~MO~ wichtig

Vorfeldtest - kein Problem:

(78) a. [Ihm als ihrem Vertreter]~DA~ dankten sie  
     b. [Für mich als CL-Studenten]~MO~ ist das wichtig

## 7.4 Wie

Innerhalb der NP wird ein durch *wie* eingeleiteter Vergleich wie nebenstehend annotiert:

```text
(NP (NK:NN Leute) (CC:NP (CM:KOKOM wie) (NK:NN Peter)))
```

<!-- PDF page 89 -->

Beachte: Die wie-Phrase kann ebenfalls von einigen Determinern, Adjektiven oder Adverbien lizensiert werden, z.B. *solch-wie*. Die wie-Phrase wird dann an den AP-Knoten angebunden, vgl.:

```text
(NP (NK:AP (HD:PIAT solche) (CC:NP (CM:KOKOM wie) (NK:NE Peter))) (NK:NN Leute))
```

```text
(NP (NK:ART ein) (NK:AP (HD:ADJA ähnlicher) (CC:AVP (CM:KOKOM wie) (HD:ADV gestern))) (NK:NN Tag))
```

```text
(NP (NK:ART ein) (NK:AP (MO:AP (HD:ADJD ähnlich)) (HD:ADJA hektischer) (CC:AVP (CM:KOKOM wie) (HD:ADV gestern))) (NK:NN Tag))
```

Taucht eine wie-Phrase in einer VP oder einem Satz auf, wird sie als MO annotiert.

```text
(S (SB:PPER Er) (HD:VAFIN hat) (OC:VP (HD:VVPP gelernt) (MO:NP (CM:KOKOM wie) (NK:ART ein) (NK:NN Besessener))))
```

<!-- PDF page 90 -->

```text
(S (SB:PPER Er) (HD:VAFIN hat) (OC:VP (MO:AP (CM:KOKOM wie) (HD:ADJD üblich)) (HD:VVPP gearbeitet)))
```

Zu *wie* in Koordinationen siehe Kapitel 9.

## 7.5 Idiosynkratische Einheiten

Für idiosynkratische Einheiten steht das Label ISU zur Verfügung. Sie werden als MO in die Verbphrase oder in den Satz gehängt.

Beachte: Die Beschreibung einer Struktur als ISU sollte immer als letzter Ausweg angesehen werden!

**Positiv-Liste**

(79) a. unter ferner liefen  
     b. so gut wie  
     c. [mehr]~ADV~ als (verdoppelt)  
     d. alles andere als in Kontexten wie:  
        nach den alles andere als unkomplizierten Verhandlungen

**Negativ-Liste**

(80) a. [[sage]~VVIMP~ [und]~KON~ [schreibe]~VVIMP~]~CS~  
     b. [ich weiß nicht wie]~S~  
     c. [[ab]~ADV~ [und]~KON~ [zu]~ADV~]~CAVP~  
        auch: nach und nach, nach wie vor, ab und an, durch und durch, hin und wieder  
     d. [[einzig]~ADJD~ [und]~KON~ [allein]~ADV~]~CO~  
     e. [ein [für allemal]~MNR~]~NP~, auch: ein ums andere Mal  
     f. [Stunde [für Stunde]~MNR~]~NP~  
     g. [von Hand [zu Hand]~MNR~]~PP~  
     h. [besser gesagt]~VP~

<!-- PDF page 91 -->

## 7.6 Anbindungsambiguitäten in VPs und Sätzen

Im folgenden werden einige Tests zur Bestimmung von Adjunktanbindung angegeben. Sie sind recht verläßlich, wobei man aber nicht vergessen sollte, daß sie die Semantik widerspiegeln, und nicht als der Wahrheit letzter Schluß angesehen werden sollten.

Ferner sollten diese Regeln nicht auf Fokuspartikeln (auch, nur, sogar, vornehmlich, vor allem usw.) angewendet werden.

### 7.6.1 Modalverben

Beispiele:

(81) Ursprünglich wollte er erst morgen fahren

(82) Du mußt nicht kommen

In solchen Fällen sollte die Anbindung von Adjunkten und der Negationspartikel nicht ihrem Skopus entsprechen (wenn möglich). Um den Skopus genau zu bestimmen, empfiehlt sich der folgende Test:

(83) du mußt nicht kommen →  
     a. Es ist nicht notwendig, daß du kommst  
     b. \*Es ist notwendig, daß du nicht kommst

Hier sollte also die hohe Anbindung (an *müssen*) gewählt werden.

Ähnlich:

(84) das junge Radio, das die Hörer von den Privaten wieder zurückholen kann →  
     a. ?Es ist wieder möglich, daß das Radio die Hörer von den Privaten zurückholt  
     b. Es ist möglich, daß das Radio die Hörer von den Privaten wieder zurückholt

daher auch die tiefe Anbindung von *wieder*.

Im Zweifelsfall so hoch wie möglich.

- müssen, sollen → Es ist notwendig, daß…
- können → Es ist möglich, daß…
- dürfen → Es ist erlaubt, daß…

Probleme bestehen noch bei der MO-Anbindung von Sätzen mit *sollen*, wenn *sollen* nicht im Sinne von *müssen*, sondern mehr um ein Gerücht o.ä. auszudrücken. Für diesen Fall konnte noch keine gute Lösung zur Umformung gefunden werden.

<!-- PDF page 92 -->

### 7.6.2 Kontrollverben

Bei Kontrollverben (versprechen, bitten, versuchen, …) ist ein ähnlicher Test anzuwenden: das verbale Komplement (OC) sollte extraponiert und - falls möglich - als daß-Satz formuliert werden:

(85) …daß er am Freitag zu kommen versprach  
     a. …am Freitag versprach er, daß er kommt  
     b. …er versprach, daß er am Freitag kommt

Die (im Kontext) plausiblere Lesart sollte gewählt werden.

### 7.6.3 Wahrnehmungsverben

Sehen, fühlen, hören und andere Wahrnehmungsverben können einen ACI nach sich ziehen (vgl. 86a) oder einen Akkusativ mit VVPP, wobei hier der Akkusativ das logische Subjekt der Passivstruktur ist (vgl. 86b):

(86) a. Ich sehe sie weinen.  
     b. Sie fühlt sich beobachtet.

In beiden Fällen gehört der Akkusativ als Objekt zum finiten Wahrnehmungsverb, v.a. weil dessen Argumentstruktur dies vorsieht. Alle anderen Adjunkte werden entsprechend ihrem Skopus angebunden, vgl.: 5.2.3

### 7.6.4 Hilfsverben

Die Hilfsverben (sein, werden, haben) haben keine eigene Semantik. Deswegen gilt bei den Hilfsverben die generelle Regel: Alle MOs zur VP! Einzige Ausnahme: Wie-Sätze, z.B. *wie die FR gestern berichtete* werden immer als MO an den Satzknoten gehängt, da die Wie-Phrase hier eher den ganzen Satz modifiziert.

### 7.6.5 Kopulakonstruktionen

Siehe 5.2.9.

<!-- PDF page 93 -->

# 8 Modifikatoren, Fokuspartikeln und Einzelfälle

Fokuspartikeln werden als Modifikatoren (MO) in die Phrase gehängt, die sie fokussieren.

Steht ein Modifikator oder eine Fokuspartikel vor einem Nebensatz oder vor einem erweiterten Infinitiv mit *zu*, sollten sie dort angebunden werden, und zwar so hoch wie möglich.

```text
(S (SB:PPER Sie) (HD:VVFIN tun) (OA:PDS das) (MO:VP (MO:ADV nur) (CP:KOUI um) (HD:VZ (PM:PTKZU zu) (HD:VVINF gewinnen))))
```

```text
(S (MO:S (MO:ADV Nur) (CP:KOUS weil) (SB:PPER sie) (OC:VP (NG:PTKNEG nicht) (HD:VVPP gewonnen)) (HD:VAFIN haben)) (HD:VAFIN sind) (SB:PPER sie) (PD:AP (MO:ADV sehr) (HD:ADJD traurig)))
```

## 8.1 Aber

Steht *aber* zwischen zwei Phrasen, wird es als CD annotiert:

(87) a. einige [[interessante]~CJ~, [aber]~CD~ [schwierige]~CJ~]~CAP~ Aufgaben  
     b. [Ich rief ihn]~CJ~, [aber]~CD~ [er kam nicht]~CJ~

In diesem Fall wird *aber* als KON getaggt.

Steht *aber* dagegen im Satz/in der VP, wird es als MO (zum S/VP-Knoten) annotiert:

(88) a. [Das]~OA~ [weiß]~HD~ [ich]~SB~ [aber]~MO~ [nicht]~NG~  
     b. [Ich rief ihn]~CJ~, [er kam [aber]~MO~ nicht]~CJ~

<!-- PDF page 94 -->

Hier ist ADV das passende PoS-Tag.

## 8.2 Allein

…wie auch, nur, eher usw. Beachte:

```text
(S (SB:NP (NK:PDS Das) (MO:ADV allein)) (HD:VVFIN koste) (OA:NP (NK:CARD 500) (NK:NN Stellen)))
```

## 8.3 Auch

Die Anbindung von *auch* hängt stark vom Kontext ab. So kann der Satz:

(89) Ich bin auch zum EDEKA gegangen

folgendermaßen analysiert werden:

„Ich bin zum Aldi und Plus gegangen, und auch zum EDEKA“

```text
(S (SB:PPER ich) (HD:VAFIN bin) (OC:VP (MO:PP (MO:ADV auch) (AC:APPRART zum) (NK:NN EDEKA)) (HD:VVPP gegangen)))
```

„ich habe zu Hause aufgeräumt und den Rasen gemäht, und außerdem bin ich zum EDEKA gegangen“

```text
(S (SB:PPER ich) (HD:VAFIN bin) (OC:VP (MO:ADV auch) (MO:PP (AC:APPRART zum) (NK:NN EDEKA)) (HD:VVPP gegangen)))
```

<!-- PDF page 95 -->

Wird *auch* betont, wie in:

(90) ich bin AUCH zum Edeka gegangen

bezieht es sich meistens auf die Topik-Konstituente, was wie folgt paraphrasiert werden kann:

„auch ich bin zum EDEKA gegangen“

```text
(S (SB:NP (NK:PPER ich) (MO:ADV auch)) (HD:VAFIN bin) (OC:VP (MO:PP (AC:APPRART zum) (NK:NN EDEKA)) (HD:VVPP gegangen)))
```

## 8.4 Ausgerechnet

wie *auch*…

## 8.5 Bereits, schon

Bevorzugt wird hier eine Anbindung an den VP/S-Knoten. Diese Regel kann jedoch nicht verallgemeinert werden, da die Anbindung von *schon* und *bereits* stark kontextabhängig ist. Es muß also von Fall zu Fall entschieden werden.

## 8.6 D.h.

D.h. wird zunächst als Satz zusammengefasst, der dann als Modifikator in eine Phrase eingehängt werden kann.

```text
(NP (NK:ART eine) (NK:CAP (CJ:ADJA angemessene) (CJ:AP (MO:S (SB:PDS d.) (HD:VVFIN h.)) (HD:ADJA friedliche))) (NK:NN Lösung))
```

<!-- PDF page 96 -->

```text
(S (SB:PPER Er) (HD:VVFIN spürte) (SVP:PTKVZ nach) (DA:NP (NK:PN (PNC:NN "Blüte")) (APP:NP (MO:S (SB:PDS d.) (HD:VVFIN h.)) (NK:ART dem) (NK:ADJA größten) (NK:ADJA bekannten) (NK:NN Geldfälscher))))
```

Aber:

```text
(S (SB:PDS Das) (HD:VVFIN heißt) (OC:S (CP:KOUS dass) (MO:ADV jetzt) (SB:NN Schluss) (HD:VAFIN ist)))
```

## 8.7 Ebenso wie

Die ebenso wie-Phrase wird als MNR an die NP angehängt, auf die sie sich bezieht.

```text
(S (SB:NP (NK:NN Computerlinguisten) (MNR:AVP (HD:ADV ebenso) (CC:NP (CM:KOKOM wie) (NK:NN Pfadfinder)))) (HD:VAFIN sind) (PD:VVPP vertreten))
```

<!-- PDF page 97 -->

Anmerkung: Diese Regel wurde oftmals nicht angewandt, und zwar in den Fällen, in denen die ebenso wie-Phrase und die Bezugs-NP sehr weit auseinander standen. Hier wurde die ebenso wie-Phrase als MO an die VP gehängt.

## 8.8 Eher (als)

```text
(S (SB:PPER Er) (HD:VAFIN hätte) (OC:VP (OA:NP (NK:ART einen) (NK:NN Roman) (MNR:AVP (HD:ADV eher) (CC:NP (CM:KOKOM als) (NK:ART einen) (NK:NN Zeitungsartikel)))) (HD:VVPP geschrieben)))
```

## 8.9 Ein paar/bißchen/wenig/…

```text
(NP (NK:NP (NK:ART ein) (NK:PIAT paar)) (NK:ADJA schäbige) (NK:NN Möbel))
```

```text
(NP (NK:AP (MO:NP (NK:ART ein) (NK:PIAT paar)) (HD:CARD hundert)) (NK:NN Leute))
```

<!-- PDF page 98 -->

Aber:

```text
(NP (NK:ART ein) (NK:NN Paar) (NK:NN Würstchen))
```

```text
(AP (MO:NP (NK:ART ein) (NK:PIAT bißchen)) (HD:ADJD müde))
```

```text
(NP (NK:NP (NK:ART ein) (NK:PIAT wenig)) (NK:NN Salz))
```

## 8.10 erst einmal

In der Verbindung *erst einmal* wird *erst* als HD und *einmal* als MO unter einem AVP-Knoten annotiert.

## 8.11 Etwa

Etwa soll immer als MO annotiert werden, auch wenn es dem Bezugswort folgt, vgl.:

(91) [[etwa]~MO~ [mit]~AC~ [Peter]~NK~]~PP~

(92) [[mit]~AC~ [Peter]~NK~ [etwa]~MO~]~PP~

## 8.12 Immer

### 8.12.1 Immer besser/schlechter/…

In solchen Phrasen wird *immer* als Gradmodifikator des Adjektivs analysiert (Label MO):

[[immer]~MO~ [besser]~HD~]~AP~

### 8.12.2 Immer (mal) wieder

Der idiosynkratische Ausdruck *immer wieder*, *immer mal wieder* wird als AVP annotiert, in der *wieder* der Kopf ist (da *wieder* semantisch am stärksten ist):

[[immer]~MO~ ([mal]~MO~) [wieder]~HD~]~AVP~

<!-- PDF page 99 -->

### 8.12.3 Immer noch

vgl. hierzu 8.20.1

## 8.13 Innerhalb

Innerhalb wird immer als AC annotiert:

(93) [[innerhalb]~AC~ [Deutschlands]~NK~]~PP~

(94) [[innerhalb]~AC~ [von]~AC~ [10]~NK~ [Tagen]~NK~]~PP~

## 8.14 Insbesondere

Fokuspartikel, zu annotieren wie *auch, nur, vor allem, etwa*….

## 8.15 Je, jeweils

*je* und *jeweils* werden meist als MO annotiert:

(95) [[je]~MO~ [nach]~AC~ [Bedarf]~NK~]~PP~

Wenn *je* als Präposition im Sinne von *pro* gebraucht ist, z.B. wie in *drei Mark je Schüler*, sollte es als APPR getaggt werden; die Phrase wird dann als PP annotiert.

(96) [[je]~AC~ [Einwohner]~NK~]~PP~

<!-- PDF page 100 -->

### 8.15.1 je-desto

Konstruktionen mit *je-desto/um so* werden wie nebenstehend annotiert:

```text
(S (PD:AP (MO:AVP (CC:S (PD:AP (MO:ADV je) (HD:ADJD jünger)) (SB:PPER du) (HD:VAFIN bist)) (HD:ADV desto)) (HD:ADJD besser)) (HD:VAFIN sind) (SB:NP (NK:PPOSAT deine) (NK:NN Chancen)))
```

```text
(AP (MO:AVP (CC:S (PD:AP (MO:ADV je) (HD:ADJD jünger)) (SB:PPER du) (HD:VAFIN bist)) (HD:AVP (AVC:KOUI um) (AVC:ADV so))) (HD:ADJD besser))
```

## 8.16 Leid

Wird *leid* prädikativ verwendet, so erhält es das pos-Tag ADJD und die Funktion PD. In allen anderen Fällen ist es NN auf der Wort- und OA auf der Funktionsebene. Dasselbe gilt für die Annotation von *recht*.

(97) Sie ist [[das Warten]~OA~ leid~HD~]~PD~

(98) Es tut ihm [leid]~OA~

<!-- PDF page 101 -->

## 8.17 Manch

Ähnlich wie bei *solch* und *welch*, verbinden sich unflektierte Formen mit dem nachfolgenden Adjektiv:

```text
(NP (NK:AP (MO:AVP (MO:ADV so) (HD:PIAT manch)) (HD:ADJA lärmenden)) (NK:NN Freizeitkapitän))
```

```text
(NP (NK:AP (MO:PIAT manch) (HD:ADJA lärmenden)) (NK:NN Freizeitkapitän))
```

```text
(NP (NK:PIAT mancher) (NK:ADJA lärmende) (NK:NN Freizeitkapitän))
```

```text
(NP (NK:AP (MO:PIAT manch) (HD:ART ein)) (NK:ADJA lärmender) (NK:NN Freizeitkapitän))
```

## 8.18 Mehr

### 8.18.1 10 Leute mehr/keine Leute mehr/nicht mehr/…

In solchen Phrasen wird *mehr* an den NP/PP-Knoten angebunden und als MO annotiert:

(99) a. [[keine]~NK~ [Leute]~NK~ [mehr]~MO~]~NP~  
     b. [[nichts]~NK~ [mehr]~MO~]~NP~  
     c. [[Vieles]~NK~ [mehr]~MO~]~NP~

<!-- PDF page 102 -->

Bei *nicht mehr* existiert natürlich keine NP und die Struktur wird wie nebenstehend annotiert. Beachte, daß eine solche Phrase das Funktionslabel NG bekommt!

```text
(S (SB:PPER ich) (HD:VVFIN weiß) (OA:PPER es) (NG:AVP (HD:PTKNEG nicht) (MO:ADV mehr)))
```

## 8.19 Nicht

Bei *nicht* vor Adjektiv oder Adverb bestehen oft Anbindungsdifferenzen, je nachdem, ob man *nicht* einen engeren oder weiteren Skopus gibt:

```text
(S (OA:PDS Das) (HD:VAFIN hast) (SB:PPER du) (OC:VP (NG:PTKNEG nicht) (MO:AP (MO:ADV besonders) (HD:ADJD gut)) (HD:VVPP erklärt)))
```

oder

```text
(S (OA:PDS Das) (HD:VAFIN hast) (SB:PPER du) (OC:VP (MO:AP (NG:PTKNEG nicht) (MO:ADV besonders) (HD:ADJD gut)) (HD:VVPP erklärt)))
```

Ähnlich:

<!-- PDF page 103 -->

```text
(S (SB:PPER Er) (HD:VMFIN will) (NG:PTKNEG nicht) (MO:ADV unbedingt) (OC:VP (MO:PP (AC:APPR nach) (NK:PN (PNC:NE New) (PNC:NE Jersey))) (HD:VVINF ziehen)))
```

oder

```text
(S (SB:PPER Er) (HD:VMFIN will) (MO:AVP (NG:PTKNEG nicht) (HD:ADV unbedingt)) (OC:VP (MO:PP (AC:APPR nach) (NK:PN (PNC:NE New) (PNC:NE Jersey))) (HD:VVINF ziehen)))
```

Für beide Möglichkeiten können Argumente gefunden werden.

In der Regel sollen folgende Einheiten, sofern sie nebeneinander stehen, in einer AVP zusammengefasst werden:

*nicht als HD:*

- nicht mehr
- noch nicht
- gar nicht
- überhaupt nicht
- längst nicht
- lange nicht
- nicht einmal
- nicht gerade
- nicht länger

<!-- PDF page 104 -->

```text
(S (SB:PPER Ich) (HD:VMFIN mag) (NG:AVP (HD:PTKNEG nicht) (MO:ADV mehr)))
```

*nicht als NG:*

- nicht nur
- nicht zuletzt
- nicht allein
- nicht immer
- nicht sofort
- nicht gleich
- nicht überall
- nicht erst
- nicht ganz
- nicht selten

Bei *nicht selten* gilt dies allerdings nur, wenn *selten* als ADV im temporalen Sinne von *nicht häufig* steht, als ADJD im Sinne von *rar, kostbar* wird *selten* von *nicht* getrennt.

```text
(S (SB:PPER Wir) (HD:VAFIN sind) (MO:AVP (NG:PTKNEG nicht) (HD:ADV immer)) (MO:PP (AC:APPR in) (NK:NE Saarbrücken)))
```

Steht eine AVP in Verbindung mit Adjektiven, so verbinden sie sich zu einer AP.

```text
(AP (MO:AVP (NG:PTKNEG nicht) (HD:ADV ganz)) (HD:ADJD leicht))
```

Die Verbindung *nicht von ungefähr* wird jedoch flach als PP annotiert, wobei *nicht* NG ist.

<!-- PDF page 105 -->

Im Gegensatz dazu sollen die nachstehenden Einheiten auch in Kontaktstellung nicht zusammengefasst werden:

- auch nicht
- zunächst nicht
- doch nicht

Für dreigliedrige nicht+ADV-Verbindungen werden folgende Konventionen festgelegt:

- längst nicht mehr: nur *nicht mehr* wird als AVP zusammengefasst
- noch längst nicht: alle Komponenten bilden eine AVP mit *nicht* als Kopf

## 8.20 Noch

### 8.20.1 Temporal-noch

In *immer noch, heute noch* usw. wird *noch* als Kopf (HD) der AVP annotiert.

### 8.20.2 Noch stärker, besser, schlechter…

Vgl. *immer stärker/besser/…* unter 8.12.1.

## 8.21 Nur

Nur verhält sich ähnlich wie *auch* mit der Einschränkung, daß Beispiele wie 90 nicht möglich sind. In der Verbindung *nur noch* wird *nur* als HD und *noch* als MO unter einem AVP-Knoten annotiert.

## 8.22 Recht

In prädikativer Funktion ADJD und PD: Das ist recht.

Sonst NN und OA: Du hast recht.

siehe *leid*

## 8.23 Schon

Vgl. hierzu 8.5

## 8.24 Selbst

Bei *selbst* muß man zwei Lesarten unterscheiden.

<!-- PDF page 106 -->

### 8.24.1 Selbst=Selber

Läßt sich *selbst* als *selber* paraphrasieren und kann es nicht vor das Nomen verschoben werden, ist es ein postnominaler Modifikator, der als MNR annotiert wird:

```text
(S (SB:NP (NK:NE Ravel) (MNR:ADV selbst)) (HD:VAFIN hat) (OC:VP (OA:NP (NK:PIAT kein) (NK:NN Wort)) (HD:VVPP gesagt)))
```

Das gilt aber nicht, wenn *selbst* durch *allein* paraphrasiert werden kann:

```text
(S (SB:NE Ravel) (HD:VAFIN hat) (OC:VP (OA:PDS das) (MO:ADV selbst) (HD:VVPP komponiert)))
```

### 8.24.2 Selbst=Sogar

Die zweite Lesart kann als *sogar* paraphrasiert werden - sogar Ravel…. *selbst* ist hier als Fokusquantor mit dem Label MO zu versehen.

```text
(S (SB:NP (MO:ADV selbst) (NK:NE Ravel)) (HD:VAFIN hätte) (OC:VP (OA:PRF sich) (HD:VVPP amüsiert)))
```

## 8.25 So

### 8.25.1 so sehr - so sehr

Dies ist im Grunde eine Komparativ-Konstruktion und wird deshalb analog zu je-desto annotiert:

<!-- PDF page 107 -->

```text
(S (MO:AVP (CC:S (MO:AVP (MO:ADV so) (HD:ADV sehr)) (SB:PPER sie) (OA:PPER ihn) (HD:VVFIN brauchen)) (HD:AVP (MO:ADV so) (HD:ADV sehr))) (HD:VMFIN müssen) (SB:PPER sie) (OC:VP (OC:VP (MO:PP (MO:ADV auch) (AC:APPR ohne) (NK:PPER ihn)) (HD:VVINF leben)) (HD:VVINF lernen)))
```

## 8.26 Sogar

Ähnlich wie *nur, auch, ausgerechnet,*…. Vgl. auch die Anmerkungen zu *selbst=sogar* (Nummer 8.24.2).

## 8.27 Solch

Wir unterscheiden die unflektierte Form *solch* und die flektierten Formen *solcher/e/…*. Die ersteren verbinden sich immer mit dem nachfolgenden Adjektiv, letztere werden direkt als NK annotiert.

### 8.27.1 Solch ein

```text
(NP (NK:AP (MO:PIAT solch) (HD:ART ein)) (NK:ADJA interessanter) (NK:NN Beitrag))
```

<!-- PDF page 108 -->

### 8.27.2 Solch + ADJA

```text
(NP (NK:AP (MO:PIAT solch) (HD:ADJA interessante)) (NK:NN Beiträge))
```

```text
(NP (NK:ART einen) (NK:AP (MO:PIAT solch) (HD:ADJA fragwürdigen)) (NK:NN Qualitätsgewinn))
```

### 8.27.3 Solch + Flexionsendung

```text
(NP (NK:ART einen) (NK:PIAT solchen) (NK:ADJA interessanten) (NK:NN Beitrag))
```

### 8.27.4 Solch + wie

Beachte:

Die `@surfaceIndex`-Suffixe machen in diesem Beispiel die diskontinuierliche AP (*solche … wie du*) und ihre Einbettung über das finite Verb hinweg eindeutig.

```text
(S (SB:NP (RE:S (SB:PWS Wer@1) (OA:NP (NK:AP (HD:PIAT solche@2) (CC:NP (CM:KOKOM wie@5) (NK:PPER du@6))) (NK:NN Überzeugung@3)) (HD:VVFIN hat@4)) (PH:ART der@8)) (HD:VVFIN gehört@9) (MO:PP (AC:APPR in@10) (NK:PPOSAT unsere@11) (NK:NN Partei@12)))
```

<!-- PDF page 109 -->

## 8.28 Statt, außer, neben

PPs, die mit *statt, außer* oder *neben* eingeleitet werden, werden als MNR an den NP-Knoten gehängt.

```text
(S (HD:VAFIN hat) (SB:PPER sie) (OC:VP (OA:NP (MNR:PP (AC:APPR Statt) (NK:NN Reis)) (NK:NN Nudeln)) (HD:VVPP gekocht)))
```

## 8.29 Umgerechnet

Umgerechnet kann stellungsabhängig entweder im S oder in einer AP als MO fungieren. Vgl. 4.2.

```text
(S (MO:ADJD Umgerechnet) (HD:VVFIN beträgt) (SB:NP (NK:ART die) (NK:NN Summe)) (MO:NP (NK:CARD zwei) (NK:NN Euro)))
```

```text
(S (SB:NP (NK:ART Die) (NK:NN Summe)) (HD:VVFIN beträgt) (MO:NP (NK:AP (MO:ADJD umgerechnet) (HD:CARD zwei)) (NK:NN Euro)))
```

<!-- PDF page 110 -->

## 8.30 Vielmehr als

Vgl. *eher als, ebenso wie*.

## 8.31 Vor allem

Wie *nur, etwa, auch* usw.

## 8.32 Welch

Vgl. *solch, manch*.

```text
(NP (NK:AP (MO:PIAT welch) (HD:ADJA interessante)) (NK:NN Beiträge))
```

```text
(NP (NK:PIAT welche) (NK:ADJA interessanten) (NK:NN Beiträge))
```

## 8.33 Wenn

### 8.33.1 wenn-dann, wenn-so

Diese Konstruktion ist als PH-RE-Abhängigkeit zu annotieren.

```text
(S (MO:AVP (RE:S (CP:KOUS wenn) (SB:PPER er) (HD:VVFIN kommt)) (PH:ADV dann)) (HD:VVFIN bringe) (SB:PPER ich) (OA:PPER ihn) (SVP:PTKVZ um))
```

<!-- PDF page 111 -->

```text
(S (MO:AVP (RE:S (CP:KOUS wenn) (SB:PPER er) (NG:PTKNEG nicht) (HD:VVFIN kommt)) (PH:ADV so)) (HD:VAFIN haben) (SB:PPER wir) (MO:ADV wenigstens) (OA:NN Ruhe))
```

<!-- PDF page 112 -->

# 9 Koordination

Als erste Richtlinie gilt zunächst: In NPs, APs und PPs werden die zu koordinierenden Elemente direkt zusammengefaßt und bilden wieder eine Konstituente. In VPs und Sätzen verbinden sich die VP- und S-Knoten zuerst mit den Dependenten auf ihrer Seite der Koordination und werden dann zu einer koordinierten Phrase zusammengefaßt (siehe Beispiele).

## 9.1 Grundstruktur der NP-, AP-, PP-Koordination

Eine Koordination besteht aus zwei oder mehr Konjunkten (CJ) und eventuell einem o. mehreren koordinierenden Konjunktionen (CD). Die Kategorie der Koordination entspricht normalerweise der der Konjunkte, wird aber zusätzlich mit dem Präfix C versehen:

```text
(CNP (CJ:NE Peter) (CD:KON und) (CJ:NP (NK:PPOSAT sein) (NK:NN Schwager)))
```

Weitere Beispiele:

- NP, NP KON NP → CNP
- NP, PN, NN → CNP
- AP KON AP → CAP

Koordinationen von zwei unterschiedlichen Elementen (z.B. AP+PP) erhalten das Label CO.

Beachte: die Präsenz einer koordinierenden Konjunktion ist nicht notwendig. Aufzählungen werden ebenso annotiert.

### 9.1.1 Koordinierende Konjunktionen

- und
- aber
- denn
- doch
- wie
- sowie
- bis
- beziehungsweise / bzw.
- respektive / resp.

Sonderfall: *Geschweige denn* wird als AVP annotiert → [[geschweige]~HD~ [denn]~MO~]~AVP~. Die AVP bekommt das Funktionslabel CD.

### 9.1.2 Binäre koordinierende Konjunktionen

- entweder oder

<!-- PDF page 113 -->

- weder noch
- sowohl als

Jede Konjunktion bekommt das Label CD:

```text
(CNP (CD:KON weder) (CJ:NE Peter) (CD:KON noch) (CJ:NE Paul))
```

Beachte: sowohl - als auch - *auch* wird als Teil des rechten Konjunkts annotiert:

```text
(CNP (CD:KON sowohl) (CJ:NE Peter) (CD:KON als) (CJ:NP (MO:ADV auch) (NK:NE Paul)))
```

Nicht nur, sondern auch soll als unär koordinierte Phrase annotiert werden (mit CD=sondern):

```text
(CNP (CJ:NP (MO:AVP (NG:PTKNEG nicht) (HD:ADV nur)) (NK:NE Peter)) (CD:KON sondern) (CJ:NP (MO:ADV auch) (NK:NE Paul)))
```

Ebenso:

<!-- PDF page 114 -->

```text
(S (SB:PPER ich) (HD:VAFIN habe) (OC:VP (OA:CNP (CJ:NP (NG:PTKNEG nicht) (NK:NE Peter)) (CD:KON sondern) (CJ:NE Paul)) (HD:VVPP gesehen)))
```

```text
(CAVP (CJ:ADV nach) (CD:KON wie) (CJ:ADV vor))
```

Wenn mehr als zwei Elemente koordiniert werden müssen, ist es möglich, dass zunächst zwei Elemente koordiniert werden und diese Koordination wiederum Konjunkt einer übergeordneten, zweiten Koordination mit dem dritten Element ist. Eine solche hierarchische Struktur von Koordinationen ist aber nur zulässig, wenn zwei zu koordinierende Elemente einen engeren Zusammenhang bilden als diese beiden mit dem dritten Element. Im Zweifelsfall sollen Koordinationen flach annotiert werden. Die unterschiedlichen Konjunktionen (z.B. *und* vs. *sowie*) verweisen nicht automatisch auf eine Hierarchie.

```text
(CS (CJ:CS (CJ:S (SB:PPER Ich) (HD:VAFIN bin) (PD:NN Köchin)) (CD:KON und) (CJ:VP (HD:VVFIN biete) (OA:PPER mich) (SVP:PTKVZ an))) (CJ:S (SB:PPER ich) (HD:VMFIN kann) (MO:ADV wenigstens) (OC:VP (OA:NP (NK:ART eine) (NK:ADJA gute) (NK:NN Suppe)) (HD:VVINF kochen))))
```

Im diesem Satz haben die beiden ersten Teilsätze im SB ein gemeinsames Argument. Sie werden deshalb zuerst koordiniert, woraus sich die hierarchische Einbettung der Koordination in die folgende Koordination mit dem dritten Teilsatz ergibt.

<!-- PDF page 115 -->

```text
(CS (CJ:S (SB:NP (NK:ART Die) (NK:NN Inflation)) (HD:VVFIN liegt) (MO:PP (AC:APPR bei) (NK:CARD 13) (NK:NN Prozent))) (CJ:S (SB:NP (NK:ART die) (NK:NN Produktion)) (HD:VAFIN ist) (OC:VVPP gesunken)) (CJ:S (SB:NP (NK:ART die) (NK:NN Arbeitslosigkeit)) (HD:VVFIN steigt)))
```

Demgegenüber werden in diesem Satz alle drei Teilsätze flach koordiniert.

## 9.2 Koordination von satzeinleitenden Konjunktionen (CPs)

Koordinierte CPs bekommen das Knotenlabel CCP (coordinated complementiser), vgl. 5.2.1.

## 9.3 Koordination von Nominal- und Präpositionalphrasen

Einleuchtend:

```text
(S (SB:PPER Er) (HD:VVFIN kauft) (OA:CNP (CJ:NN Äpfel) (CD:KON und) (CJ:NN Birnen)))
```

```text
(PP (AC:APPR für) (NK:CNP (CJ:NE Peter) (CD:KON und) (CJ:NE Sabine)))
```

Man muß die Semantik beachten: Sind sowohl die Äpfel als auch die Birnen grün und befinden sie sich im Korb, wird die folgende Struktur annotiert:

```text
(NP (NK:ART die) (NK:ADJA grünen) (NK:CNP (CJ:NN Äpfel) (CD:KON und) (CJ:NN Birnen)) (MNR:PP (AC:APPRART im) (NK:NN Korb)))
```

<!-- PDF page 116 -->

Hier hingegen bezieht sich das Adjektiv *grün* und der Artikel nur auf die Äpfel:

```text
(CNP (CJ:NP (NK:ART die) (NK:ADJA grünen) (NK:NN Äpfel)) (CD:KON und) (CJ:NP (NK:ADJA rote) (NK:NN Birnen)))
```

Regeln für den Fall, dass ein Modifikator bei einem Konjunkt steht:

Bezieht sich ein Modifikator auf beide Konjunkte einer CNP bzw. CAP, so wird er diesen in einer NP bzw. AP übergeordnet. Im Zweifelsfall wird der Modifikator jedoch dem ersten Glied zugeordnet. Anders verfahren wir bei CPPs - hier wird ein Modifikator immer dem ersten Glied zugeordnet.

```text
(NP (MO:ADV nur) (NK:CNP (CJ:NP (NK:ART den) (NK:NN Mann)) (CD:KON und) (CJ:NP (NK:PPOSAT seine) (NK:NN Frau))))
```

Noch problematisch: An dieser Stelle sollte auch auf noch bestehende Unklarheiten verwiesen werden bei Ausdrücken wie *Mädchen von 3 bis 6 Jahren*. Ist dies eine PP, die eine CAP beinhaltet, oder eine CPP, oder zwei getrennte PPs?

## 9.4 Koordinierte Adjektive

Werden zwei attributiv verwendete Adjektive durch ein Komma getrennt und kann dieses Komma durch „und“ ersetzt werden, werden die Adjektive in einer CAP zusammengefaßt:

```text
(NP (NK:ART eine) (NK:CAP (CJ:ADJA friedliche) (CJ:ADJA demokratische)) (NK:NN Lösung))
```

<!-- PDF page 117 -->

## 9.5 Koordinierte Präpositionen

Koordinierte Präpositionen werden als CAC (coordinated AC) annotiert:

[[in und um]~CAC~ Frankfurt]~PP~

## 9.6 Koordination von Verbalphrasen und Sätzen

Bei der Koordination von Verbalphrasen und Sätzen kann es vorkommen, daß Konstituenten in einem der Konjunkte fehlen. Diese werden durch sekundäre Kanten angezeigt. Bei echten Ambiguitäten wird eine sekundäre Kante gezogen.

```text
(CS (CJ:S (SB:NE Paul) (HD:VVFIN schläft)) (CD:KON und) (CJ:S (SB:NE Peter) (HD:VVFIN geht) (MO:PP (AC:APPR in) (NK:ART den) (NK:NN Kindergarten))))
```

```text
(S (SB:NE Steffi) (HD:VAFIN hat) (OC:CVP (CJ:VVPP geschlafen) (CD:KON und) (CJ:VVPP geträumt)))
```

<!-- PDF page 118 -->

In den folgenden vier Bäumen kennzeichnet `#id` den Zielknoten einer sekundären Kante; `(EDGE:@id)` ist die im Bild grau gezeichnete sekundäre Kante.

```text
(CS (CJ:S (SB:PPER#sb1 Er) (HD:VVFIN kauft) (OA:@oa1)) (CD:KON und) (CJ:S (SB:@sb1) (HD:VVFIN verkauft) (OA:CNP#oa1 (CJ:NN Äpfel) (CD:KON und) (CJ:NN Birnen))))
```

```text
(S (SB:PPER Er) (HD:VAFIN hat) (OC:CVP (CJ:VP (MO:ADV#mo1 heute) (OA:NN#oa2 Äpfel) (HD:VVPP gekauft)) (CD:KON und) (CJ:VP (MO:@mo1) (OA:@oa2) (HD:VVPP verkauft))))
```

```text
(CS (CJ:S (SB:PPER Er) (HD:VVFIN#hd1 kauft) (OA:NN Äpfel)) (CD:KON und) (CJ:S (SB:PPER sie) (HD:@hd1) (OA:NN Birnen)))
```

```text
(CS (CJ:S (OC:VP (OA:PPER#oa3 Ihn) (HD:VVPP geliebt)) (HD:VAFIN#hd2 hat) (SB:NE Maria)) (CD:KON und) (CJ:S (HD:@hd2) (SB:NE Paul) (OC:VP (OA:@oa3) (HD:VVPP gehaßt))))
```

<!-- PDF page 119 -->

Hauptsätze werden typischerweise durch *doch, und, oder, aber* und *denn* koordiniert.

Fehlt ein Konjunkt, so dass die Konjunktion am Satzanfang erscheint, so erhält diese das Funktionslabel JU (Junktor) im zugehörigen Hauptsatz.

```text
(S (JU:KON Und) (SB:NP (NK:ART die) (NK:ADJA alte) (NK:NN Politik)) (HD:VVFIN funktioniert) (NG:AVP (HD:PTKNEG nicht) (MO:ADV mehr)))
```

```text
(S (JU:KON Und) (MO:S (CP:KOUS weil) (SB:NE Tom) (PD:AP (HD:ADJD größer) (CC:NP (CM:KOKOM als) (NK:PPER ich))) (HD:VAFIN ist)) (HD:VMFIN konnte) (SB:PPER er) (OC:VP (OA:NP (NK:ART den) (NK:NN Gitarristen)) (HD:VVINF sehen)))
```
