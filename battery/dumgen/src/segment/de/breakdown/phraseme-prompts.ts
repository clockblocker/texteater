/**
 * What German `segment.inConstituents` asks about a wording's parts
 * (`constituents.ts`): the guide that closes a phraseme part's route
 * question, whether a run of parts is a Locution of its own, and what
 * `sich` is to a verb. Their examples are no Breakdown case (#693).
 */

/**
 * Closes a phraseme part's route question (#1241 rounds 1 and 4): a part's
 * Kind is what the word is inside the expression, never the whole
 * expression's Kind, which the judge also reads (`kaum` in a conjunction
 * Locution stays an adverb). Kept apart from the route descriptions, which
 * are segment.inUnits's and stay shared.
 */
export const phrasemeRouteGuide =
	"Judge the part as the word it is inside this expression, not by its commonest use and not by the whole expression's Kind: the route above is the whole's, and a part keeps its own. Test it: a part that only qualifies another part of the expression keeps its own Kind, so an adverb stays ADV even when the whole works as a conjunction (immer in immer wenn). Only a word that itself opens a clause, an infinitive clause included, is SCONJ (statt in statt … zu), while the zu right before an infinitive is PART; a comparison word, wie or als, is CCONJ before a phrase and SCONJ before a clause, never ADP or ADV (als in mehr Schein als Sein); a word that stands for a noun phrase on its own, with no noun after it, is PRON, not DET (jeder in jeder für sich), and so is a question word asking for a thing or a person (wer), whatever follows it.";

/**
 * Whether a run inside a wording is a Locution of its own (#1241 round 4):
 * its test is a meaning its words don't add up to, outside this wording,
 * since a plain run inside an idiom weighed as high as a real one (no
 * floor separates them).
 */
export const locutionQuestion = (key: string, reads: string) =>
	`Inside \`${key}\`, are the words "${reads}" a fixed expression of their own, one dictionaries list as an idiom apart from \`${key}\`? Test it: used on its own in other sentences, "${reads}" must mean something its words don't add up to, as auf jeden Fall means certainly, not on each case. Answer no when the words keep their plain meanings or are cut out of a longer phrase (ins Gras in ins Gras beißen), however fixed the whole expression is.`;

/**
 * What `sich` is to a verb in a wording, judged in the sense the verb has
 * there (ADR 0050): only `lexical` joins it to the verb. Unlike a click's
 * reflexive question, there is no Sentence, so each use names its test.
 */
export const reflexiveUses = {
	free: "An object of its own: in this sense the verb also takes another person or thing in the place of sich, and the subject only happens to be the one it acts on (sich waschen: ihn waschen; sich verteidigen: sie verteidigen)",
	dative: "A dative beside another object, for whom something is done or whose body it concerns (sich die Hände reiben; sich die Zähne putzen)",
	lexical:
		"Part of the verb itself: dictionaries list the verb with sich for this sense, and nothing else can stand in its place (sich schämen, sich beeilen, sich weigern)",
	other: "sich does not belong with this verb",
};
