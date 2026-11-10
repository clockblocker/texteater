/**
 * Nomination, the unit stage's first step: what jev judges about the
 * connections code proposes. Three requests over one judge state, each a
 * `Plan` the unit stage's graph runs by what it reads (`units.ts`):
 *
 * 1. `candidates`: a host Choice per slot (an article's noun, a particle's
 *    or an auxiliary's verb, a noun's idiom verb, …), a Noul per proposed
 *    pair, a fixedness Noul per piece, and a Noul per Saying span.
 * 2. `expressions`: a Noul per pair of the pieces most likely fixed, whether
 *    they belong to one expression.
 * 3. `final`: step 0 asks a noun's idiom host again with clause-initial
 *    verbs among the hosts, and the old-spelling `so … daß`; the Saying
 *    Choice weighs each Saying span as a whole saying, a fragment of one, a
 *    saying plus other words, a general maxim, an idiom or none.
 *
 * These are candidates v3's requests and candidates4's `final` request,
 * worded byte for byte as the lab sent them, so cached answers replay. The
 * reflexive slot question is the exception, reworded on #1285.
 */

import type { Questions } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import {
	type Answers,
	type Ask,
	type AskFailure,
	choiceOf,
	noul,
	noulOf,
} from "../ask.js";
import type { Segment } from "../segmented-sentence.js";
import { askPlan, type Plan } from "../stage-graph.js";
import {
	type PairCandidate,
	pairCandidatesOf,
	type Slot,
	type SlotKind,
	slotsOf,
} from "./candidates.js";
import type { GermanInventory } from "./inventory.js";
import {
	candidateQuestions,
	expressionId,
	type FinalOptions,
	finalQuestions,
	fixedId,
	pairId,
	sayingNoulId,
	slotId,
} from "./nomination-questions.js";
import { argmaxBesideNone, partitionOf } from "./partition.js";
import { governorShares } from "./phrase.js";
import { type SayingSpan, sayingSpans } from "./saying-spans.js";
import {
	judgeState,
	type Reference,
	type Sentence,
	sentenceOf,
} from "./sentence.js";

export {
	correlatorId,
	expressionId,
	type FinalOptions,
	pairId,
	reaskedIdiomId,
	sayingChoiceId,
	slotId,
} from "./nomination-questions.js";

/** A satellite or idiom link: the slot's piece joins its host. */
export type SlotLink = {
	readonly from: number;
	readonly to: number;
	readonly share: number;
	readonly kind: SlotKind;
};

/** What a slot's answer is read against: its Sentence and the pairs accepted at 0.5. */
export type SlotReading = Pick<Candidates, "sentence" | "accepted">;

/**
 * A slot's host shares with each accepted name's pieces pooled on its most
 * probable piece: a name is one host, and the judge spreads an article's
 * share over its words (die Deutsche Post AG: Deutsche 0.08, Post 0.42, AG
 * 0.13 against none 0.37).
 */
function pooledByName(
	accepted: SlotReading["accepted"],
	probabilities: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
	const pairs = accepted
		.filter(([, , kind]) => kind === "name")
		.map(([left, right]) => [left, right] as const);
	const names = partitionOf([...new Set(pairs.flat())], pairs).filter(
		(name) => name.length > 1,
	);
	if (names.length === 0) return probabilities;
	const pooled: Record<string, number> = { ...probabilities };
	for (const name of names) {
		const keys = name
			.map((id) => `p${id}`)
			.filter((key) => pooled[key] !== undefined)
			.sort((a, b) => (pooled[b] ?? 0) - (pooled[a] ?? 0));
		const [best, ...rest] = keys;
		if (best === undefined) continue;
		for (const key of rest) {
			pooled[best] = (pooled[best] ?? 0) + (pooled[key] ?? 0);
			delete pooled[key];
		}
	}
	return pooled;
}

/**
 * Each piece's best slot answer: the kind whose best host has the highest
 * share. A host counts only when its share beats `none`, a satellite's by
 * more than `satelliteMargin` (#762). A name is one host (`pooledByName`),
 * and a preposition's slot is read as `governorShares` reads it: the noun
 * its own phrase leads to is no host.
 */
export function slotLinks(
	reading: SlotReading,
	slots: readonly Slot[],
	answers: Answers,
	satelliteMargin = 0,
): SlotLink[] {
	const best = new Map<number, SlotLink>();
	for (const slot of slots) {
		const probabilities = pooledByName(
			reading.accepted,
			governorShares(
				reading.sentence,
				slot,
				choiceOf(answers, slotId(slot)).probabilities,
			),
		);
		const top = argmaxBesideNone(probabilities);
		const none = probabilities.none ?? 0;
		const margin = slot.kind === "idiom" ? 0 : satelliteMargin;
		if (!top || top.share <= none + margin) continue;
		const link = {
			from: slot.piece.id,
			to: Number(top.key.slice(1)),
			share: top.share,
			kind: slot.kind,
		};
		const previous = best.get(slot.piece.id);
		if (!previous || previous.share < link.share)
			best.set(slot.piece.id, link);
	}
	return [...best.values()];
}

/** A host takes at most one particle and one governed preposition, the most probable (`sehnen sich nach … nach`). */
export function oneSatellitePerHost(links: readonly SlotLink[]): SlotLink[] {
	const best = new Map<string, SlotLink>();
	for (const link of links) {
		if (link.kind !== "preposition" && link.kind !== "particle") continue;
		const key = `${link.kind}:${link.to}`;
		const previous = best.get(key);
		if (!previous || previous.share < link.share) best.set(key, link);
	}
	return links.filter(
		(link) =>
			(link.kind !== "preposition" && link.kind !== "particle") ||
			best.get(`${link.kind}:${link.to}`) === link,
	);
}

/** Greedy one-to-one matching of accepted pairs, most probable first. */
function matchedPairs(
	pairs: readonly PairCandidate[],
	answers: Answers,
	floor: number,
) {
	const used = new Set<number>();
	const accepted: [number, number, PairCandidate["kind"]][] = [];
	for (const pair of [...pairs]
		.map((pair) => ({ pair, probability: noulOf(answers, pairId(pair)) }))
		.filter(({ probability }) => probability >= floor)
		.sort((a, b) => b.probability - a.probability)) {
		const { left, right } = pair.pair;
		if (
			pair.pair.kind !== "name" &&
			(used.has(left.id) || used.has(right.id))
		)
			continue;
		used.add(left.id);
		used.add(right.id);
		accepted.push([left.id, right.id, pair.pair.kind]);
		if (pair.pair.kind === "name")
			for (let id = left.id + 1; id < right.id; id++)
				accepted.push([left.id, id, "name"]);
	}
	return accepted;
}

/** Whether two fixed pieces belong to one expression, as `expressions` answered. */
type ExpressionLink = {
	readonly left: number;
	readonly right: number;
	readonly probability: number;
};

/** What code proposes before any answer: the slots, pairs and v3 Saying spans `candidates` asks about. */
export type Proposal = {
	readonly sentence: Sentence;
	readonly state: ReturnType<typeof judgeState>["state"];
	readonly ref: Reference;
	readonly inventory: GermanInventory;
	readonly slots: readonly Slot[];
	readonly pairs: readonly PairCandidate[];
	readonly spans: readonly SayingSpan[];
};

/** What `candidates` answered, and what code read from it before any floor. */
export type Candidates = Proposal & {
	readonly first: Answers;
	/** The slot links with no margin, one particle and preposition per host. */
	readonly slotAnswers: readonly SlotLink[];
	/** Each piece's fixedness Noul. */
	readonly fixed: ReadonlyMap<number, number>;
	/** The proposed pairs at 0.5, matched one to one. */
	readonly accepted: readonly (readonly [
		number,
		number,
		PairCandidate["kind"],
	])[];
};

/** What `expressions` answered about the pairs of the pieces most likely fixed. */
export type Expressions = {
	readonly second: Answers;
	readonly links: readonly ExpressionLink[];
};

/** What the three requests answered, and what code read from them before any floor. */
export type Nomination = Candidates &
	Expressions & {
		/** `final`'s answers. */
		readonly final: Answers;
	};

/** What code proposes for one Sentence's Segments, before anything is asked. */
export function proposalOf(
	input: { readonly segments: readonly Segment[] },
	inventory: GermanInventory,
): Proposal {
	const sentence = sentenceOf(input);
	const { state, ref } = judgeState(sentence);
	return {
		sentence,
		state,
		ref,
		inventory,
		slots: slotsOf(sentence, inventory),
		pairs: pairCandidatesOf(sentence, inventory),
		spans: sayingSpans(sentence),
	};
}

/** The `candidates` request, which reads nothing jev answered. */
export const candidatesPlan = (proposal: Proposal): Plan<Candidates> => {
	const { sentence, ref, slots, pairs, spans } = proposal;
	return {
		questions: candidateQuestions(sentence, ref, slots, pairs, spans),
		read: (first) => {
			const accepted = matchedPairs(pairs, first, 0.5);
			return {
				...proposal,
				first,
				slotAnswers: oneSatellitePerHost(
					slotLinks({ sentence, accepted }, slots, first),
				),
				fixed: new Map(
					sentence.pieces.map((piece) => [
						piece.id,
						noulOf(first, fixedId(piece.id)),
					]),
				),
				accepted,
			};
		},
	};
};

/** The `expressions` request, over the pieces `candidates` heard most likely fixed. */
export const expressionsPlan = (candidates: Candidates): Plan<Expressions> => {
	const { sentence, fixed, ref } = candidates;
	const flagged = sentence.pieces
		.filter((piece) => (fixed.get(piece.id) ?? 0) >= 0.3)
		.sort((a, b) => (fixed.get(b.id) ?? 0) - (fixed.get(a.id) ?? 0))
		.slice(0, 14)
		.sort((a, b) => a.id - b.id);
	const questions: Questions = {};
	for (const [position, a] of flagged.entries())
		for (const b of flagged.slice(position + 1))
			questions[expressionId(a.id, b.id)] = noul(
				`In \`sentence\`, are ${ref(a)} and ${ref(b)} fixed words of the same one established multiword expression (idiom, collocation, fixed adverbial, routine formula, proverb or quotation)?`,
			);
	return {
		questions,
		read: (second) => ({
			second,
			links: flagged.flatMap((a, position) =>
				flagged.slice(position + 1).map((b) => ({
					left: a.id,
					right: b.id,
					probability: noulOf(second, expressionId(a.id, b.id)),
				})),
			),
		}),
	};
};

/** The `final` request, which reads nothing jev answered. */
export const finalPlan = (
	proposal: Proposal,
	options: FinalOptions = {},
): Plan<Answers> => ({
	questions: finalQuestions(
		proposal.sentence,
		proposal.ref,
		proposal.slots,
		options,
	),
	read: (answers) => answers,
});

/** Asks the three nomination requests for one Sentence, one after another. */
export const nominate = Effect.fnUntraced(function* (
	input: { readonly segments: readonly Segment[] },
	ask: Ask,
	inventory: GermanInventory,
	options: FinalOptions = {},
): Effect.fn.Return<Nomination, AskFailure> {
	const proposal = proposalOf(input, inventory);
	const { state } = proposal;
	const candidates = yield* askPlan(
		ask,
		{ stage: "candidates", state },
		candidatesPlan(proposal),
	);
	const expressions = yield* askPlan(
		ask,
		{ stage: "expressions", state },
		expressionsPlan(candidates),
	);
	const final = yield* askPlan(
		ask,
		{ stage: "final", state },
		finalPlan(proposal, options),
	);
	return { ...candidates, ...expressions, final };
});

/** The v3 Saying spans whose Noul clears the floor, most probable first, disjoint. */
export function selectedSayings(
	nomination: Pick<Nomination, "spans" | "first">,
	floor: number,
): number[][] {
	const covered = new Set<number>();
	const chosen: number[][] = [];
	for (const span of [...nomination.spans]
		.filter((span) => noulOf(nomination.first, sayingNoulId(span)) >= floor)
		.sort(
			(a, b) =>
				noulOf(nomination.first, sayingNoulId(b)) -
					noulOf(nomination.first, sayingNoulId(a)) ||
				a.pieces.length - b.pieces.length,
		)) {
		if (span.pieces.some((piece) => covered.has(piece.id))) continue;
		for (const piece of span.pieces) covered.add(piece.id);
		chosen.push(span.pieces.map((piece) => piece.id));
	}
	return chosen;
}
