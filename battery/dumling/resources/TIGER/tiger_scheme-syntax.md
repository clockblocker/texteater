<!-- PDF page 1 -->

# TIGER Annotationsschema

> **Transcription note.** Syntax diagrams are encoded as one-line Penn Treebank-style brackets extended with TIGER edge labels. A nonterminal is `(CATEGORY (EDGE:CATEGORY ...))`; a terminal is `(EDGE:POS token)`. `--` records an unlabeled punctuation edge, `@surfaceIndex` preserves surface order in discontinuous trees, `#id` plus `(EDGE:@id)` represents a secondary edge, and `?:?` records labels left blank in the source.

Stefanie Albert — alberta@rz.uni-potsdam.de  
Jan Anderssen — andersjn@ims.uni-stuttgart.de  
Regine Bader — regine@coli.uni-sb.de  
Stephanie Becker — stbe@coli.uni-sb.de  
Tobias Bracht — tobias@bloomfield.phil1.uni-potsdam.de  
Sabine Brants — kramp@coli.uni-sb.de  
Thorsten Brants — thorsten@coli.uni-sb.de  
Vera Demberg — demberva@ims.uni-stuttgart.de  
Stefanie Dipper — dipper@ims.uni-stuttgart.de  
Peter Eisenberg — eisenberg@rz.uni-potsdam.de  
Silvia Hansen — hansen@coli.uni-sb.de  
Hagen Hirschmann — hirschm@rz.uni-potsdam.de  
Juliane Janitzek — janitzek@rz.uni-potsdam.de  
Carolin Kirstein — ckirsten@rz.uni-potsdam.de  
Robert Langner — rlangner@rz.uni-potsdam.de  
Lukas Michelbacher — michells@ims.uni-stuttgart.de  
Oliver Plaehn — plaehn@coli.uni-sb.de  
Cordula Preis — cordula@coli.uni-sb.de  
Marcus Pußel — mapu@coli.uni-sb.de  
Marco Rower — rower@coli.uni-sb.de  
Bettina Schrader — schradba@ims.uni-stuttgart.de  
Anne Schwartz — anne@coli.uni-sb.de  
George Smith — smithg@rz.uni-potsdam.de  
Hans Uszkoreit — uszkoreit@coli.uni-sb.de

Projekt-Info: http://www.ims.uni-stuttgart.de/projekte/TIGER/

24. Juli 2003

Projekt TIGER  
Aufbau eines linguistisch interpretierten Korpus des Deutschen

Universität des Saarlandes  
FR 8.7 Computerlinguistik

Universität Stuttgart  
Institut für Maschinelle Sprachverarbeitung

Universität Potsdam  
Institut für Germanistik

<!-- PDF page 2 -->

<!-- Leerseite -->

<!-- PDF page 3 -->

# Inhaltsverzeichnis

1 Vorwort — 8

2 Nominalphrasen — 9  
2.1 Kern-NP — 9  
2.1.1 Adjektivphrasen — 10  
2.1.2 Numeralien — 11  
2.1.3 Datums- und Zeitangaben — 13  
2.1.4 Syntax der Eigennamen — 14  
2.1.5 Fremdsprachliches Material — 18  
2.1.6 Maßangaben — 18  
2.2 Genitive — 19  
2.3 Postnominale PPs und Adverbien — 20  
2.4 Appositionen und Parenthesen — 22  
2.4.1 Appositionen — 22  
2.4.2 Parenthesen — 24  
2.5 Argumente von Substantiven — 27  
2.5.1 VP und Satzargumente — 27  
2.5.2 Präpositionalobjekte — 29  
2.6 Relativsätze — 30  
2.7 MOs in NPs — 32

3 Präpositionalphrasen — 34  
3.1 Basisstruktur — 34  
3.2 Die Präposition *zwischen* — 35  
3.3 *Kurz vor* und ähnliche Konstruktionen — 36  
3.4 *Darüber hinaus* - Präpositionaladverbien — 37

4 Adjektivphrasen — 38  
4.1 Basisstruktur — 38  
4.2 Adjektivisch gebrauchte Verbformen — 39  
4.3 Komplexe Adjektive — 41  
4.4 Modifizierte Determiner — 41  
4.5 Komparativ — 43

<!-- PDF page 4 -->

4.6 Superlativ — 46  
4.7 Argumente von Adjektiven — 47

5 Verbphrasen und Sätze — 48  
5.1 Basisstruktur — 48  
5.2 Grammatische Funktionen — 50  
5.2.1 Komplementierer (CP) — 50  
5.2.2 Subjekt (SB) — 51  
5.2.3 Akkusativobjekt (OA, OA2) — 51  
5.2.4 Dativ (DA) — 55  
5.2.5 Genitivobjekt (OG) — 56  
5.2.6 Präpositionalobjekte (OP) — 56  
5.2.7 Obligatorische Modifikatoren (OMO) — 61  
5.2.8 Funktionsverbgefüge (CVC) — 62  
5.2.9 Prädikative (PD) — 63  
5.2.10 *Um zu, ohne zu* - Präpositionen in VPs — 66  
5.2.11 *Ohne daß, statt daß* — 66  
5.2.12 Anrede (VO) — 66  
5.2.13 VPs und Sätze als Argumente von Verben — 67  
5.3 Passiv — 69  
5.3.1 Vorgangspassiv — 69  
5.3.2 Zustandspassiv — 70  
5.4 Verblose Sätze — 72  
5.5 Direkte und Indirekte Rede — 73  
5.6 Diskurspartikeln - DM — 75

6 Platzhalterphrasen — 76  
6.1 Pronominaladverbien — 76  
6.2 *Es* — 77  
6.3 Verbale Argumente von Gradadverbien — 80  
6.4 *So, wie* — 83  
6.5 Weitere Platzhalterkonstruktionen — 83

<!-- PDF page 5 -->

7 Adjunkte — 85  
7.1 Klassifikation von Adjunkten — 85  
7.2 Komparativ-*als* — 85  
7.3 Nichtkomparativ-*als* — 86  
7.3.1 MO-*als* — 86  
7.3.2 MNR-*als* — 86  
7.4 *Wie* — 88  
7.5 Idiosynkratische Einheiten — 90  
7.6 Anbindungsambiguitäten in VPs und Sätzen — 91  
7.6.1 Modalverben — 91  
7.6.2 Kontrollverben — 92  
7.6.3 Wahrnehmungsverben — 92  
7.6.4 Hilfsverben — 92  
7.6.5 Kopulakonstruktionen — 92

8 Modifikatoren, Fokuspartikeln und Einzelfälle — 93  
8.1 *Aber* — 93  
8.2 *Allein* — 94  
8.3 *Auch* — 94  
8.4 *Ausgerechnet* — 95  
8.5 *Bereits, schon* — 95  
8.6 *D.h.* — 95  
8.7 *Ebenso wie* — 96  
8.8 *Eher (als)* — 97  
8.9 *Ein paar/bißchen/wenig/...* — 97  
8.10 *erst einmal* — 98  
8.11 *Etwa* — 98  
8.12 *Immer* — 98  
8.12.1 *Immer besser/schlechter/...* — 98  
8.12.2 *Immer (mal) wieder* — 98  
8.12.3 *Immer noch* — 99  
8.13 *Innerhalb* — 99  
8.14 *Insbesondere* — 99

<!-- PDF page 6 -->

8.15 *Je, jeweils* — 99  
8.15.1 *je-desto* — 100  
8.16 *Leid* — 100  
8.17 *Manch* — 101  
8.18 *Mehr* — 101  
8.18.1 *10 Leute mehr/keine Leute mehr/nicht mehr/...* — 101  
8.19 *Nicht* — 102  
8.20 *Noch* — 105  
8.20.1 Temporal-*noch* — 105  
8.20.2 *Noch stärker, besser, schlechter...* — 105  
8.21 *Nur* — 105  
8.22 *Recht* — 105  
8.23 *Schon* — 105  
8.24 *Selbst* — 105  
8.24.1 *Selbst = Selber* — 106  
8.24.2 *Selbst = Sogar* — 106  
8.25 *So* — 106  
8.25.1 *so sehr - so sehr* — 106  
8.26 *Sogar* — 107  
8.27 *Solch* — 107  
8.27.1 *Solch ein* — 107  
8.27.2 *Solch + ADJA* — 108  
8.27.3 *Solch + Flexionsendung* — 108  
8.27.4 *Solch + wie* — 108  
8.28 *Statt, außer, neben* — 109  
8.29 *Umgerechnet* — 109  
8.30 *Vielmehr als* — 110  
8.31 *Vor allem* — 110  
8.32 *Welch* — 110  
8.33 *Wenn* — 110  
8.33.1 *wenn-dann, wenn-so* — 110

<!-- PDF page 7 -->

9 Koordination — 112  
9.1 Grundstruktur der NP-, AP-, PP-Koordination — 112  
9.1.1 Koordinierende Konjunktionen — 112  
9.1.2 Binäre koordinierende Konjunktionen — 112  
9.2 Koordination von satzeinleitenden Konjunktionen (CPs) — 115  
9.3 Koordination von Nominal- und Präpositionalphrasen — 115  
9.4 Koordinierte Adjektive — 116  
9.5 Koordinierte Präpositionen — 117  
9.6 Koordination von Verbalphrasen und Sätzen — 117

Anhang — 120

A Literatur — 120

B Stuttgart-Tübingen-Tagset STTS — 121  
B.1 Ursprüngliches STTS — 121  
B.2 Vorgenommene Änderungen am STTS — 123

C Listen von Präpositionalobjekten und Modifikatoren — 124  
C.1 Präpositionalobjekte — 124  
C.2 Modifikatoren — 132

D Listen von Funktionsverbgefügen — 136  
D.1 Alphabetische Liste von Funktionsverben und deren PPs — 136  
D.2 Nicht als FVG sehen wir folgende Wendungen an: — 148

<!-- PDF page 8 -->

# 1 Vorwort

Das vorliegende TIGER-Annotationsschema wurde mehrfach überarbeitet und geändert. Es baut auf dem NEGRA-Annotationsschema auf.

Viele Änderungen, die während der Arbeit in den Projekten durchgeführt wurden, ergaben sich durch Probleme, die beim Annotieren auftraten. Es wurde versucht, die Regeln den konkret auftretenden Problemen anzupassen, gleichzeitig aber die Konsistenz und Systematik mit den anderen Regeln zu wahren. Hierbei konnte oft keine Lösung gefunden werden, die allen Fällen gerecht wird. Das vorliegende Schema stellt daher einen Kompromiß dar. Einige strittige Punkte, zu denen (bis jetzt) keine einheitliche Regelung gefunden wurde, sind im Schema mit Anmerkungen, Fragen u.ä. festgehalten.

Das vorliegende Schema ist also eine vorläufige Arbeitsfassung und erhebt keinen Anspruch auf Vollständigkeit.

<!-- PDF page 9 -->

# 2 Nominalphrasen

Knotenname: NP

| Kante | Englisch | Deutsch |
|---|---|---|
| AG | Attribute, Genitive | Genitivattribut |
| APP | APPosition | Apposition |
| CC | Comparative Complement | Vergleichskomplement |
| CM | CoMparative conjunction | Vergleichskonjunktion |
| MNR | Modifier of Np to the Right | postnominaler Modifikator |
| MO | MOdifier | Modifikator |
| NG | NeGation | Negation *nicht* |
| NK | Noun Kernel | Element der Kern-NP |
| OC | Object Clausal | klausales Objekt |
| OP | Object Prepositional | Präpositionalobjekt |
| PAR | PARenthesis | Parenthese |
| PG | Phrasaler Genitive | anstelle eines Genitivs verwendete *von*-PP |
| RC | Relative Clause | Relativsatz |

In den linearen Baumkodierungen bezeichnet `--` die in den Abbildungen unbeschriftete Kante zu Satzzeichen.

## 2.1 Kern-NP

Eine NP besteht zunächst aus einer Reihe von pronominalen, substantivischen und adjektivischen Kernelementen (NP kernel elements, NK). Ihre genauere Unterteilung kann aufgrund der Part-of-Speech bzw. kategorialen Information vorgenommen werden, so daß sich eine Unterscheidung auf der Ebene der Funktionslabels erübrigt.

```text
(NP (NK:ART die) (NK:ADJA große) (NK:ADJA schwarze) (NK:NN Katze))
```

```text
(NP (NK:ART der) (NK:ADJA blaue))
```

```text
(NP (NK:PIS jemand) (NK:NN Schönes))
```

```text
(NP (NK:ART die) (NK:ADJA große) (NK:NN Blonde))
```

NKs können in einigen Fällen komplex sein, z.B. als APs, komplexe Numeralien (NM) und Eigennamen.

<!-- PDF page 10 -->

### 2.1.1 Adjektivphrasen

Im nebenstehenden Beispiel ist *auf ihren Sohn* ein Dependent von *stolz* und deshalb tief angebunden.

```text
(NP (NK:ART die) (NK:AP (MO:PP (AC:APPR auf) (NK:PPOSAT ihren) (NK:NN Sohn)) (HD:ADJA stolze)) (NK:NN Frau))
```

Entsprechendes gilt auch für die folgende NP:

```text
(NP (NK:ART die) (NK:AP (MO:ADV sehr) (HD:ADJA stolze)) (NK:NN Frau))
```

Nominalisierungen von Adjektiven und Partizipien werden genauso annotiert:

(NB: \**der bereits Professor*)

```text
(NP (NK:ART das) (NK:AP (MO:ADV bereits) (HD:NN Erreichte)))
```

```text
(NP (NK:ART die) (NK:AP (MO:ADJD gesetzlich) (HD:NN Krankenversicherten)))
```

<!-- PDF page 11 -->

In beiden Fällen bekommt *bereits erreichte* dieselbe Struktur zugewiesen:

```text
(NP (NK:ART das) (NK:AP (MO:ADV bereits) (HD:ADJA erreichte)) (NK:NN Wahlergebnis))
```

### 2.1.2 Numeralien

Für komplexe Numeralien (10 000, eine Million) ist das Label NM (NuMber) vorgesehen. Die einzelnen Komponenten bekommen das Funktionslabel NMC (NuMber Component).

```text
(NP (NK:NM (NMC:CARD 10) (NMC:CARD 000)) (NK:NN Menschen))
```

Phrasen wie *die Hälfte, 10 Prozent* werden als NP annotiert.

```text
(NP (NK:CARD zehn) (NK:NN Prozent) (AG:NP (NK:ART der) (NK:NN Arbeitnehmer)))
```

<!-- PDF page 12 -->

Beachte: NM-Modifikatoren (z.B. *fast 10*) werden wie AP-Modifikatoren behandelt, so daß das Adjunkt erst an den AP-Knoten angebunden wird:

```text
(NP (NK:AP (MO:ADV fast) (HD:NM (NMC:ART eine) (NMC:NN Million))) (NK:NN Studenten))
```

```text
(NP (NK:AP (MO:ADV nahezu) (HD:PIAT alle)) (NK:NN Studenten))
```

*rund, genau, knapp, gut* sind in unflektierter Form ADJD.

```text
(NP (NK:AP (MO:ADJD rund) (HD:CARD 50)) (NK:NN Gäste))
```

Zur besseren Unterscheidung von PPs wird in Ausdrücken wie *unter 1000 Mark* der NM-Modifikator als ADV getaggt.

```text
(NP (NK:AP (MO:ADV über) (HD:CARD 200)) (NK:NN Leute))
```

<!-- PDF page 13 -->

Das gilt aber nicht, wenn es sich um eine echte PP handelt.

```text
(S (SB:NP (NK:ART Der) (NK:NN Wert)) (HD:VVFIN liegt) (MO:PP (AC:APPR unter) (NK:NM (NMC:CARD 5) (NMC:NN Millionen)) (NK:NN Mark)) (--:$. .))
```

Test für NP-Lesart: Das Adverb kann durch *rund, ungefähr, ...* ersetzt werden. Siehe auch *zwischen* (3.2).

```text
(S (SB:NP (NK:ART Der) (NK:NN Wert)) (HD:VVFIN beträgt) (MO:NP (NK:AP (MO:ADV unter) (HD:NM (NMC:CARD 5) (NMC:NN Millionen))) (NK:NN Mark)) (--:$. .))
```

*bis zu 100, an die 10, um die 50*: diese höchst idiosynkratischen Konstruktionen werden wie nebenstehend annotiert:

```text
(NP (NK:AP (MO:ADV an) (MO:ART die) (HD:CARD 10)) (NK:AP (MO:ADJD gut) (HD:ADJA gekleidete)) (NK:NN Leute))
```

Zu Komparativen mit Zahlen (z.B. *mehr als 10*) siehe 4.5.

### 2.1.3 Datums- und Zeitangaben

Alle Teile einer normalen Datumsangabe (z.B. *der 23. September 1999*) werden als NP bzw. PP annotiert:

```text
(NP (NK:ART der) (NK:ADJA 14.) (NK:NN Mai) (NK:CARD 1973))
```

```text
(PP (AC:APPRART am) (NK:ADJA 12.) (NK:NN Dezember) (NK:CARD 1997))
```

Weiter modifizierte Datumsangaben werden wie folgt behandelt:

<!-- PDF page 14 -->

```text
(PP (AC:APPRART am) (NK:ADJA 5.) (NK:NN September) (MNR:PP (AC:APPR um) (NK:CARD 20) (NK:NN Uhr)))
```

```text
(PP (AC:APPRART am) (NK:NN Donnerstag) (--:$, ,) (APP:NP (NK:ADJA 5.) (NK:NN September)) (--:$, ,) (MNR:PP (AC:APPR um) (NK:CARD 20) (NK:NN Uhr)))
```

Nachgestellte Jahresangaben werden ebenfalls als NK annotiert:

```text
(PP (AC:APPR bei) (NK:ART der) (NK:NN Bundestagswahl) (NK:CARD 1998))
```

Anmerkung: Im Gegensatz dazu wird in dem gleichbedeutenden Ausdruck *bei der Bundestagswahl im Jahre 1998* die Phrase *im Jahre 1998* als MNR annotiert.

### 2.1.4 Syntax der Eigennamen

Knotenname: PN

Vorname(n), Familienname(n) und Namenszusätze werden alle unter dem Knoten PN (proper noun) zusammengefaßt und als eine komplexe Kernkomponente der NP betrachtet. Die einzelnen Komponenten des PN werden als PNC (proper noun component) annotiert.

Dasselbe gilt für fremdsprachliche Namen. Komponenten von Firmennamen wie *Bayerische Vereinsbank* sowie Titel werden dagegen als NKs annotiert.

<!-- PDF page 15 -->

```text
(NP (NK:ART der) (NK:ADJA unglückliche) (NK:PN (PNC:NE Jose) (PNC:NE Maria) (PNC:NE Sanchez)))
```

```text
(NP (NK:ART der) (NK:ADJA fleißige) (NK:NN Dr.) (NK:PN (PNC:NE Peter) (PNC:NE Schmidt)))
```

Komplexe Titel von z.B. Büchern, Filmen oder Veranstaltungen werden strukturiert annotiert und über ihrem Mutterknoten mit einem zusätzlichen unären PN-Knoten gekennzeichnet.

Für runde Klammern und Anführungszeichen wird in den Klammerausdrücken das parse-sichere Alias `$PAREN` für das originale STTS-Tag `$(` verwendet; `-LRB-` und `-RRB-` stehen für die Klammer-Token.

```text
(NP (NK:ART die) (NK:NN Ausstellung) (NK:PN (PNC:NP (--:$PAREN ") (NK:PPOSAT Unsere) (NK:ADJA heimischen) (NK:NN Kastanienarten) (--:$PAREN "))))
```

Besteht der Titel aus einem einzelnen Wort, das nicht als NE getaggt ist, bekommt auch dieses einen unären PN-Knoten.

```text
(NP (NK:ART die) (NK:NN Pfadfindergruppe) (--:$PAREN ") (NK:PN (PNC:NN Edelweiss)) (--:$PAREN "))
```

Anders annotieren wir Konstituenten nach Wörtern wie z.B. *Thema, Formel, Motto*. Unsere Idee dabei ist: Ein Eigenname bezeichnet etwas, aber ist nicht das Bezeichnete selbst.

#### Typen von komplexen Eigennamen

##### Institutionen

Vollständige Namen von Institutionen (Ministerien, Zeitungen, Verbände, Gewerkschaften, Vereine etc.) werden strukturiert annotiert und über ihrem Mutterknoten mit einem unären PN-Knoten versehen. Ihre Abkürzungen werden dementsprechend als NE getaggt. Artikel und präpositionale Attribute, die nicht Teil des vollständigen Namens sind, kommen in eine übergeordnete NP. Als maßgeblich für die Bestimmung des vollständigen Namens soll die offizielle Abkürzung der Institution angesehen werden.

<!-- PDF page 16 -->

Beachte den Unterschied zwischen den folgenden Beispielen:

```text
(NP (NK:ART die) (NK:NN Gewerkschaft) (NK:PN (PNC:CNP (CJ:NN Handel) (--:$, ,) (CJ:NN Banken) (CD:KON und) (CJ:NN Versicherungen))) (--:$PAREN -LRB-) (APP:NE HBV) (--:$PAREN -RRB-) (MNR:PP (AC:APPR in) (NK:NE Düsseldorf)))
```

```text
(NP (NK:ART die) (NK:ADJA Ökumenische) (NK:PN (PNC:CNP (CJ:NN Koalition) (CJ:ADJA Dritte) (CJ:NN Welt-Tourismus))) (APP:NE (ECTWT)) (MNR:PP (AC:APPR in) (NK:NE Bangkok)))
```

Nicht vollständige, d.h. nicht offizielle, Namen erhalten weder das Tag NE noch werden sie mit PN-Knoten versehen. Beispiel hierfür:

```text
(NP (NK:ADJA Hessisches) (NK:NN Oberlandesgericht))
```

Sonderregelung:

```text
(PN (PNC:NP (NK:ART die) (NK:NN Grünen)))
```

```text
(PN (PNC:CNP (CJ:NP (NK:NN Bündnis) (NK:CARD 90)) (CD:$PAREN /) (CJ:NP (NK:ART Die) (NK:NN Grünen))))
```

##### Ämter

Ämter werden als NN getaggt: *Bundeskanzler, Papst, König, Prinz* etc.

<!-- PDF page 17 -->

*Prinz Eugen, die Prinzessin von Norwegen* sind NP-Knoten ohne PN-Knoten! *Gott* erhält bei uns das Tag NN.

##### Geographische Angaben

Einfache geographische Namen erhalten das POS-Tag NE (z.B. *Ostsee*), komplexe geographische Namen sollen strukturiert annotiert werden und erhalten einen PN-Knoten (vgl. Institutionen).

Beispiel:

```text
(NP (NK:ART das) (NK:PN (PNC:NP (NK:ADJA Tote) (NK:NN Meer))))
```

```text
(NP (NK:ART der) (NK:PN (PNC:NP (NK:ADJA Stille) (NK:NN Ozean))))
```

##### Ereignisse

Einfache und komplexe Ereignisse werden als NN bzw. ohne PN-Knoten analysiert. Bsp.: *Vietnamkrieg, der Zweite Weltkrieg, der Prager Fenstersturz*.

##### Abkürzungen von Stoffnamen

Abkürzungen von Vitaminen, chemischen Elementen, Stoffverbindungen etc. werden als NN angesehen. Bsp.: *Ag, Zn, B6, PVC*.

##### Agentur- und Journalistenkürzel

Agenturkürzel (*dpa, ap* etc.) werden sowohl im laufenden Text als auch im Vorfeld des Textes als NE getaggt. Journalistenkürzel hingegen bekommen das Tag XY.

Die beiden Namenszusätze *Sankt* und *junior* bzw. *senior* bekommen das PoS-Tag ADJA und werden als PNC mit in die PN integriert.

```text
(PN (PNC:ADJA Sankt) (PNC:NE Gallen))
```

```text
(PN (PNC:NE Stefan) (PNC:NE Müller) (PNC:ADJA junior))
```

<!-- PDF page 18 -->

Grundsätzlich gilt: Wenn die einzelnen Komponenten alle das PoS-Tag NE tragen, sollten sie als PN zusammengefasst werden.

```text
(PN (PNC:NE Fortuna) (PNC:NE Düsseldorf))
```

Parallel zu *die Bad Homburger Vereine* wird *die Bad Homburger* (als Bezeichnung für Personen) als MTA zusammengefasst und als NK in den NP-Knoten eingehängt.

```text
(NP (NK:ART die) (NK:MTA (ADC:NE Bad) (ADC:NN Homburger)))
```

### 2.1.5 Fremdsprachliches Material

Wörter, die nach eigenem Ermessen nicht dem deutschen Wortschatz angehören und auch nicht in aktuellen deutschen Wörterbüchern aufzufinden sind, gelten als fremdsprachliches Material und erhalten das POS-Tag FM.

Beachte: *Kebab, Döner, Service, Reality-TV* und *E-mail* sind somit NN.

Sonderregelung: Fälle wie *de facto, ergo, incognito* werden als FM bzw. als CH-Knoten analysiert und gemäß ihrer syntaktischen Funktion in den Satz oder in die VP gehängt.

Fremdsprachliche Zitate werden als Chunks (CH) flach annotiert; die einzelnen Komponenten erhalten das Label UC („unit component“).

```text
(S (SB:PPER Er) (HD:VVFIN sagte) (--:$PAREN ") (OC:CH (UC:FM The) (UC:FM show) (UC:FM must) (UC:FM go) (UC:FM on)) (--:$PAREN ") (--:$. .))
```

Das Label FM wird nur vergeben, wenn es sich um echte fremdsprachliche Äußerungen oder Übersetzungen handelt. Für fremdsprachliche Bandnamen, Firmennamen, Filmtitel o.ä. wird das Label NE verwendet.

### 2.1.6 Maßangaben

Konstruktionen wie:

<!-- PDF page 19 -->

1. a. ein Liter Wasser  
   b. vier Flaschen Bier  
   c. in 2000 Meter Höhe  
   d. Hunderte Panzer  
   e. eine Art Gesundheitspolizei

werden als Sequenzen von NKs annotiert (d.h. flach). Ist die letzte Komponente komplex wie in:

2. a. ein Liter [klares Wasser]NP,NK  
   b. eine Art [russisches Roulette]NP,NK  
   c. die 30 Jahre [Kampf gegen Äthiopien]NP,NK

so wird sie als komplexe NK (Kategorie: meistens NP) betrachtet.

Beachte: Die Maßangaben (*ein Liter, zwei Flaschen*) werden nie als komplexe NKs annotiert.

Beachte auch: Eine Phrase wie *30 Jahre Kampf gegen Äthiopien* ist zu unterscheiden von *75 Jahre Oktoberrevolution*; das erste bezeichnet die Dauer des Kampfes, das zweite die Zeit, die seit der Oktoberrevolution vergangen ist. Für die Annotation der zweiten Phrase besteht noch keine einheitliche Regelung.

## 2.2 Genitive

Sowohl prä- als auch postnominale Genitive werden als AG (Genitivattribut) annotiert:

```text
(NP (AG:NE Peters) (NK:NN Hund))
```

```text
(NP (NK:ART der) (NK:NN Hund) (AG:NE Peters))
```

```text
(NP (NK:ART der) (NK:NN Hund) (AG:NP (NK:PPOSAT meiner) (NK:NN Tante)))
```

<!-- PDF page 20 -->

## 2.3 Postnominale PPs und Adverbien

Von-PPs, die eine Genitivparaphrase sind, werden als PG (Phrasaler Genitiv) annotiert.

```text
(NP (NK:ART der) (NK:NN Hund) (PG:PP (AC:APPR von) (NK:NE Peter)))
```

```text
(NP (NK:NN Hunderte) (PG:PP (AC:APPR von) (NK:NN Schaulustigen)))
```

```text
(NP (NK:ART die) (NK:NN Mehrzahl) (PG:PP (AC:APPR von) (NK:PPER ihnen)))
```

Als relativ eindeutiges Indiz für ein PG gilt, wenn man die *von*-PP in ein Genitivattribut umwandeln kann.

Sonstige PPs bekommen in der Regel das Label MNR.

```text
(NP (NK:ART der) (NK:NN Tisch) (MNR:PP (AC:APPRART am) (NK:NN Fenster)))
```

Ebenso behandelt werden:

```text
(NP (NK:ART der) (NK:NN Tisch) (MNR:ADV dort))
```

```text
(NP (NK:ART ein) (NK:NN Mann) (MNR:PP (AC:APPR mit) (NK:ART einem) (NK:NN Radio) (MNR:PP (AC:APPR in) (NK:ART der) (NK:NN Nase))))
```

<!-- PDF page 21 -->

Aber (siehe auch 5.2.6):

```text
(NP (NK:ART die) (NK:NN Hoffnung) (OP:PP (AC:APPR auf) (NK:ART ein) (NK:ADJA baldiges) (NK:NN Ende)))
```

Beachte: In manchen Fällen kann ein MNR/PG auch links vom Substantiv stehen:

```text
(S (SB:NP (PG:PP (AC:APPR Von) (NK:ART dem) (NK:NN Erbe)) (NK:ART die) (NK:NN Hälfte)) (HD:VVFIN entfällt) (OP:PP (AC:APPR auf) (NK:PPOSAT seine) (NK:NN Söhne.)))
```

Häufig kommt es zu Anbindungsambiguitäten bei PPs. Per Konvention gilt: Im Zweifelsfall immer hoch hängen.

```text
(S (SB:NE Celanese) (HD:VVFIN liefert) (OA:NN Material) (MO:PP (AC:APPR für) (NK:ART die) (NK:NN Verbindungen)))
```

Abgrenzung zwischen PG und MNR: PG läßt sich als echter Genitiv übersetzen:

> der Hund [von meinem Vater]PG = der Hund [meines Vaters]AG  
> der Mann [von Welt]MNR ≠ der Mann [der Welt]AG

Beachte: Ambiguitäten — entweder *die Unabhängigkeit Äthiopiens*:

```text
(NP (NK:ART die) (NK:NN Unabhängigkeit) (PG:PP (AC:APPR von) (NK:NE Äthiopien)))
```

<!-- PDF page 22 -->

oder *die Unabhängigkeit (Eritreas) von Äthiopien*:

```text
(NP (NK:ART die) (NK:NN Unabhängigkeit) (MNR:PP (AC:APPR von) (NK:NE Äthiopien)))
```

Wendungen wie z.B. *Tag für Tag, Stunde um Stunde, Schlag auf Schlag, Hand in Hand* werden als NP annotiert, wobei die PP innerhalb der NP als MNR fungiert. ISU entfällt dadurch.

```text
(NP (NK:NN Tag) (MNR:PP (AC:APPR für) (NK:NN Tag)))
```

## 2.4 Appositionen und Parenthesen

Einheiten, die durch Satzzeichen (Kommata, Klammern, Gedankenstriche) abgetrennt sind, müssen daraufhin überprüft werden, ob sie prinzipiell in den Satz integriert werden können. Können sie nicht integriert werden, handelt es sich um Parenthesen. Andernfalls müssen diese Einheiten entsprechend ihrer Funktion in den Satz eingebunden werden. Integrierbare Einheiten können unter anderem auch Appositionen sein, für sie gelten jedoch bestimmte Restriktionen.

### 2.4.1 Appositionen

- Die nachgestellte Konstituente ist entweder eine NP oder selten eine PP.
- Sie stimmt in Kategorie und Kasus mit der vorangehenden Konstituente überein und ist koreferent. D.h., eine NP ist nur APP zu einer NP (die auch implizit flach in einer PP enthalten sein kann).

```text
(NP (NK:PN (PNC:NE Boris) (PNC:NE Becker)) (--:$, ,) (APP:NP (NK:ADJA bester) (NK:NN Tennisspieler) (AG:NP (NK:ART der) (NK:NN Welt))))
```

<!-- PDF page 23 -->

```text
(S (OC:VP (MO:PP (AC:APPR Für) (NK:ART den) (NK:NN Tisch) (--:$, ,)) (APP:NP (NK:PDAT dieses) (NK:ADJA häßliche) (NK:NN Monstrum) (--:$, ,)) (MO:ADV noch) (OA:NP (NK:CARD 10) (NK:NN DM)) (HD:VVPP bekommen)) (HD:VAFIN hat) (SB:PPER er) (--:$. .))
```

```text
(S (MO:PP (AC:APPR Für) (NK:ART einen) (NK:NN Cheeseburger) (--:$, ,) (APP:PP (AC:APPR für) (NK:ART die) (NK:ADJA beste) (NK:NN Erfindung) (MNR:PP (AC:APPR seit) (NK:NN Coca-Cola))) (--:$, ,)) (HD:VVFIN gehe) (SB:PPER ich) (MO:ADJD meilenweit) (--:$. .))
```

Test für Koreferenz: Die Apposition muß anstelle der vorangehenden Konstituente stehen können, ohne daß dadurch der Satz ungrammatisch wird oder sich sein Sinn verändert. Wenn nötig, dürfen Artikel ergänzt und Numerus und Person des Verbs modifiziert werden.

- Auch Distanzstellung ist möglich:

```text
(S (SB:PPER Er) (HD:VMFIN will) (OC:VP (OA:NP (NK:ART das) (NK:NN Übel)) (MO:PP (AC:APPR an) (NK:PPOSAT seiner) (NK:NN Wurzel)) (HD:VVINF packen) (--:$. :) (APP:PP (AC:APPRART am) (NK:NN Menschen))) (--:$. .))
```

- Die nachgestellte Konstituente kann eigene Modifikatoren haben. *Also, d.h.* und *sprich* zählen wir dazu.

<!-- PDF page 24 -->

```text
(NP (NK:PDAT dieses) (NK:ADJA häßliche) (NK:NN Monstrum) (--:$, ,) (APP:NP (MO:ADV also) (NK:ART der) (NK:NN Tisch)))
```

```text
(PP (AC:APPRART beim) (NK:NN Mannschaftssport) (--:$, ,) (APP:PP (MO:ADV sprich) (AC:APPRART beim) (NK:CNP (CJ:NN Fußball) (CD:KON oder) (CJ:NN Volleyball))))
```

### 2.4.2 Parenthesen

Parenthesen sind Einschübe in einen Satz, die mit diesem jedoch nicht in einer syntaktischen Struktur verbunden werden können.

```text
(S (SB:NP (NK:PN (PNC:NE Boris) (PNC:NE Becker)) (PAR:NE Leimen)) (HD:VAFIN hat) (OC:VVPP gewonnen) (--:$. .))
```

```text
(NP (NK:ART ein) (NK:NN Stück) (NK:NN Torte) (--:$, ,) (PAR:CAP (CJ:ADJD klein) (CD:KON aber) (CJ:ADJD fein)))
```

<!-- PDF page 25 -->

```text
(NP (NK:ART das) (NK:NN Haus) (--:$, ,) (PAR:VP (MO:CARD 1880) (HD:VVPP errichtet)))
```

```text
(NP (NK:PIAT viele) (NK:NN Studenten) (--:$PAREN -LRB-) (PAR:S (MO:PROAV darunter) (HD:VVFIN befanden) (OA:PRF sich) (SB:NP (MO:ADV auch) (NK:CNP (CJ:NE Roland) (CD:KON und) (CJ:NE Cordula)))) (--:$PAREN -RRB-))
```

```text
(NP (NK:CNP (CJ:PN (PNC:NE Gerhard) (PNC:NE Schröder)) (CD:KON und) (CJ:PN (PNC:NE Oskar) (PNC:NE Lafontaine))) (--:$PAREN -LRB-) (PAR:S (SB:PIS beide) (MO:NE SPD)) (--:$PAREN -RRB-))
```

Häufig sind Kommentare in NP-Form:

<!-- PDF page 26 -->

```text
(S (SB:PPER Sie) (HD:VVFIN zerreißt) (OA:NP (NK:PPOSAT ihre) (NK:NN Maske)) (--:$. :) (PAR:NP (NK:PIS einer) (AG:NP (NK:ART der) (NK:PIAT wenigen) (NK:ADJA pathetischen) (NK:NN Momente) (AG:NP (NK:ART des) (NK:NN Stücks)))) (--:$. .))
```

Die fehlende Übereinstimmung der Kategorie, kombiniert mit einer zwingenden Abtrennung durch Satzzeichen, weist auf eine Parenthese hin:

```text
(S (MO:AVP (HD:ADV Heute) (--:$, ,) (PAR:PP (MO:NP (NK:CARD 5) (NK:NN Jahre)) (AC:APPR nach) (NK:PPOSAT seinem) (NK:NN Hit)) (--:$, ,)) (HD:VAFIN erinnern) (OA:PRF sich) (SB:PIS wenige) (OP:PP (AC:APPR an) (NK:ART den) (NK:ADJA jungen) (NK:NN Rapper) (MNR:PP (AC:APPR aus) (NK:NE Berlin))) (--:$. .))
```

Aber:

```text
(S (SB:NE Deutschland) (HD:VAFIN ist) (--:$, ,) (MO:PP (AC:APPR seit) (NK:ART der) (NK:NN Wiedervereinigung)) (--:$, ,) (PD:AP (MO:AVP (MO:ADV etwa) (HD:ADV so)) (HD:ADJD groß) (CC:NP (CM:KOKOM wie) (NK:NE Frankreich))) (--:$. .))
```

<!-- PDF page 27 -->

## 2.5 Argumente von Substantiven

### 2.5.1 VP und Satzargumente

VPs und Sätze, die Komplemente von NPs sind, werden als OC (clausal object) annotiert.

```text
(NP (NK:ART der) (NK:NN Beschluß) (--:$, ,) (OC:VP (OA:NP (NK:ART ein) (NK:NN Haus)) (HD:VZ (PM:PTKZU zu) (HD:VVFIN bauen))))
```

```text
(NP (NK:ART die) (NK:NN Behauptung) (--:$, ,) (OC:S (SB:NE Peter) (HD:VAFIN sei) (PD:NP (NK:ART ein) (NK:NN Weinkenner))))
```

<!-- PDF page 28 -->

Beachte: Auch wenn infolge von Grammatikalisierung eine nähere Anbindung eines Substantivs an ein Verb zu beobachten ist (z.B. *eine Entscheidung treffen, einen Beschluß fassen, die Absicht haben, Angst haben*), werden verbale und satzwertige Argumente des Substantivs als OC analysiert. Dies gilt auch für die verbalen und satzwertigen Argumente von Kernsubstantiven in Funktionsverbgefügen (5.2.8).

```text
(S (SB:PPER Er) (HD:VAFIN hatte) (OC:VP (HD:VVPP gehabt) (OA:NP (NK:NN Angst) (--:$, ,) (OC:VP (OA:NP (NK:ART das) (NK:NN Land)) (HD:VZ (PM:PTKZU zu) (HD:VVINF verlassen))))) (--:$. .))
```

VPs und Sätze, die ansonsten als MOs annotiert werden (z.B. um-zu-Sätze), werden in NPs als MNR annotiert.

```text
(NP (NK:NN Sanierungsmaßnahmen) (--:$, ,) (MNR:VP (CP:KOUI um) (OA:NP (NK:ART die) (NK:NN Häuser)) (MO:PP (AC:APPR vor) (NK:ART dem) (NK:NN Verfall)) (HD:VZ (PM:PTKZU zu) (HD:VVINF retten))))
```

Wie-Sätze, die sich auf NPs beziehen, werden je nach Funktion entweder mit dem Label OC oder mit dem Label MNR versehen. OC sind sie, wenn das Bezugsnominal von einem Verb abgeleitet ist und der *wie*-Satz als vererbtes Komplement gelten kann. In allen anderen Fällen wird das Label MNR vergeben:

3. a. Die Erklärung, [wie die wie-Sätze behandelt werden sollten]OC  
   b. Bäcker, [wie sie in Frankreich ausgebildet werden]MNR

<!-- PDF page 29 -->

Das POS-Tag von *wie* in diesen Sätzen ist immer PWAV. Die Bezeichnung KOKOM auf der Wortebene sowie die Bezeichnung CC auf Funktionsebene werden für die Annotation von *wie*-Sätzen nicht verwendet.

Zu nachgestellten partizipialen VPs vgl. oben 2.4.2.

### 2.5.2 Präpositionalobjekte

Deverbale Substantive werden analog zum Basisverb annotiert.

```text
(S (SB:PPER Wir) (HD:VVFIN träumen) (OP:PP (AC:APPRART vom) (NK:NN Glück)) (--:$. .))
```

```text
(NP (NK:ART Der) (NK:NN Traum) (OP:PP (AC:APPRART vom) (NK:NN Glück)) (--:$. .))
```

```text
(S (SB:NE Markus) (HD:VVFIN interessiert) (OA:PRF sich) (OP:PP (AC:APPR für) (NK:NN Musik)) (--:$. .))
```

```text
(NP (AG:NE Markus’) (NK:NN Interesse) (OP:PP (AC:APPR für) (NK:NN Musik)))
```

Auch wenn es sich um ein Kompositum mit einem deverbalen Kopf handelt, wird analog zum jeweiligen Basisverb annotiert.

```text
(NP (NK:ART der) (NK:NN Wunschtraum) (OP:PP (AC:APPRART vom) (NK:NN Glück)))
```

```text
(NP (NK:ART die) (NK:NN Kindheitserinnerung) (OP:PP (AC:APPR an) (AG:NN Omas) (NK:NN Kuchen)))
```

siehe auch 5.2.6

<!-- PDF page 30 -->

## 2.6 Relativsätze

Relativsätze werden als Töchter des NP-Knotens annotiert, und zwar unabhängig davon, ob sie extraponiert sind oder nicht. Sie werden mit dem Label RC (relative clause) gekennzeichnet.

```text
(NP (NK:ART der) (NK:NN Mann) (--:$, ,) (RC:S (OA:NP (NK:PRELAT dessen) (NK:NN Tochter)) (SB:PPER ich) (HD:VVFIN kenne)))
```

```text
(NP (NK:ART der) (NK:NN Mann) (--:$, ,) (RC:S (MO:PP (AC:APPR mit) (NK:PRELS dem)) (SB:PPER sie) (HD:VVFIN spricht)))
```

```text
(NP (NK:ART das) (NK:NN Haus) (--:$, ,) (RC:S (MO:PWAV wo) (SB:PPER er) (HD:VVFIN wohnt)))
```

Ähnlich:

```text
(AVP (HD:ADV dort) (--:$, ,) (RC:S (MO:PWAV wo) (SB:PPER er) (HD:VVFIN wohnt)))
```

Aber:

<!-- PDF page 31 -->

```text
(AP (PH:ADV dann) (--:$, ,) (RE:S (CP:KOUS wenn) (SB:PPER er) (HD:VVFIN kommt)))
```

```text
(NP (NK:ART der) (NK:NN Grund) (--:$, ,) (OC:S (MO:PWAV warum) (SB:PPER er) (HD:VVFIN geht)))
```

Extraponierte Relativsätze:

Die folgenden Klammern tragen `@surfaceIndex`, weil der RC im Oberflächensatz nach dem Matrixverb steht, syntaktisch aber Tochter der eingebetteten NP ist.

```text
(S (SB:PPER Er@0) (HD:VAFIN hat@1) (OC:VP (OA:NP (NK:ART den@2) (NK:NN Mann@3) (RC:S (DA:PRELS dem@9) (SB:NP (NK:ART das@10) (NK:ADJA rote@11) (NK:NN Auto@12)) (HD:VVFIN gehört@13))) (MO:PP (AC:APPR in@4) (NK:ART der@5) (NK:NN Kneipe@6)) (HD:VVPP getroffen@7)) (--:$, ,@8))
```

aber:

```text
(S (SB:PPER Er) (HD:VAFIN hat) (OC:VP (OA:NP (NK:ART eine) (NK:NN Entscheidung)) (HD:VVPP getroffen)) (--:$, ,) (RC:S (MO:PWAV wofür) (SB:PPER er) (OA:PRF sich) (HD:VVFIN entschuldigt)) (--:$. .))
```

<!-- PDF page 32 -->

(Das Relativpronomen *wofür* bezieht sich auf den ganzen Satz.) Relativsätze können sich also auch auf Sätze und VPs beziehen.

Sog. „reduzierte Relativsätze“ sind als PAR zu annotieren:

```text
(NP (NK:ART das) (NK:NN Haus) (--:$, ,) (PAR:VP (MO:CARD 1880) (HD:VVPP gebaut)))
```

vgl. 2.4.2.

Cleft-Sätze: Der Relativsatz soll immer als RC zur prädikativen NP annotiert werden. Das Pronomen *es* ist Subjekt.

```text
(S (MO:ADV erst) (HD:VAFIN war) (SB:PPER es) (PD:NP (NK:ART der) (NK:ADJA traditionelle) (NK:NN Dürregürtel) (--:$, ,) (RC:S (DA:PRELS dem) (SB:NP (NK:ART das) (NK:NN Wasser)) (HD:VVFIN ausging))))
```

## 2.7 MOs in NPs

Von allen NP-Komponenten werden als MOs nur Fokuspartikeln (und ihre Verwandtschaft :-) annotiert, wenn sie sich semantisch auf die NP beziehen.

```text
(S (OC:VP (PD:NP (MO:ADV Nur) (NK:PIAT etwas) (NK:NN Neues)) (HD:VVINF sein)) (HD:VVFIN muß) (SB:PPER sie))
```

Typische Fokuspartikeln: *nur, auch, lediglich, zumindest, vor allem, ...*

<!-- PDF page 33 -->

```text
(S (SB:NP (NK:ART Die) (NK:NN Musik) (MO:ADV zumindest)) (HD:VVFIN machte) (OA:NP (NK:ART den) (NK:NN Schritt)) (NG:PTKNEG nicht) (SVP:PTKVZ mit))
```

Guter Test: Vorfeldbesetzung: *nur/auch/... Peter ist gekommen* vs. \**heute Peter ist gekommen*.

Bitte auf jeden Fall die Semantik beachten!

Wichtig: Alle Fokuspartikeln in einer NP werden als MO annotiert, unabhängig von ihrer Stellung in der NP:

```text
(NP (MO:ADV nur) (NK:PPOSAT mein) (NK:NN Vater))
```

```text
(NP (NK:PIAT keine) (NK:NN Lust) (MO:ADV mehr))
```

```text
(NP (NK:NE Gerhard) (MO:ADV etwa))
```

```text
(NP (MO:PP (AC:APPR vor) (NK:PIS allem)) (NK:NN Kinder))
```

<!-- PDF page 34 -->

# 3 Präpositionalphrasen

Knotenname: PP

Kantennamen: wie in NPs, zusätzlich:

| Kante | Englisch | Deutsch |
|---|---|---|
| AC | Adpositional Case marker | Kasusmarkierung |

## 3.1 Basisstruktur

PPs werden wie NPs behandelt, also auch flach annotiert. Die Prä-/Post-/Zirkumposition (PoS-Tags: APPR / APPO / APZR) bekommt das Label AC (adpositional case marker). Sonst ändert sich die Struktur nicht.

```text
(PP (AC:APPR für) (NK:ART das) (NK:NN Jahr) (NK:CARD 1999))
```

```text
(PP (AC:APPR für) (NK:ART den) (NK:NN Monat) (NK:NN April))
```

Postposition:

```text
(PP (NK:PPOSAT meiner) (NK:NN Meinung) (AC:APPO nach))
```

Zirkumposition:

```text
(PP (AC:APPR um) (NK:ART des) (NK:NN EURO) (AC:APZR willen))
```

Auch:

```text
(PP (AC:APPR herum) (AC:APPR um) (NK:ART die) (NK:NN Baustelle))
```

<!-- PDF page 35 -->

```text
(PP (AC:APPRART vom) (NK:NN Schreibtisch) (AC:ADV weg))
```

```text
(PP (AC:ADV weg) (AC:APPRART vom) (NK:ADJA schönen) (NK:NN Bild))
```

MOs in PPs — s.o. unter 2.7.  
*an die 10, um die 50* — s.o. unter 2.1.2.

## 3.2 Die Präposition *zwischen*

Bei der Präposition *zwischen* muß unterschieden werden, ob sie Präpositionalfunktion hat oder nicht:

```text
(PP (AC:APPR zwischen) (NK:CNP (CJ:NE Saarbrücken) (CD:KON und) (CJ:NE Trier)))
```

```text
(S (SB:NP (NK:AP (MO:ADV zwischen) (HD:CAP (CJ:CARD 30) (CD:KON und) (CJ:CARD 40))) (NK:NN Leute)) (HD:VAFIN waren) (PD:ADJD anwesend))
```

Wenn die *zwischen*-PP eine CAP enthält (was sehr oft vorkommt), sollte diese ganz normal (wie in einer NP) annotiert werden:

```text
(NP (NK:ART der) (NK:NN Unterschied) (MNR:PP (AC:APPR zwischen) (NK:CAP (CJ:ADJA alten) (CD:KON und) (CJ:ADJA jungen)) (NK:NN Männern)))
```

```text
(PP (AC:APPR zwischen) (NK:ART dem) (NK:CAP (CJ:ADJA 15.) (CD:KON und) (CJ:ADJA 30.)) (NK:NN Juni))
```

Die Unterscheidung ist nicht immer einfach:

<!-- PDF page 36 -->

```text
(S (SB:NP (NK:ART Die) (NK:NN Kinder)) (HD:VAFIN sind) (PD:AP (AMS:NP (NK:AP (MO:ADV zwischen) (HD:CAP (CJ:CARD 3) (CD:KON und) (CJ:CARD 6))) (NK:NN Jahre)) (HD:ADJD alt)) (--:$. .))
```

```text
(NP (NK:CNP (CJ:NN Jungen) (CD:KON und) (CJ:NN Mädchen)) (MNR:PP (AC:APPR zwischen) (NK:CAP (CJ:CARD 3) (CD:KON und) (CJ:CARD 6)) (NK:NN Jahren)))
```

## 3.3 *Kurz vor* und ähnliche Konstruktionen

Wenn der Präposition ein Modifikator vorausgeht, wird dieser als MO in der PP annotiert:

```text
(PP (MO:ADJD kurz) (AC:APPR vor) (NK:NN Beginn) (AG:NP (NK:ART des) (NK:NN Spiels)))
```

```text
(PP (MO:ADV zusammen) (AC:APPR mit) (NK:ART den) (NK:NN Eltern))
```

Diese Regel wird auch angewendet, wenn der vorausgehende Modifikator aus mehr als einem Wort besteht:

<!-- PDF page 37 -->

```text
(PP (MO:NP (NK:CARD dreizehn) (NK:NN Minuten)) (AC:APPR nach) (NK:ART dem) (NK:ADJA ersten) (NK:NN Tor))
```

## 3.4 *Darüber hinaus* - Präpositionaladverbien

Präpositionaladverbien werden selten modifiziert. Ist dies aber der Fall, sollen sie als AC in einer PP annotiert werden:

4.

```text
(PP (AC:PROAV darüber) (AC:ADV hinaus))
```

5.

```text
(PP (MO:ADV nur) (AC:PROAV darüber))
```

Selbstverständlich ist dies von Platzhalterkonstruktionen zu unterscheiden, vgl. 6.

<!-- PDF page 38 -->

# 4 Adjektivphrasen

Knotennamen: AP, MTA (multi-token adjective)

| Kante | Englisch | Deutsch |
|---|---|---|
| HD | HeaD | Kopf (immer das Adjektiv) |
| MO | MOdifier | Modifikator |
| DA | DAtive | Dativ |
| OA | Accusative Object | Akkusativobjekt |
| OG | Genitive Object | Genitivobjekt |
| CC | Comparative Complement | Vergleichskomplement |
| CM | CoMparative conjunction | Komparationskonjunkt (*als, wie*) |
| PM | Morphological Particle | Morphologische Partikel (*am*) |
| AMS | Measure Argument of Adjective | Massangabe bei Adjektiv |
| ADC | ADjective Component | Komponente eines komplexen Adjektivs |

## 4.1 Basisstruktur

In Adjektivphrasen wird das Adjektiv immer als Kopf (HD) annotiert. Nominale Adjektivargumente werden wie Objekte in Verbphrasen behandelt.

```text
(AP (DA:NP (NK:ART dem) (NK:NN Alkohol)) (HD:ADJD zugetan))
```

```text
(AP (OG:NP (NK:ART des) (NK:NN Lebens)) (HD:ADJD überdrüssig))
```

PPs und Adverbien werden vorläufig alle als MO annotiert.

```text
(AP (MO:ADV sehr) (HD:ADJD doof))
```

```text
(AP (MO:PP (AC:APPR auf) (NK:PPOSAT ihren) (NK:NN Sohn)) (HD:ADJD stolz))
```

```text
(NP (NK:ART der) (NK:AP (MO:PP (AC:APPR für) (NK:PPOSAT sein) (NK:NN Land)) (MO:ADV ziemlich) (HD:ADJA große)) (NK:NN Mann))
```

<!-- PDF page 39 -->

```text
(NP (NK:ART der) (NK:AP (MO:ADV fast) (MO:ADV schon) (MO:PTKA zu) (HD:ADJA große)) (NK:NN Mann))
```

```text
(NP (NK:ART der) (NK:AP (MO:ADV immer) (HD:ADJA glückliche)) (NK:NN Mann))
```

Das Label AMS bekommen folgende NPs bzw. PPs:

6. a. [zwei Jahre]AMS [alt]HD  
   b. [zehn Meter]AMS [hoch]HD  
   c. [drei Monate]AMS [älter]HD  
   d. [um einiges]AMS [besser]HD  
   e. [drei Wochen]AMS [lang]HD

```text
(AP (AMS:NP (NK:CARD drei) (NK:NN Kilometer)) (HD:ADJD nördlich) (PG:PP (AC:APPR von) (NK:NE Saarbrücken)))
```

## 4.2 Adjektivisch gebrauchte Verbformen

Sowohl Partizip Präsens als auch Partizip Präteritum können adjektivisch gebraucht werden. In solchen Fällen werden sie als ADJD bzw. ADJA getaggt, vererbte Argumente werden mit dem entsprechenden Funktionslabel in einen AP-Knoten gehängt.

```text
(NP (NK:ART der) (NK:AP (SBP:PP (AC:APPR von) (NK:PPER uns)) (OP:PP (AC:APPR über) (NK:ART das) (NK:NN Mensaessen)) (HD:ADJA befragte)) (NK:NN Student))
```

<!-- PDF page 40 -->

```text
(AP (OA:NP (NK:ART den) (NK:NN Zug)) (MO:ADJD knapp) (HD:ADJD verpassend))
```

Mit *zu* modifizierte, adjektivisch gebrauchte Partizipien werden folgendermaßen annotiert:

```text
(NP (NK:VZ (PM:PTKZU zu) (HD:ADJA erledigende)) (NK:NN Aufträge))
```

Zusätzlich modifizierte Zu-Partizipien werden wie folgt behandelt:

```text
(NP (NK:ART die) (NK:AP (MO:ADV noch) (HD:VZ (PM:PTKZU zu) (HD:ADJA erledigenden))) (NK:NN Aufträge))
```

<!-- PDF page 41 -->

## 4.3 Komplexe Adjektive

Komplexe Adjektive, meistens von Eigennamen abgeleitet, werden als MTA (multi-token adjective) annotiert. Ein MTA besteht ausschließlich aus Adjektivkomponenten (ADC):

```text
(NP (NK:ART die) (NK:MTA (ADC:NE New) (ADC:ADJA Yorker)) (NK:NN Presse))
```

Beachte: Wie bei komplexen Eigennamen werden etwaige Modifikatoren von MTAs an den AP-Knoten angebunden.

## 4.4 Modifizierte Determiner

Modifizierte Determiner werden ebenfalls als APs annotiert, wie z.B. *fast alle, gar keine, viel zu viele, manch ein*. Der Determiner wird dabei als Kopf (HD) annotiert, der Modifikator als MO.

```text
(NP (NK:AP (MO:ADV fast) (HD:PIAT alle)) (NK:ADJA saarländischen) (NK:NN Studenten))
```

```text
(NP (NK:AP (MO:ADV gar) (HD:PIAT keine)) (NK:NN Nudeln))
```

```text
(NP (NK:AP (MO:ADV viel) (MO:PTKA zu) (HD:PIAT viele)) (NK:NN Menschen))
```

Zu *keine* siehe auch 8.18.1.

```text
(NP (NK:AP (MO:ADV überhaupt) (HD:PIAT keine)) (NK:NN Leute))
```

<!-- PDF page 42 -->

Im Falle von *nur* ist zu beachten, daß der Skopus je nach Kontext variiert.

```text
(S (SB:NP (NK:AP (MO:ADV nur) (HD:PIAT wenige)) (NK:ADJA überzeugte) (NK:NN Kämpfer)) (HD:VVFIN kamen))
```

Für das nebenstehende Beispiel ist sowohl eine AP-Lesart wie oben möglich, als auch eine Lesart, in der *nur* das Verb modifiziert.

```text
(S (PH:PPER es) (HD:VVFIN kamen) (MO:ADV nur) (SB:NP (NK:PIAT wenige) (NK:ADJA überzeugte) (NK:NN Kämpfer)))
```

Flach annotiert werden hingegen komplexe Determiner wie *die vielen, ein jeder*.

```text
(NP (NK:ART die) (NK:PIAT vielen) (NK:NN Leute))
```

```text
(NP (NK:ART ein) (NK:PIAT jeder) (NK:NN Mann))
```

Von komplexen bzw. modifizierten Determinern zu unterscheiden sind Konstruktionen wie (siehe auch Abschnitt 4.6.):

```text
(NP (NK:CARD zwei) (AG:NP (NK:ART der) (NK:ADJA schnellsten) (NK:NN Läufer)))
```

<!-- PDF page 43 -->

## 4.5 Komparativ

Adjektive im Komparativ können sich mit einem zusätzlichen Argument verbinden, einer mit *als* eingeleiteten Phrase, wobei die Kategorie der Phrase vom *als* unabhängig ist. Dieses Argument bekommt das Funktionslabel CC (comparative complement), das Wort *als* das Label CM (comparative conjunction). Siehe auch die Abschnitte 7.2 und 6.4.

```text
(AP (MO:PP (AC:APPR auf) (NK:PPOSAT ihren) (NK:NN Sohn)) (HD:ADJD stolzer) (CC:NP (CM:KOKOM als) (NK:PPOSAT ihr) (NK:NN Mann)))
```

```text
(S (SB:PPER Er) (HD:VVFIN tat) (MO:AP (MO:ADV viel) (HD:ADJD unschuldiger) (CC:S (CM:KOKOM als) (SB:PPER er) (HD:VAFIN war))) (--:$. .))
```

```text
(NP (MO:ADV viel) (HD:PIS weniger) (CC:NP (CM:KOKOM als) (NK:CARD 30) (NK:NN Leute)))
```

In den folgenden diskontinuierlichen Bäumen kennzeichnet `@surfaceIndex` die ursprüngliche Wortfolge.

```text
(NP (NK:ART einen@0) (NK:AP (MO:ADV viel@1) (HD:ADJA traurigeren@2) (CC:S (CM:KOKOM als@5) (SB:NE Marvin@6) (PD:PDS einer@7) (HD:VAFIN ist@8))) (NK:NN Roboter@3) (--:$, ,@4))
```

```text
(NP (NK:ART eine) (NK:AP (MO:ADV weniger) (HD:ADJA wichtige)) (NK:NN Angelegenheit))
```

```text
(VP (OA:NP (NK:AP (HD:PIAT mehr@0) (CC:AVP (CM:KOKOM als@3) (MO:ADV je@4) (HD:ADV zuvor@5))) (NK:NN Schulden@1)) (HD:VVPP angehäuft@2))
```

```text
(NP (NK:AP (HD:PIAT weniger@0) (CC:NP (CM:KOKOM als@2) (NK:ART die@3) (NK:ADJA vorangemeldeten@4) (NK:NN Leute@5))) (NK:NN Teilnehmer@1))
```

<!-- PDF page 44 -->

```text
(S (SB:PPER Wir@0) (HD:VAFIN haben@1) (OC:VP (OA:NP (MO:PP (AC:APPR um@2) (NK:CARD 17@3) (NK:NN Stimmen@4)) (NK:PIS weniger@5) (CC:NP (CM:KOKOM als@7) (NK:ART die@8) (NK:NN Regierung@9))) (HD:VVPP bekommen@6)))
```

```text
(NP (NK:AP (HD:PIAT mehr) (CC:AP (CM:KOKOM als) (HD:NM (NMC:CARD 30) (NMC:NN Millionen)))) (NK:NN Mark))
```

Beachte den Unterschied zwischen dem Komparativ-*als* und *als* in *Peter als Straßenfeger* (PP)!

Dasselbe gilt für Phrasen, die mit *wie* gebildet werden.

```text
(AP (HD:ADJD groß) (CC:NP (CM:KOKOM wie) (NK:NE Peter)))
```

Anmerkung: Die nicht-prototypischen Indefinitpronomen *wenig, ander-* und *mehr* können ebenfalls eine Vergleichsphrase als CC nehmen, auch wenn sie ihrem POS-Tag nach keine Adjektive sind. Dementsprechend heißt im Falle von PIS bzw. ADV der Knoten, in dem die Vergleichsphrase hängt, NP bzw. AVP. Im Falle von PIAT bleibt es bei dem Knoten AP. Bei der POS-Tag-Vergabe für diese Einheiten bildet das STTS unsere Grundlage und sieht Folgendes vor:

<!-- PDF page 45 -->

7. a. *wenig*: PIAT, PIS oder ADV
   - [weniger]PIAT Milch als Kakao (AP)
   - die [wenigen]PIAT Stunden
   - [Wenige]PIS kamen.
   - Es kamen [weniger]PIS als gestern. (NP)
   - Sie weint [wenig]ADV.
   - Sie weint [weniger]ADV, als er glaubt. (AVP)

   b. *ander-* : ADJA, PIS
   - [andere]ADJA Socken als gestern (AP)
   - [andere]PIS als gestern (NP)
   - Das Adverb *anders* kann ebenfalls eine Vergleichsphrase unter dem Mutterknoten AVP nehmen.

   c. *mehr*: PIAT, PIS oder ADV
   - [mehr]PIAT Kakao als Milch (AP)
   - [mehr]PIAT Stunden
   - Ich will [mehr]PIS.
   - Ich will [mehr]PIS, als ich kriege. (NP)
   - Ich jogge wieder [mehr]ADV.
   - Kinder hüpfen [mehr]ADV als Erwachsene. (AVP)

Im Falle von *so - wie* wird zuerst die AVP mit dem Kopf *so* und dem komparativen Komplement (CC) *wie ...* gebildet. Diese wiederum fungiert als MO des Adjektivs.

```text
(S (SB:NE Peter) (HD:VAFIN ist) (PD:AP (MO:AVP (HD:ADV so) (CC:NP (CM:KOKOM wie) (NK:NE Maria))) (HD:ADJD groß)))
```

<!-- PDF page 46 -->

Beachte auch:

```text
(NP (NK:ART eine) (NK:AP (MO:ADV weniger) (HD:ADJA wichtige)) (NK:NN Angelegenheit))
```

```text
(VP (MO:AVP (HD:ADV anders@0) (CC:NP (CM:KOKOM als@2) (NK:NE Maria@3))) (HD:VVPP gekleidet@1))
```

## 4.6 Superlativ

In NPs mit Superlativen wird die Beziehung zwischen Superlativ und Referenzmenge nicht ausdrücklich annotiert. Die Struktur entspricht der Struktur NP mit MNR.

```text
(NP (NK:ART der) (NK:ADJA beste) (NK:NN Annotierer) (MNR:PP (AC:APPR von) (NK:PIS allen)))
```

```text
(NP (NK:ART die) (NK:PIS meisten) (AG:NP (NK:ART der) (NK:CARD 100) (NK:NN Angestellten)))
```

Superlativisches *am* wird analog zum infinitivischen *zu* mit dem Funktionslabel (PM) (particle morphological) versehen. Das zugehörige Adjektiv wird als head (HD) gekennzeichnet. Die aus *am* und dem Adjektiv im Superlativ gebildete Phrase wird mit dem Knotenlabel (AA) (adjective with am) versehen.

```text
(AP (HD:AA (PM:PTKA am) (HD:ADJD besten)) (MO:PP (AC:APPR von) (NK:PIS allen)))
```

<!-- PDF page 47 -->

Superlative ohne *am* werden wie folgt behandelt:

```text
(NP (NK:ART der) (NK:AP (MO:PP (AC:APPR von) (NK:PIS allen)) (HD:ADJA beste)) (NK:NN Annotierer))
```

## 4.7 Argumente von Adjektiven

Eindeutige Tests für die Frage, welche Konstituenten Komplemente zu Adjektiven sind, gibt es nicht. Generell gilt: Wenn eine Konstituente eng zum Adjektiv interpretiert wird, bindet man es in die AP mit ein, vergibt jedoch die Funktion MO.

```text
(AP (HD:ADJD stolz) (MO:PP (AC:APPR auf) (NK:ART das) (NK:NN Erreichte)))
```

Beachte! Im Falle von deverbalen Adjektiven werden die Argumente des Verbs vererbt und mit ihren ursprünglichen Funktionen annotiert.

8. a. Das *auf den Zeugenaussagen beruhende* Urteil wird angefochten:

```text
(AP (OP:PP (AC:APPR auf) (NK:ART den) (NK:NN Zeugenaussagen)) (HD:ADJA beruhende))
```

   b. *Den Zug verpassend*, stand ich da:

```text
(AP (OA:NP (NK:ART Den) (NK:NN Zug)) (HD:ADJD verpassend))
```

   c. Das *von ihm gestohlene* Auto brannte völlig aus:

```text
(AP (SBP:PP (AC:APPR von) (NK:PPER ihm)) (HD:ADJA gestohlene))
```

Vgl. 5.2.6
<!-- PDF page 48 -->

# 5 Verbphrasen und Sätze

Knotennamen: VP, S

Kantennamen:

| Label | Bezeichnung | Bedeutung |
|---|---|---|
| AC | ADpositional Case marker | Adposition |
| CP | ComPlementizer | Complementizer |
| DA | DAtive | Dativobjekt oder freier Dativ |
| DM | Discourse Marker | Diskurspartikel (ja, nein) |
| HD | HeaD | Kopf |
| JU | JUnctor | Junktor |
| MO | MOdifier | Modifikator |
| NG | NeGation | Negation nicht |
| OA | Object Accusative | Akkusativobjekt |
| OA2 | Object Accusative 2 | zweites Akkusativobjekt |
| OC | Object Clausal | klausales Objekt |
| OG | Object Genitive | Genitivobjekt |
| PD | PreDicative | Prädikativ |
| SB | SuBject | Subjekt |
| SBP | SuBject Passivised | (logisches) Subjekt im Passivsatz |
| SP | Subject or Predicative | Subjekt oder Prädikativ |
| SVP | Separable Verb Prefix | abgetrennter Verbpräfix |
| VO | Vocative | Anrede |

## 5.1 Basisstruktur

Jedes Verb führt eine eigenständige Phrase ein. Phrasen mit finitem Verb bekommen das Label S (Satz):

```text
(S (SB:NE Peter) (HD:VVFIN schläft) (MO:PP (AC:APPRART im) (NK:NN Büro)))
```

<!-- PDF page 49 -->

Nicht-finite Phrasen bekommen das Label VP:

```text
(S (SB:NE Peter) (HD:VMFIN will) (OC:VP (MO:PP (AC:APPRART im) (NK:NN Büro)) (HD:VVINF schlafen)))
```

Im letzteren Satz ist *im Büro schlafen* ein nicht-finites verbales Argument von *will* und bekommt deshalb das Funktionslabel OC (s. NP-Syntax) und das Kategorielabel VP.

Beachte: Das Subjekt wird immer als Dependent des finiten Verbs annotiert.

OC wird auch Satzkomplementen zugewiesen:

```text
(S (SB:PPER Er) (HD:VMFIN will) (OC:S (CP:KOUS daß) (SB:PPER wir) (HD:VVFIN kommen)))
```

Infinitive mit *zu* werden wie nebenstehend annotiert.

Der Infinitiv und das *zu* verbinden sich zuerst zu einer VZ-Phrase (PM steht für morphologische Partikel). Diese Phrase ist dann der Kopf der eigentlichen VP.

```text
(S (SB:PPER Er) (HD:VVFIN versucht) (OC:VP (MO:PP (AC:APPR zu) (NK:PPER uns)) (HD:VZ (PM:PTKZU zu) (HD:VVINF kommen))))
```

Beachte: alle Verbkomplemente und -adjunkte werden an den VP-Knoten angebunden und nicht an VZ.

<!-- PDF page 50 -->

```text
(S (SB:PPER Er) (HD:VAFIN hat) (OC:VP (OC:VP (DA:PPER mir) (HD:VVINF versprechen)) (HD:VMINF müssen) (OC:VP (MO:PP (AC:APPR in) (NK:NE Saarbrücken)) (HD:VZ (PM:PTKZU zu) (HD:VVINF bleiben)))))
```

Erläuterungen:

- Funktor-Argument-Abhängigkeiten zwischen den Verben: hat-müssen-versprechen-bleiben, dementsprechend sieht der Baum aus.

## 5.2 Grammatische Funktionen

### 5.2.1 Komplementierer (CP)

Als CP werden alle satzeinleitenden Konjunktionen annotiert, die die Verbletztstellung auslösen: daß, ob, weil, obwohl etc. Fragepronomen, die einen Nebensatz mit Verbletztstellung einleiten, werden hingegen als MO annotiert und bekommen das PoS-Tag PWAV (entgegen der - unserer Meinung nach unlogischen - Regelung im STTS).

<!-- PDF page 51 -->

Koordinierte CPs bekommen das Knotenlabel CCP (coordinated complementiser), koordinierte PWAVs das Knotenlabel CAVP:

```text
(S (CP:CCP (CJ:KOUS obwohl) (CD:KON oder) (CJ:AVP (MO:ADV gerade) (HD:KOUS weil))) (SB:PPER er) (HD:VVFIN kommt))
```

```text
(S (MO:CAVP (CJ:PWAV wann) (CD:KON und) (CJ:PWAV wie)) (SB:PPER er) (HD:VVFIN kommt))
```

Problematisch wird es bei Kombinationen von PWAV und CP, wie z.B. *ob und wann*. Mögliche Lösung: Die Kategorie des ersten Elements bestimmt auch die Kategorie der Koordination, z.B. *ob und wann* wäre somit eine CCP.

### 5.2.2 Subjekt (SB)

Als SB werden alle im Satz vorkommenden Subjekte annotiert:

(9)  
a. [Der Duden]SB hat immer Recht.  
b. [Er]SB fragte, ob [sie]SB ihn noch liebe.

Auch Sätze und VPs können Subjektfunktion übernehmen und werden dann als Subjekt annotiert:

(10)  
a. [Daß der Duden immer Recht hat]SB, ist unumstritten.  
b. [Hausarbeiten schreiben]SB macht Spaß.

Genauere Ausführungen hierzu: vgl. 5.2.13

### 5.2.3 Akkusativobjekt (OA, OA2)

Als OA werden die meisten im Satz vorkommenden Akkusativ-NPs annotiert:

(11)  
a. er sieht [den Mann]OA

<!-- PDF page 52 -->

b. [das Buch]OA hat er dem Kind gegeben

Dies gilt auch für Reflexiva, die im Akkusativ stehen (Vorsicht: sich, uns und euch sind ambig (Dativ/Akkusativ)!), vgl.

(12) Peter erinnert [sich]OA noch daran

Ausgenommen sind dagegen sog. freie Akkusative, meistens Zeitausdrücke, die als MO annotiert werden:

(13)  
a. er hat [den ganzen Tag]MO geschlafen  
b. Paul hat [den ganzen Tag]MO [den Rasen]OA gemäht

Einige Verben können sich mit zwei Akkusativ-NPs verbinden. Die zweite wird entweder als OA2 oder als MO annotiert. Das Hauptunterscheidungskriterium ist der Kasus der zweiten Akkusativ-NP nach der Passivierung: Bei OA2 ändert er sich nicht, vgl.:

(14)  
a. der Tanzlehrer lehrt [den Schüler]OA [einen Tanz]OA2  
b. der Schüler wird einen/*ein Tanz gelehrt

(15)  
a. der Mann nennt [mich]OA [einen Lügner]MO  
b. ich wurde ein/*einen Lügner genannt

lehren: OA + OA2

nennen, schimpfen, kosten: OA + MO

<!-- PDF page 53 -->

Beachte: Diese Analyse gilt nicht für Akkusativ-mit-Infinitiv-Verben sowie *lassen*, da hier die Akkusativ-NPs zu verschiedenen Verben gehören:

```text
(S (SB:PPER er) (HD:VAFIN hat) (OC:VP (OA:NE Maria) (OC:VP (OA:NP (NK:PPOSAT ihren) (NK:NN Mann)) (HD:VVINF schlagen)) (HD:VVINF sehen)))
```

```text
(S (SB:PPER er) (HD:VVFIN ließ) (OA:NE Peters) (OC:VP (OA:NP (NK:ART ein) (NK:NN Lied)) (HD:VVINF singen)))
```

Bei *lassen* kann dies oft zu Fehlern führen, so daß besondere Aufmerksamkeit geboten ist. Als Faustregel kann man sich merken: das OA von *lassen* ist zugleich das logische Subjekt des eingebetteten Verbs. In der nebenstehenden Struktur gilt also: Er läßt uns gehen → Wir gehen.

```text
(S (SB:PPER er) (HD:VVFIN läßt) (OA:PPER uns) (HD:VVINF gehen))
```

Hier dagegen ist *den Mann* das OA von *enthaupten*, und man kann sagen: er läßt den Henker den Mann enthaupten.

Die Suffixe `@0` bis `@4` geben wegen der diskontinuierlichen VP die Oberflächenpositionen an.

```text
(S (OC:VP (OA:NP (NK:ART den@0) (NK:NN Mann@1)) (HD:VVINF enthaupten@4)) (HD:VVFIN ließ@2) (SB:PPER er@3))
```

<!-- PDF page 54 -->

*lassen + sich*: per Konvention wird *sich* tief angebunden:

```text
(S (SB:PDS das) (HD:VVFIN läßt) (OC:VP (OA:PRF sich) (HD:VVINF machen)))
```

Ebenfalls so:

```text
(S (HD:VVFIN läßt) (OC:VP (MO:ADV so) (OA:PRF sich) (HD:VVINF diskutieren)) (NG:PTKNEG nicht))
```

```text
(S (SB:NP (NK:ART das) (NK:NN Monster)) (HD:VVFIN läßt) (OC:VP (OA:PRF sich) (MO:ADJD leicht) (HD:VVINF rasieren)))
```

```text
(S (SB:PPER es) (HD:VVFIN läßt) (OC:VP (OA:PRF sich) (HD:VVINF sagen)) (NG:PTKNEG nicht))
```

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen Platzhalterphrase an.

```text
(S (HD:VVFIN läßt@1) (OC:VP (OA:PRF sich@2) (HD:VVINF sagen@4)) (NG:PTKNEG nicht@3) (SB:NP (PH:PPER es@0) (RE:S (CP:KOUS ob@6) (SB:PPER er@7) (HD:VVFIN kommt@8))))
```

Ausnahme:

(16) [er]SB [läßt]HD [sich]OA [gehen]OC

Beachte: *sich* kann sowohl ein OA, als auch ein DA sein, wie nebenstehend:

```text
(S (SB:PPER er) (HD:VVFIN läßt) (OC:VP (DA:PRF sich) (OA:NP (NK:ART den) (NK:NN Kopf)) (MO:ADJD kahl) (HD:VVINF rasieren)))
```

Akkusativanbindung bei ACI-Konstruktionen:

Wahrnehmungsverben wie *sehen, hören, fühlen* etc. können als Ergänzungen ein Akkusativobjekt und einen reinen Infinitiv bzw. eine Infinitivkonstruktion nehmen.

<!-- PDF page 55 -->

(17) Ich sehe den schlauen Kai einen Kuchen backen.  
(18) Ich sehe den schlauen Kai backen.

In 17 ist die erste OA-NP das logische Subjekt des infiniten Vollverbs, dessen Akkusativobjekt durch die zweite OA-NP repräsentiert wird. Daraus folgt, dass der erste Akkusativ dem finiten Verb und der zweite Akkusativ dem infiniten Verb nebengeordnet wird. Ambivalente Strukturen wie in 18 sollten kontextuell disambiguiert werden können.

Ebenso soll mit Verbindungen aus Wahrnehmungsverb, OA-NP und Partizip verfahren werden. Hier stellt das Akkusativobjekt das Subjekt der Passivkonstruktion dar. Vgl. 7.6.3

(19)  
a. Er sieht sein Lebenswerk bedroht.  
b. Sein Lebenswerk ist bedroht.

(20)  
a. Sie sieht sich dazu gezwungen.  
b. Sie ist dazu gezwungen.

MO-Anbindung:

- In Sätzen mit dem Verb *lassen* soll wie bei der MO-Anbindung bei den Modalverben durch andere Verben (z.B. können, müssen, veranlassen) paraphrasiert werden. (*Früher ließ sich eine Grippe nicht so leicht auskurieren* kann paraphrasiert werden durch *Früher war es nicht so leicht möglich, eine Grippe auszukurieren*. Demnach müßten die MOs *früher* und *nicht so leicht* an das *lassen* angebunden werden anstatt an die VP.) Je nach Kontext sollten verschiedene Paraphrasierungen ausprobiert und die beste Möglichkeit ausgesucht werden. Auch hier gilt wie bei den Modalverben: Im Zweifelsfall eher hoch als niedrig anbinden!
- Bei den Wahrnehmungsverben sollte sinnvoll disambiguiert werden bzw. auf die Zweifelsfall-Regel zurückgegriffen werden. In *Ich sah ihn am Freitag ins Schwimmbad gehen* würde die Zeitangabe zum finiten Verb und die Richtungsangabe zum infiniten Verb gehängt.

### 5.2.4 Dativ (DA)

Sowohl freie Dative als auch echte Dativobjekte werden mit dem Label DA versehen:

(21)  
a. Peter hilft [mir]DA  
b. Jemand hat [ihm]DA sein Auto geklaut  
c. [Dem Professor]DA ist ein Fehler unterlaufen

Analog zu Akkusativobjekten, werden auch Dativreflexiva als DA annotiert:

(22) Er hat [sich]DA vorgenommen, dreihundert Sätze zu annotieren

<!-- PDF page 56 -->

### 5.2.5 Genitivobjekt (OG)

In diese Klasse fallen echte Genitivobjekte von Verben, wie:

(23)  
a. Peter gedenkt [seines Großvaters]OG  
b. So entledigten [sie]SB [sich]OA [eines Mitwissers]OG

Freie Genitive (*eines Tages, eines Nachts*, etc.) werden hingegen als MO annotiert.

### 5.2.6 Präpositionalobjekte (OP)

An dieser Stelle geht es um die Abgrenzung zwischen Präpositionalobjekten und Präpositionalphrasen, die als Modifikatoren (MO) fungieren. Eine Reihe von Tests wird etabliert, die dazu dienen, Präpositionalobjekte zu identifizieren. Im Anhang (C) befinden sich einige Listen von Verbindungen von Verben und Präpositionen, eingeteilt nach den hier entwickelten Kriterien.

Ein Präpositionalobjekt zeichnet sich dadurch aus, daß seine Präposition infolge eines Abstraktionsprozesses an das Verb gebunden ist. Dabei verliert sie ihren lexikalischen Gehalt und nimmt funktionalen Charakter an (24).

(24)  
a. Kalle verzichtet auf exorbitante Schwierigkeiten  
b. Inge wartet auf den Mann ihres Lebens  
c. Der Frosch freut sich auf die fette Fliege über ihm

Ganz anders sind die Präpositionalphrasen in (25) zu werten. Dort ist der lexikalische Gehalt der Präpositionen deutlich.

(25)  
a. Kalle steht auf dem Teppich  
b. Inge wartet auf dem Berg  
c. Die fette Fliege sitzt auf dem Frosch  
d. Die Berliner hängen ihre Wäsche an die Leine

Im Falle eines Präpositionalobjektes regiert das Verb genau eine Präposition, doch kann man vom Auftreten dieser Präposition allein noch nicht auf das Vorliegen eines Präpositionalobjekts schließen. In den Beispielen (26) tritt dieselbe Präposition sowohl in einer als Modifikator fungierenden PP als auch in einer als Präpositionalobjekt fungierenden PP auf.

(26)  
a. Mit Elan (MO) fing er mit seiner Unterrichtsstunde (OP) an  
b. An der alten Eiche (MO) denke ich an Thomas (OP)  
c. Nach zehn Uhr (MO) sehnte er sich immer nach einem kühlen Bier (OP)

Um Präpositionalobjekte zu erkennen, kann auf verschiedene Testverfahren zurückgegriffen werden, die im folgenden aufgelistet werden.

<!-- PDF page 57 -->

1. Die Präpositionen der Präpositionalobjekte sind ausschließlich morphologisch einfache Präpositionen der alten Schicht und bilden eine geschlossene Klasse. Wir zählen dazu:

   - an
   - auf
   - aus
   - für
   - gegen
   - in
   - mit
   - nach
   - über
   - um
   - unter
   - von
   - vor
   - zu

   Präpositionalphrasen mit neueren oder morphologisch komplexen Präpositionen wie *aufgrund, entsprechend, infolge, trotz, zuzüglich* können keine Präpositionalobjekte sein. Dieser Test kann also viele Präpositionalphrasen gleich zu Beginn ausschließen.

2. Die Präposition hat keine fest umrissene Bedeutung. Die Präpositionen in (24) haben aufgrund eines Abstraktionsprozesses, in der die Präposition an das Verb gebunden wird, ihre zumeist lokale Grundbedeutung verloren. Ihr Charakter ist eher als funktional zu bezeichnen. In der Praxis hat sich gezeigt, dass die Grundbedeutung einiger Präpositionen schwierig zu bestimmen bzw. die Abgrenzung von der Grundbedeutung nur schwer zu vollziehen ist. Hierzu zählen vor allem die Präpositionen *für* und *mit*. (siehe Test 4 zur Kommutierbarkeit!)

   In der Vergangenheit traten hierbei einige Zweifelsfälle auf, die tendenziell als OP analysiert wurden, die wir aber als MO beschreiben wollen. Dabei handelt es sich um Fälle von Übertragungen und um Präpositionalphrasen bei Partikelverben.

   - **Übertragungen**

     Im Falle von Übertragungen behält die Präposition ihre Grundbedeutung, doch wird das von der Präposition bezeichnete konkrete Verhältnis metaphorisch abstrahiert. Die syntaktische Struktur bleibt erhalten, so dass sich immer Beispiele für eine konkrete Verwendung finden lassen. PPs mit übertragener Bedeutung werden als MO analysiert.

     (27)  
     a. Die Gardinen entzünden sich an der Kerze (konkret)  
     &nbsp;&nbsp;&nbsp;&nbsp;Der Streit entzündet sich am Gesetzentwurf (übertragen)  
     b. Dieser Weg führt zur Universität Potsdam (konkret)  
     &nbsp;&nbsp;&nbsp;&nbsp;Unsere Überlegungen führen zu einer Lösung (übertragen)  
     c. Ich setze das Kind auf den Wickeltisch. (konkret)  
     &nbsp;&nbsp;&nbsp;&nbsp;Ich setze große Stücke auf unser Vorhaben (übertragen)

     Bei einigen Verben zeigt sich, dass die konkrete Bedeutung der PP an die reflexive Form des Verbs gebunden ist, während die metaphorische Bedeutung tendenziell mit der nicht-reflexiven Form einhergeht.

     (28)  
     a. Er hält sich an der Leine fest (konkret)  
     &nbsp;&nbsp;&nbsp;&nbsp;Er hält (sich) an seinem Vorhaben fest (übertragen)

<!-- PDF page 58 -->

     b. Die Äste neigen sich zum Boden (konkret)  
     &nbsp;&nbsp;&nbsp;&nbsp;Er neigt zur Fresssucht (übertragen)

     Wenn ein Fall von Übertragung vermutet und nach einem konkreten Beispiel gesucht wird, spielt es keine Rolle, ob ein Reflexivpronomen hinzugefügt bzw. weggelassen werden muss, siehe (28b).

     Sonderfälle: Bei den folgenden Phrasen handelt es sich nicht um Verben mit Präpositionalobjekten, sondern um Verben, deren konkrete Bedeutung metaphorisiert und deren Akkusativobjekt restringiert ist.

     (29)  
     a. [auf etwas]MO [Wert]OA legen  
     b. [das Wort]OA richten [an jemanden]MO

   - **Partikelverben**

     Bei Partikelverben handelt es sich um ein spezielles semantisches Problem. Es tritt hierbei semantische Identität zwischen Verbpartikel und der jeweiligen Präposition auf. Bei einer solchen Doppelung gilt die Grundbedeutung der Präposition als nicht verloren, da die Präposition in der Verbindung mit dem zugrunde liegenden Verb eben diese konkrete Bedeutung nicht eingebüßt hat. Auch in diesen Fällen sollen die entsprechenden PPs als MO angesehen werden.

     (30) anpassen an, einmischen in, einbeziehen in, anknüpfen an, einreihen in, zusammenarbeiten mit, zusammenhängen mit

     Verben wie *einhergehen mit, kollaborieren mit, kombinieren mit* werden analog behandelt, da die komitative Bedeutung von *mit* im Präfix enthalten ist. Es ergibt sich dieselbe semantische Identität zwischen Präfix und Präposition wie oben zwischen Verbpartikel und Präposition.

3. Bei nicht-belebten Nominalen kann ein Ersetzungstest mit Pronominaladverb verwendet werden (31a-31b). Wenn es nicht möglich ist, die Stelle des Nominals mit einem Pronominaladverb zu besetzen, dann handelt es sich um einen Modifikator, und nicht um ein Präpositionalobjekt. Der Satz (31e) kann anstelle von (31d) verwendet werden. Eine Verwendung anstelle von (31c) ist nur dann möglich, wenn die Werkbank repariert wird, also Präpositionalobjekt ist, nicht aber, wenn die Werkbank ein MO ist, also den Ort des Arbeitens angibt. Das gleiche Ergebnis liefert ein Fragetest mit einem entsprechenden Pronomen (*Woran arbeitet Paul?*).

   (31)  
   a. Er besteht darauf  
   b. Er interessiert sich dafür  
   c. Paul arbeitet an der Werkbank  
   d. Paul arbeitet an seinem Schaukelpferd  
   e. Paul arbeitet daran

   Bei belebten Nominalen ist es manchmal möglich, bei gleichbleibender Verbsemantik ein nicht-belebtes Nominal einzusetzen. In diesem Falle kann Test 3 auch bei Sätzen mit belebten Nomina verwendet werden. Beispiel (32a) kann in (32b) umgewandelt werden. Dann können die Sätze (32c) und (32d) als Tests dienen.

<!-- PDF page 59 -->

   (32)  
   a. Wolfgang wartet auf Helmut  
   b. Wolfgang wartet auf Helmuts Ankunft  
   c. Wolfgang wartet darauf  
   d. Worauf wartet Wolfgang?

   NB: Test 3 ist kein Test zur positiven Identifikation von Präpositionalobjekten, sondern ein Test, der eine Klasse von Modifikatoren ausschließt (z.B. 31c mit einer bestimmten Bedeutung). Die Vorgehensweise in (32) zeigt, daß die Präpositionalgruppe in (32a) immer noch ein Präpositionalobjekt sein kann. Test 2 ist dann ausschlaggebend.

4. Das Kriterium der Nichtkommutierbarkeit wird erfüllt. Regiert das Verb genau eine Präposition, während alle anderen zu ungrammatischen Ausdrücken führen, so handelt es sich dabei um ein Präpositionalobjekt. Auch wenn mehrere Präpositionen möglich sind, kann dies der Fall sein.

   (33)  
   a. Ich freue mich auf den Urlaub  
   b. Wir freuen uns über die Gehaltserhöhung

   Test zur Abgrenzung von Adjunkten:

   **Die Präpositionen gegen und für**

   Kann man *gegen* statt *für* einsetzen, handelt es sich nicht um ein Präpositionalobjekt.

   (34)  
   a. Über tausend ErzieherInnen demonstrierten gestern für den Erhalt der städtischen Kindertagesstätten  
   b. Über tausend ErzieherInnen demonstrierten gestern gegen die Kürzungen im sozialen Bereich  
   c. Ich interessiere mich für Sport  
   d. \*Ich interessiere mich gegen Sport

   **Die Präposition mit**

   Häufig treten Abgrenzungsprobleme bei *mit*-PPs auf. In Adjunkten kann *mit* vor allem die folgenden Grundbedeutungen haben:

   - **Komitative Bedeutung**

     Als Regel gilt die mögliche Substitution der Präposition *mit* durch *ohne*. Zusätzlich kann oft das Adverb *zusammen* vor die PP geschoben werden, welches die komitative Bedeutung besonders verdeutlicht.

     (35)  
     a. Mit Rückenwind schaffe ich die Strecke in einer Stunde  
     b. Ohne Rückenwind schaffe ich sie gar nicht!  
     c. Sören fliegt (zusammen) mit Ortrun in den Urlaub  
     d. Sören fliegt ohne Ortrun in den Urlaub

<!-- PDF page 60 -->

     Die *mit*-Präpositionalphrasen fungieren hier als Modifikatoren.

   - **Instrumentale Bedeutung**

     Als Erkennungshilfe gilt die Substitution von *mit* durch *mittels*.

     (36)  
     a. Ich öffne die Tür [mit dem Schlüssel / mittels eines Schlüssels]INST/MO  
     b. Ich mische das Mehl [mit den Eiern]OP / [mit dem Löffel]INST/MO

     Die Präposition *mittels* ist im heutigen Sprachgebrauch selten, wodurch die Intuition, ob die *mittels*-PP eine mögliche Alternative zur *mit*-PP darstellt, geschwächt ist. Dennoch liegt meistens der Instrumentcharakter des Adjunkts auf der Hand.

     Instrumentale Phrasen nehmen eine Sonderstellung zwischen Objekten und Adjunkten ein. Sie sind im Vergleich zu den prototypischen Adjunkten stark grammatikalisiert. So sind zum Beispiel Strukturen wie etwa *Der Schlüssel öffnet die Tür* als Diathese zu (36a) möglich. Daher wäre es von Vorteil, die instrumentalen Phrasen als solche zu kennzeichnen. Wir schlagen vor, zu einem späteren Zeitpunkt, nach der grundlegenden Konsistenzschaffung, über die Zukunft der Instrumentale im TIGER-Korpus zu entscheiden. Vorerst werden aber auch die instrumentalen *mit*-Präpositionalphrasen als Modifikatoren annotiert.

5. Die Präpositionalphrase ist obligatorisch. Ohne die betreffende Präpositionalphrase ist der Satz ungrammatisch. Ist diese Bedingung erfüllt, ist dies ein Indiz dafür, daß es sich um ein Präpositionalobjekt handeln könnte. Wie andere Komplemente (z.B. Akkusativ- und Dativobjekte) können aber auch Präpositionalobjekte fakultativ sein. Die Obligatorik ist also keine absolute Bedingung. Es gibt auch MOs, die obligatorisch sind, wie etwa bei *wohnen*. Dieser Test rangiert also ganz unten. Wenn eine Präpositionalphrase obligatorisch ist, sollten zunächst auch die anderen Tests auf jedem Fall angewandt werden.

Sonstiges:

In manchen Fällen, bei denen ein Verb mit derselben Präposition sowohl Präpositionalobjekte als auch Modifikatoren anschließen kann, lassen sich Präpositionalobjekte durch die verschiedene Kasuswahl der Präposition von Adjunkten unterscheiden.

(37)  
a. Er wartet auf dem Bahnsteig (MO[Dat]) auf ihn (OP[Akk]).  
b. Ich stehe auf das Annotationsschema (OP[Akk]) und er steht auf dem Tisch (MO[Dat]).

In Zusammenhang mit den Präpositionalobjekten stehen auch Subjekts- bzw. Objektsprädikative.

(38)  
a. Waldemar wird zur Furie.  
b. Cindy hält ihn für unzurechnungsfähig.

Gleichwohl alle zuvor beschriebenen Tests zu keinem Ausschluss führen, besetzt in beiden Beispiel-Sätzen die Präpositionalphrase keine Objektposition: In 38a fungiert sie als Ergänzung zur Kopula, in 38b prädiziert sie als obligatorische Angabe das direkte Objekt (in beiden Fällen MO, siehe auch 5.2.7).

Als weitere Konvention gilt, dass wir auch Pronominal- und Frageadverbien (*miteinander, davon, worüber, worauf* usw.), die eine entsprechende Präposition enthalten, gegebenenfalls als OP annotieren:

<!-- PDF page 61 -->

(39)  
a. Sie reden nicht mehr [miteinander]OP  
b. Diese ungeheure Begeisterung rührt [davon]OP her  
c. [Worüber]OP denkst du nach?  
d. [Worauf]OP wartest du noch?

Beachte: Der kontinuierliche Sprachwandel hat zur Folge, daß einige Präpositionen stärker grammatikalisiert sind als andere. Damit lassen sich Uneinheitlichkeiten bei der Anwendung der Kriterien erklären. Die genannten Kriterien können als wegweisende Faustregeln gelten. Dabei ist das wichtigste Erkennungszeichen für ein Präpositionalobjekt, daß die Präposition tendenziell desemantisiert und dadurch funktional an das Verb gebunden wird.

Für das praktische Vorgehen können die Tests 1, 3 und 4 viele Modifikatoren herausfiltern. Der Test 4 kann manche Präpositionalobjekte positiv identifizieren. Erst bei den restlichen Präpositionalphrasen muß dann anhand von Test 2 über die Desemantisierung und funktionale Anbindung nachgedacht werden.

Im Zweifelsfall gilt der Grundsatz, nur prototypische Präpositionalobjekte zu kennzeichnen. Im weiteren verweisen wir auf eine auf den TIGER-Seiten zu findende Liste mit seit September 2000 annotierten und als solche anerkannten Verb-Präpositionalobjekt-Verbindungen.

### 5.2.7 Obligatorische Modifikatoren (OMO)

Achtung: Obligatorische Modifikatoren werden wegen Abgrenzungsschwierigkeiten weiterhin als MO, nicht als OMO getaggt!

Neben den Objekten gibt es weitere obligatorische Konstituenten (NP, PP, ADJD, ADV), die wir jedoch zu den Adjunkten zählen:

NP:

(40) a. Er wiegt [70 Kilo]OMO.

PP:

(41)  
a. Ich wohne [in Stuttgart]OMO.  
b. Ich wohne [auf einer Parkbank]OMO.

ADJD:

(42)  
a. Er wirkt [alt]OMO.  
b. Das macht mich [krank]OMO.

ADV:

(43) a. Er benimmt sich [so]OMO.

<!-- PDF page 62 -->

Bisher wurden obligatorische Modifikatoren als PDs, als OAs oder als MOs getaggt. Da Verben ihre Valenz ändern können, gestaltet es sich schwieriger, ihre Obligatorik festzustellen.

Für Maßangaben bzw. Numeralien legt der folgende Test die Unterscheidung von OA und MO fest:

Ist der Satz passivierbar?

1. Ja: OA
2. Nein:
   1. Wenn sich der Satz als wie- oder wieviel-Frage umformulieren läßt: MO.
   2. Sonst: OA.

Zum Beispiel:

kosten: OA + MO

> Das Auto hat [Peter]OA [5000 DM]MO gekostet

Bis weitere zuverlässige Tests gefunden worden sind, werden obligatorische Modifikatoren vorläufig weiterhin als MO annotiert.

### 5.2.8 Funktionsverbgefüge (CVC)

Unter Funktionsverbgefüge (collocational verb construction) verstehen wir eine Kombination aus Vollverb und Präpositionalphrase. Dabei trägt nicht das Verb, sondern das Nomen der Präpositionalphrase die semantische Information.

(44)  
a. Paulas Argumente kamen nicht [zur Geltung]CVC  
b. Eine Toilette steht [zu ihrer Verfügung]CVC  
c. Markus gerät nicht so leicht [in Versuchung]CVC

Typisch für Funktionsverbgefüge ist:

1. Es kann oft durch ein Verb ersetzt werden.
   - zur Diskussion bringen ↔ diskutieren
   - zum Abschluß bringen ↔ abschließen
2. Die Präpositionen von Funktionsverbgefügen sind fast immer *zu* oder *in*.
3. Das beteiligte Nomen kann in der Regel nicht ersetzt werden, ohne daß dabei der Sinn verändert wird.
4. Es handelt sich um eine kleine, geschlossene Klasse von bedeutungsschwachen Verben mit direktionaler oder lokaler Grundbedeutung (*stellen, setzen, bringen, geraten, kommen, stehen, ...*).

<!-- PDF page 63 -->

Die oben aufgelisteten Kriterien sind keine verbindlichen Tests, sondern allgemeine Richtlinien.

Da wir nur die Kerngruppe der Funktionsverbgefüge als solche annotieren wollen, gilt im Zweifelsfall: Das Label CVC nicht vergeben.

Auch Funktionsverbgefüge können komplex strukturiert sein. Ein Beispiel hierfür sind deverbale Kernsubstantive wie:

(45) jemanden [[vor etwas]OP in Schutz]CVC nehmen

Nicht als Funktionsverbgefüge sehen wir folgende Wendungen an, da diese nicht dem Kriterium der Verb-Präpositional-Verbindungen entsprechen:

(46)  
a. [keinen Zweifel [an jemanden/etwas]OP]OA lassen  
b. [[auf jemanden/etwas]MO Rücksicht]OA nehmen

Verbale und satzwertige Argumente von Kernsubstantiven in Funktionsverbgefügen werden als OC analysiert (2.5).

### 5.2.9 Prädikative (PD)

Zu den Prädikative zählen für uns nur die Phrasen NP und AP (darunter fallen auch bestimmte Partizipien, s.u.) bei den Verben *sein, bleiben, werden*. Eine Ausnahme bildet die Annotation des Zustandspassivs, vgl. 5.3.2.

Präpositionalphrasen sollen nicht als Prädikativ beschrieben werden, da es dabei größere Abgrenzungs- und Interpretationsschwierigkeiten gibt.

Kopula-Konstruktionen: Die Kopula wird als Kopf (HD) annotiert.

1. NP als PD

   (47) [Peter]SB [ist]HD [Lehrer]PD

```text
(S (SB:NE Peter) (HD:VAFIN ist) (PD:NN Lehrer))
```

2. AP als PD

   (48) [Peter]SB [wird]HD [älter]PD

<!-- PDF page 64 -->

Im Gegensatz zu attributiv verwendeten APs werden nur bestimmte Konstituenten unter die AP gehängt. Es hängen unter der AP:

1. alle Argumente:

   NP: er ist [des Wartens müde]PD  
   PP: er ist [stolz auf Hans]PD  
   S: er ist [stolz, daß er es geschafft hat]PD  
   S: er ist nicht [sicher, ob er es geschafft hat]PD

2. Vergleichssätze:

```text
(AP (MO:AVP (HD:ADV so) (CC:NP (CM:KOKOM wie) (NK:NE Tom))) (HD:ADJD groß))
```

```text
(AP (HD:ADJD schneller) (CC:NP (CM:KOKOM als) (NK:ART der) (NK:NN Blitz)))
```

3. Adverbien, die das Adjektiv eng modifizieren:

   Test: Adverb kann nicht allein topikalisiert werden:

   er ist [sehr stolz]PD  
   \* sehr ist er stolz

   genauso: ganz stolz, überaus stolz, ziemlich stolz

```text
(S (MO:ADV Gestern) (HD:VAFIN war) (SB:NE Peter) (MO:ADV wieder) (PD:AP (MO:ADV etwas) (HD:ADJD genervt)))
```

Alles andere wird unter den S-Knoten gehängt! Als Orientierung gilt die Liste zur Adjektivvalenz in Engel (1996, 592ff).

<!-- PDF page 65 -->

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen prädikativen AP an.

```text
(S (SB:NE Peter@0) (HD:VAFIN ist@1) (MO:ADV heute@2) (PD:AP (HD:ADJD stolz@3) (MO:PP (AC:APPR auf@4) (NK:NE Paul@5)) (CC:S (CP:KOUS weil@7) (SB:PPER er@8) (OC:VVPP gewonnen@9) (HD:VAFIN hat@10))))
```

Zur Erinnerung: Unterschiedliche Annotation von MOs in attributiv vs. prädikativ verwendeten APs:

```text
(NP (NK:ART der) (NK:AP (MO:ADV immer) (HD:ADJA stille)) (NK:NN Student))
```

```text
(S (SB:PPER Er) (HD:VAFIN ist) (MO:ADV immer) (PD:ADJD still))
```

kopulalose Prädikativkonstruktionen: hier fehlt einfach der Kopf, der Rest bleibt wie oben:

(49) [schade]PD, [daß du nicht kommst]SB

vgl. daß du nicht kommst, ist schade - hier wird *ist* als HD annotiert.

Zustandspassiv: hier wird die VP als PD annotiert:

(50) die Tür ist [geöffnet]PD

Präpositionalkonstruktionen: Präpositionalphrasen bei den Kopulaverben *sein, werden, bleiben* werden als MO annotiert, da die Unterscheidung zwischen konkreten und abstrakt-idiomatischen Ausdrücken nicht eindeutig getroffen werden kann.

Abgrenzung PD vs. SB: hier sind einige empirische Tests (Heuristiken) möglich:

**Kategorie:** Falls einer der Kandidaten ein Adjektiv ist, kann man ihn ruhigen Gewissens als PD annotieren.

**Determination:** Prädikative NPs treten häufig ohne Artikel auf:

(51) [Ziel]PD unserer Arbeit ist, [möglichst viele Sätze zu annotieren]SB

<!-- PDF page 66 -->

weitere Tests: (i) Ersetze die Kopula durch eine Form von *machen*, das (vermeintliche) Subjekt durch eine Akkusativ-NP und das Prädikatsnomen durch eine zu-PP:

(52) der Gärtner ist der Mörder  
a. sie haben den Gärtner zum Mörder gemacht  
b. ??????????sie haben den Mörder zum Gärtner gemacht  
&nbsp;&nbsp;&nbsp;&nbsp;(wenn schon, dann den Bock :-)

(ii) noch besser: *gelten als, etw. darstellen, ...*

→ die als-Phrase ist das Prädikativ:

(53)  
a. der Gärtner gilt als Mörder  
b. ≠ ??der Mörder gilt als Gärtner

Auch wenn beide Möglichkeiten nicht besonders gut klingen, nimm die bessere!

Falls immer noch unklar, kann das Label SP (subject or predicative) als ultima ratio vergeben werden.

### 5.2.10 Um zu, ohne zu - Präpositionen in VPs

Präpositionen in Infinitivkonstruktionen mit *zu* werden als CP annotiert:

(54) [um/ohne/statt]CP [mich]OA [zu benachrichtigen]HD

### 5.2.11 Ohne daß, statt daß...

Anders als *um zu* wird diese Konstruktion als AC + CP annotiert, und zwar flach:

(55) [ohne]AC [daß]CP [er]SB [mich]OA [benachrichtigte]HD

### 5.2.12 Anrede (VO)

Anrede- ("Vokativ-") NPs werden als VO (vocative) annotiert, vgl.:

```text
(S (VO:NE Hans) (HD:VVIMP sag) (DA:PPER mir) (OA:NP (NK:ART das) (NK:NN Schwein)))
```

<!-- PDF page 67 -->

### 5.2.13 VPs und Sätze als Argumente von Verben

Sätze/VPs können in dreierlei Beziehung zu einem Verb treten:

**Klausalobjekt (OC):** Darunter fallen verbale Komplemente von

- Auxiliaren

  [er]SB [hat]HD [geschlafen]OC  
  die Tür ist [vorsichtig zu öffnen]OC

- Modalverben

  [er]SB [will]HD [schlafen]OC

- Anhebungsverben

  [er]SB [scheint]HD [zu schlafen]OC

- Kontrollverben ("equi")

  [er]SB [verspricht]HD [zu gehen]OC

- fest subkategorisierte daß-, ob-, usw. Sätze:

  [er]SB [weiß]HD [daß du kommst]OC  
  ebenfalls: glauben, fragen, zweifeln, behaupten, sagen...

- V-2-Sätze, die sich mit Verben wie *sagen, glauben* usw. verbinden:

  [er]SB [sagt]HD [du kennst ihn]OC

**Modifikator (MO):** Subordinierte Sätze und VPs, die fakultative Adverbialbestimmungen sind wie:

> Als er kam, wollten alle schon nach Hause gehen  
> Wenn er kommt, stelle ich ihn dir vor  
> Er kam, um dich zu sehen

Ähnlich: obwohl, weil, da, um-zu, ohne-zu, außer daß...

Ob Sätze als Modifikatoren eingebettet oder koordiniert werden, wird gemäß der syntaktischen Struktur entschieden, die ausdrückt, ob es sich um einen Nebensatz handelt oder nicht. (Siehe auch 9.6.)

Hierzu gehören auch durch Inversion eingeleitete Konditionalsätze:

<!-- PDF page 68 -->

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen MO-AVP an.

```text
(S (MO:AVP (RE:S (HD:VVFIN kommt@0) (SB:PPER er@1) (MO:ADV jetzt@2) (NG:PTKNEG nicht@3)) (PH:ADV so@5)) (HD:VVFIN bringe@6) (SB:PPER ich@7) (OA:PPER ihn@8) (SVP:PTKVZ um@9))
```

**Subjekt (SB):** Subjektsätze erkennt man am besten

> Daß er kam, überraschte mich  
> Was Du mir erzählst, überzeugt mich nicht  
> Nach Saarbrücken zu fahren, macht ihm Spaß

Beachte: Subjektsätze mit einem Korrelat-*es* werden als Platzhalterphrasen annotiert, vgl. 6.2

> Es überraschte mich, daß er kam  
> Es macht ihm Spaß, nach Saarbrücken zu fahren

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen Subjekt-NP an.

```text
(S (HD:VAFIN ist@1) (SB:NP (PH:PPER Es@0) (RE:S (CP:KOUS daß@4) (SB:PPER er@5) (HD:VVFIN schnarcht@6))) (PD:ADJD klar@2))
```

<!-- PDF page 69 -->

## 5.3 Passiv

### 5.3.1 Vorgangspassiv

Bei Passivkonstruktionen muß man unbedingt beachten, daß die annotierte Struktur ausnahmsweise nicht der semantischen Argumentstruktur entspricht. Das Subjekt, das semantisch gesehen zu den Argumenten des eingebetteten Verbs (hier: *gesehen*) gehört, wird - wie alle Subjekte - an das finite Passivauxiliar (*wurde*) angebunden. Guter Test: Kasus- und Kongruenzmerkmale (Nominativ + Subjekt-Verb-Kongruenz).

```text
(S (SB:NP (NK:ART der) (NK:NN Mörder)) (HD:VAFIN wurde) (OC:VP (SBP:PP (AC:APPR von) (NK:CARD zwei) (NK:NN Passanten)) (HD:VVPP gesehen)))
```

Das passivierte logische Subjekt wird als SBP (passivised subject) annotiert. Dieses Label ist auch in attributiv gebrauchten partizipialen APs zu verwenden.

```text
(NP (NK:ART das) (NK:AP (MO:ADV vorher) (SBP:PP (AC:APPR von) (NK:NN Stiefeln)) (HD:ADJA betretene)) (NK:NN Hemd))
```

Per Konvention :-)) wurde festgelegt, daß *durch*-PPs NIEMALS als SBP annotiert werden sollen, auch wenn ihre Funktion manchmal nicht klar zu unterscheiden ist von der Funktion einer *von*-PP.

Beachte: Auch Satzargumente (OCs) können passiviert werden. Sie werden dann als Subjekt annotiert:

```text
(S (SB:S (CP:KOUS daß) (SB:PPER er) (HD:VVFIN kommt)) (HD:VMFIN kann) (NG:PTKNEG nicht) (OC:VP (OC:VVPP bestritten) (HD:VAINF werden)))
```

<!-- PDF page 70 -->

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen Subjekt-NP an.

```text
(S (HD:VMFIN kann@1) (NG:PTKNEG nicht@2) (SB:NP (PH:PPER es@0) (RE:S (SB:KOUS daß@6) (SB:PPER er@7) (HD:VVFIN kommt@8))) (OC:VP (OC:VVPP bestritten@3) (HD:VAINF werden@4)))
```

### 5.3.2 Zustandspassiv

Das Zustandspassiv wird wie das Vorgangspassiv annotiert, außer daß das Partizip, bzw. die VP, die das Partizip dominiert, nicht als OC, sondern als PD annotiert wird. Beim Zustandspassiv wird das Partizip weiterhin als VVPP getaggt.

```text
(S (SB:NP (NK:ART die) (NK:NN Tür)) (HD:VAFIN ist) (PD:VVPP geöffnet))
```

Das Partizip wird in den meisten Fällen als VVPP getaggt, außer bei lexikalisierten Partizipien, die als Adjektive gebraucht werden, z.B. *bekannt, verrückt, begabt*. Die Bedeutung dieser Adjektive hat nichts mehr mit der des Ursprungsverb zu tun, daher wird hier das PoS-Tag ADJD vergeben.

Der Zustandspassiv und der Kopulasatz haben vieles gemeinsam und eine Abgrenzung ist nicht immer einfach. (56a). Die Partizipien im Zustandspassiv haben einerseits adjektivische Eigenschaften und können sogar als Adjektive lexikalisiert (aber nicht idiomatisiert, s.u.) sein. Andererseits besteht ein produktiver Zusammenhang zum verbalen Paradigma, der durch das *werden*-Passiv sichtbar wird (56b). Die Verwendung des Kantenlabels PD zusammen mit dem PoS-Label VVPP bringt dies zum Ausdruck.

(56)  
a. Die Tür ist gestrichen/geschlossen/ausgehängt/verbrannt  
b. Die Tür wird (von Franz) gestrichen/geschlossen/ausgehängt/verbrannt

Eindeutig idiomatisierte Partizipien (57) werden mit dem PoS-Label ADJD versehen. Die Bedeutung dieser Adjektive hat nichts mehr mit der des Ursprungsverbs zu tun.

(57)  
a. Der alte Mann ist [verrückt]ADJD  
b. Fridolin ist verklemmtADJD  
c. Helga ist [bekannt]ADJD

<!-- PDF page 71 -->

d. Anita ist [begabt]ADJD

Teilweise bestehen Homographien zwischen Formen, die ursprünglich Partizipien waren, aber inzwischen als Adjektive lexikalisiert und idiomatisiert sind, und solchen, die Formen des verbalen Paradigmas sind (58).

(58)  
a. Der Tisch ist (um 3 cm.) [verrückt]VPP  
b. Der alte Mann ist [verrückt]ADJD

(59)  
a. Diese Theorie ist [anerkannt]VVPP  
b. Der alte Herr ist sehr [gebildet]ADJD

Hier und auch in weniger deutlichen Fällen wie die in 59 dient die Umformung in einen entsprechenden Satz mit werden-Passiv und von-Phrase als Test. Ist eine Umformung ohne Sinnesverlust möglich wird das PoS-Label VVPP vergeben (60). Ist dies nicht möglich haben wir es eindeutig mit einem Adjektiv zu tun, und das PoS-Label ADJD wird vergeben (61).

(60)  
a. Der Tisch ist von den Studenten (um 3 cm.) verrückt worden  
b. Diese Theorie ist von der Mehrheit der Wissenschaftler anerkannt worden

(61)  
a. \* Der alte Mann ist von den Studenten verrückt worden  
b. \* Der alte Herr ist von seinem Lehrer sehr gebildet worden

Partizipien, die mit dem Präfix *un-* affigiert werden, sind alle als Adjektive anzusehen, auch wenn sie unpräfigiert im selben Kontext als VVPP klassifiziert werden (62).

(62)  
a. Die Tür ist [geöffnet]VVPP  
b. Die Tür ist [ungeöffnet]ADJD  
c. Die Tür ist geöffnet worden  
d. \* Die Tür ist ungeöffnet worden

Als verbale Partizipien werden auch die Ausdrücke angesehen, die als Bestandteile des *sein*-Perfekt aufzufassen sind, d.h. wo es ein Verb mit eben der Bedeutung gibt.

```text
(S (SB:NP (NK:ART Der) (NK:NN Aussenminister)) (HD:VAFIN ist) (OC:VP (MO:PP (AC:APPR nach) (NK:NE Taiwan)) (HD:VVPP geflogen)))
```

<!-- PDF page 72 -->

Beachte: Die Perfektform des Vorgangspassivs (auch mit *sein* gebildet) wird wie nebenstehend annotiert:

```text
(S (SB:NP (NK:ART die) (NK:NN Tür)) (HD:VAFIN ist) (OC:VP (OC:VVPP geöffnet) (HD:VAPP worden)))
```

## 5.4 Verblose Sätze

Bei verblosen Sätzen, die v.a. in Überschriften und Titeln erscheinen, sollte man den Satz in Gedanken sinnvoll ergänzen und ihn dann ganz normal annotieren:

```text
(S (SB:NP (NK:ADJA Brutaler) (NK:NN Raubüberfall)) (OC:VP (MO:ADV endlich) (SBP:PP (AC:APPR von) (NK:ART der) (NK:NN Polizei)) (HD:VVPP aufgeklärt)))
```

Die sinnvolle Ergänzung diese Satzes lautet: *Ein brutaler Raubüberfall wurde endlich von der Polizei aufgeklärt.* *Brutaler Raubüberfall* ist seiner Form nach deutlich Nominativ, also das Subjekt, und kann deswegen nicht mit in die VP gefaßt werden.

Es gibt allerdings auch Fälle, in denen die Ergänzung zum vollständigen Satz nicht so eindeutig ist wie hier. Z.B. in einer Überschrift *Finale gewonnen!* könnte die Ergänzung lauten *Das Finale wurde gewonnen*, was für eine Annotation als Satz sprechen würde, oder *Finnland hat das Finale gewonnen*, womit *Finale* zum OA wird und zur VP gehört.

```text
(VP (OA:NN Finale) (HD:VVPP gewonnen))
```

```text
(S (SB:NN Finale) (OC:VVPP gewonnen))
```

Unklarheit entsteht oft auch bei Sätzen, die gar kein Verb enthalten (auch kein infinites), z.B. *Keine Chance im Halbfinalspiel*. Dies könnte entweder als NP mit MNR *im Halbfinalspiel* oder als Satz annotiert werden. Bei letzterer Möglichkeit besteht wiederum Unklarheit, ob *keine Chance* SB oder OA ist.

<!-- PDF page 73 -->

Die häufigen Wendungen *Bericht/Kommentar Seite x* bzw. *Bericht/Kommentar auf Seite x* werden wie folgt beschrieben:

(63)  
a. [Bericht [auf Seite x]MNR]NP  
b. [Bericht [Seite x]NK]NP

In Fällen, in denen Rubriknamen durch Doppelpunkt mit Überschriften zusammengeführt werden, sollen die beiden Elemente unverbunden bleiben. Beispiele hierfür sind:

(64)  
a. TIP: Bausparen  
b. TIP: Vollkasko bei Schwangerschaft  
c. IM BLICKPUNKT: TV-Journalistinnen und ihre Männer

## 5.5 Direkte und Indirekte Rede

Da für uns die syntaktische Struktur Vorrang hat vor der Diskursstruktur, wird die letztere nur annotiert, wenn keine klaren syntaktischen Beziehungen bestehen. So wird im folgenden Satz die angeführte Äußerung als OC zu *sagt* annotiert.

(65) "Nun", sagt Peter, "müssen wir nach Hause gehen".

Wenn hingegen keine syntaktische Beziehung (meistens OC) zwischen dem Angeführten und der es einbettenden Diskursstruktur besteht, verbinden sich die beiden Komponenten parataktisch zu einer Discourse Level Constituent (DL). Die Bestandteile einer DL sind: RS (reported speech) und DH (discourse-level head).

Beispiel:

```text
(DL (RS:S (SB:PPER Ich) (HD:VVFIN hoffe) (OC:S (CP:KOUS daß) (SB:PPER es) (HD:VVFIN klappt))) (DH:S (HD:VVFIN verabschiedete) (OA:PPER ihn) (SB:NP (NK:ART der) (NK:NN Arzt))))
```

Als Kriterium für eine solche DL-Konstruktion gilt: Wenn es nicht möglich ist, die direkte Rede als daß-Satz zum übergeordneten Satz, als ob-Satz oder als Satz mit Fragewort umzuformulieren, sollte die DL-Konstruktion verwendet werden. *Der Arzt verabschiedete ihn, daß er hoffte, daß es klappt* kann z.B. nicht als syntaktisch richtig angesehen werden, deshalb ist die DL-Konstruktion hier gerechtfertigt.

Steht bei direkter Rede vor dem Doppelpunkt ein Satzfragment ohne übergeordnetes Verb, wird dies als DL annotiert:

(66)  
a. [[Helmut Kohl:]DH ["Der Mantel der Geschichte..."]RS]DL

<!-- PDF page 74 -->

b. [[Und doch:]DH ["Wir können auch anders."]RS]DL

Wird der Einschub mit *so* eingeleitet, betrachten wir es als Platzhalter für den eingebetteten Satz, vgl.

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen MO-AVP an.

```text
(S (HD:VVFIN meint@5) (SB:NE Feldkamp@6) (MO:AVP (MO:PP (MO:ADV Auch@0) (AC:APPR mit@1) (NK:NN Prothesen@2)) (PH:ADV so@4) (RE:S (HD:VMFIN könne@8) (SB:PIS man@9) (OC:VP (OA:NN Sport@10) (HD:VVINF treiben@11)))))
```

Beachte: Bezieht sich *so* nur auf eine Teilstruktur, wird die obige Struktur nicht verwendet:

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen Subjekt-NP an.

```text
(S (SB:NP (NK:ART Der@0) (NK:ADJA heimliche@1) (NK:NN Bürgermeister@2) (PG:PP (AC:APPR von@3) (NK:NE Bornheim@4)) (PAR:S (MO:ADV so@6) (HD:VVFIN nennen@7) (OA:PPER ihn@8) (SB:PIS einige@9))) (HD:VAFIN war@11) (MO:ADV ebenfalls@12) (PD:ADJD anwesend@13))
```

Durch *wie* eingeleitete S/VP-Einschübe werden ebenfalls als MO zum Satz annotiert:

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen Satzkonstituenten an.

```text
(S (OA:NP (MO:ADV Auch@0) (NK:NN Tennis@1)) (HD:VVFIN hält@2) (SB:PPER er@3) (MO:VP (MO:PWAV wie@5) (MO:ADV schon@6) (HD:VVPP erwähnt@7)) (MO:PP (AC:APPR für@9) (NK:ADJD sinnvoll@10)))
```

Wenn sich *wie* nur auf eine Teilstruktur des Satzes bezieht, wird es als MO zu dieser Teilstruktur annotiert:

<!-- PDF page 75 -->

Die Suffixe geben die Oberflächenpositionen der mehrfach diskontinuierlichen Relativsatzstruktur an.

```text
(S (SB:NP (NK:ART Die@0) (NK:NN Gruppe@1)) (HD:VVFIN zeigte@2) (OA:NP (NK:PPOSAT ihr@3) (NK:NN Programm@4) (RC:S (MO:PP (AC:APPR mit@6) (NK:PRELS dem@7)) (SB:PPER sie@8) (MO:S (MO:PWAV wie@10) (SB:NP (NK:ART die@11) (NK:NE FR@12)) (HD:VVFIN berichtete@13)) (OA:NP (NK:ART einen@15) (NK:NN Wettbewerb@16)) (HD:VVFIN gewann@17))))
```

Die DL-Konstruktionen sind also nur noch auf die zuerst genannten Fälle anzuwenden.

## 5.6 Diskurspartikeln - DM

Antwortpartikeln wie *ja, nein*, usw. werden als DM (discourse marker) annotiert, vgl.:

```text
(S (HD:VVFIN sagt) (SB:PPER er) (OC:S (DM:PTKANT Nein) (SB:PDS das) (HD:VAFIN war) (PD:ADV anders)))
```

Auch:

```text
(S (DM:PTKANT Naja) (MO:ADV da) (HD:VVFIN üben) (SB:PPER wir) (MO:ADV halt) (MO:ADV manchmal) (MO:PP (AC:APPRART im) (NK:NN Silobad)))
```

Aber:

(67) [sie]SB [sagten]HD [nein]OA

Diese letzte Regelung ist umstritten, da auch argumentiert werden kann, daß *nein* hier für eine direkte Rede steht und somit als OC annotiert werden müßte. Ähnliche Probleme bestehen bei Sätzen wie *Sie fragten sich wieso*. *Wieso* könnte sowohl MO als auch OC sein.

<!-- PDF page 76 -->

# 6 Platzhalterphrasen

Hier unterscheiden wir zwischen "echten" Resumptiven (Pronominaladverb + Satz/VP, es + Satz/VP) und nicht-lokalen Abhängigkeiten des Typs Gradadverb + Satz/VP.

## 6.1 Pronominaladverbien

Das Pronominaladverb ist nur eine Art Platzhalter (PH) für den Satz/die VP (Label RE, repeated element):

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen MO-PP an.

```text
(S (MO:PP (PH:PROAV Daran@0) (RE:S (CP:KOUS daß@5) (SB:PPER er@6) (HD:VVFIN schnarcht@7))) (HD:VVFIN erkennst@1) (SB:PPER du@2) (OA:PPER ihn@3))
```

Ebenso:

```text
(S (SB:PPER Sie@0) (HD:VVFIN beurteilten@1) (OA:PPER ihn@2) (MO:PP (PH:PROAV danach@3) (RE:S (MO:PWAV wie@5) (SB:PPER er@6) (HD:VVFIN schnarchte@7))))
```

```text
(S (SB:PPER Ich@0) (HD:VAFIN bin@1) (PD:ADJD müde@3) (MO:PP (PH:PROAV deswegen@2) (RE:S (CP:KOUS weil@5) (SB:PPER ich@6) (OC:VP (NG:PTKNEG nicht@7) (HD:VVPP geschlafen@8)) (HD:VAFIN habe@9))))
```

Adverbiale Modifikation der PH-RE-Phrase:

<!-- PDF page 77 -->

```text
(S (SB:PPER Sie@0) (HD:VVFIN beurteilten@1) (OA:PPER ihn@2) (MO:PP (MO:ADV nur@3) (PH:PROAV danach@4) (RE:S (MO:PWAV wie@6) (SB:PPER er@7) (HD:VVFIN schnarchte@8))))
```

## 6.2 Es

Neben dem normalen Pronomen *es* (wie in *Ich habe es gesehen*) unterscheiden wir drei weitere Verwendungen von *es*. Für diese drei Typen gilt: Das *es* kann nicht durch *er* oder *ihn* ersetzt werden (ohne Sinnveränderung).

1. **Korrelat-es (Platzhalter [PH] & Repeated Element [RE])**

   Test:

   1. ist meist optional:

      weil es mich freut, daß ... -  
      weil mich freut, daß ...

   2. das Korrelat-es steht immer zusammen mit einem satzwertigen Subjekt oder Objekt, dem eigentlichen/bedeutungstragenden Argument.

   Das *es* (PH) und das eigentliche Argument (RE) verbinden sich zu einer Phrase:

The source leaves both the edge label and PoS label of the ellipsis blank; `?:?` records that explicit omission.

```text
(S (CP:KOUS weil@0) (SB:NP (PH:PPER es@1) (RE:S (CP:KOUS dass@5) (?:? …@6))) (OA:PPER mich@2) (HD:VVFIN freut@3))
```

Ebenso (mit einem VP-Argument):

```text
(S (HD:VVFIN macht@1) (SB:NP (PH:PPER Es@0) (RE:VZ (PM:PTKZU zu@4) (HD:VVINF lügen@5))) (DA:PPER ihm@2) (OA:NN Spaß@3))
```

<!-- PDF page 78 -->

2. **Expletives es (EP)**

   Test:

   1. ist obligatorisch
   2. das *es* ist ausschließlich abhängig vom Verb (und nicht, wie oben, vom Auftreten eines satzwertigen Arguments)

   ...weil es heute regnet - \*weil heute regnet  
   ...weil es gute Gründe dafür gibt.  
   ...weil es noch seiner Zustimmung bedarf.  
   ...weil es hier komisch riecht.

```text
(S (CP:KOUS weil) (EP:PPER es) (MO:ADV heute) (HD:VVFIN regnet))
```

Ebenso (hier in der Funktion eines Objektes):

> Er legt es darauf an, dass ...  
> Er nimmt es mit ihm auf.  
> Er hat es darauf abgesehen.

```text
(S (SB:PPER Er) (HD:VVFIN nimmt) (EP:PPER es) (MO:PP (AC:APPR mit) (NK:PPER ihm)) (SVP:PTKVZ auf))
```

Auch:

> Mich friert es.

(Obwohl es hier auch eine Variante ohne *es* gibt: *Mich friert.* D.h., der 2. Test gibt hier den Ausschlag.)

```text
(S (OA:PPER mich) (HD:VVFIN friert) (EP:PPER es))
```

3. **Vorfeld-es (PH ohne RE)**

   Test: steht nur im Vorfeld (d.h., dieses *es* hängt weder vom Auftreten eines satzwertigen Arguments ab noch vom Verb)

   Es naht ein Gewitter -  
   \*Weil es ein Gewitter naht, ...  
   Es wird hier immer getanzt -  
   \*Weil es hier immer getanzt wird, ...

```text
(S (PH:PPER Es) (HD:VVFIN naht) (SB:NP (NK:ART ein) (NK:NN Gewitter)))
```

Übersicht über alle *es*-Typen:

<!-- PDF page 79 -->

| es-Typ | normales Pronomen | Korrelat-es | expletives es | Vorfeld-es |
|---|---|---|---|---|
| Tests | durch er/ihn ersetzbar | nicht ersetzbar; (meist) fakultativ; steht mit Satz/VP | nicht ersetzbar; obligatorisch; ohne Satz/VP | nicht ersetzbar; nur im Vorfeld |
| Annotation | wie NP | PH (+RE) | EP | PH (ohne RE) |

Anmerkung:

> Das/Es sollten Zivilisten sein  
> → hier ist Das/Es SB und Zivilisten ist PD

Zum Thema *scheinen*:

*scheinen* hat (mindestens) folgende Varianten:

1. mit Adj: Es scheint merkwürdig, daß er lügt
2. mit Dat: Es scheint mir, daß er lügt
3. ohne: Es scheint, daß er lügt

Die oben genannten Tests ergeben:

1. mit Adj:

   Es scheint merkwürdig, daß er lügt  
   Daher scheint (es) merkwürdig, daß er lügt  
   Daß er lügt, scheint merkwürdig  
   → fakultatives *es* und steht zusammen mit Satz-Argument  
   → Korrelat-es, PH + RE

2. mit Dat:

   Es scheint mir, daß er lügt  
   Daher scheint (es) mir, daß er lügt  
   \*Daß er lügt, scheint mir  
   → widersprüchliches Testergebnis  
   → soll per Konvention :-) gleich annotiert werden wie die Variante ohne Dativ  
   d.h. expletives *es*, EP (s. Eisenberg 1999:354)

3. ohne Adj/Dat:

   Es scheint, daß er lügt  
   \*Daher scheint, daß er lügt  
   \*Daß er lügt, scheint  
   (?)Daher scheint es, daß er lügt  
   → obligatorisches *es* (ausnahmsweise auch hier Satz-Argument vorhanden)  
   → expletives *es*, EP

Anmerkung: Die verschiedenen Verwendungen von *scheinen* sind sowieso auch automatisch unterscheidbar: Typ 1 enthält ein MO (*merkwürdig*), Typ 2 ein Dativ-Objekt (*mir*), Typ 3 weder noch.

Zusammenfassung:

1. mit Adj: Jetzt scheint es merkwürdig, daß er lügt PH + RE
2. mit Dat: Jetzt scheint es mir, daß er lügt EP

<!-- PDF page 80 -->

3. ohne Adj/Dat: Jetzt scheint es, daß er lügt EP

Auch ein Konditionalsatz kann ein Korrelat im übergeordneten Satz haben.

> Es wäre schön, wenn du kommst. → Schön wäre, wenn du kommst.

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen Subjekt-NP an.

```text
(S (HD:VAFIN wäre@1) (PD:ADJD schön@2) (SB:NP (PH:PPER Es@0) (RE:S (CP:KOUS wenn@4) (SB:PPER du@5) (HD:VVFIN kommst@6))))
```

## 6.3 Verbale Argumente von Gradadverbien

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen MO-AVP an.

```text
(S (SB:PPER Er@0) (HD:VVFIN tat@1) (MO:AVP (HD:ADV so@2) (CC:S (CP:KOUS als@4) (HD:VVFIN ginge@5) (OA:PPER ihn@6) (SB:NP (NK:ART das@7) (NK:PIS alles@8)) (MO:NP (MO:ADV kaum@9) (NK:PIS etwas@10)) (SVP:PTKVZ an@11))))
```

Ebenso:

<!-- PDF page 81 -->

```text
(S (SB:PPER Er@0) (HD:VVFIN tat@1) (MO:AP (HD:ADJD unschuldig@3) (MO:AVP (HD:ADV so@2) (CC:S (CP:KOUS als@5) (HD:VVFIN ginge@6) (OA:PPER ihn@7) (SB:NP (NK:ART das@8) (NK:PIS alles@9)) (MO:NP (MO:ADV kaum@10) (NK:PIS etwas@11)) (SVP:PTKVZ an@12)))))
```

```text
(AP (MO:AVP (HD:ADV dermaßen) (CC:S (CP:KOUS daß) (SB:NP (MO:ADV selbst) (NK:ART die) (NK:NN Ohren)) (OC:VVFIN wackeln))) (HD:ADJD obskur))
```

Im folgenden Baum wird das PoS-Tag `$(` als `\$\(` maskiert, damit die einzeilige Klammernotation eindeutig bleibt.

```text
(AP (HD:ADJA dumm) (MO:AVP (HD:ADV genug) (CC:VP (CP:KOUI um) (--:\$\( …))))
```

<!-- PDF page 82 -->

```text
(AP (MO:AVP (HD:PTKA zu) (CC:VP (CP:KOUI um) (HD:VZ (PM:PTKZU zu) (HD:VVINF gewinnen)))) (HD:PIS dumm))
```

Ähnlich werden auch Komparativkonstruktionen mit *je-desto* oder *so-so* annotiert:

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen prädikativen AP an.

```text
(S (PD:AP (MO:AVP (CC:S (PD:AP (MO:ADV je@0) (HD:ADJD jünger@1)) (SB:PPER du@2) (HD:VAFIN bist@3)) (HD:ADV desto@5)) (HD:ADJD besser@6)) (HD:VAFIN sind@7) (SB:NP (NK:PPOSAT deine@8) (NK:NN Chancen@9)))
```

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen Vergleichskonstruktion an.

```text
(S (MO:AVP (MO:AVP (CC:S (MO:AVP (MO:ADV so@0) (HD:ADV sehr@1)) (SB:PPER sie@2) (OA:PPER ihn@3) (HD:VVFIN brauchen@4)) (HD:ADV so@6)) (HD:ADV sehr@7)) (HD:VMFIN müssen@8) (SB:PPER sie@9) (OC:VP (OC:VP (MO:PP (MO:ADV auch@10) (AC:APPR ohne@11) (NK:PPER ihn@12)) (HD:VVINF leben@13)) (HD:VVINF lernen@14)))
```

<!-- PDF page 83 -->

## 6.4 So, wie...

Für *so-wie*-Konstruktionen gilt folgende vorläufige Regel:

Folgt dem *wie* ein ganzer Satz, so wird es als PWAV getaggt und als MO in den Satz gehängt. Der Satz ist dann zunächst ein CC zu dem *so*:

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen MO-AVP an.

```text
(S (MO:AVP (HD:ADV So@0) (CC:S (MO:PWAV wie@2) (SB:PPER er@3) (OA:PRF sich@4) (HD:VVFIN benimmt@5))) (HD:VVFIN findet@7) (SB:PPER er@8) (MO:ADV nie@9) (OA:NP (NK:ART einen@10) (NK:NN Job@11)))
```

Folgt dem *wie* kein ganzer Satz, erhält es das PoS-Tag KOKOM (=Vergleichspartikel ohne Satz) und wird als CM annotiert; die dem *so* folgende Phrase wird dann ebenfalls als CC an das *so* gehängt:

```text
(AVP (HD:ADV so) (CC:NP (CM:KOKOM wie) (NK:NE Peter)))
```

So-wie-Konstruktionen werden nach dieser Regel nie als PH/RE annotiert.

## 6.5 Weitere Platzhalterkonstruktionen

Ähnlich behandelt werden sollen folgende Konstruktionen:

**Linksversetzung:** Konstruktionen wie

> [[Dein Bruder]RE, [dem]PH]NP kann ich nicht helfen

**wenn-dann:**

> [[wenn er kommt]RE, dannPH]AVP ...

<!-- PDF page 84 -->

**S/VP/NP-so:** vgl.

Die Suffixe geben die Oberflächenpositionen der diskontinuierlichen MO-AVP an.

```text
(S (HD:VVFIN meint@5) (SB:NE Feldkamp@6) (MO:AVP (MO:PP (MO:ADV Auch@0) (AC:APPR mit@1) (NK:NN Prothesen@2)) (PH:ADV so@4) (RE:S (HD:VMFIN könne@8) (SB:PIS man@9) (OC:VP (OA:NN Sport@10) (HD:VVINF treiben@11)))))
```
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
<!-- PDF page 120 -->

# A Literatur

- Engel, U. (1996). Deutsche grammatik. Heidelberg: Groos.

- Thielen, C., Schiller, A., Teufel, S. & Stöckert, C. (1999). Guidelines für das Tagging deutscher Textkorpora mit STTS (Tech. Rep.). Universität Stuttgart, Institut für maschinelle Sprachverarbeitung, and Seminar für Sprachwissenschaft, Universität Tübingen.

<!-- PDF page 121 -->

# B Stuttgart-Tübingen-Tagset STTS

## B.1 Ursprüngliches STTS

Das hier verwendete Tagset ist das “Stuttgart/Tübinger Tagsets” (STTS), das von Anne Schiller (ehemals IMS/STR, jetzt RXRC/Grenoble), Christine Thielen (SfS/TÜB), Simone Teufel (ehemals IMS/STR, jetzt Cogsci/Edinburgh) und Christine Stöckert (IMS/STR) entwickelt wurde (Thielen, Schiller, Teufel & Stöckert, 1999).

```text
 ADJA         attributives Adjektiv               [das] große [Haus]
 ADJD         adverbiales oder                    [er fährt] schnell
              prädikatives Adjektiv              [er ist] schnell
 ADV          Adverb                              schon, bald, doch
 APPR        Präposition; Zirkumposition links   in [der Stadt], ohne [mich]
 APPRART     Präposition mit Artikel             im [Haus], zur [Sache]
 APPO        Postposition                         [ihm] zufolge, [der Sache] wegen
 APZR        Zirkumposition rechts                [von jetzt] an
 ART          bestimmter oder                     der, die, das,
              unbestimmter Artikel                ein, eine, . . .
 CARD         Kardinalzahl                        zwei [Männer], [im Jahre] 1994
 FM           Fremdsprachliches Material          [Er hat das mit “]
                                                  A big fish [” übersetzt]
 ITJ          Interjektion                        mhm, ach, tja
 KOUI         unterordnende Konjunktion           um [zu leben],
              mit “zu” und Infinitiv              anstatt [zu fragen]
 KOUS         unterordnende Konjunktion           weil, daß, damit,
              mit Satz                            wenn, ob
 KON          nebenordnende Konjunktion           und, oder, aber
 KOKOM        Vergleichskonjunktion               als, wie
 NN           normales Nomen                      Tisch, Herr, [das] Reisen
 NE           Eigennamen                          Hans, Hamburg, HSV
 PDS          substituierendes Demonstrativ-      dieser, jener
              pronomen
 PDAT         attribuierendes Demonstrativ-       jener [Mensch]
              pronomen
 PIS          substituierendes Indefinit-         keiner, viele, man, niemand
              pronomen
 PIAT         attribuierendes Indefinit-          kein [Mensch],
              pronomen ohne Determiner            irgendein [Glas]
 PIDAT        attribuierendes Indefinit-          [ein] wenig [Wasser],
              pronomen mit Determiner             [die] beiden [Brüder]
```

<!-- PDF page 122 -->

```text
PPER     irreflexives Personalpronomen        ich, er, ihm, mich, dir
PPOSS    substituierendes Possessiv-              meins, deiner
         pronomen
PPOSAT   attribuierendes Possessivpronomen        mein [Buch], deine [Mutter]
PRELS    substituierendes Relativpronomen         [der Hund ,] der
PRELAT   attribuierendes Relativpronomen          [der Mann ,] dessen [Hund]
PRF      reflexives Personalpronomen          sich, dich, mir
PWS      substituierendes                     wer, was
         Interrogativpronomen
PWAT     attribuierendes                      welche [Farbe],
         Interrogativpronomen                 wessen [Hut]
PWAV     adverbiales Interrogativ-            warum, wo, wann,
         oder Relativpronomen                 worüber, wobei
PAV      Pronominaladverb                     dafür, dabei, deswegen, trotzdem
PTKZU    “zu” vor Infinitiv                   zu [gehen]
PTKNEG   Negationspartikel                    nicht
PTKVZ    abgetrennter Verbzusatz              [er kommt] an, [er fährt] rad
PTKANT   Antwortpartikel                      ja, nein, danke, bitte
PTKA     Partikel bei Adjektiv                am [schönsten],
         oder Adverb                          zu [schnell]
SGML     SGML Markup                          <turnid=n022k_TS2004>




SPELL    Buchstabierfolge                     S-C-H-W-E-I-K-L
TRUNC    Kompositions-Erstglied               An- [und Abreise]
VVFIN    finites Verb, voll                   [du] gehst, [wir] kommen [an]
VVIMP    Imperativ, voll                      komm [!]
VVINF    Infinitiv, voll                      gehen, ankommen
VVIZU    Infinitiv mit “zu”, voll             anzukommen, loszulassen
VVPP     Partizip Perfekt, voll               gegangen, angekommen
VAFIN    finites Verb, aux                    [du] bist, [wir] werden
VAIMP    Imperativ, aux                       sei [ruhig !]
VAINF    Infinitiv, aux                       werden, sein
VAPP     Partizip Perfekt, aux                gewesen
VMFIN    finites Verb, modal                  dürfen
VMINF    Infinitiv, modal                     wollen
VMPP     Partizip Perfekt, modal              gekonnt, [er hat gehen] können
XY       Nichtwort, Sonderzeichen             3:7, H2O,
         enthaltend                           D2XW3
$,       Komma                                ,
$.       Satzbeendende Interpunktion          .?!;:
$(       sonstige Satzzeichen; satzintern     - [,]()
```

<!-- PDF page 123 -->

## B.2 Vorgenommene Änderungen am STTS

- **PIDAT vs. PIAT.** Die Unterscheidung zwischen PIAT und PIDAT wird nicht getroffen; PIAT wird für attribuierende Indefinitpronomen mit und ohne Determiner verwendet. Die Unterscheidung läßt sich ggf. über entsprechende Listen, welche Worte mit bzw. ohne Determiner verwendet werden, rekonstruieren.

- **ADV.** Präpositionen werden als ADV getaggt, wenn sie Numeralien modifizieren. Siehe 2.1.2.

- **PAV vs. PROAV.** Statt des STTS-Tags PAV wird — bei gleicher Bedeutung — PROAV verwendet.

<!-- PDF page 124 -->

# C Listen von Präpositionalobjekten und Modifikatoren

Dies ist eine Liste von Verben mit Präpositionen aus Präpositionalphrasen, die als HD-OP-Verbindungen analysiert wurden und im Nachhinein eine zusätzliche Überarbeitung mit partiell neuer Einordnung erfuhren. Innerhalb der Modifikatoren wurden Teilgruppen erstellt, um deren Neubewertung zu begründen. NB: In manchen Fällen, kann ein Verb mit derselben Präposition sowohl Präpositionalobjekte als auch Modifikatoren anschließen. Die Listen lassen sich also nicht für automatisierte Verfahren einsetzen.

## C.1 Präpositionalobjekte

```text
 abbauen         auf
 sich abfinden   mit
 abhängen       von
 abheben         auf
 abraten         “vor” von
 abrechnen       mit
 absehen         von
 absetzen        von
 (ab)stammen     von
 abstimmen       über
 abwechseln      mit
 abzielen        auf
 achten          auf
 ändern         an
 anfangen        mit
 anfreunden      mit
 ängstigen      vor
 ankommen        auf
 anschwellen     auf
 ansetzen        auf
 anspielen       auf
 ansprechen      auf
 anstiften       zu
 antworten       auf
 anwenden        auf
 appellieren     an
 arbeiten        an
 ärgern         über
 arrangieren     mit
 auffordern      zu
```

<!-- PDF page 125 -->

```text
aufklären          über
aufkommen           für
aufräumen          mit
aufregen            über
aufrufen            zu
aufwarten           mit
auseinandersetzen   mit
äußern             über, zu
ausrichten          an
ausruhen            von
aussagen            über
ausschließen        von
ausschweigen        über
aussehen            nach
aussöhnen          mit
auswirken           auf
bangen              um
basieren            auf
basteln             an
beauftragen         mit
bedanken            für
befassen            mit
befinden            über
befragen            nach, über
befreien            von
beginnen            mit
begnügen           mit
beharren            auf
beisteuern          zu
beitragen           zu
bekennen            Zu
beklagen            über
bekritteln          an
belaufen            auf
bemühen            um
benachrichtigen     über
beneiden            um
beraten             über
berechtigen         zu
berichten           über, von
berufen             auf
beruhen             auf
```

<!-- PDF page 126 -->

```text
sich bescheiden   mit
bescheidwissen    über
beschränken      auf
beschweren        über
besinnen          auf
bestehen          aus, auf, in
beteiligen        an
betrauen          mit
betrügen         um
bewahren          vor
bewerben          für, um
beziehen          auf
beziffern         auf
bitten            um
brechen           mit
bürgen           für
buhlen            um
danken            für
decken            mit
definieren        über
denken            über, an
dienen            zu
diskutieren       über, mit
dispensieren      von
distanzieren      von
dotieren          mit
drängen          auf, zu
dringen           auf
drohen            mit
eignen            für
eingehen          auf
einhergehen       mit
einigen           auf, mit, über
sich einlassen    auf, mit
einschränken     auf
einstehen         für
einstellen        auf
eintreten         für
einwenden         gegen
einwirken         auf
entfallen         auf
entlasten         von
```

<!-- PDF page 127 -->

```text
entscheiden     über
entschuldigen   für
entstehen       aus
erfahren        von, über
ergeben         aus
erholen         von
erinnern        an
erkranken       an
erkundigen      nach, über
sich erregen    über
erschrecken     vor
erwarten        von
erzählen       von, über
fabulieren      von
faseln          von
fehlen          an
festlegen       auf
folgen          aus
folgern         aus
forschen        nach
fragen          nach
freikaufen      von
freuen          auf, über
fürchten       vor, um
fußen           auf
garantieren     für
gebieten        über
gehen           um
gehören        zu
geradestehen    für
gewinnen        an
gewöhnen       an
glauben         an
gleichstellen   mit
hadern          mit
halten          an, von
handeln         von, um
hapern          an, in
hereinfallen    auf
herfallen       über
herrschen       über
herrühren      von
```

<!-- PDF page 128 -->

```text
hervorgehen           aus
hinausgehen           über
hinauskommen          über
hindern               an
hinwegsetzen          über
hinwegtäuschen       über
hinweisen             auf
hinwirken             auf
hoffen                auf
hören                auf
sich identifizieren   mit
informieren           über
kämpfen              mit, um
kandidieren           für
klagen                auf, über
kommunizieren         mit
konfrontieren         mit
konkurrieren          um, mit
konzentrieren         auf
koppeln               mit
korrespondieren       mit
kranken               an
kritisieren           an
kümmern              um
lauten                auf
leiden                an, unter
mahnen                zu
mangeln               an
messen                mit
mitentscheiden        über
mitwirken             bei, an
motivieren            zu
nachdenken            über
niederschlagen        in
nötigen              zu
orientieren           an
partizipieren         an
passen                zu
profitieren           von
(über)prüfen        auf
rächen               für
raten                 zu
```

<!-- PDF page 129 -->

```text
rätseln              über
reagieren             auf
rechnen               auf, zu
reden                 über, von, mit
reduzieren            auf
referieren            über
regieren              über
rennen                um
resultieren           aus
retten                vor
richten               nach
ringen                um
sagen                 zu
schachern             um
schämen              für
schätzen             auf
scheitern             an
scheren               um
scheuen               vor
schließen             aus
schützen             vor
schwärmen            von
sehnen                nach
senken                auf
siegen                über
singen                von
sich solidarisieren   mit
sorgen                für, um
sparen                an
sich speisen          aus
spekulieren           über
sprechen              über, von, mit, zu
stammen               aus
staunen               über
stehen                zu
sterben               an
steuern               auf
sticheln              gegen
stinken               nach
stöhnen              über
sträuben             gegen
streben               nach
```

<!-- PDF page 130 -->

```text
streiten          über, mit, um
strotzen          von
suchen            nach
suspendieren      von
sympathisieren    mit
taugen            zu
tauschen          mit
teilhaben         an
teilnehmen        an
telephonieren     mit
träumen          von
treffen           auf, mit
trennen           von
triumphieren      über
üben             in
übereinstimmen   mit
überprüfen      auf
übertragen       auf
überwerfen       mit
überzeugen       von
umgehen           mit
umsehen           nach
umsteigen         auf
umwandeln         in
unterhalten       mit
unterrichten      über
unterscheiden     von
urteilen          über
verabschieden     von
veranlassen       zu
verbinden         mit
verdienen         an
verdonnern        zu
vereinbaren       mit
vereinigen        mit
verfallen         auf
verfügen         über
vergleichen       mit
verhalten         zu
verhandeln        mit, über
verheiraten       mit
verlängern       auf
```

<!-- PDF page 131 -->

```text
verlieren             an
verpflichten          auf, zu
verschmelzen          mit
verschonen            von
versöhnen            mit
versprechen           von
verständigen         auf
verstehen             auf, unter
versteifen            auf
verstoßen             gegen
verstricken           in
sich versuchen        an/in
versündigen          an
verteilen             auf
vertragen             mit
vertrauen             auf
verurteilen           zu
verwandeln            in
verwechseln           mit
verweisen             auf
verwickeln            in
verzichten            auf
vorbereiten           auf
vorgehen              gegen
wachen                über
warnen                vor
warten                auf
wehren                gegen
wenden                an
werben                für, um
wetteifern            um, in
wettlaufen            um
wetten                auf, um
wirken                auf
wissen                über, um, von
zahlen                für
zählen               zu
zehren                an
zubewegen             auf
sich zufriedengeben   mit
zugrundegehen         an
zutreffen             auf
```

<!-- PDF page 132 -->

```text
 zurückführen     auf
 zurückgehen       auf
 zurückgreifen     auf
 zurückschrecken   vor
 zusammensetzen     aus
 zweifeln           an
 zwingen            zu
```

## C.2 Modifikatoren

### Partikelverben

```text
 abbringen            von
 abhalten             von
 abkehren             von
 abkommen             von
 abkoppeln            von
 ablassen             von
 ablenken             von
 abschirmen           von
 abweichen            von
 abwenden             von
 anknüpfen           an
 anpassen             an
 ausscheiden          aus
 ausscheren           aus
 aussteigen           aus
 einbeziehen          in
 einmischen           in
 einreihen            in
 engagieren           in
 herantasten          an
 hindeuten            auf
 investieren          in
 mithalten            mit
 zusammenarbeiten     mit
 zusammenhängen      mit
 zusammentreffen      mit
```

### Übertragungen

```text
 abkehren     von
 abkommen     von
 ableiten     aus
 abschotten   gegen
```

<!-- PDF page 133 -->

```text
 abtreten          an
 abwälzen         auf
 abweichen         von
 auflösen         in
 ausgehen          von
 ausrichten        auf
 binden            an
 entbinden         von
 entfernen         aus, von
 entzünden        an
 fernhalten        von
 festhalten        an
 finden            an
 führen           zu
 gelangen          zu
 kommen            zu
 koppeln           an
 knüpfen          an
 liegen            an
 messen            an
 münden           in
 neigen            zu
 rechnen           mit
 richten           an, auf, gegen
 schleudern        auf
 setzen            auf
 sinken            auf
 steigen           auf
 stoßen            an, auf
 stützen          auf
 übergehen        an
 umschwenken       auf
 veranschlagen     auf
 sich vergreifen   an
 wechseln          auf
 wegführen        von
 wenden            gegen
 zielen            auf
 zurücktreten     von
 zurückziehen     aus
```

### Kommutierbarkeit

```text
 aufbringen   gegen
 einsetzen    für
 eintreten    für
```

<!-- PDF page 134 -->

```text
 engagieren       für
 entscheiden      für
 ergeben          aus
 kämpfen         gegen
 klagen           gegen
 plädieren       für
 protestieren     gegen
 prozessieren     gegen
 stehen           für
 unterscheiden    durch
 votieren         für
 votieren         gegen
 würdigen        für
 zahlen           für
```

### Instrumental

```text
 auskommen       mit
 ausrüsten      mit
 ausstatten      mit
 auszeichnen     mit/durch
 begründen      mit
 belegen         mit
 beschäftigen   mit
 enden           mit
 erfüllen       mit
 erklären       mit
 kombinieren     mit
 schmücken      mit
 vermischen      mit
 versorgen       mit
 vertreiben      mit
```

### Subjekts- und Objektsprädikative bei Vollverben

```text
 avancieren      zu
 erklären       zu
 erklären       für
 halten          für
 machen          zu
 verdichten      zu
 verhelfen       zu
 verkommen       zu
 aussehen        nach
```

### Sonstiges

<!-- PDF page 135 -->

```text
aufmerksam machen          auf
ausdrücken                in
ausstatten                 für
benötigen                 zu
bilden                     aus
erhöhen                   auf
erhoffen                   von
einladen                   zu
enden                      in
ermitteln                  gegen
ermitteln                  in
sich erstrecken            auf
erwarten                   von
gelten                     als (“für”)
gipfeln                    in
handeln                    mit
(ver)kaufen                für
leben                      von
lernen                     von
nennen                     nach
nutzen                     zu
rufen                      nach
schreiben                  an
teilen                     mit
verdoppelln                auf
verflechten                mit
verkaufen                  an
verkürzen                 auf
verlängern                auf
verlangen                  nach
verlangen                  von
verüben                   auf
verwenden                  zu
vorsorgen                  für
zeigen                     auf
zurückblicken             auf
zuspitzen                  auf
(Wert) legen               auf
(Rücksicht) nehmen        auf
(über den Tisch) ziehen   über
```

<!-- PDF page 136 -->

# D Listen von Funktionsverbgefügen

Allgemeine Definition: Vgl. 5.2.8; Als FVG sehen wir nur bestimmte Verbindungen zwischen PP und FV an. Ausgeschlossen werden demnach NP-FV-, PP-KV-Verbindungen oder Redewendungen. Schwierig ist hierbei vor allem die Abgrenzung zwischen FVG und Redewendungen/Lexikalisierungen. Bei FVG handelt es sich um produktive Muster. Zwischen den einzelnen Elementen von FVG kommt es auf verschiedene Weise zu Reihenbildungen:

1. zwischen Präposition und nominalen Kern (in/im Rechnung [stellen], Frage [kommen], Verdacht [stehen])

2. zwischen FV und PrGr (geraten in Versuchung, in Angst, in Bedrängnis)

3. zwischen PrGr und FV (in Bewegung setzen, versetzen, kommen, bringen, befinden)

Hierin könnte ein Kriterium zur Abgrenzung von Redewendungen/Lexikalisierung liegen. Innerhalb der PP können sowohl allein Präpositionen, Verschmelzungen als auch Präposition-Artikel-Verbindungen stehen. Im Weiteren werden die eigentlich festen Gefüge gelegentlich durch verschiedenste Attributmöglichkeiten rhetorisch aufgebrochen, was jedoch nichts an der Analyse als FVG ändern soll.

## D.1 Alphabetische Liste von Funktionsverben und deren PPs

Diese Liste soll als Orientierung gelten, d.h. sie ist nicht vollständig und kann nach Absprache ergänzt werden.

```text
sich befinden (schweben)
auf der Flucht
in Abhängigkeit (von)
in Anwendung
im Aufbau
in Betrieb
in Bewegung
in Gefahr
begriffen sein
im Anwachsen
im Entstehen
bringen (treiben)
auf Touren
auf Trab
aus der Fassung
aus dem Gleichgewicht
außer Atem
in Anwendung
in Armut
```

<!-- PDF page 137 -->

```text
in Aufregung
in Aufruhr
in Berührung (mit)
in Betrieb
in Bewegung
in Einklang
in Ekstase
in Erfahrung
in Erregung
in Erstaunen
in Fahrt
in Fluß
in Form
in Gang
in Gefahr
in Gegensatz (zu)
in die Gewalt
in Konnex
in Kontakt
in Mode
in Misskredit
in Ordnung/Unordnung
in Schulden
in Schwingungen
in Schwung
in Sicherheit
in Stellung
in Trab
in Stimmung
in Übereinstimmung
in Umlauf
in Ungnade
in Verbindung (mit)
in (den) Verkehr
in Verlegenheit
in Versuchung
in Verwirrung
in Verwunderung
in Verzug
in Verzückung
in Widerspruch
in Wut
in Zorn
in Zusammenhang
in Zweifel
ins Elend
ins Gerede
```

<!-- PDF page 138 -->

```text
ins Gespräch
ins Rollen
ins Spiel
zu Bewußtsein
zu Ende
zu Fall
zu Gehör
zu Kräften
zu Papier
zum Abschluß
zum Ausdruck
zum Durchbruch
zum Einsatz
zum Einsturz
zum Erliegen
zum Halten
zum Kochen, Sieden, Singen, Keimen, Lachen, Weinen, Fließen, Gehen, Rollen, Sprechen, Schmel-
zen, Schweigen, Stehen, Umkippen, Verschwinden etc.
zum Stillstand
zum Verkauf
zum Verstummen
zum Vorschein
zum Wahnsinn
zur Abschaltung
zur Abstimmung
zur Anschauung
zur Anwendung
zur Anzeige
zur Aufführung
zur Ausführung
zur Begeisterung
zur Besinnung
zur Darstellung
zur Deckung
zur Durchführung
zur Einsicht
zur Entscheidung
zur Explosion
zur Geltung
zur Kenntnis/Erkenntnis
zur Raserei
zur Reife
zur Ruhe
zur Sprache
zur Strecke
zur Übereinstimmung
zur Übergabe
```

<!-- PDF page 139 -->

```text
zur Überzeugung
zur Vernunft
zur Versteigerung
zur Verteilung
zur Verwendung
zur Verzweiflung
zur Vollendung
zur Wirkung
fallen
zum Opfer
zur Last
geben
in Arbeit, Produktion, Fabrikation
in Auftrag
in Druck
in Pacht
in Verwahrung
zu Protokoll
zur Antwort
zur Bearbeitung
gehen (schreiten)
auf Distanz
in Arbeit
in Auftrag
in Deckung
in Druck
in Erfüllung
in Führung
in Herstellung, Produktion
in Konkurs
in Revision
in (den) Ruhestand
in Serie
in Stellung
zu Ende
zu Lasten (von)
zu Rate
zu Werke
zur Neige
gelangen
zu Ansehen
zur Anschauung
zur Ansicht
```

<!-- PDF page 140 -->

```text
zur Entscheidung
zur Überzeugung
zur Aufführung
zur Durchführung
zur Einsicht
zur Erkenntnis
zur Macht
geraten (stürzen)
in Abhängigkeit (von)
in Angst
in Armut
in Aufregung
in Aufruhr
in Bedrängnis
in Begeisterung
in Bewegung
in den Blick
in Brand
in Ekstase
in Erregung
in Erstaunen
in Furcht
in Gefahr
in Isolierung
in Konflikt (mit)
in Not
in Rückstand
in Schieflage
in Schulden
in Schwingungen
in Stimmung
in Unordnung
in Unruhe
in Verdacht
in Vergessenheit
in Verlegenheit
in Verruf
in Versuchung
in Verwirrung
in Verwunderung
in Verzückung
in Verzug
in Verzweiflung
in Widerspruch
in Wut
in Zorn
```

<!-- PDF page 141 -->

```text
in Zugzwang
in Zweifel
ins Elend
ins Gerede
ins Rollen, Schlingern, Trudeln
unter Druck
unter Einfluß (von)
haben
in Arbeit
in Auftrag
in Bearbeitung
in Besitz
in Pacht
in Verwahrung
im Gefühl
im Griff
zu Gebote
zum Gegenstand
zur Folge
zur Konsequenz
zur Verfügung
halten
am Laufen
auf Touren
in Angst
in Atem
in Aufregung
in Aufruhr
in der Balance
in Bann
in Betrieb
in Bewegung
in Ehren
in Ekstase
in Erregung
in Furcht
in Gang
in Grenzen
in Haft
in Kenntnis
in Ordnung
in Schach
in Schrecken
in Schwung
in Stimmung
```

<!-- PDF page 142 -->

```text
in Unruhe
in Verwahrung
in Verzückung
in Wut
im Spiel
kommen (eilen, melden)
außer Atem
aus der Mode
in Anwendung
in Berührung
in Betracht
in Bewegung
in Erregung
in Erwägung
in Fahrt
in Fluß in Form
in Frage
in Genuß
in Gang/in die Gänge
in Konflikt
in Kontakt
in Mode
in Ordnung
in Schulden
in Schwingungen
in Schwung
in Sicht
in Stimmung
in Trab
in Umlauf
in Verdacht
in Verlegenheit
in Verruf
in Versuchung
in Verzug
ins Gerede
ins Geschäft
ins Gespräch
ins Rollen, Trudeln, Schwimmen
ins Spiel
zu Ansehen
zu Bewusstsein
zu Fall
zu Hilfe
zu Kräften
zu Wort
```

<!-- PDF page 143 -->

```text
zum Abschluß
zum Ausbruch
zum Ausdruck
zum Austausch
zum Bruch
zum Durchbruch
zum Einsatz
zum Ende
zum Entschluss
zum Kochen, Stehen, Sieden, Schmelzen etc.
zum Schluß
zum Schuß
zum Stillstand
zum Streit
zum Tragen
zum Verkauf
zum Vorschein
zum Vortrag
zum Zuge
zur Abstimmung
zur Anschauung
zur Ansicht
zur Anwendung
zur Aufführung
zur Auffassung
zur Ausführung
zur Besinnung
zur Darstellung
zur Durchführung
zur Einigung
zur Einsicht
zur Entscheidung
zur Geltung
zur Kenntnis/Erkenntnis
zur Macht
zur Ruhe
zur Sprache
zur Übergabe
zur Überzeugung
zur Verhandlung
zur Vernunft
zur Verständigung
zur Versteigerung
zur Verwendung
zur Wirkung
lassen
```

<!-- PDF page 144 -->

```text
außer acht
legen
zur Last
liegen
in Fehde
in Führung
in Scheidung
in/im Streit
im Interesse
im Kampf
im Sterben
im Trend
unter Beschuß
nehmen
in die Pflicht
in Acht
in Angriff
in Anspruch
in Arbeit
in Auftrag
in Augenschein
in Beschlag
in Besitz
in Betrieb
in Empfang
in Gebrauch
in Gewahrsam
in Haft
in Kauf
in Obhut
in Pacht
in Schutz
in Verwahrung
ins Visier
unter Beschuß
unter Feuer
zu Hilfe
zu Protokoll
zur Kenntnis
zum Anlaß
zum Maßstab
zum Vorbild
rufen
```

<!-- PDF page 145 -->

```text
in Erinnerung
ins Leben
setzen (stecken)
aufs Spiel
außer Betrieb
außer Gefecht
außer Kraft
in Betrieb
in Bewegung
in Beziehung (zu)
in Brand
in Erstaunen
in Gang
in Kenntnis
in Kraft
in Marsch
in Rechnung
in Szene
in Umlauf
in Verbindung
in Verwunderung
in Zusammenhang
ins Unrecht
ins Vertrauen
unter Druck
zum Ziel
zur Ruhe
zur Wehr
stehen
am Anfang
außer Frage
außer Zweifel
in Abhängigkeit
in (hohem) Ansehen
in Aussicht
in Beziehung (zu)
in Frage
in Gegensatz
in Konkurrenz (zu)
in Kontakt (mit/zu)
in Verbindung (mit/zu)
in Verhandlung (mit)
in Verruf
in Wechselwirkung
in Wettbewerb (mit)
```

<!-- PDF page 146 -->

```text
in Widerspruch (zu)
in Zusammenhang
in Zweifel
im Begriff
im Dienst
im Einklang (mit)
im Einvernehmen
im Ermessen
im Gegensatz (zu)
im Ruf
im Verdacht
im Verhältnis (zu)
im Visier
im Widerspruch
im Zusammenhang (mit)
unter Anklage
unter Arrest
unter Aufsicht
unter Beobachtung
unter Beschuß
unter Beweis
unter Druck
unter Einfluß (von)
unter Kontrolle
unter Schutz
unter Strafe
unter Stress
unter Verdacht
zu Buche
zu Diensten
zu Gebote
zum Verkauf
zur Auswahl
zur Debatte
zur Diskussion
zur Entscheidung
zur Erörterung
zur Verfügung
zur Wahl
stellen
in Abrede
in Aussicht
in Dienst
in Frage
in Rechnung
in (den) Zusammenhang
```

<!-- PDF page 147 -->

```text
unter Anklage
unter Arrest
unter Beobachtung
unter Beweis
unter Kontrolle
unter Schutz
unter Strafe
zu Gebote
zur Abstimmung
zur Auswahl
zur Debatte
zur Diskussion
zur Entscheidung
zur Erörterung
zur Rede
zur Verfügung
zur Verhandlung
zur Wahl
treten
außer Kraft
in Aktion
in Beziehung (mit/zu)
in Dialog
in Erscheinung
in Gegensatz (zu)
in Konkurrenz (mit/zu)
in Kontakt
in Kraft
in einen/den Streik
in Verbindung
in Verhandlung
in Wettbewerb
ins Bewußtsein
versetzen
in Angst
in Aufruhr
in Aufregung
in Begeisterung
in Bewegung
in Ekstase
in Erregung
in Erstaunen
in Furcht
in Schrecken
in Schwung
```

<!-- PDF page 148 -->

```text
in Stimmung
in Unruhe
in Verwirrung
in Verwunderung
in Verzückung
in Wut
in Zorn
ziehen
in Beratung
in Betracht
in Erwägung
in Mitleidenschaft
in Zweifel
ins Gespräch
ins Vertrauen
zu Rate
zur Rechenschaft
zur Verantwortung
```

## D.2 Nicht als FVG sehen wir folgende Wendungen an

```text
unter Dach und Fach bringen
unter der Decke halten
auf dem Laufenden halten
über die Runden kommen
an den Tag legen
unter die Lupe nehmen
im Mittelpunkt stehen
in der Kreide stehen / in der Tinte sitzen
in den Kinderschuhen stecken
in die Sackgasse geraten
Folgende Verbindungen werden nach STTS als Verb+PTKVZ(SVP) beschrieben.
abhanden kommen
beiseite bringen, stellen, legen, nehmen
instand setzen, bringen
zugrunde gehen, richten
zugute kommen, halten
zuleide tun
zunutze machen
zutage treten, fördern, bringen
zustande kommen, bringen
zustatten kommen
zuwege bringen
vonstatten gehen
```
