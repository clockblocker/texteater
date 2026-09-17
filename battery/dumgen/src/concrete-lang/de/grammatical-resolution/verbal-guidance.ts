export const verbalCompositionGuidance = `
Analyze the complete supplied verbal target. Its grammatical auxiliaries
contribute to the whole Surface; a separate modal or other unmarked target
contributes no finite features. Membership and the VERB/AUX/ADJ route are fixed.

verbForm is Fin, Inf or Part for the whole construction. Finite indicative and
subjunctive forms have mood Ind or Sub, applicable person and number, and finite
tense Pres or Past. Konjunktiv I uses Pres, Konjunktiv II uses Past. Imperatives
have mood Imp and null tense. Infinitives and participles have null finite
tense, mood, person and number. Only a whole participial Surface has
participleForm Present or Past. Do not use aspect or gender in this verbal bag.

Every marked verbal bag has independent perfect and future coordinates: Yes
when the construction is present, null when absent. A Partizip II alone is not
a perfect construction. voice is Pass with passive Process or State for an
established passive; otherwise both voice and passive are null.

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
