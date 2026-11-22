/**
 * The Government Choice (#851, X4): one follow-up request, `government`,
 * for the prepositions whose grouping depends on valency, which the
 * `candidates` request's preposition slot asks among a dozen other
 * questions and with no test to tell a governed preposition from a free one.
 * A preposition joins the word that selects it for its complement
 * (de/governed-preposition-joins-its-governor, ADR 0034): a verb, adjective
 * or noun, or a routine formula's head word. One heading an Adverbial
 * complement of place or direction, or a free adjunct, stays its own unit,
 * since the word requires a place or direction, not that preposition
 * (ADR 0034), and a preposition the expression governs
 * for a free complement is valency, not a fixed member
 * (de/fixed-member-test). Code flags (`government-flags.ts`), and the judge
 * answers one Choice per flag, worded as E-VALBU tests valency: does a
 * wo(r)- question ask for the phrase and a da(r)- word replace it, or would
 * another place or direction word do?
 *
 * - `joined`: a preposition the slot joined to its host.
 * - `particle`: a preposition-shaped particle the slot joined to a verb
 *   while an article, pronoun or noun right after it may open its phrase
 *   (stellt die Kiste vor die Tür).
 * - `rival`: a preposition whose slot named a host past the floor that
 *   another link took (sehnen sich nach Monaten … nach Ruhe), and the twin
 *   of a host spelled the same and nearer (Danke, danke für).
 * - `weak`: a preposition alone whose slot named a host under the floor.
 * - `literal`: an idiom unit that took in a member noun's preposition
 *   (de/idiom): the same words used literally are separate units, nimmt
 *   das Kind auf den Arm, the preposition included.
 * - `duel`: one host flagged with the same preposition twice. A Preposition
 *   complement appears at most once in a frame (ADR 0034), so the judge
 *   picks the phrase that is the complement (sehnen sich nach Monaten …
 *   nach Ruhe), and its answer settles both flags, except that a winner
 *   its own Choice reads free is split.
 *
 * A split drops only the satellite link between the preposition and its
 * host, or for `literal` the idiom unit's expression links and the
 * prepositions they absorbed. A join never reaches a piece in a Saying or
 * one a code rule decides. An answer moves membership only past the floor,
 * and the last option of each Choice never does. The request depends on
 * the nomination and the membership it is asked over, so settings that
 * differ only in floor or applied families read the same answers. A
 * Sentence with no flag asks nothing.
 */

import type { Questions } from "@typesafe-ai/sdk";
import type * as Effect from "effect/Effect";
import { type Answers, type Ask, type AskFailure, choice } from "../ask.js";
import { askPlan, type Plan } from "../stage-graph.js";
import {
	type AssembledEdge,
	type Membership,
	openPiecePredicate,
} from "./assembly.js";
import { fusedSiblings, nounLike } from "./candidates.js";
import { boundPieces, type CodeRule } from "./code-rules.js";
import { wordingOf } from "./fixed-member.js";
import {
	flaggedPrepositions,
	type GovernmentFamily,
	type GovernmentFlag,
	governmentFamilies,
} from "./government-flags.js";
import type { Nomination } from "./nomination.js";
import {
	argmaxBesideNone,
	pairKey,
	partitionOf,
	pieceGroupMap,
} from "./partition.js";
import type { Piece } from "./sentence.js";

export {
	type GovernmentFamily,
	governmentFamilies,
} from "./government-flags.js";

/** How the Government Choice's answers move membership. */
export type GovernmentSettings = {
	/** The share an answer needs before it joins or splits. */
	readonly floor: number;
	/** The families whose answers apply. */
	readonly families: readonly GovernmentFamily[];
};

/**
 * The setting X4 pre-registered for full dev after the focus screen of v2
 * (#851): the joined, particle, rival and literal families at 0.5. On
 * focus, 0.6 held +4 −0 and left free answers of 0.5 to 0.6 unused, while
 * `weak` won nothing and broke 2 units at 0.5.
 */
export const governmentSettings: GovernmentSettings = {
	floor: 0.5,
	families: ["joined", "particle", "rival", "literal"],
};

const governmentId = (flag: GovernmentFlag) =>
	flag.family === "duel"
		? `g_duel_${flag.host}_${(flag.rivals ?? []).join("_")}`
		: `g_${flag.family}_${flag.piece}_${flag.host}`;

/** The Choice for the preposition families; its last option moves nothing. */
const governedCriteria = {
	governed:
		"Governed: the word selects this very preposition in this sense, a prepositional complement as E-VALBU counts it. Its stand-in is da(r)- with the preposition (darauf, davon), never dort or dorthin, and with another preposition the word would lose this sense or the sentence would break (denkt an ihre Mutter, not *denkt zu ihrer Mutter; achtet auf den Verkehr; abhängig von seinen Eltern; die Hoffnung auf Frieden; danke für die Blumen)",
	fixed: "Fixed: the preposition is a fixed word of an idiom or collocation the word belongs to here, and an ordinary synonym would break it (auf dem Holzweg sein, zur Sprache bringen)",
	place: "Place or direction: the word needs or allows a place, a direction or a level, an adverbial complement as E-VALBU counts it, and the preposition only says which one. Its stand-in is dort, dorthin, dahin or daher, and another preposition of place or direction fits with the same sense of the word (schaut auf das Meer: schaut zum Horizont, schaut dorthin; legt den Schlüssel unter die Matte; wohnt in Rostock). After a verb of looking or moving, a phrase that says where the look or the movement goes is place, whatever its preposition: blickt auf die Uhr (blickt dorthin), springt auf den Tisch, fährt an den See",
	adjunct:
		"Free adjunct: time, cause, purpose, manner, means, agent, accompaniment, or the case or circumstance something holds in; the word does not ask for it, and it could be added to almost any clause (nach dem Konzert, seit Dienstag, wegen des Streiks, mit dem Fahrrad, durch einen Tunnel verbunden, bei Kindern, für ihre Freundin)",
	elsewhere:
		"Elsewhere: another word of the sentence governs the preposition, it is part of a two-part preposition or circumposition (um … willen, von … an), or the word takes no preposition at all",
	particle:
		"No preposition: it is the separable particle of the word, a verb standing apart from it, and has no phrase of its own (hört mit dem Rauchen auf, macht die Tür auf)",
};

/** The Choice for an idiom unit; its last option moves nothing. */
const literalCriteria = {
	literal:
		"Literal: the words mean what they say here, the action and the place or thing are real ones (greift dem Kind unter die Arme, um es hochzuheben; legt das Baby ins Bettchen)",
	none: "No idiom: the words form no established expression with this verb",
	idiom: "An idiom: an established expression whose meaning here is not the sum of its words (jemandem unter die Arme greifen 'help'; aus der Haut fahren 'lose one's temper'), also when one of its words is changed or played on",
};

const personalPronouns = new Set(
	"ich mich mir du dich dir er ihn ihm sie es ihr wir uns euch ihnen sich man".split(
		" ",
	),
);

/**
 * The phrase a preposition may open: it and the pieces after it in its
 * clause, up to the first noun, number or personal pronoun, at most six.
 */
function phraseOf(nomination: Nomination, piece: Piece): readonly number[] {
	const { pieces } = nomination.sentence;
	const ids = [piece.id];
	for (const next of pieces.slice(piece.id, piece.id + 5)) {
		if (next.clause !== piece.clause) break;
		ids.push(next.id);
		if (
			nounLike(next) ||
			/^\p{N}/u.test(next.text) ||
			personalPronouns.has(next.word.toLowerCase())
		)
			return ids;
	}
	return [piece.id];
}

/** The `government` request's questions: a Choice per flag. */
function governmentQuestions(
	nomination: Nomination,
	membership: Membership,
	flags: readonly GovernmentFlag[],
): Questions {
	const { sentence, ref } = nomination;
	const groupOf = pieceGroupMap(membership.partition);
	const siblings = fusedSiblings(sentence);
	const questions: Questions = {};
	for (const flag of flags) {
		const piece = sentence.pieces[flag.piece - 1];
		const host = sentence.pieces[flag.host - 1];
		if (!piece || !host) continue;
		if (flag.family === "literal") {
			const unit = groupOf.get(flag.host) ?? [flag.host];
			const noun = sentence.pieces[(flag.noun ?? 0) - 1];
			questions[governmentId(flag)] = choice(
				`In \`sentence\`, the verb ${ref(host)} and the phrase opened by ${ref(piece)}${noun ? ` with ${ref(noun)}` : ""} were read as one idiom, "${wordingOf(nomination, unit)}". Are these words used as that idiom here?`,
				literalCriteria,
			);
			continue;
		}
		if (flag.family === "duel") {
			questions[governmentId(flag)] = choice(
				`In \`sentence\`, ${ref(host)} takes at most one complement with the preposition "${piece.text}". Which of these phrases is that complement?`,
				{
					...Object.fromEntries(
						(flag.rivals ?? []).map((id) => {
							const rival = sentence.pieces[id - 1];
							return [
								`p${id}`,
								rival
									? `"${wordingOf(nomination, phraseOf(nomination, rival))}", opened by ${ref(rival)}`
									: `p${id}`,
							];
						}),
					),
					none: `Neither: ${ref(host)} governs none of them, as when a phrase only says where a look or a movement goes (blickt auf die Uhr, springt auf den Tisch)`,
				},
			);
			continue;
		}
		// The host's unit names a verb with its particle (geht … hinaus),
		// without the prepositions asked about and their fused pieces.
		const asked = new Set(
			flags
				.filter(
					(other) =>
						other.host === flag.host && other.family !== "duel",
				)
				.flatMap((other) => siblings.get(other.piece) ?? [other.piece]),
		);
		const unit = (groupOf.get(flag.host) ?? [flag.host]).filter(
			(id) => !asked.has(id),
		);
		const named =
			unit.length > 1
				? `${ref(host)} (in "${wordingOf(nomination, unit)}")`
				: ref(host);
		const phrase = phraseOf(nomination, piece);
		const opens =
			phrase.length > 1
				? ` ${ref(piece)} may open "${wordingOf(nomination, phrase)}".`
				: "";
		questions[governmentId(flag)] = choice(
			`In \`sentence\`,${opens} Does ${named} govern the preposition ${ref(piece)} here, or is ${ref(piece)} free?`,
			governedCriteria,
		);
	}
	return questions;
}

/** What the `government` request was asked and answered. */
export type GovernmentAnswers = {
	readonly flags: readonly GovernmentFlag[];
	readonly answers: Answers;
};

/** The `government` request over the prepositions of `families` in `membership`. */
export function governmentPlan(
	nomination: Nomination,
	membership: Membership,
	rules: readonly CodeRule[],
	families: readonly GovernmentFamily[] = governmentFamilies,
): Plan<GovernmentAnswers> {
	const flags = flaggedPrepositions(nomination, membership, rules).filter(
		(flag) => families.includes(flag.family),
	);
	return {
		questions: governmentQuestions(nomination, membership, flags),
		read: (answers) => ({ flags, answers }),
	};
}

/** Asks the `government` request on its own. */
export const askGovernmentChoice = (
	nomination: Nomination,
	membership: Membership,
	ask: Ask,
	rules: readonly CodeRule[],
	families: readonly GovernmentFamily[] = governmentFamilies,
): Effect.Effect<GovernmentAnswers, AskFailure> =>
	askPlan(
		ask,
		{ stage: "government", state: nomination.state },
		governmentPlan(nomination, membership, rules, families),
	);

type Action =
	| { readonly join: readonly [number, number] }
	| { readonly split: readonly [number, number] }
	| { readonly literal: GovernmentFlag }
	| { readonly duel: GovernmentFlag; readonly winner: number };

/** What one answered flag does under the floor. */
function actionOf(
	flag: GovernmentFlag,
	shares: Readonly<Record<string, number>>,
	floor: number,
): Action | undefined {
	const share = (...keys: string[]) =>
		keys.reduce((total, key) => total + (shares[key] ?? 0), 0);
	const pair = [flag.piece, flag.host] as const;
	const free = share("place", "adjunct", "elsewhere");
	switch (flag.family) {
		case "joined":
		case "particle":
			return free >= floor ? { split: pair } : undefined;
		case "rival":
		case "weak":
			return share("governed") >= floor ? { join: pair } : undefined;
		case "literal":
			return share("literal", "none") >= floor
				? { literal: flag }
				: undefined;
		case "duel": {
			const top = argmaxBesideNone(shares);
			return top && top.share >= floor
				? { duel: flag, winner: Number(top.key.slice(1)) }
				: undefined;
		}
	}
}

/**
 * The membership with the answers past the floor applied: a split drops
 * the satellite link between the preposition and its host; a join links
 * them unless either is in a Saying or decided by a code rule; a literal
 * idiom unit loses its expression links and the prepositions and fused
 * pieces they absorbed. A unit no expression link holds any longer is a
 * Lexeme.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function withGovernmentChoice(
	nomination: Nomination,
	membership: Membership,
	asked: GovernmentAnswers,
	rules: readonly CodeRule[],
	settings: GovernmentSettings,
): Membership {
	const actions = asked.flags
		.filter((flag) => settings.families.includes(flag.family))
		.flatMap((flag) => {
			const answer = asked.answers[governmentId(flag)];
			const action =
				answer?.type === "choice"
					? actionOf(flag, answer.probabilities, settings.floor)
					: undefined;
			return action ? [action] : [];
		});
	if (actions.length === 0) return membership;
	const groupOf = pieceGroupMap(membership.partition);
	const bound = boundPieces(nomination, membership, rules);
	const open = openPiecePredicate(membership.edges, bound);
	const splits = new Set<string>();
	const literal = new Set<number>();
	const joins: AssembledEdge[] = [];
	const { pieces } = nomination.sentence;
	const spelled = (id: number) => pieces[id - 1]?.word.toLowerCase();
	const siblings = fusedSiblings(nomination.sentence);
	// A settled duel decides which of its prepositions the host may take
	// before any other answer; the winner's own Choice still says whether
	// the host governs it, so a winner read free is split (blickt auf die
	// Uhr: the duel picks auf die Uhr, its Choice reads place, #1341).
	const free = new Set(
		actions.flatMap((action) =>
			"split" in action ? [pairKey(...action.split)] : [],
		),
	);
	const settled = new Set<string>();
	for (const action of actions) {
		if (!("duel" in action)) continue;
		const { host, rivals = [] } = action.duel;
		for (const id of rivals) {
			const key = pairKey(id, host);
			settled.add(key);
			if (id !== action.winner || free.has(key)) splits.add(key);
			else if (open(id) && open(host))
				joins.push({ pieces: [id, host], source: "government" });
		}
	}
	for (const action of actions) {
		if ("duel" in action) continue;
		if ("split" in action) {
			if (!settled.has(pairKey(...action.split)))
				splits.add(pairKey(...action.split));
		} else if ("join" in action) {
			if (
				!action.join.every(open) ||
				settled.has(pairKey(...action.join))
			)
				continue;
			const [piece, host] = action.join;
			joins.push({ pieces: action.join, source: "government" });
			// One governor: a nearer twin takes the preposition from the farther one (Danke, danke für).
			for (const edge of membership.edges)
				if (
					edge.source === "satellite" &&
					edge.pieces[0] === piece &&
					edge.pieces[1] !== host &&
					spelled(edge.pieces[1]) === spelled(host)
				)
					splits.add(pairKey(...edge.pieces));
		} else {
			const { piece, host } = action.literal;
			for (const id of groupOf.get(host) ?? []) literal.add(id);
			// de/idiom: used literally, the words are separate units, the preposition too.
			for (const id of siblings.get(piece) ?? [piece])
				splits.add(pairKey(id, host));
		}
	}
	const absorbed = (edge: AssembledEdge) =>
		edge.source === "expression" ||
		edge.source === "preposition" ||
		edge.source === "sibling";
	const edges = [
		...membership.edges.filter(
			(edge) =>
				!(
					edge.source === "satellite" &&
					splits.has(pairKey(...edge.pieces))
				) &&
				!(absorbed(edge) && edge.pieces.every((id) => literal.has(id))),
		),
		...joins,
	];
	const partition = partitionOf(
		nomination.sentence.pieces.map((piece) => piece.id),
		edges.map(({ pieces }) => pieces),
	);
	const multiword = new Set(
		edges
			.filter(
				(edge) =>
					edge.source === "expression" ||
					edge.source === "locution" ||
					edge.source === "saying" ||
					edge.source === "pair",
			)
			.flatMap((edge) => edge.pieces),
	);
	return {
		...membership,
		edges,
		partition,
		familyOf: (group) =>
			group.some((id) => literal.has(id)) &&
			!group.some((id) => multiword.has(id))
				? "Lexeme"
				: membership.familyOf(group),
	};
}
