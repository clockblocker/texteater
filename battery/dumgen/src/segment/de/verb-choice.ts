/**
 * The Verb Choice (#851, D4): one follow-up request, `verb`, for the verb
 * satellites whose grouping a dumcorpus Rule decides from the sense, which
 * the `candidates` request's slot questions don't ask. The auxiliary slot
 * asks for a perfect, future or passive auxiliary, so it misses causative
 * lassen and the recipient passive and has no state reading; the reflexive
 * and expletive slots name no alternation or position test. Code flags each
 * satellite whose slot names a host (`flaggedVerbs`), and the judge answers
 * one Choice per flag, worded from its Rule:
 *
 * - `lassen` (de/causative-lassen, ADR 0026): an AUX lassen form with an
 *   infinitive is causative (joins it), the modal passive sich lassen
 *   (joins its sich), or lassen with a doer named or letting (apart).
 * - `recipient` (de/recipient-passive): an AUX bekommen, kriegen or
 *   erhalten form with a participle is the recipient passive (joins it), or
 *   resultative or lexical (apart).
 * - `state` (de/sein-perfect-or-copula, de/verbal-participle, ADR 0036):
 *   haben or sein with a participle reports the event (joins it) or
 *   describes a state (apart). Haben that the sentence can't settle joins as
 *   the perfect (#725, de/unresolved-over-repair). A sein form also asks
 *   which auxiliary the participle's verb takes in its perfect, since sein
 *   is a perfect only when that is sein: a haben answer splits whatever the
 *   event answer says, so Sein bisschen Geld ist schnell ausgegeben gives
 *   [ist] and [ausgegeben] (ausgeben has hat ausgegeben), where the event
 *   question heard a perfect at 0.6.
 * - `expletive` (de/expletive-es-joins-its-verb): es that its verb selects
 *   and that refers to nothing joins the verb, weather and time es with
 *   sein included; positional, anticipatory and referential es stay apart.
 * - `reflexive` (de/verb-owns-its-scattered-members): a reflexive the sense
 *   needs joins its verb; one an ordinary object could replace, a dative
 *   and a reciprocal stay apart.
 *
 * An answer moves membership only past the floor, and `other` never does,
 * so an unclear flag keeps the judge's slot answer. A split drops only the
 * satellite link between the two pieces; a join never reaches a Saying or
 * a piece a code rule decides. The request depends on the nomination and
 * the families asked, so settings that differ only in floor or applied
 * families read the same answers. A Sentence with no flag asks nothing.
 *
 * On dev (#851) the expletive and reflexive families mostly re-asked what
 * their slots ask and lost as many units as they won (wandte sich read
 * lexical at 0.91, es herrschte selected at 0.92); production asks the
 * other three.
 */

import type { Questions } from "@typesafe-ai/sdk";
import {
	authoredRealizations,
	closedVerbForms,
	closedVerbParticiples,
} from "dumcorpus/inventories";
import * as Effect from "effect/Effect";
import {
	type Answers,
	type Ask,
	type AskFailure,
	askAny,
	choice,
} from "../ask.js";
import type { AssembledEdge, Membership } from "./assembly.js";
import {
	expletiveForms,
	foldedText,
	reflexiveForms,
	reflexiveSubject,
} from "./candidates.js";
import { boundPieces, type CodeRule } from "./code-rules.js";
import { type Nomination, slotId } from "./nomination.js";
import { argmax, partitionOf } from "./partition.js";
import type { Piece } from "./sentence.js";

export const verbFamilies = [
	"lassen",
	"recipient",
	"state",
	"expletive",
	"reflexive",
] as const;

export type VerbFamily = (typeof verbFamilies)[number];

/** How the Verb Choice's answers move membership. */
export type VerbSettings = {
	/** The share an answer needs before it joins or splits. */
	readonly floor: number;
	/** The families whose answers apply. */
	readonly families: readonly VerbFamily[];
};

/** The setting D4 pre-registered: every family at 0.6. */
export const verbSettings: VerbSettings = {
	floor: 0.6,
	families: verbFamilies,
};

/** One flagged satellite and the host its slot named. */
export type VerbFlag = {
	readonly family: VerbFamily;
	readonly piece: number;
	readonly host: number;
};

const lower = (piece: Piece) => piece.text.toLowerCase();

/** The spellings of one authored AUX Lemma. */
const auxiliaryForms = (lemma: string): ReadonlySet<string> =>
	new Set(
		authoredRealizations
			.filter(
				({ member }) =>
					member.lemma.kind === "AUX" &&
					member.lemma.canonicalForm === lemma,
			)
			.map(({ spelled }) => spelled.toLowerCase()),
	);

let lassenForms: ReadonlySet<string> | undefined;
let bekommenForms: ReadonlySet<string> | undefined;

const seinForms: ReadonlySet<string> = new Set(closedVerbForms.sein ?? []);

/** haben and sein forms that can carry a perfect; their participles are hosts' business (`sein-chain`). */
export const perfectAuxiliaries: ReadonlySet<string> = new Set(
	[...(closedVerbForms.haben ?? []), ...(closedVerbForms.sein ?? [])].filter(
		(form) =>
			!closedVerbParticiples.haben.includes(form) &&
			!closedVerbParticiples.sein.includes(form),
	),
);

/** Verb forms that are never the participle a haben or sein serves: modals, auxiliaries, lassen. */
function closedVerbForm(word: string): boolean {
	lassenForms ??= auxiliaryForms("lassen");
	return (
		lassenForms.has(word) ||
		Object.values(closedVerbForms).some((forms) => forms.includes(word))
	);
}

/** The slot's most probable host other than `none`, at `floor` or above. */
function slotHost(
	nomination: Nomination,
	kind: "auxiliary" | "reflexive" | "expletive",
	piece: Piece,
	floor: number,
): Piece | undefined {
	const slot = nomination.slots.find(
		(candidate) =>
			candidate.kind === kind && candidate.piece.id === piece.id,
	);
	const answer = slot ? nomination.first[slotId(slot)] : undefined;
	if (answer?.type !== "choice") return undefined;
	const top = argmax(
		Object.fromEntries(
			Object.entries(answer.probabilities).filter(
				([key]) => key !== "none",
			),
		),
	);
	if (!top.key || top.share < floor) return undefined;
	return nomination.sentence.pieces[Number(top.key.slice(1)) - 1];
}

/** A host share that flags an auxiliary or reflexive slot. */
const hostFlag = 0.1;
/** Expletive es: any named verb, since weather and time es with sein is heard near zero. */
const expletiveFlag = 0.02;

const lowercase = (piece: Piece) => /^\p{Ll}/u.test(piece.text);

/**
 * A Partizip II's shape: ge- inside the word, an inseparable prefix, or
 * -iert. It only narrows what the `state` family asks: a copula's
 * adjective (krank, tot, fertig) is no participle.
 */
const participleShape =
	/^(\p{Ll}*ge\p{Ll}{2,}(t|en|n)|(be|ver|er|ent|zer|emp|miss|über|unter|hinter|wider|voll|durch)\p{Ll}{2,}(t|en|n)|\p{Ll}+iert)$/u;

/** The satellites whose slot named a host, one flag each, from the nomination alone. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
function flaggedVerbs(nomination: Nomination): VerbFlag[] {
	lassenForms ??= auxiliaryForms("lassen");
	bekommenForms ??= auxiliaryForms("bekommen");
	const { pieces } = nomination.sentence;
	const flags: VerbFlag[] = [];
	const lassenClauses = new Set<number>();
	for (const piece of pieces) {
		const word = lower(piece);
		const auxiliary = (family: VerbFamily) => {
			const host = slotHost(nomination, "auxiliary", piece, hostFlag);
			if (
				host &&
				lowercase(host) &&
				!closedVerbForm(lower(host)) &&
				(family !== "state" || participleShape.test(lower(host)))
			) {
				flags.push({ family, piece: piece.id, host: host.id });
				return true;
			}
			return false;
		};
		if (lassenForms.has(word)) {
			if (auxiliary("lassen")) lassenClauses.add(piece.clause);
		} else if (bekommenForms.has(word)) auxiliary("recipient");
		else if (perfectAuxiliaries.has(word)) auxiliary("state");
	}
	for (const piece of pieces) {
		const word = lower(piece);
		if (
			expletiveForms.has(foldedText(piece)) &&
			piece.surface.toLowerCase() === "es"
		) {
			const host = slotHost(
				nomination,
				"expletive",
				piece,
				expletiveFlag,
			);
			if (host)
				flags.push({
					family: "expletive",
					piece: piece.id,
					host: host.id,
				});
		}
		if (
			!reflexiveForms.has(foldedText(piece)) ||
			lassenClauses.has(piece.clause)
		)
			continue;
		// The subject a non-sich reflexive needs in its clause, as the
		// `pronoun` code rule reads it.
		const subject = reflexiveSubject.get(word);
		if (
			subject &&
			!pieces.some(
				(other) =>
					other.clause === piece.clause && lower(other) === subject,
			)
		)
			continue;
		const host = slotHost(nomination, "reflexive", piece, hostFlag);
		if (host && !lassenForms.has(lower(host)))
			flags.push({ family: "reflexive", piece: piece.id, host: host.id });
	}
	return flags;
}

const verbId = (flag: VerbFlag) =>
	`v_${flag.family}_${flag.piece}_${flag.host}`;

/** The perfect-auxiliary question of a `state` flag on a sein form. */
const perfectAuxiliaryId = (flag: VerbFlag) =>
	`v_perfect-auxiliary_${flag.piece}_${flag.host}`;

/** Whether a flag asks the perfect-auxiliary question: a `state` flag on a sein form. */
const asksPerfectAuxiliary = (nomination: Nomination, flag: VerbFlag) =>
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
function verbQuestions(
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

/** What the `verb` request was asked and answered. */
export type VerbAnswers = {
	readonly flags: readonly VerbFlag[];
	readonly answers: Answers;
};

/** Asks the `verb` request about the flags of `families`, every family unless given. */
export const askVerbChoice = Effect.fnUntraced(function* (
	nomination: Nomination,
	ask: Ask,
	families: readonly VerbFamily[] = verbFamilies,
): Effect.fn.Return<VerbAnswers, AskFailure> {
	const flags = flaggedVerbs(nomination).filter((flag) =>
		families.includes(flag.family),
	);
	const answers = yield* askAny(ask, {
		stage: "verb",
		state: nomination.state,
		questions: verbQuestions(nomination, flags),
	});
	return { flags, answers };
});

type Action =
	| { readonly join: readonly [number, number] }
	| { readonly split: readonly [number, number] }
	| undefined;

/** The nearest sich in the piece's clause: the modal passive's reflexive. */
function clauseSich(nomination: Nomination, id: number): number | undefined {
	const piece = nomination.sentence.pieces[id - 1];
	return nomination.sentence.pieces
		.filter(
			(other) =>
				other.clause === piece?.clause && lower(other) === "sich",
		)
		.sort((a, b) => Math.abs(a.id - id) - Math.abs(b.id - id))[0]?.id;
}

/** What one answered flag does under the floor. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
function actionOf(
	nomination: Nomination,
	flag: VerbFlag,
	answers: Answers,
	floor: number,
): Action[] {
	const answer = answers[verbId(flag)];
	if (answer?.type !== "choice") return [];
	const shares = answer.probabilities;
	const share = (...keys: string[]) =>
		keys.reduce((total, key) => total + (shares[key] ?? 0), 0);
	const pair = [flag.piece, flag.host] as const;
	switch (flag.family) {
		case "lassen": {
			if (share("causative") >= floor) return [{ join: pair }];
			if (share("modal") >= floor) {
				const sich = clauseSich(nomination, flag.piece);
				return sich === undefined
					? []
					: [{ join: [flag.piece, sich] }, { split: pair }];
			}
			return share("doer") >= floor ? [{ split: pair }] : [];
		}
		case "recipient":
			if (share("recipient") >= floor) return [{ join: pair }];
			return share("resultative", "lexical") >= floor
				? [{ split: pair }]
				: [];
		case "state": {
			const haben = (closedVerbForms.haben ?? []).includes(
				nomination.sentence.pieces[
					flag.piece - 1
				]?.text.toLowerCase() ?? "",
			);
			if (share("state") >= floor) return [{ split: pair }];
			// de/sein-perfect-or-copula: sein is no perfect of a verb whose perfect takes haben.
			const auxiliary = answers[perfectAuxiliaryId(flag)];
			if (
				asksPerfectAuxiliary(nomination, flag) &&
				auxiliary?.type === "choice" &&
				(auxiliary.probabilities.haben ?? 0) >= floor
			)
				return [{ split: pair }];
			// #725: haben with a participle the sentence can't settle is the perfect.
			return share("perfect", ...(haben ? ["open"] : [])) >= floor
				? [{ join: pair }]
				: [];
		}
		case "expletive":
			if (share("selected") >= floor) return [{ join: pair }];
			return share("positional", "anticipatory", "referential") >= floor
				? [{ split: pair }]
				: [];
		case "reflexive":
			if (share("lexical") >= floor) return [{ join: pair }];
			return share("free", "dative", "reciprocal") >= floor
				? [{ split: pair }]
				: [];
	}
}

const pairKey = (a: number, b: number) => `${Math.min(a, b)},${Math.max(a, b)}`;

/**
 * The membership with the answers past the floor applied: each split drops
 * the satellite link between its two pieces, each join links them, unless
 * a piece is in a Saying or decided by a code rule.
 */
export function withVerbChoice(
	nomination: Nomination,
	membership: Membership,
	asked: VerbAnswers,
	rules: readonly CodeRule[],
	settings: VerbSettings,
): Membership {
	const actions = asked.flags
		.filter((flag) => settings.families.includes(flag.family))
		.flatMap((flag) =>
			actionOf(nomination, flag, asked.answers, settings.floor),
		);
	if (actions.length === 0) return membership;
	const saying = new Set(
		membership.edges
			.filter((edge) => edge.source === "saying")
			.flatMap((edge) => edge.pieces),
	);
	const bound = boundPieces(nomination, membership, rules);
	const open = (id: number) => !saying.has(id) && !bound.has(id);
	const splits = new Set<string>();
	const joins: AssembledEdge[] = [];
	for (const action of actions) {
		if (!action) continue;
		if ("split" in action) splits.add(pairKey(...action.split));
		else if (action.join.every(open))
			joins.push({ pieces: action.join, source: "verb" });
	}
	const edges = [
		...membership.edges.filter(
			(edge) =>
				edge.source !== "satellite" ||
				!splits.has(pairKey(...edge.pieces)),
		),
		...joins,
	];
	return {
		...membership,
		edges,
		partition: partitionOf(
			nomination.sentence.pieces.map((piece) => piece.id),
			edges.map(({ pieces }) => pieces),
		),
	};
}
