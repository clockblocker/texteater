/**
 * Code rules over an assembled membership (#851, X3). Each rule enforces
 * one dumcorpus Rule over the links the judge chose: it drops a link its
 * Rule forbids, or adds one its Rule decides from the words alone. The
 * judge's other answers stand, and a Saying span is never cut.
 *
 * - `split-adverb` (de/split-adverb-is-one-target,
 *   de/pronominal-adverb-stands-alone): an accepted split adverb (Da … hin,
 *   Wo … mit) is one unit of exactly its two pieces, and the verb stays
 *   bare.
 * - `stranded-adverb` (de/split-adverb-is-one-target,
 *   de/pronominal-adverb-stands-alone): a preposition that is never a
 *   separable particle (für, von, gegen, in, neben, hinter, zwischen) left
 *   at the end of its clause has no complement, so with a da, wo or hier
 *   before it in that clause it is a split pronominal adverb, though the
 *   judge rejected the pair: Da kann ich nichts für gives [Da, für].
 * - `anchors` (de/correlator-anchors, de/dass-conjunction,
 *   de/complex-preposition): an accepted correlator, X-dass subordinator or
 *   circumposition is one Locution of its anchors only, the auch and nur of
 *   sowohl … als auch and nicht nur … sondern auch included. The words they
 *   connect or govern stay outside.
 * - `quantifier` (de/quantifier-by-use): ein wenig, ein paar, and an
 *   article right before quantity bisschen, are one Lexeme PRON unit each,
 *   and what they quantify is its own: Nach ein paar Sekunden gives
 *   [ein, paar] and [Sekunden], though the judge read ein as the article of
 *   Sekunden. Only lowercase paar counts; ein Paar Schuhe is the noun Paar
 *   with its article, left to the judge. Routing reads the PRON
 *   (`quantifierRoutes`), since the route Choice hears an article and its
 *   noun in such a unit. A one-piece lowercase bisschen (or bißchen) routes
 *   Lexeme PRON too, alone (klingt bisschen förmlich) or after a
 *   determiner that stays its own unit (kein, dieses, sein), where the
 *   route Choice hears a degree ADV, a DET or a NOUN; capitalized Bisschen
 *   is left to the judge, as the noun 'small bite' may be meant.
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
 *   on dumcorpus's AUX forms of sein): worden, gewesen and geworden take sein
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
 * - `bracket-particle` (de/verb-owns-its-scattered-members,
 *   de/bracket-particle-or-circumposition,
 *   de/governed-preposition-joins-its-governor): a verb has one separable
 *   particle, and it closes the verb's bracket. When one clause holds the
 *   same preposition twice and the judge hears both as one verb's
 *   particle, the one that ends the clause is the particle, and the
 *   earlier one heads a phrase: it joins the verb only when its
 *   preposition answer names that verb. With such answers, Pass auf dich
 *   auf gives [Pass, auf, auf], and Er fängt an der Ecke wieder an gives
 *   [fängt, an] with the first an free. When the two particle answers
 *   don't name one verb at the satellite floor, the rule changes nothing.
 * - `particle-verb` (de/verb-owns-its-scattered-members,
 *   de/verb-core-features): a unit of one verb piece, that verb's
 *   auxiliary, reflexive and expletive satellites, and exactly one
 *   separable prefix written apart is a particle verb, so it routes Lexeme
 *   VERB, though an expression link or the Locution Choice made it a
 *   Locution: gab … bekannt, hat … bekannt gegeben, Es tut … leid. The
 *   route Choice must hear the unit as a verb: Lexeme VERB's share tops
 *   every other Lexeme Kind's. That keeps a Locution of another Kind with
 *   one prefix word (ohne … zu, Auf Wiedersehen, vor allem) a Locution, and
 *   asks nothing more, since routing reads the answers it already has.
 * - `saying-closed` (de/saying-needs-uptake,
 *   de/locutions-and-sayings-are-made-of-lexemes): a Saying is one unit
 *   over exactly its own words, so a link between a word inside a Saying
 *   span and one outside it drops: erinnerte … „Wer zuletzt lacht, lacht am
 *   besten“ keeps erinnerte out, though the judge read an of am as its
 *   governed preposition.
 */
import type { AssembledEdge, Family, Membership } from "./assembly.js";
import {
	bracketParticles,
	infixedZu,
	particleVerbRoutes,
	seinChains,
} from "./code-rules-verbs.js";
import {
	anchors,
	articleHeads,
	binomialLinks,
	pronouns,
	quantifierRoutes,
	quantifiers,
	sayingsClosed,
	splitAdverbs,
	strandedAdverbs,
	wasFuer,
} from "./code-rules-words.js";
import type { Nomination } from "./nomination.js";
import { groupKey, partitionOf } from "./partition.js";
import type { FixedRoute } from "./routing.js";

export const codeRules = [
	"split-adverb",
	"stranded-adverb",
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
	"bracket-particle",
	"particle-verb",
] as const;

export type CodeRule = (typeof codeRules)[number];

/** A unit a rule decides whole: its pieces join, and no other link reaches them. */
export type ClosedUnit = {
	readonly pieces: readonly number[];
	readonly family: Family;
};

/** What one rule decides. */
export type Decision = {
	readonly closed?: readonly ClosedUnit[];
	readonly drop?: (edge: AssembledEdge) => boolean;
	readonly add?: readonly (readonly [number, number])[];
	/** Pieces the rule keeps out of any expression a judge proposes. */
	readonly bound?: readonly number[];
};

/**
 * The routes the listed rules fix (`quantifier`, `particle-verb`), the
 * first rule's that fixes one; undefined when no listed rule fixes routes.
 */
export function codeRoutes(
	nomination: Nomination,
	rules: readonly CodeRule[],
): FixedRoute | undefined {
	const routes = [
		...(rules.includes("quantifier") ? [quantifierRoutes(nomination)] : []),
		...(rules.includes("particle-verb")
			? [particleVerbRoutes(nomination)]
			: []),
	];
	if (routes.length === 0) return undefined;
	return (group, shares) => {
		for (const route of routes) {
			const fixed = route(group, shares);
			if (fixed) return fixed;
		}
		return undefined;
	};
}

/** Each rule's decision over one membership. */
function decisionsOf(
	nomination: Nomination,
	membership: Membership,
	rules: readonly CodeRule[],
): Decision[] {
	const decide: Record<CodeRule, () => Decision> = {
		"split-adverb": () => splitAdverbs(nomination),
		"stranded-adverb": () => strandedAdverbs(nomination),
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
		// Read by routing (`codeRoutes`).
		"particle-verb": () => ({}),
		"saying-closed": () => sayingsClosed(membership.edges),
		"bracket-particle": () => bracketParticles(nomination),
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
