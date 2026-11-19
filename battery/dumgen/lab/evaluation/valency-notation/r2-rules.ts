/**
 * Round 2's rules (2026-11-19), refining `rules@r1`, the only round 1
 * revision that beat production (64.8% against 62.7% on dev, 49/33):
 *
 * - its referent rule's base rate («about half of all simple verbs»)
 *   turned verbs of a person's own movement Either, so the subject rule
 *   now asks whether a thing fills it in this same meaning, and objects
 *   default to the narrower referent, where production wrote Either for
 *   eight dev objects gold has as etw. or jmdn.;
 * - its Locution rule did not bring back the complements Collocations
 *   drop, so a Collocation now takes its noun's own government, Optional;
 * - a governed two-way preposition's case follows the preposition where
 *   German fixes it (über and auf Acc, vor Dat).
 */
import { r1Rules } from "./r1-examples.js";

const [sich, prepositionStatus] = r1Rules;

export const r2Referent =
	"A Case or Preposition complement's referent is who or what fills it in this meaning, never just what this sentence shows. A subject is jmd./etw. only when a thing, an institution, an event or a machine fills it in this same meaning as literally as a person does («der Lärm stört», «das Telefon klingelt»); it is jmd. when the meaning is a person's own movement, deed, speech or feeling («joggen», «auswandern», «lügen»), and etw. when no person can fill it («rosten»). An object is jmdn./etw. only when the dictionary gives jemanden/etwas for it; most objects are one or the other: etw. for what is noted, said, shown, given or passed on («etw. äußern», «etw. in Kauf nehmen»), jmdn. for whom an act is done to as a person («jmdn. bestehlen»).";

export const r2Collocation =
	"A Collocation of a verb and a noun («Kritik üben», «Hilfe leisten») takes every complement its noun takes, each as an Optional Slot: the noun's preposition («die Kritik an etw.»: (an jmdm./etw.)) and the person it is for («jmdm. Hilfe leisten»: (jmdm.)). An Idiom's frame holds each jemand, jemandem or etwas its dictionary entry names beyond its own words, Optional when the idiom is complete without it («mit jemandem ins Gespräch kommen»: jmd. (mit jmdm.)), and nothing the entry does not name.";

export const r2Case =
	"A governed über or auf takes Acc (über jmdn./etw., auf etw.(akk)) and a governed vor or zwischen Dat (vor jmdm./etw.); a governed an or in takes the case the dictionary gives this meaning («denken an»: Acc, «leiden an»: Dat).";

/** Round 2's rules after production's paragraphs, the referent paragraph replaced. */
export const r2Rules = {
	added: [sich, prepositionStatus, r2Collocation, r2Case] as string[],
	referent: r2Referent,
};
