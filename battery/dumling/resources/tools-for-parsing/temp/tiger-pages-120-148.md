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
