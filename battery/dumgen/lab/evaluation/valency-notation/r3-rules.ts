/**
 * Round 3's rules (2026-11-19), refining `rules@r2` (66.1% against
 * production's 63.0% on dev, 90/42): r2's Optional default for prepositions
 * spread to objects («auf der Nase herumtanzen» lost its Required jmdm.),
 * and its Collocation rule brought back almost none of the complements
 * Collocations drop when the sentence does not show them. A second
 * revision asks without the sentence at all, the Emoji Description alone
 * naming the meaning.
 */
import { r1Rules } from "./r1-examples.js";
import { r2Case, r2Rules } from "./r2-rules.js";

const sich = r1Rules[0] as string;

export const r3PrepositionStatus =
	"Most prepositional Slots are Optional: one is Required only when the word without it is ungrammatical or means something else («bestehen aus», «sich kümmern um»), and a Locution's prepositional Slot is almost always Optional («Kritik üben»: jmd./etw. (an jmdm./etw.)). The default is for prepositions only: an object is Required whenever the word is incomplete without it, a Locution's too («jemandem die Leviten lesen»: jmd. jmdm.).";

export const r3Collocation =
	"A Collocation of a verb and a noun («Kritik üben», «Hilfe leisten») takes every complement its noun takes, each as an Optional Slot: the noun's preposition («die Kritik an etw.»: (an jmdm./etw.)) and the person it is for («jmdm. Hilfe leisten»: (jmdm.)). The sentence seldom shows them: take them from the noun, not from the sentence («Sie übt Kritik.»: jmd./etw. (an jmdm./etw.)). An Idiom's frame holds each jemand, jemandem or etwas its dictionary entry names beyond its own words, Optional when the idiom is complete without it («mit jemandem ins Gespräch kommen»: jmd. (mit jmdm.)), and nothing the entry does not name.";

export const r3Rules = {
	added: [sich, r3PrepositionStatus, r3Collocation, r2Case],
	referent: r2Rules.referent,
};

/** What replaces the evidence paragraph when Luna sees no sentence. */
export const r3NoSentence =
	"You see the Reading alone, without a sentence: write the frame its meaning has in every sentence.";

/** Production's input without the marked sentence. */
export const withoutSentence = (input: unknown): unknown => {
	if (typeof input !== "object" || input === null) return input;
	const { markedSentence: _, ...rest } = input as Record<string, unknown>;
	return rest;
};
