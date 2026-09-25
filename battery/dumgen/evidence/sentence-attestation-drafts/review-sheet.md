# Sentence-analysis Attestation drafts

Written by `codegen/migrate-sentence-cases.ts` from the drafts
`cli/draft-sentence-attestations.ts` produced by running Grammatical
Resolution on each expected target of the sentence-analysis cases a Full
Spec Record could serve (#634). `[[...]]` marks the target's members, and
Expected gives its Kind and each member's role (`-` where the case scores
none). An Attestation reads: Lemma {Core Features} · "Surface" {Inflectional
Features} · members/orthography · Realization Coverage · evidence.

Drafting configuration: `{"generation":{"model":"gpt-5.6-luna","settings":{"reasoning":{"effort":"none"},"service_tier":"fast"}},"judgment":{"model":"jev-latest","settings":{"timeoutMs":30000,"maxRetries":0}}}`

- Cases: 36; a Full record could serve 13, with 67 targets
- Targets drafted: 0
- Targets whose drafting failed: 1
- Targets not drafted yet: 66
- Drafts that disagree with the case: 0
- Held back by a Reviewed record: 1
- Held back by a conflicting Draft record: 0
- Served by a record: 0

Drafting stops at the first answer that the provider wants payment (HTTP
402). To draft the rest and move what agrees, from `battery/dumgen`:

```sh
bun --env-file=../../.env.local cli/draft-sentence-attestations.ts
bun codegen/migrate-sentence-cases.ts && bun run generate
bun run --cwd ../../app/tf-demo compile:relation-policy
```

| Case | Sentence | Expected | Explanation | Attestation | Draft | Placement |
| --- | --- | --- | --- | --- | --- | --- |
| sentence-de-kakao | [[Der]] heiße [[Kakao]] schmeckt gut. | NOUN Article Head | The owned article joins the noun across an adjective. |  | failed: ProviderFailure: 402 Your organization has no available TypeSafe API credits | stays in source-data.json: 4 of 4 targets have no agreeing draft |
| sentence-de-kakao | Der [[heiße]] Kakao schmeckt gut. | ADJ - |  |  | not drafted |  |
| sentence-de-kakao | Der heiße Kakao [[schmeckt]] gut. | VERB - |  |  | not drafted |  |
| sentence-de-kakao | Der heiße Kakao schmeckt [[gut]]. | ADJ - |  |  | not drafted |  |
| sentence-de-kino | [[Wir]] gehen heute ins Kino. | PRON - | A fused word: `ins` is `in` plus `s` standing for `das`, and the article piece joins the noun. |  | not drafted | stays in source-data.json: 5 of 5 targets have no agreeing draft |
| sentence-de-kino | Wir [[gehen]] heute ins Kino. | VERB - |  |  | not drafted |  |
| sentence-de-kino | Wir gehen [[heute]] ins Kino. | ADV - |  |  | not drafted |  |
| sentence-de-kino | Wir gehen heute [[in]]s Kino. | ADP - |  |  | not drafted |  |
| sentence-de-kino | Wir gehen heute in[[s]] [[Kino]]. | NOUN Article Head |  |  | not drafted |  |
| sentence-de-aufstehen | [[Meine]] Schwester steht jeden Morgen um sechs auf. | DET - | A discontinuous separable verb; two determiners with authored identities. |  | not drafted | stays in source-data.json: 7 of 7 targets have no agreeing draft |
| sentence-de-aufstehen | Meine [[Schwester]] steht jeden Morgen um sechs auf. | NOUN - |  |  | not drafted |  |
| sentence-de-aufstehen | Meine Schwester [[steht]] jeden Morgen um sechs [[auf]]. | VERB Head SeparableParticle |  |  | not drafted |  |
| sentence-de-aufstehen | Meine Schwester steht [[jeden]] Morgen um sechs auf. | DET - |  |  | not drafted |  |
| sentence-de-aufstehen | Meine Schwester steht jeden [[Morgen]] um sechs auf. | NOUN - |  |  | not drafted |  |
| sentence-de-aufstehen | Meine Schwester steht jeden Morgen [[um]] sechs auf. | ADP - |  |  | not drafted |  |
| sentence-de-aufstehen | Meine Schwester steht jeden Morgen um [[sechs]] auf. | NUM - |  |  | not drafted |  |
| sentence-de-erinnert | [[Er]] hat sich gestern an seinen Bruder erinnert. | PRON - | Auxiliary, required reflexive and governed preposition on one verb, spread over the sentence. |  | not drafted | stays in source-data.json: 5 of 5 targets have no agreeing draft |
| sentence-de-erinnert | Er [[hat]] [[sich]] gestern [[an]] seinen Bruder [[erinnert]]. | VERB Auxiliary Reflexive GovernedPreposition Head |  |  | not drafted |  |
| sentence-de-erinnert | Er hat sich [[gestern]] an seinen Bruder erinnert. | ADV - |  |  | not drafted |  |
| sentence-de-erinnert | Er hat sich gestern an [[seinen]] Bruder erinnert. | DET - |  |  | not drafted |  |
| sentence-de-erinnert | Er hat sich gestern an seinen [[Bruder]] erinnert. | NOUN - |  |  | not drafted |  |
| sentence-de-ausweg | [[Es]] [[gibt]] keinen Ausweg. | VERB Expletive Head | Expletive `es` belongs to the verb; `kein` is a determiner, never an article. |  | not drafted | stays in source-data.json: 3 of 3 targets have no agreeing draft |
| sentence-de-ausweg | Es gibt [[keinen]] Ausweg. | DET - |  |  | not drafted |  |
| sentence-de-ausweg | Es gibt keinen [[Ausweg]]. | NOUN - |  |  | not drafted |  |
| sentence-de-relativ | [[Die]] [[Frau]], die dort wartet, kennt niemanden. | NOUN Article Head | The same spelling as article and as relative pronoun; a negative pronoun with one authored identity. |  | not drafted | stays in source-data.json: 6 of 6 targets have no agreeing draft |
| sentence-de-relativ | Die Frau, [[die]] dort wartet, kennt niemanden. | PRON - |  |  | not drafted |  |
| sentence-de-relativ | Die Frau, die [[dort]] wartet, kennt niemanden. | ADV - |  |  | not drafted |  |
| sentence-de-relativ | Die Frau, die dort [[wartet]], kennt niemanden. | VERB - |  |  | not drafted |  |
| sentence-de-relativ | Die Frau, die dort wartet, [[kennt]] niemanden. | VERB - |  |  | not drafted |  |
| sentence-de-relativ | Die Frau, die dort wartet, kennt [[niemanden]]. | PRON - |  |  | not drafted |  |
| sentence-de-passiv | [[Das]] [[Paket]] wird morgen geliefert. | NOUN Article Head | The process passive: `wird` is an Auxiliary member whose AUX Reading derives from the shape. |  | not drafted | stays in source-data.json: 3 of 3 targets have no agreeing draft |
| sentence-de-passiv | Das Paket [[wird]] morgen [[geliefert]]. | VERB Auxiliary Head |  |  | not drafted |  |
| sentence-de-passiv | Das Paket wird [[morgen]] geliefert. | ADV - |  |  | not drafted |  |
| sentence-de-faden | Er hat den Faden verloren. |  | An idiom over two words: the verb brings its auxiliary, the noun its article, and the whole expression lights up. |  |  | stays in source-data.json: the case has a Phraseme, whose words a Full record cannot also hold as Lexeme targets |
| sentence-de-usw | [[Anna]] kauft Obst, Gemüse usw. auf dem Markt. | PROPN - | An abbreviation is one Segment whose surface is its expansion. |  | not drafted | held back: Reviewed record de/anna-kauft-obst-gemuese-usw-auf-dem-markt |
| sentence-de-usw | Anna [[kauft]] Obst, Gemüse usw. auf dem Markt. | VERB - |  |  | not drafted |  |
| sentence-de-usw | Anna kauft [[Obst]], Gemüse usw. auf dem Markt. | NOUN - |  |  | not drafted |  |
| sentence-de-usw | Anna kauft Obst, [[Gemüse]] usw. auf dem Markt. | NOUN - |  |  | not drafted |  |
| sentence-de-usw | Anna kauft Obst, Gemüse [[usw.]] auf dem Markt. | ADV - |  |  | not drafted |  |
| sentence-de-usw | Anna kauft Obst, Gemüse usw. [[auf]] dem Markt. | ADP - |  |  | not drafted |  |
| sentence-de-usw | Anna kauft Obst, Gemüse usw. auf [[dem]] [[Markt]]. | NOUN Article Head |  |  | not drafted |  |
| sentence-de-museum | [[Das]] [[Museum]] öffnet z.B. am Montag erst um zehn. | NOUN Article Head | A dotted abbreviation and the fusion `am`. |  | not drafted | stays in source-data.json: 8 of 8 targets have no agreeing draft |
| sentence-de-museum | Das Museum [[öffnet]] z.B. am Montag erst um zehn. | VERB - |  |  | not drafted |  |
| sentence-de-museum | Das Museum öffnet [[z.B.]] am Montag erst um zehn. | ADV - |  |  | not drafted |  |
| sentence-de-museum | Das Museum öffnet z.B. [[a]]m Montag erst um zehn. | ADP - |  |  | not drafted |  |
| sentence-de-museum | Das Museum öffnet z.B. a[[m]] [[Montag]] erst um zehn. | NOUN Article Head |  |  | not drafted |  |
| sentence-de-museum | Das Museum öffnet z.B. am Montag [[erst]] um zehn. | ADV - |  |  | not drafted |  |
| sentence-de-museum | Das Museum öffnet z.B. am Montag erst [[um]] zehn. | ADP - |  |  | not drafted |  |
| sentence-de-museum | Das Museum öffnet z.B. am Montag erst um [[zehn]]. | NUM - |  |  | not drafted |  |
| sentence-de-genitiv | [[Das]] [[Haus]] des Nachbarn ist alt. | NOUN Article Head | A genitive article; `des` is not an authored article spelling, so its identity comes from the noun. |  | not drafted | stays in source-data.json: 4 of 4 targets have no agreeing draft |
| sentence-de-genitiv | Das Haus [[des]] [[Nachbarn]] ist alt. | NOUN Article Head |  |  | not drafted |  |
| sentence-de-genitiv | Das Haus des Nachbarn [[ist]] alt. | VERB - |  |  | not drafted |  |
| sentence-de-genitiv | Das Haus des Nachbarn ist [[alt]]. | ADJ - |  |  | not drafted |  |
| sentence-de-typo | [[Ihc]] habe leider keine Zeit. | PRON - | A typo on a pronoun: the route says PRON, the table has no candidate, so the identity is a Miss. |  | not drafted | stays in source-data.json: 5 of 5 targets have no agreeing draft |
| sentence-de-typo | Ihc [[habe]] leider keine Zeit. | VERB - |  |  | not drafted |  |
| sentence-de-typo | Ihc habe [[leider]] keine Zeit. | ADV - |  |  | not drafted |  |
| sentence-de-typo | Ihc habe leider [[keine]] Zeit. | DET - |  |  | not drafted |  |
| sentence-de-typo | Ihc habe leider keine [[Zeit]]. | NOUN - |  |  | not drafted |  |
| sentence-de-klitik | Wie geht's dir heute? |  | An apostrophe clitic: `s` stands for `es`, the expletive of `es geht`; the greeting is a DiscourseFormula over three words. |  |  | stays in source-data.json: the case has a Phraseme, whose words a Full record cannot also hold as Lexeme targets |
| sentence-de-verfuegung | Der Lehrer stellt den Schülern Material zur Verfügung. |  | A Funktionsverbgefüge: a Collocation over three words, with the fused article reaching the noun through its own word; `den Schülern` and `Material` are free arguments. Its fixed `zu` is wording, not a slot of `stellt`. |  |  | stays in source-data.json: the case has a Phraseme, whose words a Full record cannot also hold as Lexeme targets |
| sentence-de-manche | [[Manche]] kommen früh, viele gehen spät. | PRON - | Standalone quantifiers are pronouns; the DET twin is the trap. |  | not drafted | stays in source-data.json: 6 of 6 targets have no agreeing draft |
| sentence-de-manche | Manche [[kommen]] früh, viele gehen spät. | VERB - |  |  | not drafted |  |
| sentence-de-manche | Manche kommen [[früh]], viele gehen spät. | ADJ - |  |  | not drafted |  |
| sentence-de-manche | Manche kommen früh, [[viele]] gehen spät. | PRON - |  |  | not drafted |  |
| sentence-de-manche | Manche kommen früh, viele [[gehen]] spät. | VERB - |  |  | not drafted |  |
| sentence-de-manche | Manche kommen früh, viele gehen [[spät]]. | ADJ - |  |  | not drafted |  |
| sentence-de-fremd | [[Das]] [[Meeting]] war very good. | NOUN Article Head | Code-switched words: no multilingual support, so they are X or Unresolved. |  | not drafted | stays in source-data.json: 4 of 4 targets have no agreeing draft |
| sentence-de-fremd | Das Meeting [[war]] very good. | VERB - |  |  | not drafted |  |
| sentence-de-fremd | Das Meeting war [[very]] good. | X - |  |  | not drafted |  |
| sentence-de-fremd | Das Meeting war very [[good]]. | X - |  |  | not drafted |  |
| sentence-de-government-warten-auf | Er wartet auf den Nachtbus. |  | warten governs auf with the accusative. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-warten-adjunct | Er wartet seit einer Stunde am Bahnhof. |  | seit and am are free adjuncts of time and place; the sentence attests no government. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-bestehen-auf | Sie besteht auf einer Entschuldigung. |  | bestehen auf (insist) takes the dative. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-bestehen-aus | Das Team besteht aus fünf Leuten. |  | bestehen aus (consist of) governs aus. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-bestehen-none | Er hat die Prüfung endlich bestanden. |  | No preposition, so no government question is asked. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-stolz-auf | Sie ist sehr stolz auf ihren Sohn. |  | The adjective stolz governs auf with the accusative and takes it in as a member; the copula ist stays its own word and forms no expression with stolz (ADR 0034). |  |  | stays in source-data.json: the case puts Sie, sehr, ihren, Sohn in no Lexeme target, or in several |
| sentence-de-copula-stolz-auf | Er ist stolz auf seinen Sohn. |  | A copula never forms an expression with its predicative adjective: ist is its own VERB, and stolz takes in the auf it governs (ADR 0034). |  |  | stays in source-data.json: the case puts Er, seinen, Sohn in no Lexeme target, or in several |
| sentence-de-government-abhaengig-von | Der Ausflug ist abhängig vom Wetter. |  | The adposition component of vom is the governed von. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-angst-vor | Das Kind hat Angst vor Hunden. |  | The noun Angst governs vor with the dative and keeps it inside the Collocation Angst haben, which takes the click (ADR 0034). |  |  | stays in source-data.json: the case has a Phraseme, whose words a Full record cannot also hold as Lexeme targets |
| sentence-de-government-interesse-an | Er zeigt großes Interesse an Musik. |  | The noun Interesse governs an with the dative. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-bedanken-two | Ich bedanke mich bei dir für die Hilfe. |  | sich bedanken governs both bei and für. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-freuen-darauf | Ich freue mich schon sehr darauf. |  | The pronominal adverb darauf realizes the governed auf. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-denken-an | Ich denke oft an dich. |  | denken an takes the accusative. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-teilnehmen-an | Sie nimmt an dem Kurs teil. |  | teilnehmen governs an with the dative; the preposition is not the separable particle. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-bescheid-wissen | Sie weiß über das Projekt gut Bescheid. |  | The Collocation Bescheid wissen governs über with the accusative; Bescheid governs it only inside the Collocation, so über is the Collocation's governed preposition and not a fixed word (ADR 0034). |  |  | stays in source-data.json: the case has a Phraseme, whose words a Full record cannot also hold as Lexeme targets |
| sentence-de-government-spielen-adjunct | Die Kinder spielen im Garten. |  | im is a free place adjunct. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-schneiden-adjunct | Sie schneidet das Brot mit dem Messer. |  | mit is a free instrument adjunct. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-abfahren-adjunct | Der Zug fährt um acht Uhr ab. |  | um is a time adjunct and ab a separable particle. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-gross-none | Das Haus ist ziemlich groß. |  | No preposition, so no government question is asked. |  |  | stays in source-data.json: the case scores no Lexeme layer |
| sentence-de-government-tisch-adjunct | Der Tisch steht am Fenster. |  | am is a free place adjunct. |  |  | stays in source-data.json: the case scores no Lexeme layer |
