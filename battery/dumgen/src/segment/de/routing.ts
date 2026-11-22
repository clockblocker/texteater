/**
 * Routing, the unit stage's last step: every unit gets its route, or
 * `Unresolved`.
 *
 * - A one-piece unit takes the route Choice over Lexeme and Foreign
 *   routes, unless its spelling realizes authored DET or PRON members:
 *   then the identity it picks among them implies the route (Dumgen ADR
 *   0007), an article's too: an article standing alone is a DET, never the
 *   noun its phrase would take (#1334). Two Rule tests move ADV to ADJ and DET to PRON or back. An
 *   abbreviation-shaped piece also sees Locution routes.
 * - Code names a multi-piece unit's Family from how it was built; the
 *   route Choice picks only the Kind within it, never Lexeme PART: every
 *   authored PART is one word (#734), so the click could serve none, and
 *   such a unit takes its Family's next Kind (#1340, fertig zu).
 * - Closed-class identity (#734) overrides the route of a one-piece unit
 *   whose spelling it covers.
 * - Adjacent one-piece units routed INTJ merge into one Locution INTJ
 *   (Rule `de/interjection-counts-its-words`), each read by the route it
 *   takes alone, closed-class identity included (#1331): ja ja that the
 *   `closed` request hears as modal particles stays apart, and nein nein,
 *   fixed INTJ, merges whatever the route Choice said.
 * - A code rule may fix the route of a unit: the `quantifier` rule's ein
 *   wenig, ein paar and article + bisschen, and a one-piece lowercase
 *   bisschen, are Lexeme PRON (de/quantifier-by-use), whatever the route
 *   Choice says, and the `particle-verb` rule's verb with one separable
 *   prefix is Lexeme VERB, whatever Family code named.
 * - A one-piece DET or PRON unit keeps the authored identity the identity
 *   Choice picked, re-read for the final Kind when a Rule test flipped it
 *   or the Choice answered Other (#864, `storedIdentity`): a unit routed
 *   DET or PRON whose spelling realizes an authored member of that Kind
 *   always stores one, since a Closed Route resolves only to authored
 *   members (system ADR 0021) and `resolve.grammar` builds its Lemma from
 *   that identity alone.
 *
 * The route requests and how their answers read are `route-requests.ts`.
 */
import type {
	ClosedClassIdentity,
	Route,
	Unit,
} from "../segmented-sentence.js";
import type { Family, Membership } from "./assembly.js";
import {
	closedClassRoute,
	closedClassRouteShares,
	hasFixedRoute,
} from "./closed-class.js";
import type { IdentityCandidate } from "./inventory.js";
import type { Nomination } from "./nomination.js";
import {
	argmax,
	groupKey,
	type Partition,
	partitionOf,
	pieceGroupMap,
	unitsOf,
} from "./partition.js";
import {
	abbreviationId,
	closedId,
	type IdentityPick,
	type RouteAnswers,
	type RouteJudgment,
	type Routes,
} from "./route-requests.js";
import {
	checkedRouteKey,
	type RouteKey,
	routeForKey,
	type UnitRouteKey,
} from "./routes.js";
import type { Piece, Sentence } from "./sentence.js";

/**
 * The identity a one-piece unit stores (#864), consistent with its final
 * route: the picked candidate when its Kind is the route's, else the most
 * probable candidate of the route's Kind in the same Choice, as when the
 * DET/PRON Rule test flipped the Kind or the Choice answered Other while
 * the route Choice, or a code rule, still routed the unit DET or PRON.
 * Other says no description fitted, not that the word is another one: the
 * closed classes are enumerated, so a DET or PRON reading of this spelling
 * is one of its authored members (system ADR 0021), and storing none would
 * leave the click a permanent Catalog Miss. None for another route, or
 * when the spelling realizes no member of the route's Kind: that is a gap
 * in the inventory, which the click reports as a Catalog Miss.
 */
export function storedIdentity(
	pick: IdentityPick | undefined,
	route: UnitRouteKey,
): ClosedClassIdentity | undefined {
	if (!pick) return undefined;
	const kind =
		route === "Lexeme/DET"
			? "DET"
			: route === "Lexeme/PRON"
				? "PRON"
				: undefined;
	if (!kind) return undefined;
	const picked = pick.candidates[Number(pick.choice.slice(1))];
	const candidate =
		picked?.kind === kind
			? picked
			: pick.candidates
					.map((entry, position) => ({
						entry,
						share: pick.probabilities[`c${position}`] ?? 0,
					}))
					.filter(({ entry }) => entry.kind === kind)
					.reduce<
						{ entry: IdentityCandidate; share: number } | undefined
					>(
						(best, next) =>
							best && best.share >= next.share ? best : next,
						undefined,
					)?.entry;
	if (!candidate) return undefined;
	return {
		kind: candidate.kind,
		canonicalForm: candidate.canonicalForm,
		pronType: candidate.pronType,
		...(candidate.poss ? { poss: "Yes" as const } : {}),
	};
}

/**
 * A multi-piece unit's route shares within the Family code named, without
 * Lexeme PART: every authored PART is one word (#734), so a click on a
 * multi-piece PART would find no Lemma (#1340).
 */
const familyShares = (
	distribution: Readonly<Record<string, number>>,
	family: Family,
): Record<string, number> =>
	Object.fromEntries(
		Object.entries(distribution).filter(
			([key]) => key.startsWith(`${family}/`) && key !== "Lexeme/PART",
		),
	);

/** Code names the Family from how the unit was built; jev only the Kind within it. */
export const structuralRoute =
	(
		distributions: ReadonlyMap<string, Readonly<Record<string, number>>>,
		jevRoute: (group: readonly number[]) => UnitRouteKey,
		familyOf: (group: readonly number[]) => Family,
	) =>
	(group: readonly number[]): UnitRouteKey => {
		if (group.length === 1) return jevRoute(group);
		const family = familyOf(group);
		if (family === "Saying") return "Saying/Saying";
		const best = argmax(
			familyShares(distributions.get(groupKey(group)) ?? {}, family),
		);
		return best ? checkedRouteKey(best.key) : jevRoute(group);
	};

/** Two adjacent pieces that stay apart although both are interjections. */
export type KeepApart = (left: Piece, right: Piece) => boolean;

/**
 * The route a code rule fixed for a group, given the group's route
 * distribution when a route request asked about it; undefined for any
 * other group.
 */
export type FixedRoute = (
	group: readonly number[],
	shares: Readonly<Record<string, number>> | undefined,
) => RouteKey | undefined;

/**
 * Adjacent one-piece units both routed INTJ by `route`, the route each
 * takes alone, with only whitespace between,
 * merge into one Locution INTJ (Rule `de/interjection-counts-its-words`),
 * unless `apart` keeps the two pieces apart.
 */
function mergeInterjections(
	sentence: Sentence,
	partition: Partition,
	route: (group: readonly number[]) => UnitRouteKey,
	apart: KeepApart | undefined,
): {
	readonly partition: Partition;
	readonly merged: ReadonlySet<string>;
	readonly links: readonly (readonly [number, number])[];
} {
	const groupOf = pieceGroupMap(partition);
	const cachedRoute = new Map<number, UnitRouteKey>();
	const interjection = (id: number) => {
		const group = groupOf.get(id);
		if (group?.length !== 1) return false;
		let unitRoute = cachedRoute.get(id);
		if (unitRoute === undefined) {
			unitRoute = route(group);
			cachedRoute.set(id, unitRoute);
		}
		return unitRoute === "Lexeme/INTJ";
	};
	const links: [number, number][] = [];
	for (const piece of sentence.pieces.slice(1)) {
		const previous = sentence.pieces[piece.id - 2];
		if (!previous) continue;
		const between = sentence.segments.slice(
			previous.segment + 1,
			piece.segment,
		);
		if (
			between.length > 0 &&
			between.every((segment) => segment.kind === "Whitespace") &&
			interjection(previous.id) &&
			interjection(piece.id) &&
			!apart?.(previous, piece)
		)
			links.push([previous.id, piece.id]);
	}
	if (links.length === 0) return { partition, merged: new Set(), links };
	const next = partitionOf(
		sentence.pieces.map((piece) => piece.id),
		[
			...partition.flatMap((group) =>
				group.slice(1).map((id) => [group[0] ?? id, id] as const),
			),
			...links,
		],
	);
	const merged = new Set(
		next
			.filter((group) => links.some(([a]) => group.includes(a)))
			.map(groupKey),
	);
	return { partition: next, merged, links };
}

/**
 * The Kind pairs a unit's route variants may span (#827): the five pairs
 * Dumgen ADR 0008 tolerates, within Family Lexeme. The evaluator's
 * `toleratedKindPairs` names the same five.
 */
export const variantKindPairs = [
	["PART", "ADV"],
	["CCONJ", "ADV"],
	["ADJ", "ADV"],
	["NOUN", "PROPN"],
	["PRON", "DET"],
] as const;

const variantPair = (left: RouteKey, right: RouteKey) => {
	const [leftFamily, leftKind] = left.split("/");
	const [rightFamily, rightKind] = right.split("/");
	return (
		leftFamily === "Lexeme" &&
		rightFamily === "Lexeme" &&
		variantKindPairs.some(
			([a, b]) =>
				(leftKind === a && rightKind === b) ||
				(leftKind === b && rightKind === a),
		)
	);
};

/**
 * The route variants of a borderline unit (Dumgen ADR 0007). When the top
 * two shares of the distribution that decided its route lie within `margin`
 * of each other, the routes within `margin` of the top, its route first, at
 * most `most`; undefined when one route is clear. A unit whose route and
 * near routes include two outside the tolerated `variantKindPairs` takes its
 * route alone (#827).
 */
export function routeVariants(
	route: UnitRouteKey,
	shares: Readonly<Record<string, number>> | undefined,
	margin: number,
	most = 3,
): RouteKey[] | undefined {
	if (!shares || route === "Unresolved") return undefined;
	const ranked = Object.entries(shares)
		.filter(([key]) => key !== "Unresolved")
		.sort((a, b) => b[1] - a[1]);
	const [top, second] = ranked;
	if (!top || !second || top[1] - second[1] > margin) return undefined;
	const near = ranked
		.filter(([, share]) => share >= top[1] - margin)
		.map(([key]) => checkedRouteKey(key));
	const routes = [route, ...near.filter((key) => key !== route)];
	if (
		routes.some((left, index) =>
			routes.slice(index + 1).some((right) => !variantPair(left, right)),
		)
	)
		return undefined;
	const variants = routes.slice(0, most);
	return variants.length > 1 ? variants : undefined;
}

const variantRoute = (key: RouteKey): Route => {
	const route = routeForKey(key);
	if (route === "Unresolved") throw Error("A route variant is a route");
	return route;
};

/** A membership with its units routed. */
export type RoutedMembership = {
	/** The membership's partition after adjacent interjections merged. */
	readonly partition: Partition;
	/** The interjection merges, two pieces each. */
	readonly merges: readonly (readonly [number, number])[];
	/** A group's route before closed-class identity overrides it. */
	readonly openRoute: (group: readonly number[]) => UnitRouteKey;
	/** A group's route. */
	readonly route: (group: readonly number[]) => UnitRouteKey;
	/**
	 * The units; a borderline one carries variants when `variantMargin` is
	 * given, and a one-piece DET or PRON unit its closed-class identity when
	 * `identity` is set, as production stores it (#864).
	 */
	readonly units: (
		variantMargin?: number,
		options?: { readonly identity?: boolean },
	) => Unit[];
};

/**
 * Routes a membership from the batched answers, plus `extra` for the
 * groups no batch asked about; a group without either routes
 * `Unresolved`, and so does a piece whose closed-class use or
 * abbreviation route a failed request left unanswered. A unit's variants come from the distribution that decided
 * its route: closed-class identity for a covered spelling (its uses'
 * shares summed by route), the abbreviation route for an abbreviation, the
 * route Choice for any other word, and the Choice restricted to the Family
 * code named for a multi-piece unit. A Saying, a merged interjection, a
 * fixed closed-class route, a route a code rule fixed (`fixedRoute`) and a
 * unit holding part of a fused word carry none, and variants span only
 * `variantKindPairs` (#827).
 */
export function routeMembership(
	nomination: Nomination,
	membership: Pick<Membership, "partition" | "familyOf">,
	answers: RouteAnswers,
	extra?: Routes,
	keepApart?: KeepApart,
	fixedRoute?: FixedRoute,
): RoutedMembership {
	const { sentence } = nomination;
	const { route2, closed: closedAnswers, unanswered } = answers;
	/** A one-piece group whose closed-class or abbreviation route a failed request left undecided. */
	const undecided = (
		group: readonly number[],
		id: (piece: number) => string,
	) => {
		const [only] = group;
		return (
			group.length === 1 && only !== undefined && unanswered.has(id(only))
		);
	};
	const judged = new Map<string, RouteJudgment>([
		...answers.routes.identity,
		...(extra?.identity ?? []),
	]);
	const distributions = new Map([
		...answers.routes.distributions,
		...(extra?.distributions ?? []),
	]);
	const picks = new Map([...answers.routes.picks, ...(extra?.picks ?? [])]);
	const jevRoute = (group: readonly number[]): UnitRouteKey => {
		if (undecided(group, abbreviationId)) return "Unresolved";
		const [only] = group;
		if (group.length === 1 && only !== undefined) {
			const abbreviation = route2[abbreviationId(only)];
			if (abbreviation?.type === "choice")
				return checkedRouteKey(abbreviation.choice);
		}
		return judged.get(groupKey(group))?.choice ?? "Unresolved";
	};
	const structural = structuralRoute(
		distributions,
		jevRoute,
		membership.familyOf,
	);
	const closedRoute = (group: readonly number[]): RouteKey | undefined => {
		const [only] = group;
		if (group.length !== 1 || only === undefined) return undefined;
		const piece = sentence.pieces[only - 1];
		if (!piece) return undefined;
		if (hasFixedRoute(piece, sentence))
			return closedClassRoute(piece, undefined, sentence);
		const answer = closedAnswers[closedId(only)];
		return answer?.type === "choice"
			? closedClassRoute(piece, answer.choice, sentence)
			: undefined;
	};
	const fixed = (group: readonly number[]): RouteKey | undefined =>
		fixedRoute?.(group, distributions.get(groupKey(group)));
	/** A group's route before any interjection merge: closed-class identity first (#1331). */
	const unmerged = (group: readonly number[]): UnitRouteKey =>
		undecided(group, closedId)
			? "Unresolved"
			: (closedRoute(group) ?? fixed(group) ?? structural(group));
	const merged = mergeInterjections(
		sentence,
		membership.partition,
		unmerged,
		keepApart,
	);
	const openRoute = (group: readonly number[]): UnitRouteKey =>
		merged.merged.has(groupKey(group))
			? "Locution/INTJ"
			: structural(group);
	const route = (group: readonly number[]): UnitRouteKey =>
		merged.merged.has(groupKey(group)) ? "Locution/INTJ" : unmerged(group);
	const decidingShares = (
		group: readonly number[],
	): Readonly<Record<string, number>> | undefined => {
		// Never on a fused half, the i or m of im (#827).
		if (
			group.some(
				(id) => sentence.pieces[id - 1]?.fusedWord !== undefined,
			) ||
			undecided(group, closedId) ||
			undecided(group, abbreviationId)
		)
			return undefined;
		const [only] = group;
		if (group.length === 1 && only !== undefined) {
			const piece = sentence.pieces[only - 1];
			if (!piece || hasFixedRoute(piece, sentence)) return undefined;
			const closed = closedAnswers[closedId(only)];
			if (
				closed?.type === "choice" &&
				closedClassRoute(piece, closed.choice, sentence) !== undefined
			)
				return closedClassRouteShares(piece, closed.probabilities);
			const abbreviation = route2[abbreviationId(only)];
			if (abbreviation?.type === "choice")
				return abbreviation.probabilities;
			return distributions.get(groupKey(group));
		}
		if (merged.merged.has(groupKey(group)) || fixed(group) !== undefined)
			return undefined;
		const family = membership.familyOf(group);
		if (family === "Saying") return undefined;
		return familyShares(distributions.get(groupKey(group)) ?? {}, family);
	};
	return {
		partition: merged.partition,
		merges: merged.links,
		openRoute,
		route,
		units(variantMargin, options) {
			if (variantMargin === undefined && !options?.identity)
				return unitsOf(sentence, merged.partition, route);
			const unitRoutes = merged.partition.map(route);
			const units = unitsOf(
				sentence,
				merged.partition,
				(_, index) => unitRoutes[index] ?? "Unresolved",
			);
			return units.map((unit, index) => {
				const group = merged.partition[index] ?? [];
				const unitRoute = unitRoutes[index] ?? "Unresolved";
				const keys =
					variantMargin === undefined
						? undefined
						: routeVariants(
								unitRoute,
								decidingShares(group),
								variantMargin,
							);
				const identity =
					options?.identity && group.length === 1
						? storedIdentity(picks.get(groupKey(group)), unitRoute)
						: undefined;
				return {
					...unit,
					...(keys ? { variants: keys.map(variantRoute) } : {}),
					...(identity ? { identity } : {}),
				};
			});
		},
	};
}
