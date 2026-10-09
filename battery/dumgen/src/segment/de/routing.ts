/**
 * Routing, the unit stage's last step: every unit gets its route, or
 * `Unresolved`.
 *
 * - A one-piece unit takes the route Choice over Lexeme and Foreign
 *   routes, unless its spelling realizes authored DET or PRON members:
 *   then the identity it picks among them implies the route (Dumgen ADR
 *   0007). Two Rule tests move ADV to ADJ and DET to PRON or back. An
 *   abbreviation-shaped piece also sees Locution routes.
 * - Code names a multi-piece unit's Family from how it was built; the
 *   route Choice picks only the Kind within it.
 * - Adjacent one-piece INTJ units merge into one Locution INTJ (Rule
 *   `de/interjection-counts-its-words`).
 * - Closed-class identity (#734) overrides the route of a one-piece unit
 *   whose spelling it covers.
 * - A code rule may fix the route of a unit: the `quantifier` rule's ein
 *   wenig, ein paar and article + bisschen, and a one-piece lowercase
 *   bisschen, are Lexeme PRON (de/quantifier-by-use), whatever the route
 *   Choice says.
 * - A one-piece DET or PRON unit keeps the authored identity the identity
 *   Choice picked, re-read for the final Kind when a Rule test flipped it
 *   (#864, `storedIdentity`).
 *
 * The route requests are batched as candidates4's lab runs batched them:
 * `route` over the groups of candidates v3's seven policies, `route2` over
 * the groups its step-0 and Saying policies added plus the abbreviations,
 * and `closed`. No floor changes them, so cached answers replay under any
 * setting. A group no batch asked about gets `route-extra`, or routes
 * `Unresolved` unasked.
 */

import type { Questions } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import {
	type Answers,
	type Ask,
	type AskFailure,
	askAny,
	choice,
	choiceOf,
	noul,
} from "../ask.js";
import type {
	ClosedClassIdentity,
	Route,
	Unit,
} from "../segmented-sentence.js";
import {
	articleHosts,
	assemble,
	type Family,
	full07,
	type Membership,
	policyInput,
	sayingsOf,
	stepZeroInput,
	v3Policies,
} from "./assembly.js";
import { isAbbreviationPiece } from "./candidates.js";
import {
	closedClassQuestion,
	closedClassRoute,
	closedClassRouteShares,
	hasFixedRoute,
} from "./closed-class.js";
import type { GermanInventory, IdentityCandidate } from "./inventory.js";
import type { Nomination } from "./nomination.js";
import {
	argmax,
	groupKey,
	type Partition,
	partitionOf,
	unitsOf,
} from "./partition.js";
import {
	allRoutes,
	type RouteKey,
	routeCriteria,
	routeForKey,
	singletonRoutes,
} from "./routes.js";
import {
	joinRefs,
	type Piece,
	type Reference,
	type Sentence,
} from "./sentence.js";

/** One route answer, kept for calibration. */
export type RouteJudgment = {
	readonly group: readonly number[];
	readonly choice: RouteKey;
	readonly confidence: number;
	readonly share: number;
	readonly source: "open" | "identity";
};

const routeId = (group: readonly number[]) => `r_${group.join("_")}`;
const identityId = (id: number) => `i_${id}`;
const adjectiveTestId = (id: number) => `ta_${id}`;
const modifierTestId = (id: number) => `tm_${id}`;
const abbreviationId = (id: number) => `ra_${id}`;
const closedId = (id: number) => `cc_${id}`;

/**
 * A route Choice for each group (Lexeme and Foreign routes for a one-piece
 * group), the Rule tests, and an identity Choice for each one-piece group
 * whose spelling realizes authored DET or PRON members.
 */
function routeQuestions(
	sentence: Sentence,
	groups: Partition,
	ref: Reference,
	inventory: GermanInventory,
): Questions {
	const questions: Questions = {};
	for (const group of groups) {
		const single = group.length === 1;
		const keys = single ? singletonRoutes : allRoutes;
		questions[routeId(group)] = choice(
			single
				? `In \`sentence\`, the word ${joinRefs(sentence, ref, group)} is a unit on its own. Which route does it take?`
				: `In \`sentence\`, the pieces ${joinRefs(sentence, ref, group)} together form one unit. Which route does that whole unit take?`,
			routeCriteria(keys, true),
		);
		const [only] = group;
		if (single && only !== undefined) {
			const piece = sentence.pieces[only - 1];
			const candidates = piece
				? inventory.identityCandidates(piece.text)
				: [];
			if (piece) {
				// Rule de/adjective-stays-adj: a word that can inflect as an
				// attributive adjective is an ADJ, also used adverbially.
				if (/^\p{Ll}/u.test(piece.text) && candidates.length === 0)
					questions[adjectiveTestId(only)] = noul(
						`Can the word ${ref(piece)}, in the form of its dictionary entry, also stand before a noun as an attributive adjective with an inflection ending (laut: ein lauter Ruf; schnell: der schnelle Hund)?`,
					);
				// Rule de/pron-or-det-by-use: DET modifies a noun, PRON stands for one.
				const kinds = new Set(
					candidates.map((candidate) => candidate.kind),
				);
				if (kinds.has("DET") && kinds.has("PRON"))
					questions[modifierTestId(only)] = noul(
						`In \`sentence\`, does ${ref(piece)} directly modify a noun that follows it (dieser Mann, jeglicher Zweifel), rather than standing for a whole noun phrase on its own?`,
					);
			}
			if (piece && candidates.length > 0)
				questions[identityId(only)] = choice(
					`In \`sentence\`, which word is ${ref(piece)}?`,
					{
						...Object.fromEntries(
							candidates.map((candidate, position) => [
								`c${position}`,
								candidate.description,
							]),
						),
						Other: "None of these: a different word or use",
					},
				);
		}
	}
	return questions;
}

/**
 * A one-piece group's closed-class identity Choice: the authored candidates
 * its spelling realizes and how jev answered (`c0`, `c1`, … or `Other`).
 */
export type IdentityPick = {
	readonly candidates: readonly IdentityCandidate[];
	readonly choice: string;
	readonly probabilities: Readonly<Record<string, number>>;
};

/**
 * Each group's route as jev judged it, its full route distribution, and a
 * one-piece group's identity Choice.
 */
export type Routes = {
	readonly identity: Map<string, RouteJudgment>;
	readonly distributions: Map<string, Readonly<Record<string, number>>>;
	readonly picks: Map<string, IdentityPick>;
};

/**
 * The identity a one-piece unit stores (#864), consistent with its final
 * route: the picked candidate when its Kind is the route's, else the most
 * probable candidate of the route's Kind in the same Choice, as when the
 * DET/PRON Rule test flipped the Kind. None for another route, for
 * `Other`, or when no candidate has the route's Kind. A route a code rule
 * fixed (`fixed`) overrides `Other` as well, so a bare bisschen the judge
 * heard as another word still stores PRON bisschen.
 */
export function storedIdentity(
	pick: IdentityPick | undefined,
	route: RouteKey,
	fixed = false,
): ClosedClassIdentity | undefined {
	if (!pick || (pick.choice === "Other" && !fixed)) return undefined;
	const kind =
		route === "Lexeme/DET" ? "DET" : route === "Lexeme/PRON" ? "PRON" : "";
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
 * Reads the route answers: the route Choice, a winning non-article identity
 * candidate's Kind instead, then the Rule tests between ADV and ADJ and
 * between DET and PRON.
 */
function readRoutes(
	sentence: Sentence,
	groups: Partition,
	answers: Answers,
	inventory: GermanInventory,
): Routes {
	const identity = new Map<string, RouteJudgment>();
	const distributions = new Map<string, Readonly<Record<string, number>>>();
	const picks = new Map<string, IdentityPick>();
	for (const group of groups) {
		const answer = choiceOf(answers, routeId(group));
		const top = argmax(answer.probabilities);
		const judged: RouteJudgment = {
			group,
			choice: answer.choice,
			confidence: answer.confidence,
			share: top.share,
			source: "open",
		};
		identity.set(groupKey(group), judged);
		distributions.set(groupKey(group), answer.probabilities);
		const [only] = group;
		const id = only === undefined ? undefined : identityId(only);
		if (group.length !== 1 || id === undefined || !(id in answers))
			continue;
		const piece = sentence.pieces[(only ?? 0) - 1];
		const candidates = piece
			? inventory.identityCandidates(piece.text)
			: [];
		const picked = choiceOf(answers, id);
		picks.set(groupKey(group), {
			candidates,
			choice: picked.choice,
			probabilities: picked.probabilities,
		});
		const position = Number(picked.choice.slice(1));
		const candidate =
			picked.choice === "Other" ? undefined : candidates[position];
		if (candidate && candidate.pronType !== "Art")
			identity.set(groupKey(group), {
				group,
				choice: `Lexeme/${candidate.kind}`,
				confidence: picked.confidence,
				share: argmax(picked.probabilities).share,
				source: "identity",
			});
	}
	for (const group of groups) {
		const [only] = group;
		if (group.length !== 1 || only === undefined) continue;
		const current = identity.get(groupKey(group));
		if (!current) continue;
		const adjective = answers[adjectiveTestId(only)];
		if (
			adjective?.type === "noul" &&
			current.choice === "Lexeme/ADV" &&
			adjective.noul >= 0.5
		)
			identity.set(groupKey(group), { ...current, choice: "Lexeme/ADJ" });
		const modifier = answers[modifierTestId(only)];
		if (
			modifier?.type === "noul" &&
			(current.choice === "Lexeme/DET" ||
				current.choice === "Lexeme/PRON")
		)
			identity.set(groupKey(group), {
				...current,
				choice: modifier.noul >= 0.5 ? "Lexeme/DET" : "Lexeme/PRON",
			});
	}
	return { identity, distributions, picks };
}

/** Asks one route request over `groups` and reads it. */
const askRoutes = Effect.fnUntraced(function* (
	nomination: Nomination,
	groups: Partition,
	ask: Ask,
	stage: string,
	more: Questions = {},
): Effect.fn.Return<
	{ readonly routes: Routes; readonly answers: Answers },
	AskFailure
> {
	const { sentence, ref, state, inventory } = nomination;
	const answers = yield* askAny(ask, {
		stage,
		state,
		questions: {
			...routeQuestions(sentence, groups, ref, inventory),
			...more,
		},
	});
	return {
		routes: readRoutes(sentence, groups, answers, inventory),
		answers,
	};
});

const uniqueGroups = (partitions: readonly Partition[]) => {
	const unique = new Map<string, readonly number[]>();
	for (const partition of partitions)
		for (const group of partition) unique.set(groupKey(group), group);
	return unique;
};

/**
 * The partitions of candidates4's step-0 and Saying policies, whose groups
 * `route2` asks about: step 0 at idiom 0.7, with the Saying Choice at 0.5,
 * and with the maxim at 0.7.
 */
function candidates4Partitions(nomination: Nomination): Partition[] {
	const articleOf = articleHosts(nomination);
	const base = policyInput(nomination, full07);
	const { input } = stepZeroInput(nomination, base, 0.7);
	return [
		assemble(nomination, articleOf, base).partition,
		assemble(nomination, articleOf, input).partition,
		assemble(nomination, articleOf, {
			...input,
			sayings: sayingsOf(nomination, { floor: 0.5, maxim: false }),
		}).partition,
		assemble(nomination, articleOf, {
			...input,
			sayings: sayingsOf(nomination, { floor: 0.7, maxim: true }),
		}).partition,
	];
}

/** The answers of the batched route requests, which no floor changes. */
export type RouteAnswers = {
	/** Every group a batch asked about. */
	readonly asked: ReadonlySet<string>;
	readonly routes: Routes;
	/** `route2`, with the abbreviation routes. */
	readonly route2: Answers;
	readonly closed: Answers;
};

export const askRouteBatches = Effect.fnUntraced(function* (
	nomination: Nomination,
	ask: Ask,
): Effect.fn.Return<RouteAnswers, AskFailure> {
	const { sentence, ref, state } = nomination;
	const articleOf = articleHosts(nomination);
	const v3Partitions = Object.values(v3Policies).map(
		(policy) =>
			assemble(nomination, articleOf, policyInput(nomination, policy))
				.partition,
	);
	const v3 = yield* askRoutes(
		nomination,
		[...uniqueGroups(v3Partitions).values()],
		ask,
		"route",
	);
	const v3Groups = new Set(
		v3Partitions.flatMap((partition) => partition.map(groupKey)),
	);
	const fresh = new Map(
		[...uniqueGroups(candidates4Partitions(nomination))].filter(
			([key]) => !v3Groups.has(key),
		),
	);
	const abbreviations: Questions = {};
	for (const piece of sentence.pieces.filter(isAbbreviationPiece))
		abbreviations[abbreviationId(piece.id)] = choice(
			`In \`sentence\`, the word ${ref(piece)} is a unit on its own. Which route does it take? An abbreviation takes the route of what it stands for (z.B. = zum Beispiel, a Locution ADV).`,
			routeCriteria(allRoutes, true),
		);
	const route2 = yield* askRoutes(
		nomination,
		[...fresh.values()],
		ask,
		"route2",
		abbreviations,
	);
	const closedQuestions: Questions = {};
	for (const piece of sentence.pieces) {
		const question = closedClassQuestion(piece);
		if (question)
			closedQuestions[closedId(piece.id)] = choice(
				question.instructions(ref(piece)),
				question.criteria,
			);
	}
	const closed = yield* askAny(ask, {
		stage: "closed",
		state,
		questions: closedQuestions,
	});
	return {
		asked: new Set([...v3Groups, ...fresh.keys()]),
		routes: {
			identity: new Map([
				...v3.routes.identity,
				...route2.routes.identity,
			]),
			distributions: new Map([
				...v3.routes.distributions,
				...route2.routes.distributions,
			]),
			picks: new Map([...v3.routes.picks, ...route2.routes.picks]),
		},
		route2: route2.answers,
		closed,
	};
});

/** The groups of a partition no batched request asked about. */
const unaskedGroups = (
	answers: RouteAnswers,
	partition: Partition,
): Partition =>
	partition.filter((group) => !answers.asked.has(groupKey(group)));

/** `route-extra`: the route request for the groups no batch asked about. */
export const askUnaskedRoutes = Effect.fnUntraced(function* (
	nomination: Nomination,
	answers: RouteAnswers,
	partition: Partition,
	ask: Ask,
): Effect.fn.Return<Routes, AskFailure> {
	return (yield* askRoutes(
		nomination,
		unaskedGroups(answers, partition),
		ask,
		"route-extra",
	)).routes;
});

/** Code names the Family from how the unit was built; jev only the Kind within it. */
export const structuralRoute =
	(
		distributions: ReadonlyMap<string, Readonly<Record<string, number>>>,
		jevRoute: (group: readonly number[]) => RouteKey,
		familyOf: (group: readonly number[]) => Family,
	) =>
	(group: readonly number[]): RouteKey => {
		if (group.length === 1) return jevRoute(group);
		const family = familyOf(group);
		if (family === "Saying") return "Saying/Saying";
		const distribution = distributions.get(groupKey(group)) ?? {};
		const best = argmax(
			Object.fromEntries(
				Object.entries(distribution).filter(([key]) =>
					key.startsWith(`${family}/`),
				),
			),
		);
		return best.key || jevRoute(group);
	};

/** Two adjacent pieces that stay apart although both are interjections. */
export type KeepApart = (left: Piece, right: Piece) => boolean;

/** The route a code rule fixed for a group; undefined for any other group. */
export type FixedRoute = (group: readonly number[]) => RouteKey | undefined;

/**
 * Adjacent one-piece units both routed INTJ, with only whitespace between,
 * merge into one Locution INTJ (Rule `de/interjection-counts-its-words`),
 * unless `apart` keeps the two pieces apart.
 */
function mergeInterjections(
	sentence: Sentence,
	partition: Partition,
	route: (group: readonly number[]) => RouteKey,
	apart: KeepApart | undefined,
): {
	readonly partition: Partition;
	readonly merged: ReadonlySet<string>;
	readonly links: readonly (readonly [number, number])[];
} {
	const interjection = (id: number) => {
		const group = partition.find((entry) => entry.includes(id));
		return group?.length === 1 && route(group) === "Lexeme/INTJ";
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
	route: RouteKey,
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
		.map(([key]) => key);
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
	readonly openRoute: (group: readonly number[]) => RouteKey;
	/** A group's route. */
	readonly route: (group: readonly number[]) => RouteKey;
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
 * `Unresolved`. A unit's variants come from the distribution that decided
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
	const { route2, closed: closedAnswers } = answers;
	const judged = new Map<string, RouteJudgment>([
		...answers.routes.identity,
		...(extra?.identity ?? []),
	]);
	const distributions = new Map([
		...answers.routes.distributions,
		...(extra?.distributions ?? []),
	]);
	const picks = new Map([...answers.routes.picks, ...(extra?.picks ?? [])]);
	const jevRoute = (group: readonly number[]): RouteKey => {
		const [only] = group;
		if (group.length === 1 && only !== undefined) {
			const abbreviation = route2[abbreviationId(only)];
			if (abbreviation?.type === "choice") return abbreviation.choice;
		}
		return judged.get(groupKey(group))?.choice ?? "Unresolved";
	};
	const structural = structuralRoute(
		distributions,
		jevRoute,
		membership.familyOf,
	);
	const merged = mergeInterjections(
		sentence,
		membership.partition,
		structural,
		keepApart,
	);
	const closedRoute = (group: readonly number[]): RouteKey | undefined => {
		const [only] = group;
		if (group.length !== 1 || only === undefined) return undefined;
		const piece = sentence.pieces[only - 1];
		if (!piece) return undefined;
		if (hasFixedRoute(piece)) return closedClassRoute(piece, undefined);
		const answer = closedAnswers[closedId(only)];
		return answer?.type === "choice"
			? closedClassRoute(piece, answer.choice)
			: undefined;
	};
	const openRoute = (group: readonly number[]): RouteKey =>
		merged.merged.has(groupKey(group))
			? "Locution/INTJ"
			: structural(group);
	const route = (group: readonly number[]): RouteKey =>
		closedRoute(group) ?? fixedRoute?.(group) ?? openRoute(group);
	const decidingShares = (
		group: readonly number[],
	): Readonly<Record<string, number>> | undefined => {
		// Never on a fused half, the i or m of im (#827).
		if (
			group.some((id) => sentence.pieces[id - 1]?.fusedWord !== undefined)
		)
			return undefined;
		const [only] = group;
		if (group.length === 1 && only !== undefined) {
			const piece = sentence.pieces[only - 1];
			if (!piece || hasFixedRoute(piece)) return undefined;
			const closed = closedAnswers[closedId(only)];
			if (closed?.type === "choice")
				return closedClassRouteShares(piece, closed.probabilities);
			const abbreviation = route2[abbreviationId(only)];
			if (abbreviation?.type === "choice")
				return abbreviation.probabilities;
			return distributions.get(groupKey(group));
		}
		if (
			merged.merged.has(groupKey(group)) ||
			fixedRoute?.(group) !== undefined
		)
			return undefined;
		const family = membership.familyOf(group);
		if (family === "Saying") return undefined;
		return Object.fromEntries(
			Object.entries(distributions.get(groupKey(group)) ?? {}).filter(
				([key]) => key.startsWith(`${family}/`),
			),
		);
	};
	return {
		partition: merged.partition,
		merges: merged.links,
		openRoute,
		route,
		units(variantMargin, options) {
			const units = unitsOf(sentence, merged.partition, route);
			if (variantMargin === undefined && !options?.identity) return units;
			return units.map((unit, index) => {
				const group = merged.partition[index] ?? [];
				const keys =
					variantMargin === undefined
						? undefined
						: routeVariants(
								route(group),
								decidingShares(group),
								variantMargin,
							);
				const identity =
					options?.identity && group.length === 1
						? storedIdentity(
								picks.get(groupKey(group)),
								route(group),
								fixedRoute?.(group) !== undefined,
							)
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
