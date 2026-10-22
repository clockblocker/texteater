/**
 * The code rules (`code-rules.ts`) the words decide: `split-adverb`,
 * `stranded-adverb`, `anchors`, `quantifier` and its routes, `pronoun`,
 * `article-head`, `was-fuer`, `binomial`, `saying-closed` and
 * `answer-apart`.
 */
import {
	authoredRealizations,
	germanConjunctionLocutions,
	germanSeparablePrefixes,
} from "dumcorpus/inventories";
import type { AssembledEdge, Membership } from "./assembly.js";
import {
	articleForms,
	foldedText,
	isArticle,
	nounLike,
	reflexiveSubject,
	splitAdverbForm,
	splitTails,
	wasFuerId,
	wasFuerPairs,
} from "./candidates.js";
import type { ClosedUnit, Decision } from "./code-rules.js";
import { bracketClauses } from "./code-rules-verbs.js";
import type { Nomination } from "./nomination.js";
import { groupKey } from "./partition.js";
import type { FixedRoute } from "./routing.js";
import type { Piece } from "./sentence.js";

const lower = (piece: Piece) => piece.text.toLowerCase();

const accepted = (nomination: Nomination) => {
	const pairs: [number, number, string][] = nomination.accepted.map(
		([left, right, kind]) => [left, right, kind],
	);
	// Step 0's old-spelling so … daß joins as a correlator (`c4_` ids).
	for (const [id, answer] of Object.entries(nomination.final))
		if (
			id.startsWith("c4_") &&
			answer.type === "noul" &&
			answer.noul >= 0.5
		) {
			const [, left, right] = id.split("_").map(Number);
			if (left && right) pairs.push([left, right, "correlator"]);
		}
	return pairs;
};

export function splitAdverbs(nomination: Nomination): Decision {
	return {
		closed: accepted(nomination)
			.filter(([, , kind]) => kind === "split-adverb")
			.map(([left, right]) => ({
				pieces: [left, right],
				family: "Lexeme",
			})),
	};
}

/**
 * The split-adverb tails that are no separable prefix (für, von, gegen, in,
 * neben, hinter, zwischen), so one left at its clause's end is stranded.
 */
export const strandedTails: ReadonlySet<string> = new Set(
	[...splitTails].filter((tail) => !germanSeparablePrefixes.has(tail)),
);

export function strandedAdverbs(nomination: Nomination): Decision {
	const { pieces } = nomination.sentence;
	const clauseOf = bracketClauses(nomination);
	const paired = new Set(
		// biome-ignore lint/complexity/noFlatMapIdentity: the flatMap drops each pair's kind; .flat() would keep it
		accepted(nomination)
			.filter(([, , kind]) => kind === "split-adverb")
			.flatMap(([left, right]) => [left, right]),
	);
	const closed: ClosedUnit[] = [];
	for (const tail of pieces) {
		const clause = clauseOf.get(tail.id);
		if (
			!strandedTails.has(lower(tail)) ||
			tail.fusedWord ||
			paired.has(tail.id) ||
			pieces.some(
				(other) =>
					other.id > tail.id && clauseOf.get(other.id) === clause,
			)
		)
			continue;
		const head = pieces
			.filter(
				(other) =>
					other.id < tail.id &&
					clauseOf.get(other.id) === clause &&
					!other.fusedWord &&
					splitAdverbForm(lower(other), lower(tail)) !== undefined,
			)
			.at(-1);
		if (head && !paired.has(head.id))
			closed.push({ pieces: [head.id, tail.id], family: "Lexeme" });
	}
	return { closed };
}

/** The anchors right after a correlator's own two: nicht nur … sondern auch, sowohl … als auch. */
const extraAnchors: Readonly<
	Record<string, readonly (readonly [string, string])[]>
> = {
	"nicht nur … sondern auch": [
		["nicht", "nur"],
		["sondern", "auch"],
	],
	"sowohl … als auch": [["als", "auch"]],
	"sowohl … wie auch": [["wie", "auch"]],
};

/**
 * The zu-infinitive conjunctions dumcorpus lists (um … zu): a circumposition
 * candidate so named is one. Other circumpositions are left to the judge,
 * since a bracket particle verb (führt an … vorbei) or an idiom (Um Himmels
 * willen) can hold their pieces (de/bracket-particle-or-circumposition).
 */
const zuInfinitive: ReadonlySet<string> = new Set(
	germanConjunctionLocutions.zuInfinitive,
);

export function anchors(nomination: Nomination): Decision {
	const { pieces } = nomination.sentence;
	const named = new Map(
		nomination.pairs.map((pair) => [
			`${pair.left.id},${pair.right.id}`,
			pair.name,
		]),
	);
	return {
		closed: accepted(nomination)
			.filter(
				([left, right, kind]) =>
					kind === "correlator" ||
					(kind === "circumposition" &&
						zuInfinitive.has(named.get(`${left},${right}`) ?? "")),
			)
			.map(([left, right]) => {
				const ids = [left, right];
				for (const [anchor, next] of extraAnchors[
					named.get(`${left},${right}`) ?? ""
				] ?? []) {
					const at = ids.find(
						(id) => pieces[id - 1]?.text.toLowerCase() === anchor,
					);
					const following = at === undefined ? undefined : pieces[at];
					if (following && lower(following) === next)
						ids.push(following.id);
				}
				return { pieces: ids, family: "Locution" };
			}),
	};
}

/** Quantity bisschen, in its spelling and its Historical spelling: the realizations of PRON bisschen. */
export const quantityBisschen: ReadonlySet<string> = new Set(
	authoredRealizations
		.filter(
			({ member }) =>
				member.lemma.kind === "PRON" &&
				member.lemma.canonicalForm === "bisschen",
		)
		.map(({ spelled }) => spelled),
);

/** The two pieces of each unit the `quantifier` rule closes. */
function quantifierPairs(
	nomination: Nomination,
): (readonly [number, number])[] {
	const { pieces } = nomination.sentence;
	const pairs: (readonly [number, number])[] = [];
	for (const piece of pieces) {
		const before = pieces[piece.id - 2];
		if (!before || before.clause !== piece.clause) continue;
		const word = lower(piece);
		if (
			(quantityBisschen.has(word) && isArticle(before)) ||
			(word === "wenig" && lower(before) === "ein") ||
			// Capitalized Paar is the noun 'pair' (ein Paar Schuhe).
			(piece.text === "paar" && lower(before) === "ein")
		)
			pairs.push([before.id, piece.id]);
	}
	return pairs;
}

export function quantifiers(nomination: Nomination): Decision {
	return {
		closed: quantifierPairs(nomination).map((pieces) => ({
			pieces,
			family: "Lexeme",
		})),
	};
}

/**
 * The route of a unit the `quantifier` rule closes, and of a one-piece
 * lowercase bisschen or bißchen, and undefined for any other group: Lexeme
 * PRON in every use (de/quantifier-by-use). Capitalized Bisschen may be the
 * noun 'small bite', so the judge keeps it.
 */
export function quantifierRoutes(nomination: Nomination): FixedRoute {
	const { pieces } = nomination.sentence;
	const fixed = new Set([
		...quantifierPairs(nomination).map((pair) => groupKey(pair)),
		...pieces
			.filter((piece) => quantityBisschen.has(piece.text))
			.map((piece) => groupKey([piece.id])),
	]);
	return (group) => (fixed.has(groupKey(group)) ? "Lexeme/PRON" : undefined);
}

/**
 * Each personal object pronoun and the subject its reflexive use needs, if
 * any: the reflexive ones' subjects, and the 3rd person object pronouns this
 * rule also frees, which are never reflexive (sich is).
 */
export const objectPronounSubject: ReadonlyMap<string, string | null> = new Map<
	string,
	string | null
>([...reflexiveSubject, ["ihm", null], ["ihn", null], ["ihnen", null]]);

export function pronouns(nomination: Nomination): Decision {
	const { pieces } = nomination.sentence;
	const free = new Set<number>();
	for (const piece of pieces) {
		const subject = objectPronounSubject.get(foldedText(piece));
		if (subject === undefined) continue;
		const coreferent =
			subject !== null &&
			pieces.some(
				(other) =>
					other.clause === piece.clause && lower(other) === subject,
			);
		if (!coreferent) free.add(piece.id);
	}
	return {
		drop: (edge) =>
			edge.source === "expression" &&
			edge.pieces.some((id) => free.has(id)),
		bound: [...free],
	};
}

/** An adjective's ending: a capitalized word with one before a noun may be its adjective (die Berliner Polizei, das Rote Kreuz). */
const adjectiveEnding = /(e|er|en|es|em)$/u;

/** Only whitespace or quote marks between two Segments. */
const quoteMark = /^[„“”"»«‚‘’›‹]$/u;

export function articleHeads(nomination: Nomination): Decision {
	const { pieces, segments } = nomination.sentence;
	const moved = new Map<number, number>();
	for (const slot of nomination.slots) {
		if (slot.kind !== "article") continue;
		const answer = nomination.first[`s_article_${slot.piece.id}`];
		if (answer?.type !== "choice") continue;
		// The judge reads it as an article when its hosts outweigh none.
		if ((answer.probabilities.none ?? 0) >= 0.5) continue;
		const next = pieces[slot.piece.id];
		if (
			!next ||
			next.clause !== slot.piece.clause ||
			!nounLike(next) ||
			!segments
				.slice(slot.piece.segment + 1, next.segment)
				.every(
					(segment) =>
						segment.kind === "Whitespace" ||
						quoteMark.test(segment.text),
				)
		)
			continue;
		const after = pieces[next.id];
		if (
			adjectiveEnding.test(next.text) &&
			after &&
			after.clause === next.clause &&
			nounLike(after)
		)
			continue;
		moved.set(slot.piece.id, next.id);
	}
	return {
		drop: (edge) =>
			edge.source === "satellite" && moved.has(edge.pieces[0]),
		add: [...moved],
	};
}

/** Uninflected welch (welch ein Glück), which never follows was für. */
const uninflectedWelch = "welch";

/** The ein or welcher a was für takes right after für: the forms of ein and of DET welcher. */
export const einForms: ReadonlySet<string> = new Set([
	...[...articleForms].filter((form) => form.startsWith("ein")),
	...authoredRealizations
		.filter(
			({ member, spelled }) =>
				member.lemma.kind === "DET" &&
				member.lemma.canonicalForm === "welcher" &&
				spelled !== uninflectedWelch,
		)
		.map(({ spelled }) => spelled.toLowerCase()),
]);

export function wasFuer(nomination: Nomination): Decision {
	const { pieces } = nomination.sentence;
	const closed: ClosedUnit[] = [];
	const used = new Set<number>();
	for (const [was, fuer] of wasFuerPairs(nomination.sentence)) {
		const answer = nomination.final[wasFuerId(was.id, fuer.id)];
		if (answer?.type !== "noul" || answer.noul < 0.5) continue;
		if (used.has(was.id) || used.has(fuer.id)) continue;
		const ids = [was.id, fuer.id];
		const next = pieces[fuer.id];
		if (next && next.clause === fuer.clause && einForms.has(lower(next)))
			ids.push(next.id);
		for (const id of ids) used.add(id);
		closed.push({ pieces: ids, family: "Locution" });
	}
	return { closed };
}

const coordinators = new Set(["und", "oder"]);

/** The conjunctions standing right between two members of one Locution. */
export function binomialLinks(
	nomination: Nomination,
	partition: readonly (readonly number[])[],
	familyOf: Membership["familyOf"],
): (readonly [number, number])[] {
	const { pieces, segments } = nomination.sentence;
	const groupOf = new Map(
		partition.flatMap((group) => group.map((id) => [id, group] as const)),
	);
	const beside = (left: Piece, right: Piece) =>
		segments
			.slice(left.segment + 1, right.segment)
			.every((segment) => segment.kind === "Whitespace");
	const links: [number, number][] = [];
	for (const piece of pieces) {
		const left = pieces[piece.id - 2];
		const right = pieces[piece.id];
		if (!coordinators.has(lower(piece)) || !left || !right) continue;
		const group = groupOf.get(left.id);
		if (
			group &&
			group === groupOf.get(right.id) &&
			group !== groupOf.get(piece.id) &&
			familyOf(group) === "Locution" &&
			beside(left, piece) &&
			beside(piece, right)
		)
			links.push([left.id, piece.id]);
	}
	return links;
}

/** Each Saying span's pieces, keyed to its first piece, from the `saying` edges. */
function sayingSpanOf(edges: readonly AssembledEdge[]): Map<number, number> {
	const spanOf = new Map<number, number>();
	for (const { pieces, source } of edges)
		if (source === "saying") {
			spanOf.set(pieces[0], pieces[0]);
			spanOf.set(pieces[1], pieces[0]);
		}
	return spanOf;
}

export function sayingsClosed(edges: readonly AssembledEdge[]): Decision {
	const spanOf = sayingSpanOf(edges);
	return {
		drop: (edge) => {
			if (edge.source === "saying") return false;
			const [left, right] = edge.pieces.map((id) => spanOf.get(id));
			return (
				(left !== undefined || right !== undefined) && left !== right
			);
		},
	};
}

/**
 * Whether two adjacent interjection pieces stay apart: an answer word
 * before a formula (de/interjection-counts-its-words).
 */
export function answerBeforeFormula(left: Piece, right: Piece): boolean {
	return (
		["ja", "nein", "doch", "jawohl", "jein"].includes(lower(left)) &&
		["danke", "bitte", "gern", "gerne"].includes(lower(right))
	);
}
