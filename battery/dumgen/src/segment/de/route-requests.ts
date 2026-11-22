/**
 * The route requests of routing (`routing.ts`) and how their answers read.
 *
 * The route requests are batched as candidates4's lab runs batched them:
 * `route` over the groups of candidates v3's seven policies, `route2` over
 * the groups its step-0 and Saying policies added plus the abbreviations,
 * and `closed`. No floor changes them, so cached answers replay under any
 * setting. A group no batch asked about gets `route-extra`, or routes
 * `Unresolved` unasked. Each is a `Plan` the unit stage's graph runs by
 * what it reads (`units.ts`), and each says what its failure leaves:
 * the routes it decides `Unresolved`, the grouping kept.
 */
import type { Questions } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import {
	type Answers,
	type Ask,
	type AskFailure,
	choice,
	choiceOf,
	noul,
} from "../ask.js";
import { askPlan, type Plan } from "../stage-graph.js";
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
import { fusedPrepositions } from "./phrase.js";
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

/**
 * Rule de/adjective-stays-adj's test of a word's own letters, asked of the
 * word: does it take an ending before a noun? Code spells the inflected
 * form, -e added, or -n after a final e, so the judge reads that form and
 * not a related adjective spelled otherwise (besonders is no besonder-):
 * ewig is ewige, lange is langen, besonders would be besonderse (#1340).
 */
/**
 * The share past which the test reads an adjective. The judge gives a form
 * that is no word 0.04 to 0.06 and a real one 0.18 or more, near 0.5 for
 * many; on dev, 0.3 kept every scored route and moved the most unscored
 * ones the Rule's way of the floors tried (0.1 to 0.5, #1341).
 */
const attributiveFloor = 0.3;

function attributiveTest(word: string): string {
	const inflected = word.endsWith("e") ? `${word}n` : `${word}e`;
	return `Is "${inflected}", the word "${word}" with an inflection ending, a German adjective form that stands before a noun (laut: der laute Ruf; schnell: die schnellen Hunde; lange: die langen Tage)? Answer no when "${inflected}" is no German word, or no adjective form, even if a related adjective is spelled otherwise.`;
}
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
				? inventory.identityCandidates(piece.word)
				: [];
			if (piece) {
				// Rule de/adjective-stays-adj: a word that can inflect as an
				// attributive adjective is an ADJ, also used adverbially. The
				// test is of the word's own letters, so one that only ever
				// modifies is an ADV beside a same-stem adjective (#1340).
				if (/^\p{Ll}/u.test(piece.text) && candidates.length === 0)
					questions[adjectiveTestId(only)] = noul(
						attributiveTest(piece.word.toLowerCase()),
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
 * Reads the route answers: the route Choice, a winning identity
 * candidate's Kind instead, then the Rule tests between ADV and ADJ and
 * between DET and PRON. An even ADV/ADJ test moves ADV to ADJ, since the
 * route Choice under-hears adjectives used adverbially (dev's even answers
 * are ewig, gleich, gemeinsam, weltweit, völlig); an even DET/PRON test
 * leaves the identity Choice's Kind.
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
			? inventory.identityCandidates(piece.word)
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
		// An article standing alone is the closed-class word it is, a DET,
		// never the noun or preposition its phrase would take (#1334); the
		// DET/PRON Rule test below may still read it as a pronoun.
		if (candidate)
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
			adjective.noul >= attributiveFloor
		)
			identity.set(groupKey(group), { ...current, choice: "Lexeme/ADJ" });
		// The DET/PRON test answering even (0.5) decides nothing: the
		// identity Choice, whose candidates already say determiner or
		// pronoun, keeps its Kind (the relative der of Expresslieferdienst,
		// der …, #1340).
		const modifier = answers[modifierTestId(only)];
		if (
			modifier?.type === "noul" &&
			modifier.noul !== 0.5 &&
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

/** A batched route request's routes and answers, and the questions it asked that brought none. */
export type BatchAnswers = {
	readonly routes: Routes;
	readonly answers: Answers;
	readonly unanswered: readonly string[];
};

const noRoutes = (): Routes => ({
	identity: new Map(),
	distributions: new Map(),
	picks: new Map(),
});

/**
 * A route request over `groups`, with `more` beside them. Without its
 * answers, its groups route `Unresolved` and none of them is asked again.
 */
export function routePlan(
	nomination: Pick<Nomination, "sentence" | "ref" | "inventory">,
	groups: Partition,
	more: Questions = {},
): Plan<BatchAnswers> {
	const { sentence, ref, inventory } = nomination;
	const questions = {
		...routeQuestions(sentence, groups, ref, inventory),
		...more,
	};
	return {
		questions,
		read: (answers) => ({
			routes: readRoutes(sentence, groups, answers, inventory),
			answers,
			unanswered: [],
		}),
		absent: () => ({
			routes: noRoutes(),
			answers: {},
			unanswered: Object.keys(questions),
		}),
	};
}

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
	/**
	 * The questions of a batch whose request failed: a piece whose route
	 * one of them decides routes `Unresolved`.
	 */
	readonly unanswered: ReadonlySet<string>;
};

/** The groups `route` and `route2` ask about: v3's, then candidates4's new ones. */
export type RouteBatches = {
	readonly v3: Partition;
	readonly fresh: Partition;
};

/** The groups of the batched route requests, from the nomination alone. */
export function routeBatchesOf(nomination: Nomination): RouteBatches {
	const articleOf = articleHosts(nomination);
	const v3Partitions = Object.values(v3Policies).map(
		(policy) =>
			assemble(nomination, articleOf, policyInput(nomination, policy))
				.partition,
	);
	const v3ByKey = uniqueGroups(v3Partitions);
	const fresh: (readonly number[])[] = [];
	for (const [key, group] of uniqueGroups(candidates4Partitions(nomination)))
		if (!v3ByKey.has(key)) fresh.push(group);
	return {
		v3: [...v3ByKey.values()],
		fresh,
	};
}

/** `route2`: candidates4's new groups and each abbreviation's route with Locution routes. */
export function route2Plan(
	nomination: Nomination,
	batches: RouteBatches,
): Plan<BatchAnswers> {
	const { sentence, ref } = nomination;
	const abbreviations: Questions = {};
	for (const piece of sentence.pieces.filter(isAbbreviationPiece))
		abbreviations[abbreviationId(piece.id)] = choice(
			`In \`sentence\`, the word ${ref(piece)} is a unit on its own. Which route does it take? An abbreviation takes the route of what it stands for (z.B. = zum Beispiel, a Locution ADV).`,
			routeCriteria(allRoutes, true),
		);
	return routePlan(nomination, batches.fresh, abbreviations);
}

/**
 * `closed`: each closed-class spelling's use, which reads only the pieces,
 * except a fused word's preposition piece, whose use the word settles.
 * Without its answers, those pieces route `Unresolved`.
 */
export function closedPlan(
	proposal: Pick<Nomination, "sentence" | "ref">,
): Plan<Pick<BatchAnswers, "answers" | "unanswered">> {
	const questions: Questions = {};
	// A fused word's preposition piece is a preposition (de/fused-word-pieces),
	// whatever else its spelling may be: the zu of zum is never asked.
	const fused = fusedPrepositions(proposal.sentence);
	for (const piece of proposal.sentence.pieces) {
		if (fused.has(piece.id)) continue;
		const question = closedClassQuestion(piece);
		if (question)
			questions[closedId(piece.id)] = choice(
				question.instructions(proposal.ref(piece)),
				question.criteria,
			);
	}
	return {
		questions,
		read: (answers) => ({ answers, unanswered: [] }),
		absent: () => ({ answers: {}, unanswered: Object.keys(questions) }),
	};
}

/** The batched route requests' answers together. */
export function routeAnswersOf(
	batches: RouteBatches,
	route: BatchAnswers,
	route2: BatchAnswers,
	closed: Pick<BatchAnswers, "answers" | "unanswered">,
): RouteAnswers {
	return {
		asked: new Set([...batches.v3, ...batches.fresh].map(groupKey)),
		routes: {
			identity: new Map([
				...route.routes.identity,
				...route2.routes.identity,
			]),
			distributions: new Map([
				...route.routes.distributions,
				...route2.routes.distributions,
			]),
			picks: new Map([...route.routes.picks, ...route2.routes.picks]),
		},
		route2: route2.answers,
		closed: closed.answers,
		unanswered: new Set([
			...route.unanswered,
			...route2.unanswered,
			...closed.unanswered,
		]),
	};
}

/** The batched route requests one after another: `route`, `route2`, `closed`. */
export const askRouteBatches = Effect.fnUntraced(function* (
	nomination: Nomination,
	ask: Ask,
): Effect.fn.Return<RouteAnswers, AskFailure> {
	const { state } = nomination;
	const batches = routeBatchesOf(nomination);
	const route = yield* askPlan(
		ask,
		{ stage: "route", state },
		routePlan(nomination, batches.v3),
	);
	const route2 = yield* askPlan(
		ask,
		{ stage: "route2", state },
		route2Plan(nomination, batches),
	);
	const closed = yield* askPlan(
		ask,
		{ stage: "closed", state },
		closedPlan(nomination),
	);
	return routeAnswersOf(batches, route, route2, closed);
});

/** The groups of a partition no batched request asked about. */
const unaskedGroups = (
	answers: RouteAnswers,
	partition: Partition,
): Partition =>
	partition.filter((group) => !answers.asked.has(groupKey(group)));

/**
 * `route-extra`: the route request for the groups of `partition` no batch
 * asked about. Without its answers, those groups route `Unresolved`.
 */
export function routeExtraPlan(
	nomination: Nomination,
	answers: RouteAnswers,
	partition: Partition,
): Plan<Routes | undefined> {
	const plan = routePlan(nomination, unaskedGroups(answers, partition));
	return {
		questions: plan.questions,
		read: (answered) => plan.read(answered).routes,
		absent: () => undefined,
	};
}

/** `route-extra` asked on its own. */
export const askUnaskedRoutes = (
	nomination: Nomination,
	answers: RouteAnswers,
	partition: Partition,
	ask: Ask,
): Effect.Effect<Routes | undefined, AskFailure> =>
	askPlan(
		ask,
		{ stage: "route-extra", state: nomination.state },
		routeExtraPlan(nomination, answers, partition),
	);
