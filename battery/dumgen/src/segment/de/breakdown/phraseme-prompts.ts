/**
 * What German `segment.inConstituents` asks about a wording's parts
 * (`constituents.ts`): the guide that closes a phraseme part's route
 * question. Its examples are no Breakdown case (#693).
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
	"Judge the part by the role it plays inside this whole expression, not by its commonest use; the route above is the whole expression's, not the part's. A word that itself opens a clause, an infinitive clause included, is SCONJ (statt in statt … zu), and a word before it that only qualifies it keeps its own Kind (immer in immer wenn stays ADV). The zu right before an infinitive is PART and that infinitive is VERB (zu bügeln), since an infinitive is NOUN only when capitalised or after an article (das Bügeln). A comparison word, wie or als, is CCONJ before a phrase or parallel word (als in mehr Schein als Sein) and SCONJ before a clause, never ADP or ADV. A preposition word (like ab, ein, um) with NO noun or pronoun complement after it is ADV, not ADP. A word that can take an inflection ending before a noun stays ADJ even when used adverbially (schnell). A capitalised common noun stays NOUN (never ADV or PROPN unless it is a unique named person or place). A word that stands for a noun phrase on its own, with no noun after it, is PRON, not DET (jeder in jeder für sich), and so is a question word asking for a thing or a person (wer), whatever follows it.";
