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
