/**
 * The wording of nomination's questions (`nomination.ts`) and their ids:
 * `candidates`' slot, pair and fixedness questions, and
 * `final`'s re-asked idiom hosts, so … daß, Saying Choice and was … für.
 * They are worded byte for byte as the lab sent them, so cached answers
 * replay; the reflexive slot question is the exception, reworded on #1285.
 */
import type { Questions } from "@typesafe-ai/sdk";
import { choice, noul } from "../ask.js";
import {
	idiomHosts,
	type Slot,
	type SlotKind,
	wasFuerId,
	wasFuerPairs,
} from "./candidates.js";
import {
	oldSpellingCorrelators,
	type PairCandidate,
} from "./pair-candidates.js";
import { sayingSpans } from "./saying-spans.js";
import type { Reference, Sentence } from "./sentence.js";

const slotQuestion: Record<SlotKind, (piece: string) => string> = {
	idiom: (piece) =>
		`In \`sentence\`, is ${piece} a fixed part of an idiom or a support-verb collocation together with a verb (den Faden verlieren, den Kopf in den Sand stecken, eine Entscheidung treffen, Kritik üben, einen Antrag stellen, zur Verfügung stellen, Angst haben)? If so, which piece is that verb? Choose none for an ordinary noun the verb merely takes as its object or complement, and for a name.`,
	article: (piece) =>
		`In \`sentence\`, ${piece} is the article der/die/das/ein of a noun phrase. Which piece is the head of that phrase: its noun, or the word standing in for an elided noun? Choose none if ${piece} is not an article here but a pronoun (relative or demonstrative der, die, das) or a numeral.`,
	particle: (piece) =>
		`In \`sentence\`, is ${piece} the separable particle of a verb standing apart from it (zog … an, kam … zurück)? If so, which piece is that verb? Choose none if it is a preposition, an adverb or anything else.`,
	auxiliary: (piece) =>
		`In \`sentence\`, is ${piece} an auxiliary that forms the perfect, future or passive of another verb (hat … gegessen, ist … gekommen, wird … gebaut, wird … kommen, ist … verleumdet worden)? If so, which piece is the participle or infinitive it combines with? Only in hat … schreiben müssen, where an infinitive-shaped modal stands for the participle, choose the modal. Choose none if ${piece} is a full verb here: a copula before an adjective or noun, possession, or becoming.`,
	/**
	 * de/verb-owns-its-scattered-members: a reflexive is the verb's member
	 * when this sense needs it coreferent with the subject; one that
	 * alternates with other objects in the same sense is a PRON of its own
	 * (ADR 0052). 1st and 2nd person reflexives count, and a plain use of
	 * the verb in another sense leaves its reflexive lexical (#1285).
	 */
	reflexive: (piece) =>
		`In \`sentence\`, is ${piece} the lexical reflexive of a verb? Most verbs take a reflexive as an ordinary object, so test it: put another object (ihn, den Kunden) in its place. If the verb keeps the meaning it has in this sentence, the reflexive is an ordinary object and you choose none, even when the verb has a lexical reflexive in another sense: du rasierst dich and du rasierst den Kunden both mean shaving, ich verteidige mich and ich verteidige das Tor both mean defending, wir kaufen uns ein Buch and wir kaufen ihr ein Buch both mean buying. If the verb keeps this meaning only with the reflexive, it is lexical: sie beeilt sich, du weigerst dich; ich erinnere mich 'I remember' is lexical though ich erinnere ihn exists, since that means 'I remind him'. A lexical reflexive refers back to the subject: sich, or mich, mir, dich, dir, uns, euch beside ich, du, wir, ihr. If it is lexical, which piece is that verb? Choose none also for a reciprocal 'each other' (sie umarmen sich) and for a pronoun that does not refer to the subject (er sieht mich).`,
	expletive: (piece) =>
		`In \`sentence\`, is ${piece} a non-referential es that a verb lexically selects (es gibt, es regnet, es geht um, es handelt sich um)? If so, which piece is that verb? Choose none if it refers to something, anticipates a clause, or only fills the first position.`,
	preposition: (piece) =>
		`In \`sentence\`, does a verb, adjective or noun lexically select ${piece} as its fixed preposition (wartet auf, erinnert sich an, stolz auf, Angst vor)? If so, which piece is that word? Choose none if it is a free preposition of place, time, manner or cause, or part of a pronominal adverb.`,
};

const pairQuestion: Record<
	PairCandidate["kind"],
	(pair: PairCandidate, ref: Reference) => string
> = {
	"split-adverb": (pair, ref) =>
		`In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form the split adverb ${pair.name} (as Da … von is davon, Wo … hin is wohin)?`,
	correlator: (pair, ref) =>
		`In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form the fixed conjunction ${pair.name}?`,
	circumposition: (pair, ref) =>
		`In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form one circumposition around a phrase (von … an, an … vorbei, über … hinaus, um … willen), rather than ${ref(pair.right)} being a verb's particle or an adverb?`,
	"spelled-apart": (pair, ref) =>
		`In \`sentence\`, are ${ref(pair.left)} and ${ref(pair.right)} the preposition ${pair.name} written as two words (auf Grund des Wetters is aufgrund, mit Hilfe seines Bruders is mithilfe), rather than a preposition and a noun used literally (auf Seiten 12 bis 14)?`,
	name: (pair, ref) =>
		`In \`sentence\`, are ${ref(pair.left)} and ${ref(pair.right)} parts of one multiword proper name (Johann Wolfgang von Goethe, Tundu Lissu, New York), rather than a title or common noun next to a name, or two separate names?`,
};

export const slotId = (slot: Slot) => `s_${slot.kind}_${slot.piece.id}`;
export const fixedId = (id: number) => `f_${id}`;
export const pairId = (pair: PairCandidate) =>
	`c_${pair.left.id}_${pair.right.id}`;
export const expressionId = (a: number, b: number) => `e_${a}_${b}`;
export const reaskedIdiomId = (id: number) => `s4_idiom_${id}`;
export const correlatorId = (pair: PairCandidate) =>
	`c4_${pair.left.id}_${pair.right.id}`;
export const sayingChoiceId = (ids: readonly number[]) => `y4_${ids.join("_")}`;

export function candidateQuestions(
	sentence: Sentence,
	ref: Reference,
	slots: readonly Slot[],
	pairs: readonly PairCandidate[],
): Questions {
	const questions: Questions = {};
	for (const slot of slots)
		questions[slotId(slot)] = choice(
			slotQuestion[slot.kind](ref(slot.piece)),
			{
				...Object.fromEntries(
					slot.hosts.map((host) => [`p${host.id}`, host.text]),
				),
				none: "None of these",
			},
		);
	for (const pair of pairs)
		questions[pairId(pair)] = noul(pairQuestion[pair.kind](pair, ref));
	for (const piece of sentence.pieces)
		questions[fixedId(piece.id)] = noul(
			`In \`sentence\`, is ${ref(piece)} a fixed word of an established multiword expression: an idiom (den Faden verlieren), a support-verb collocation (zur Verfügung stellen, eine Entscheidung treffen), a fixed adverbial (zum Teil, und so weiter, auf keinen Fall), a routine formula or exclamation of several words (tut mir leid, ach je, ha ha), or a proverb or famous quotation? Answer no for a word in an ordinary free combination.`,
		);
	return questions;
}

const sayingCriteria = {
	whole: "A complete proverb, famous quotation or aphorism that people cite as a saying, in exactly this wording (Morgenstund hat Gold im Mund; Wer nichts weiß, muss alles glauben)",
	fragment:
		"The start of such a saying or a changed wording of one, standing for it (Wer im Glashaus sitzt …; Aller Anfank ist schwer with a typo)",
	plus: "A saying together with other words around it, such as the clause that introduces or comments on it",
	maxim: "A general maxim about life, stated as a timeless truth in the style of an aphorism, even if you do not know its author",
	idiom: "An ordinary sentence that only uses an idiom or fixed phrase inside it (Er ließ die Katze aus dem Sack; Sie hat den Faden verloren), not a saying",
	none: "An ordinary statement, question or description, not a saying",
};

/** What the `final` request asks beyond candidates4's questions. */
export type FinalOptions = {
	/** A Noul per was … für pair, for the `was-fuer` code rule (de/was-fuer). */
	readonly wasFuer?: boolean;
};

/**
 * The `final` request: step 0's idiom hosts and `so … daß`, and the Saying
 * Choice; with `wasFuer`, whether was … für is was für.
 */
export function finalQuestions(
	sentence: Sentence,
	ref: Reference,
	slots: readonly Slot[],
	options: FinalOptions,
): Questions {
	const questions: Questions = {};
	for (const slot of slots) {
		if (slot.kind !== "idiom") continue;
		const hosts = idiomHosts(sentence, slot.piece);
		if (hosts.length === slot.hosts.length) continue;
		questions[reaskedIdiomId(slot.piece.id)] = choice(
			`In \`sentence\`, is ${ref(slot.piece)} a fixed part of an idiom or a support-verb collocation together with a verb (den Faden verlieren, den Kopf in den Sand stecken, eine Entscheidung treffen, Kritik üben, einen Antrag stellen, zur Verfügung stellen, Angst haben)? If so, which piece is that verb? Choose none for an ordinary noun the verb merely takes as its object or complement, and for a name.`,
			{
				...Object.fromEntries(
					hosts.map((host) => [`p${host.id}`, host.text]),
				),
				none: "None of these",
			},
		);
	}
	for (const pair of oldSpellingCorrelators(sentence))
		questions[correlatorId(pair)] = noul(
			`In \`sentence\`, do ${ref(pair.left)} and ${ref(pair.right)} together form the fixed conjunction so … dass (spelled daß)?`,
		);
	for (const span of sayingSpans(sentence)) {
		const ids = span.pieces.map((piece) => piece.id);
		questions[sayingChoiceId(ids)] = choice(
			`In \`sentence\`, what is the wording "${span.text}"?`,
			sayingCriteria,
		);
	}
	if (options.wasFuer)
		for (const [was, fuer] of wasFuerPairs(sentence))
			questions[wasFuerId(was.id, fuer.id)] = noul(
				`In \`sentence\`, do ${ref(was)} and ${ref(fuer)} together form was für, asking or exclaiming what kind of thing or person (Was für ein Auto fährst du? Was hast du für ein Auto? Was sind das für Leute? Was für welche?), rather than was standing on its own and für being a preposition (Was hast du für das Buch bezahlt?)?`,
			);
	return questions;
}
