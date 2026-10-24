/**
 * The code rules (`code-rules.ts`) about a verb and its bracket:
 * `bracket-particle`, `sein-chain`, `infixed-zu`, and `particle-verb`'s
 * routes, with the clauses a verb's bracket never crosses.
 */
import {
	closedVerbForms,
	closedVerbParticiples,
	germanSeparablePrefixes,
} from "dumcorpus/inventories";
import type { AssembledEdge } from "./assembly.js";
import { fusedSiblings, type SlotKind } from "./candidates.js";
import type { Decision } from "./code-rules.js";
import { type Nomination, slotId } from "./nomination.js";
import { argmaxBesideNone } from "./partition.js";
import type { FixedRoute } from "./routing.js";
import type { Piece } from "./sentence.js";

const lower = (piece: Piece) => piece.text.toLowerCase();

/** The share a satellite's host needs: production's satellite floor. */
const satelliteFloor = 0.5;

/** A piece's top host in one of its slots, when it beats none and clears the satellite floor. */
function slotHostOf(
	nomination: Nomination,
	kind: "particle" | "preposition",
	piece: Piece,
): number | undefined {
	const slot = nomination.slots.find(
		(candidate) =>
			candidate.kind === kind && candidate.piece.id === piece.id,
	);
	const answer = slot ? nomination.first[slotId(slot)] : undefined;
	if (answer?.type !== "choice") return undefined;
	const top = argmaxBesideNone(answer.probabilities);
	return top &&
		top.share >= satelliteFloor &&
		top.share > (answer.probabilities.none ?? 0)
		? Number(top.key.slice(1))
		: undefined;
}

export function bracketParticles(nomination: Nomination): Decision {
	const { pieces } = nomination.sentence;
	const clauseOf = bracketClauses(nomination);
	const last = new Map<number, number>();
	for (const piece of pieces) last.set(clauseOf.get(piece.id) ?? 0, piece.id);
	const add: [number, number][] = [];
	const dropped = new Set<string>();
	for (const late of pieces) {
		const clause = clauseOf.get(late.id);
		if (late.fusedWord || last.get(clause ?? 0) !== late.id) continue;
		const host = slotHostOf(nomination, "particle", late);
		if (host === undefined) continue;
		for (const early of pieces) {
			if (
				early.id >= late.id ||
				early.fusedWord ||
				clauseOf.get(early.id) !== clause ||
				lower(early) !== lower(late) ||
				slotHostOf(nomination, "particle", early) !== host
			)
				continue;
			add.push([late.id, host]);
			if (slotHostOf(nomination, "preposition", early) !== host)
				dropped.add(`${early.id},${host}`);
		}
	}
	return {
		add,
		drop: (edge) =>
			edge.source === "satellite" &&
			dropped.has(`${edge.pieces[0]},${edge.pieces[1]}`),
	};
}

/** The slots whose satellite belongs to a verb's own Lexeme. */
const verbSatellites: ReadonlySet<SlotKind> = new Set([
	"auxiliary",
	"reflexive",
	"expletive",
]);

/**
 * Whether a group is one verb piece, its auxiliary, reflexive and expletive
 * satellites (their slot answer names a host in the group), and exactly one
 * separable prefix that is no part of a fused word: gab … bekannt, hat …
 * bekannt gegeben, Es tut … leid. Which piece is the verb the route
 * Choice decides (`heardAsVerb`).
 */
function particleVerbShape(
	nomination: Nomination,
	group: readonly number[],
): boolean {
	const { pieces } = nomination.sentence;
	const satellites = nomination.slotAnswers.filter(
		(link) =>
			verbSatellites.has(link.kind) &&
			group.includes(link.from) &&
			group.includes(link.to),
	);
	const core = group.filter(
		(id) => !satellites.some((link) => link.from === id),
	);
	const prefixes = core.filter((id) => {
		const piece = pieces[id - 1];
		return (
			piece !== undefined &&
			!piece.fusedWord &&
			germanSeparablePrefixes.has(lower(piece))
		);
	});
	const [prefix] = prefixes;
	return (
		core.length === 2 &&
		prefixes.length === 1 &&
		!satellites.some((link) => link.to === prefix)
	);
}

/** Whether the route Choice hears a group as a verb: Lexeme VERB's share tops every other Lexeme Kind's. */
function heardAsVerb(
	shares: Readonly<Record<string, number>> | undefined,
): boolean {
	const verb = shares?.["Lexeme/VERB"] ?? 0;
	return (
		verb > 0 &&
		Object.entries(shares ?? {}).every(
			([key, share]) =>
				key === "Lexeme/VERB" ||
				!key.startsWith("Lexeme/") ||
				share < verb,
		)
	);
}

/**
 * The route of a unit the `particle-verb` rule reads as a particle verb:
 * Lexeme VERB (de/verb-owns-its-scattered-members: zog … an gives [zog, an]
 * VERB anziehen), and undefined for any other group.
 */
export function particleVerbRoutes(nomination: Nomination): FixedRoute {
	return (group, shares) =>
		particleVerbShape(nomination, group) && heardAsVerb(shares)
			? "Lexeme/VERB"
			: undefined;
}

const seinForms = new Set(closedVerbForms.sein ?? []);

/** Clause breaks a verb's bracket never crosses: brackets and quotes are inserts, not breaks. */
const bracketBreak = /[,;:.!?–—]/u;

/** Each piece's clause by `bracketBreak`, by piece id. */
export function bracketClauses(nomination: Nomination): Map<number, number> {
	const { segments, pieces } = nomination.sentence;
	const clauseAt: number[] = [];
	let clause = 0;
	for (const segment of segments) {
		if (segment.kind === "Punctuation" && bracketBreak.test(segment.text))
			clause++;
		clauseAt.push(clause);
	}
	return new Map(
		pieces.map((piece) => [piece.id, clauseAt[piece.segment] ?? 0]),
	);
}
/** Participles whose perfect sein forms: of sein, and of werden, the passive's worden included. */
export const seinParticiples: ReadonlySet<string> = new Set([
	...closedVerbParticiples.sein,
	...closedVerbParticiples.werden,
]);

export function seinChains(
	nomination: Nomination,
	edges: readonly AssembledEdge[],
): Decision {
	const { pieces } = nomination.sentence;
	const clauseOf = bracketClauses(nomination);
	const sameClause = (a: Piece, b: Piece) =>
		clauseOf.get(a.id) === clauseOf.get(b.id);
	const add: [number, number][] = [];
	const satelliteHost = new Map(
		edges
			.filter((edge) => edge.source === "satellite")
			.map((edge) => [edge.pieces[0], edge.pieces[1]]),
	);
	for (const piece of pieces) {
		const word = lower(piece);
		if (!seinParticiples.has(word)) continue;
		const chain = [piece.id];
		const before = pieces[piece.id - 2];
		if (
			word === "worden" &&
			before &&
			sameClause(before, piece) &&
			/^\p{Ll}/u.test(before.text)
		) {
			add.push([piece.id, before.id]);
			chain.push(before.id);
		}
		const auxiliary = pieces
			.filter(
				(other) =>
					sameClause(other, piece) &&
					other.id !== piece.id &&
					seinForms.has(lower(other)) &&
					!seinParticiples.has(lower(other)),
			)
			.sort(
				(a, b) => Math.abs(a.id - piece.id) - Math.abs(b.id - piece.id),
			)[0];
		if (!auxiliary) continue;
		// A sein form the judge already gave another verb stays with it.
		const host = satelliteHost.get(auxiliary.id);
		if (host !== undefined && !chain.includes(host)) continue;
		add.push([auxiliary.id, piece.id]);
	}
	return { add };
}

export function infixedZu(nomination: Nomination): Decision {
	const add: [number, number][] = [];
	for (const [id, run] of fusedSiblings(nomination.sentence)) {
		const [first, middle, last] = run;
		if (
			id !== first ||
			run.length !== 3 ||
			first === undefined ||
			last === undefined ||
			nomination.sentence.pieces[(middle ?? 0) - 1]?.text !== "zu"
		)
			continue;
		add.push([first, last]);
	}
	return { add };
}
