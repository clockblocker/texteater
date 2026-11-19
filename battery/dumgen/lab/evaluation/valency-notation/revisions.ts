/**
 * The notation prompt's revisions, each its full paragraphs and examples,
 * so a run's records name the revision they were asked under and replay
 * with it.
 *
 * - r1: the first wording.
 * - r2: after r1's misses: no ADJ(subj)/ADJ(obj) override in the prompt
 *   (r1 wrote spurious predicatives, mostly with one), no case labels, no
 *   kind names and no words of the Lemma in the answer, and two Locution
 *   examples whose fixed noun is no object (r1's commonest miss: a
 *   Locution's own noun written as jmdn./etw.). The grammars' fixed-phrase
 *   preposition is a list from r2 on (`variants.ts`). r2 adds the `lead`
 *   answer: the Lemma, a colon, then the frame.
 */
import { firstExamples, notationParagraphs, type Revision } from "./prompts.js";

const r2: Revision = {
	paragraphs: {
		...notationParagraphs,
		caseComplement:
			"A Case complement is the dictionary pronoun, whose form names case and referent: jmd. (Nom), jmdn. (Acc), jmdm. (Dat), jmds. (Gen) for Someone; etw. for Something; jmd./etw., jmdn./etw., jmdm./etw., jmds./etw. for Either. A bare etw. is Nom in a verb's subject Slot and Acc everywhere else; write etw.(dat) or etw.(gen) for those cases. The form is the case: never add a case name after a pronoun.",
		predicative:
			"A Predicative is ADJ, als ADJ or für ADJ, ADJ standing for any predicative adjective or noun; it describes the Acc object when the frame has one, else the subject. Write one only when the dictionary's pattern for this meaning names a predicative.",
		output: "Use only the complement kinds `complementKinds` names. Answer with the frame alone: only the notation's pronouns, prepositions, markers and stand-ins, never the Lemma, its fixed words, its separable prefix, a kind's name or any other word.",
		leadOutput:
			"Use only the complement kinds `complementKinds` names. Answer with one line: the Lemma's Canonical Form exactly as `reading.lemma` writes it, a colon, then the frame, whose words are only the notation's pronouns, prepositions, markers and stand-ins, never the Lemma's fixed words, its separable prefix, a kind's name or any other word.",
	},
	examples: [
		...firstExamples,
		{
			lemma: "den Braten riechen",
			emoji: "👃🕵",
			verb: true,
			frame: "jmd.",
		},
		{
			lemma: "einen Bären aufbinden",
			emoji: "🐻🤥",
			verb: true,
			frame: "jmd. jmdm.",
		},
	],
};

/**
 * r3, after r2's pattern misses: jmdn./etw. written as a default object
 * where only a thing fills the Slot, and Locutions and adjectives losing
 * the complements they govern (r2's Locution examples have none), so one
 * example of each with a complement. Its JSON guidance states the same
 * two rules for the `json-examples` control.
 */
const r3: Revision = {
	paragraphs: {
		...r2.paragraphs,
		caseComplement: `${r2.paragraphs.caseComplement} jmdn./etw. is no default object: write etw. when only a thing fills the Slot in this meaning, and jmdn. when only a person does.`,
	},
	examples: [
		...r2.examples,
		{
			lemma: "Rede und Antwort stehen",
			emoji: "🗣❓",
			verb: true,
			frame: "jmd. (jmdm.)",
		},
		{
			lemma: "abhängig",
			emoji: "🔗",
			verb: false,
			frame: "von jmdm./etw.",
		},
	],
	jsonGuidance:
		"Add a Predicative only when the dictionary's pattern for this meaning names a predicative. Either is no default referent of an object: Something when only a thing fills the Slot in this meaning, Someone when only a person does.",
};

export const revisions: Readonly<Record<string, Revision>> = {
	r1: { paragraphs: notationParagraphs, examples: firstExamples },
	r2,
	r3,
};
