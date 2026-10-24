/**
 * The Verb Choice's `verb` request (`verb-choice.ts`): its question ids and
 * the wording of each family's Choice, from its Rule.
 */
import type { Questions } from "@typesafe-ai/sdk";
import { closedVerbForms } from "dumcorpus/inventories";
import { choice } from "../ask.js";
import type { Nomination } from "./nomination.js";
import type { VerbFamily, VerbFlag } from "./verb-choice.js";

const seinForms: ReadonlySet<string> = new Set(closedVerbForms.sein ?? []);

export const verbId = (flag: VerbFlag) =>
	`v_${flag.family}_${flag.piece}_${flag.host}`;

/** The perfect-auxiliary question of a `state` flag on a sein form. */
export const perfectAuxiliaryId = (flag: VerbFlag) =>
	`v_perfect-auxiliary_${flag.piece}_${flag.host}`;

/** Whether a flag asks the perfect-auxiliary question: a `state` flag on a sein form. */
export const asksPerfectAuxiliary = (nomination: Nomination, flag: VerbFlag) =>
	flag.family === "state" &&
	seinForms.has(
		nomination.sentence.pieces[flag.piece - 1]?.text.toLowerCase() ?? "",
	);

/**
 * Which auxiliary the participle's verb takes in its perfect, asked of the
 * verb rather than the clause, which a state passive makes look like a sein
 * perfect (de/sein-perfect-or-copula: sein only when the verb's perfect
 * takes sein).
 */
const perfectAuxiliaryCriteria: Record<string, string> = {
	haben: "haben: in this sense the verb takes an accusative object, is reflexive, or names an activity or a lasting situation, and no change of place or state happens to its subject (Er hat das Geld ausgegeben; Sie hat die Tür geschlossen; Er hat sich verliebt; Sie hat lange geschlafen)",
	sein: "sein: in this sense the verb names a change of place or state that happens to its subject, with no accusative object, or it is sein, bleiben, werden, geschehen or passieren (Er ist gegangen; Sie ist eingeschlafen; Der Zug ist angekommen; Er ist geblieben; Es ist geschehen)",
	either: "Either, with this sense, and nothing decides between them (Er hat getanzt or Er ist durch den Saal getanzt)",
	other: "The piece is no participle of a verb",
};

const criteria: Record<VerbFamily, Record<string, string>> = {
	lassen: {
		causative:
			"Causative lassen: someone has the action of the infinitive carried out by others, and the clause names nobody who carries it out, in no form; a dative or sich for whom it is done may stand there (Wir lassen das Dach decken; Er hat sich einen Anzug nähen lassen)",
		modal: "The modal passive sich lassen, 'can be done': the subject undergoes the action of the infinitive, and sich stands with lassen (Die Tür lässt sich nicht schließen; Das lässt sich leicht erklären)",
		doer: "The clause names who carries out the action, as an accusative, a von-phrase or in another form, or lassen lets or allows it (Sie lässt den Maler die Wand streichen; Er lässt die Kinder draußen spielen; Lass uns essen); with an infinitive that takes no object, the accusative is its doer (Er ließ den Teller fallen)",
		other: "Not lassen with this infinitive: the infinitive belongs to another verb, or lassen stands on its own (leave, stop)",
	},
	recipient: {
		recipient:
			"The recipient passive: the subject receives what is done to it or for it, and the verb adds no meaning of its own; an active clause says the same with the subject as a dative (Er bekam ein Buch geschenkt: man schenkte ihm ein Buch; Sie erhielt den Preis verliehen)",
		resultative:
			"The subject manages to bring something into the state the participle names (Er bekommt den Motor nicht gestartet: he can't get it started)",
		lexical:
			"The verb means get, receive or keep a thing, and the participle only describes that thing (Er erhielt das Paket beschädigt)",
		other: "The participle does not belong with this verb",
	},
	state: {
		perfect:
			"A perfect: the clause reports the event of the participle's verb, and a simple past would say the same (Der Zug ist abgefahren: fuhr ab; Sie hat das Fenster geöffnet: öffnete)",
		state: "A state: the participle describes, like an adjective, the state the subject or object is in, and no simple past says the same (Das Geschäft ist sonntags geschlossen; Das Museum hat montags geschlossen; Sie hatte den ganzen Film über die Arme verschränkt)",
		open: "Either reading fits, and nothing in the sentence decides between them",
		other: "The piece is no participle that this verb combines with",
	},
	expletive: {
		selected:
			"A subject es that the verb selects and that refers to nothing (es gibt, es regnet, es geht um, es klopft, wie geht es dir); the es of weather or time with sein counts too (Es ist schon spät; Es war Mitternacht)",
		positional:
			"es only fills the first position, and the real subject stands later in the clause (Es fehlten zwei Stühle; Es wartete eine Überraschung auf uns)",
		anticipatory:
			"es stands for a dass-, ob-, wenn- or infinitive clause that follows (Es ist wichtig, dass alle kommen)",
		referential:
			"es refers to a thing, person, fact or situation the text names or means (Das Auto? Es fährt wieder.)",
		object: "es is an object of the verb, not its subject (Er hat es eilig)",
		other: "es does not go with this verb",
	},
	reflexive: {
		lexical:
			"The verb needs the reflexive in this sense: it refers back to the subject, and an ordinary object in its place would change the sense or make no sense (sich schämen, sich beeilen, sich weigern, sich irren)",
		free: "An ordinary object could stand in its place with the same sense of the verb: the subject only happens to act on itself (verteidigt sich: verteidigt ihn; rasiert sich: rasiert den Kunden)",
		dative: "A dative for whom something is done, or whose body it concerns (putzt sich die Zähne; zieht sich die Jacke an; kauft sich ein Buch)",
		reciprocal: "Each other (sie küssen sich: küssen einander)",
		other: "The pronoun does not belong with this verb",
	},
};

const instruction: Record<VerbFamily, (piece: string, host: string) => string> =
	{
		lassen: (piece, host) =>
			`In \`sentence\`, ${piece} may be lassen with the infinitive ${host}. Which use is it?`,
		recipient: (piece, host) =>
			`In \`sentence\`, ${piece} may combine with the participle ${host}. Which use is it?`,
		state: (piece, host) =>
			`In \`sentence\`, ${piece} stands with the participle ${host}. Does the clause report an event or describe a state?`,
		expletive: (piece, host) =>
			`In \`sentence\`, what is ${piece} to the verb ${host}?`,
		reflexive: (piece, host) =>
			`In \`sentence\`, is the reflexive ${piece} part of the verb ${host}?`,
	};

/** The `verb` request's questions: a Choice per flag. */
export function verbQuestions(
	nomination: Nomination,
	flags: readonly VerbFlag[],
): Questions {
	const { sentence, ref } = nomination;
	const questions: Questions = {};
	for (const flag of flags) {
		const piece = sentence.pieces[flag.piece - 1];
		const host = sentence.pieces[flag.host - 1];
		if (!piece || !host) continue;
		questions[verbId(flag)] = choice(
			instruction[flag.family](ref(piece), ref(host)),
			criteria[flag.family],
		);
		if (asksPerfectAuxiliary(nomination, flag))
			questions[perfectAuxiliaryId(flag)] = choice(
				`In \`sentence\`, ${ref(host)} is the participle of a verb. In the sense it has here, which auxiliary does that verb take in its perfect, in an active clause?`,
				perfectAuxiliaryCriteria,
			);
	}
	return questions;
}
