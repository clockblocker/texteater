/**
 * The route requests of routing (`routing.ts`) and how their answers read.
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
import {
	articleHosts,
	assemble,
	full07,
	policyInput,
	sayingsOf,
	stepZeroInput,
	v3Policies,
} from "./assembly.js";
import { isAbbreviationPiece } from "./candidates.js";
import { closedClassQuestion } from "./closed-class.js";
import type { GermanInventory, IdentityCandidate } from "./inventory.js";
import type { Nomination } from "./nomination.js";
import { argmax, groupKey, type Partition } from "./partition.js";
import {
	allRoutes,
	checkedRouteKey,
	type RouteKey,
	routeCriteria,
	singletonRoutes,
} from "./routes.js";
import { joinRefs, type Reference, type Sentence } from "./sentence.js";

/** One route answer, kept for calibration. */
export type RouteJudgment = {
	readonly group: readonly number[];
	readonly choice: RouteKey;
	readonly confidence: number;
	readonly share: number;
	readonly source: "open" | "identity";
};

/** A judgment's top share; -1 for a Choice that came back with no probabilities. */
const topShare = (probabilities: Readonly<Record<string, number>>) =>
	argmax(probabilities)?.share ?? -1;

const routeId = (group: readonly number[]) => `r_${group.join("_")}`;
const identityId = (id: number) => `i_${id}`;
const adjectiveTestId = (id: number) => `ta_${id}`;
const modifierTestId = (id: number) => `tm_${id}`;
export const abbreviationId = (id: number) => `ra_${id}`;
export const closedId = (id: number) => `cc_${id}`;

/**
 * A route Choice for each group (Lexeme and Foreign routes for a one-piece
 * group), the Rule tests, and an identity Choice for each one-piece group
 * whose spelling realizes authored DET or PRON members.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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
 * Reads the route answers: the route Choice, a winning non-article identity
 * candidate's Kind instead, then the Rule tests between ADV and ADJ and
 * between DET and PRON.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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
		const judged: RouteJudgment = {
			group,
			choice: checkedRouteKey(answer.choice),
			confidence: answer.confidence,
			share: topShare(answer.probabilities),
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
				share: topShare(picked.probabilities),
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
