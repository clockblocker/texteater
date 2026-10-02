/**
 * Code rules over an assembled membership (#851, X3). Each rule enforces
 * one dumspec Rule over the links the judge chose: it drops a link its
 * Rule forbids, or adds one its Rule decides from the words alone. The
 * judge's other answers stand, and a Saying span is never cut.
 *
 * - `split-adverb` (de/split-adverb-is-one-target,
 *   de/pronominal-adverb-stands-alone): an accepted split adverb (Da … hin,
 *   Wo … mit) is one unit of exactly its two pieces, and the verb stays
 *   bare.
 * - `anchors` (de/correlator-anchors, de/dass-conjunction,
 *   de/complex-preposition): an accepted correlator, X-dass subordinator or
 *   circumposition is one Locution of its anchors only, the auch and nur of
 *   sowohl … als auch and nicht nur … sondern auch included. The words they
 *   connect or govern stay outside.
 * - `quantifier` (de/quantifier-by-use): ein wenig, and an article right
 *   before quantity bisschen, are one unit each, and what they quantify is
 *   its own.
 * - `pronoun` (de/verb-owns-its-scattered-members, de/fixed-member-test): a
 *   personal object pronoun joins a verb or Locution only as its lexical
 *   reflexive, coreferent with the subject. Its fixed-word links drop
 *   unless its clause has that subject: mir and mich need ich, uns wir,
 *   dir and dich du, euch ihr; ihm, ihn and ihnen are never reflexive.
 *   Tut mir leid gives [Tut, leid] and [mir].
 * - `article-head` (de/noun-owns-its-article,
 *   de/shared-article-in-coordination): an article the judge reads as an
 *   article belongs to the noun right after it, when one follows: eine Art
 *   Ziel, der Frau Grubach, des Kinder- und Jugendbuchs. A capitalized word
 *   with an adjective's ending before another one is left to the judge (die
 *   Berliner Polizei, das Rote Kreuz).
 * - `sein-chain` (de/verbal-participle, de/auxiliary-joins-the-verb-it-serves,
 *   on dumspec's AUX forms of sein): worden, gewesen and geworden take sein
 *   as their perfect's auxiliary, so the nearest sein form in their clause
 *   joins them, and worden, only ever the passive's auxiliary, also joins
 *   the participle right before it: ist … aufgefunden worden, examiniert
 *   worden war, wäre … gewesen.
 * - `was-fuer` (de/was-fuer): was and für that the judge, asked in the
 *   `final` request, reads as was für (ein) are one Locution with the ein
 *   or welche right after für, split or not; the noun stays outside.
 * - `infixed-zu` (de/fused-word-pieces, de/bare-infinitive-zu,
 *   de/verb-owns-its-scattered-members): an infinitive split around its
 *   infixed zu joins its particle and its stem, and zu stays apart:
 *   abzuspannen gives [ab, spannen] and [zu].
 * - `binomial` (de/fixed-members-only): und or oder standing between two
 *   members of one Locution, right beside each, is a member too: Hand und
 *   Fuß hätte.
 * - `answer-apart` (de/interjection-counts-its-words): an answer word
 *   before a formula keeps its own unit, with no punctuation between
 *   (Nein danke); routing reads it when it merges interjections.
 * - `saying-closed` (de/saying-needs-uptake,
 *   de/locutions-and-sayings-are-made-of-lexemes): a Saying is one unit
 *   over exactly its own words, so a link between a word inside a Saying
 *   span and one outside it drops: erinnerte … „Wer zuletzt lacht, lacht am
 *   besten“ keeps erinnerte out, though the judge read an of am as its
 *   governed preposition.
 */
import {
	closedVerbForms,
	germanConjunctionLocutions,
} from "dumspec/inventories";
import type { AssembledEdge, Family, Membership } from "./assembly.js";
import {
	fusedSiblings,
	isArticle,
	nounLike,
	wasFuerId,
	wasFuerPairs,
} from "./candidates.js";
import type { Nomination } from "./nomination.js";
import { groupKey, partitionOf } from "./partition.js";
import type { Piece } from "./sentence.js";

export const codeRules = [
	"split-adverb",
	"anchors",
	"quantifier",
	"pronoun",
	"article-head",
	"sein-chain",
	"was-fuer",
	"infixed-zu",
	"binomial",
	"answer-apart",
	"saying-closed",
] as const;

export type CodeRule = (typeof codeRules)[number];

/** A unit a rule decides whole: its pieces join, and no other link reaches them. */
type ClosedUnit = {
	readonly pieces: readonly number[];
	readonly family: Family;
};

/** What one rule decides. */
type Decision = {
	readonly closed?: readonly ClosedUnit[];
	readonly drop?: (edge: AssembledEdge) => boolean;
	readonly add?: readonly (readonly [number, number])[];
	/** Pieces the rule keeps out of any expression a judge proposes. */
	readonly bound?: readonly number[];
};

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

function splitAdverbs(nomination: Nomination): Decision {
	return {
		closed: accepted(nomination)
			.filter(([, , kind]) => kind === "split-adverb")
			.map(([left, right]) => ({
				pieces: [left, right],
				family: "Lexeme",
			})),
	};
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
 * The zu-infinitive conjunctions dumspec lists (um … zu): a circumposition
 * candidate so named is one. Other circumpositions are left to the judge,
 * since a bracket particle verb (führt an … vorbei) or an idiom (Um Himmels
 * willen) can hold their pieces (de/bracket-particle-or-circumposition).
 */
const zuInfinitive: ReadonlySet<string> = new Set(
	germanConjunctionLocutions.zuInfinitive,
);

function anchors(nomination: Nomination): Decision {
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

function quantifiers(nomination: Nomination): Decision {
	const { pieces } = nomination.sentence;
	const closed: ClosedUnit[] = [];
	for (const piece of pieces) {
		const before = pieces[piece.id - 2];
		if (!before || before.clause !== piece.clause) continue;
		const word = lower(piece);
		if (
			(word === "bisschen" && isArticle(before)) ||
			(word === "wenig" && lower(before) === "ein")
		)
			closed.push({ pieces: [before.id, piece.id], family: "Lexeme" });
	}
	return { closed };
}

/** Each personal object pronoun and the subject its reflexive use needs, if any. */
const reflexiveSubject: Readonly<Record<string, string | null>> = {
	mir: "ich",
	mich: "ich",
	uns: "wir",
	dir: "du",
	dich: "du",
	euch: "ihr",
	ihm: null,
	ihn: null,
	ihnen: null,
};

function pronouns(nomination: Nomination): Decision {
	const { pieces } = nomination.sentence;
	const free = new Set<number>();
	for (const piece of pieces) {
		const subject = reflexiveSubject[lower(piece)];
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

function articleHeads(nomination: Nomination): Decision {
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

const seinForms = new Set(closedVerbForms.sein ?? []);

/** Clause breaks a verb's bracket never crosses: brackets and quotes are inserts, not breaks. */
const bracketBreak = /[,;:.!?–—]/u;

/** Each piece's clause by `bracketBreak`, by piece id. */
function bracketClauses(nomination: Nomination): Map<number, number> {
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
/** Participles whose perfect sein forms: of the passive's werden, of sein and of werden. */
const seinParticiples = new Set(["worden", "gewesen", "geworden"]);

function seinChains(
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

const einForms = new Set([
	"ein",
	"eine",
	"einen",
	"einem",
	"einer",
	"eines",
	"welche",
	"welcher",
	"welchen",
	"welchem",
	"welches",
]);

function wasFuer(nomination: Nomination): Decision {
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

function infixedZu(nomination: Nomination): Decision {
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

const coordinators = new Set(["und", "oder"]);

/** The conjunctions standing right between two members of one Locution. */
function binomialLinks(
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

function sayingsClosed(edges: readonly AssembledEdge[]): Decision {
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

/** Each rule's decision over one membership. */
function decisionsOf(
	nomination: Nomination,
	membership: Membership,
	rules: readonly CodeRule[],
): Decision[] {
	const decide: Record<CodeRule, () => Decision> = {
		"split-adverb": () => splitAdverbs(nomination),
		anchors: () => anchors(nomination),
		quantifier: () => quantifiers(nomination),
		pronoun: () => pronouns(nomination),
		"article-head": () => articleHeads(nomination),
		"sein-chain": () => seinChains(nomination, membership.edges),
		"was-fuer": () => wasFuer(nomination),
		"infixed-zu": () => infixedZu(nomination),
		// Applied once the other rules have built the units.
		binomial: () => ({}),
		// Read by routing, where interjections merge.
		"answer-apart": () => ({}),
		"saying-closed": () => sayingsClosed(membership.edges),
	};
	return rules.map((rule) => decide[rule]());
}

/**
 * The pieces the rules decide on their own: those of a unit a rule closes,
 * and those a rule keeps out of expressions (a personal pronoun that is no
 * reflexive). The Locution Choice proposes no merge that touches them.
 */
export function boundPieces(
	nomination: Nomination,
	membership: Membership,
	rules: readonly CodeRule[],
): ReadonlySet<number> {
	return new Set(
		decisionsOf(nomination, membership, rules).flatMap((decision) => [
			...(decision.closed ?? []).flatMap((unit) => unit.pieces),
			...(decision.bound ?? []),
		]),
	);
}

/** The membership with each rule applied; with no rule, the membership itself. */
export function withCodeRules(
	nomination: Nomination,
	membership: Membership,
	rules: readonly CodeRule[],
): Membership {
	if (rules.length === 0) return membership;
	const decisions = decisionsOf(nomination, membership, rules);
	const closedOf = new Map<number, number>();
	const closed = decisions.flatMap((decision) => decision.closed ?? []);
	for (const [index, unit] of closed.entries())
		for (const id of unit.pieces)
			if (!closedOf.has(id)) closedOf.set(id, index);
	const added: AssembledEdge[] = [
		...decisions.flatMap((decision) => decision.add ?? []),
		...closed.flatMap((unit) =>
			unit.pieces
				.slice(1)
				.map((id) => [unit.pieces[0] ?? id, id] as const),
		),
	].map(([left, right]) => ({ pieces: [left, right], source: "rule" }));
	// A closed unit keeps only its own links; a Saying span is never cut.
	const outside = (edge: AssembledEdge) => {
		if (edge.source === "saying") return false;
		const [left, right] = edge.pieces.map((id) => closedOf.get(id));
		return (left !== undefined || right !== undefined) && left !== right;
	};
	const edges = [...membership.edges, ...added].filter(
		(edge) =>
			!outside(edge) &&
			!decisions.some((decision) => decision.drop?.(edge) ?? false),
	);
	const families = new Map(
		closed.map((unit) => [
			groupKey([...unit.pieces].sort((a, b) => a - b)),
			unit.family,
		]),
	);
	const familyOf = (group: readonly number[]) =>
		families.get(groupKey(group)) ?? membership.familyOf(group);
	const ids = nomination.sentence.pieces.map((piece) => piece.id);
	let partition = partitionOf(
		ids,
		edges.map(({ pieces }) => pieces),
	);
	if (rules.includes("binomial")) {
		const links = binomialLinks(nomination, partition, familyOf);
		if (links.length > 0) {
			edges.push(
				...links.map(
					(pieces): AssembledEdge => ({ pieces, source: "rule" }),
				),
			);
			partition = partitionOf(
				ids,
				edges.map(({ pieces }) => pieces),
			);
		}
	}
	return { ...membership, edges, partition, familyOf };
}
