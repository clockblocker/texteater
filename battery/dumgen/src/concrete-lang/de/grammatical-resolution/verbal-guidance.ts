export const verbalCompositionGuidance = `
Analyze the complete supplied verbal target. A fixed nonreferential subject es
plus its verb is a supported VERB target in this domain, even though es is a
pronoun when analyzed alone. es gibt, gibt es and es gab have Lemma geben;
es regnet has regnen. es geht um has gehen, es handelt sich um has sich
handeln; in both, um is the owned member named as
governed-preposition evidence, never a Lemma feature. These are
not unsupported mixed-POS groups and do not require a new es-prefixed Lemma.
Use person 3 and number Sing for these complete targets
when finite. Retain tense from the verb. Normalize ordinary sentence-initial verb
capitalization to lowercase (Gibt es -> gibt es).
 Its grammatical auxiliaries
contribute to the whole Surface; a separate modal or other unmarked target
contributes no finite features. Membership and the VERB/ADJ route are fixed.
A modal (dürfen, können, mögen, müssen, sollen, wollen) is a VERB Lemma with
verbType Mod whether it governs an infinitive or an object. An AUX target is
sein, haben or werden serving another verb; perfect, future and passive belong
to the verb it serves and are null on the auxiliary's own Surface.

verbForm is Fin, Inf or Part for the whole construction. Finite indicative and
subjunctive forms have mood Ind or Sub, applicable person and number, and finite
tense Pres or Past. Konjunktiv I uses Pres, Konjunktiv II uses Past. Imperatives
have mood Imp and null tense. Infinitives and participles have null finite
tense, mood, person and number. Only a whole participial Surface has
participleForm Present or Past. A participle is verbal only in a perfect or
passive; an attributive, adverbial or predicative one is an ADJ and never
reaches this route. Do not use aspect, case, gender or degree in this verbal
bag.

Every marked verbal bag has independent perfect and future coordinates: Yes
when the construction is present, null when absent. A Partizip II alone is not
a perfect construction. voice is Pass with passive Process or Recipient for an
established passive; otherwise both voice and passive are null. sein with a
participle outside the perfect is a copula with an adjective, not a passive. The
recipient passive is bekommen, kriegen or erhalten with a Partizip II that
contributes nothing lexical (bekommt ... geliefert); the auxiliary is a member,
the participle's verb is the Lemma. Lexical bekommen with an object and the
resultative bekommt ... geöffnet (manages to open it) keep bekommen as the verb.

ist ... geschrieben worden is Fin, Pres, perfect Yes, future null, voice Pass,
passive Process, mood Ind, person 3, number Sing. geschrieben worden sein under
a separate modal is Inf, perfect Yes, future null, Process passive with all
finite coordinates null. hat ... müssen is a perfect finite modal Surface
despite Ersatzinfinitiv spelling; its separate lexical infinitive inherits none
of the modal's finite features. wird ... geschrieben haben is Fin, Pres,
perfect Yes and future Yes. Preserve the supplied target's realization coverage.

Null means unmarked or inapplicable under that field's policy. An uncertain
required analysis is Unresolved, never a guessed replacement or a repaired
target. Dictionary-only or invariant nonverbal uses may have a null feature bag.
`;
