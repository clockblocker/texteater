/**
 * What German `segment.inConstituents` asks about a wording's parts
 * (`constituents.ts`): the guide that closes a phraseme part's route
 * question and whether a run of parts is a Locution of its own. Their
 * examples are no Breakdown case (#693).
 */

/**
 * Closes a phraseme part's route question (#1241 rounds 1 and 4): a part's
 * Kind is what the word is inside the expression, never the whole
 * expression's Kind, which the judge also reads (`kaum` in a conjunction
 * Locution stays an adverb). A zu-infinitive's verb stays VERB: the shared
 * NOUN description's substantivized infinitives drew `tun` in mit zu tun
 * haben to the noun Tun, and its zu with it to ADP. Kept apart from the
 * route descriptions, which are segment.inUnits's and stay shared.
 */
export const phrasemeRouteGuide =
	"Judge the part by the role it plays inside this whole expression, not by its commonest use; the route above is the whole expression's, not the part's. A word that itself opens a clause, an infinitive clause included, is SCONJ (statt in statt … zu), and a word before it that only qualifies it keeps its own Kind (immer in immer wenn stays ADV), while the zu right before an infinitive is PART and that infinitive a VERB (zu bügeln), since an infinitive is NOUN only when it is used as a noun, capitalised or after an article (das Bügeln); a comparison word, wie or als, is CCONJ before a phrase and SCONJ before a clause, never ADP or ADV (als in mehr Schein als Sein); a word that stands for a noun phrase on its own, with no noun after it, is PRON, not DET (jeder in jeder für sich), and so is a question word asking for a thing or a person (wer), whatever follows it.";

/**
 * Whether a run inside a wording is a Locution of its own (#1241 round 4):
 * its test is a whole phrase that keeps its fixed meaning outside this
 * wording, since a plain run inside an idiom weighed as high as a real one
 * under the old wording, whose example (vor allem) also primed one. With
 * the Reading's definition in the state, that meaning is the one the run
 * has inside the whole, which the definition gives (ADR 0050, the user on
 * #1241, 2026-10-30): an emoji can't carry it.
 */
export const locutionQuestion = (key: string, reads: string, defined = false) =>
	`Inside \`${key}\`, is "${reads}" a fixed expression that dictionaries list as a headword or idiom of its own, used apart from \`${key}\` (auf jeden Fall)? Test it: it must be a whole phrase that can stand alone in other sentences with this same fixed meaning${defined ? `, the one it has inside \`${key}\`, whose meaning \`definition\` gives` : ""}. Answer no for ordinary words that just combine here, for words cut out of a longer phrase, and for words fixed only inside this expression (ins Gras in ins Gras beißen).`;
