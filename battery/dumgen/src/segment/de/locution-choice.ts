/**
 * The Locution Choice (#851, X5): one follow-up request, `locution`, for
 * fixed expressions membership left in pieces. Nomination often hears an
 * expression and assembly still splits it, because its link stayed under a
 * floor: an idiom host share of 0.3 to 0.7 (die Katze im Sack … gekauft),
 * an expression Noul of 0.5 to 0.7 (bitte schön), or a fixedness Noul under
 * 0.5 for one member (Blase … Trübsal, the m of zum Beispiel), or a fused
 * word's pieces split between units (Im Allgemeinen gives [I] and [m,
 * Allgemeinen]). Code turns each such link between two of the membership's
 * units into a merge candidate and shows the judge the unit the merge would make, fused pieces
 * and a member noun's opening preposition included (de/fused-word-pieces).
 * The judge then takes de/fixed-member-test on each of the two units: is it
 * a fixed part of one established expression with the other, needed in its
 * slot so that another word of its kind would break the expression, or a
 * free subject, object, complement or modifier the expression only takes
 * (de/fixed-members-only); or are the words meant literally (de/idiom), or
 * joined by no expression at all? Both units fixed, the merge joins them
 * into a Locution, and the code rules apply again over it.
 *
 * The request also carries the member check (`member-check.ts`), the
 * same test of every member of each Locution assembly built, and a member
 * it reads free leaves before the merges apply. An expression link counts
 * here only between words that are no article (`memberLinks`): a fixed
 * article counts through its noun.
 *
 * No merge touches a piece a code rule decides (`boundPieces`) or a
 * Saying, nor a unit of one word the Rules keep apart whatever the judge
 * reads (`keptApart`, `fixed-member.ts`). A Sentence with no candidate
 * asks nothing.
 *
 * The first version asked one Choice over the whole wording and merged on
 * its `whole` share; it read free objects and pronouns as fixed (df28add5).
 * The second also asked bleiben with an infinitive
 * (de/bleiben-with-an-infinitive), which the judge never accepted (cfd482be).
 */

import type { Questions } from "@typesafe-ai/sdk";
import type * as Effect from "effect/Effect";
import type { Answers, Ask, AskFailure } from "../ask.js";
import { askPlan, type Plan } from "../stage-graph.js";
import {
	type AssembledEdge,
	absorbedEdges,
	articleHosts,
	type Membership,
	memberLinks,
} from "./assembly.js";
import { fusedSiblings } from "./candidates.js";
import { boundPieces, type CodeRule, withCodeRules } from "./code-rules.js";
import { fixedMemberQuestion, keptApart } from "./fixed-member.js";
import {
	freeMembers,
	type MemberCheck,
	memberCheckQuestions,
	memberChecks,
	withoutFreeMembers,
} from "./member-check.js";
import { type Nomination, reaskedIdiomId, slotId } from "./nomination.js";
import { argmaxBesideNone, groupKey, partitionOf } from "./partition.js";

export { wordingOf } from "./fixed-member.js";

/** How the Locution Choice's answers become merges. */
export type LocutionSettings = {
	/** The `fixed` share each unit of a merge needs. */
	readonly floor: number;
	/** Whether a merged unit absorbs its members' fused pieces and a noun's opening preposition. */
	readonly absorb: boolean;
	/**
	 * The member check (`member-check.ts`): the `free` share with which a
	 * member of an assembled Locution leaves it. No member is asked when
	 * absent.
	 */
	readonly members?: number;
};

/** The setting X5 screened first: both units fixed at 0.5, absorbing. Production asks 0.6 (`units.ts`). */
export const locutionSettings: LocutionSettings = {
	floor: 0.5,
	absorb: true,
};

/** Below its floor, an idiom host share that still flags a merge. */
const idiomFlag = 0.25;
/** Below its floor, an expression Noul that still flags a merge. */
const expressionFlag = 0.5;
/** The fixedness that makes a piece a possible expression member: nomination's own flag for the `expressions` request. */
const fixedFlag = 0.3;

/** Two units of the membership the judge weighs as one wording. */
type MergeCandidate = {
	readonly left: readonly number[];
	readonly right: readonly number[];
};

/**
 * The pairs of units a sub-floor link joins: an idiom host share of at
 * least 0.25, first or re-asked, an expression Noul of at least 0.5, or a
 * fused word's pieces split between a unit of its own and one with a
 * possibly fixed word, between pieces of two units, neither a Saying, holding a bound piece, nor
 * one word the Rules keep apart.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
function mergeCandidates(
	nomination: Nomination,
	membership: Pick<Membership, "partition" | "edges">,
	bound: ReadonlySet<number>,
): MergeCandidate[] {
	const groupOf = new Map<number, readonly number[]>();
	for (const group of membership.partition)
		for (const id of group) groupOf.set(id, group);
	const saying = new Set(
		membership.edges
			.filter((edge) => edge.source === "saying")
			.flatMap((edge) => edge.pieces),
	);
	const open = (group: readonly number[]) =>
		group.every((id) => !bound.has(id) && !saying.has(id)) &&
		!keptApart(nomination, group);
	const pairs = new Map<string, MergeCandidate>();
	const flag = (a: number, b: number) => {
		const left = groupOf.get(a);
		const right = groupOf.get(b);
		if (!left || !right || left === right || !open(left) || !open(right))
			return;
		const [first, second] =
			(left[0] ?? 0) < (right[0] ?? 0) ? [left, right] : [right, left];
		pairs.set(`${groupKey(first)}|${groupKey(second)}`, {
			left: first,
			right: second,
		});
	};
	for (const slot of nomination.slots) {
		if (slot.kind !== "idiom") continue;
		for (const answer of [
			nomination.first[slotId(slot)],
			nomination.final[reaskedIdiomId(slot.piece.id)],
		]) {
			if (answer?.type !== "choice") continue;
			const top = argmaxBesideNone(answer.probabilities);
			if (top && top.share >= idiomFlag)
				flag(slot.piece.id, Number(top.key.slice(1)));
		}
	}
	for (const link of memberLinks(nomination))
		if (link.probability >= expressionFlag) flag(link.left, link.right);
	// de/fused-word-pieces: in a fixed expression both pieces of a fused
	// word are members, so a piece left alone beside a sibling in a unit
	// with a possibly fixed word (Im Allgemeinen gives [I] and [m,
	// Allgemeinen]) is a candidate.
	for (const [id, run] of fusedSiblings(nomination.sentence)) {
		if (groupOf.get(id)?.length !== 1) continue;
		for (const sibling of run) {
			const group = groupOf.get(sibling);
			if (
				group &&
				group.length > 1 &&
				group.some(
					(piece) => (nomination.fixed.get(piece) ?? 0) >= fixedFlag,
				)
			)
				flag(id, sibling);
		}
	}
	return [...pairs.values()].sort(
		(a, b) =>
			(a.left[0] ?? 0) - (b.left[0] ?? 0) ||
			(a.right[0] ?? 0) - (b.right[0] ?? 0),
	);
}

const mergeId = (candidate: MergeCandidate) =>
	`lc_${candidate.left.join("_")}_x_${candidate.right.join("_")}`;

/** The pieces a merge would make one unit: both units and what they absorb. */
function mergedPieces(nomination: Nomination, merge: MergeCandidate): number[] {
	const members = new Set([...merge.left, ...merge.right]);
	for (const edge of absorbedEdges(
		nomination,
		articleHosts(nomination),
		members,
	))
		for (const id of edge.pieces) members.add(id);
	return [...members].sort((a, b) => a - b);
}

/** The `locution` request's questions: a Choice per unit of each merge. */
function locutionQuestions(
	nomination: Nomination,
	merges: readonly MergeCandidate[],
): Questions {
	const questions: Questions = {};
	for (const merge of merges) {
		const whole = mergedPieces(nomination, merge);
		questions[`${mergeId(merge)}_l`] = fixedMemberQuestion(
			nomination,
			merge.left,
			merge.right,
			whole,
			"merge",
		);
		questions[`${mergeId(merge)}_r`] = fixedMemberQuestion(
			nomination,
			merge.right,
			merge.left,
			whole,
			"merge",
		);
	}
	return questions;
}

/** What the `locution` request was asked and answered. */
export type LocutionAnswers = {
	readonly merges: readonly MergeCandidate[];
	/** The members of assembled Locutions the member check asked about. */
	readonly checks: readonly MemberCheck[];
	readonly answers: Answers;
};

/**
 * The `locution` request over a membership the code rules have applied
 * to: the Locution Choice's merges, and with `members` the member check
 * of every assembled Locution.
 */
export function locutionPlan(
	nomination: Nomination,
	ruled: Membership,
	rules: readonly CodeRule[],
	members = false,
): Plan<LocutionAnswers> {
	const bound = boundPieces(nomination, ruled, rules);
	const merges = mergeCandidates(nomination, ruled, bound);
	const checks = members ? memberChecks(nomination, ruled, bound) : [];
	return {
		questions: {
			...locutionQuestions(nomination, merges),
			...memberCheckQuestions(nomination, checks),
		},
		read: (answers) => ({ merges, checks, answers }),
	};
}

/** Asks the `locution` request on its own. */
export const askLocutionChoice = (
	nomination: Nomination,
	ruled: Membership,
	ask: Ask,
	rules: readonly CodeRule[],
	members = false,
): Effect.Effect<LocutionAnswers, AskFailure> =>
	askPlan(
		ask,
		{ stage: "locution", state: nomination.state },
		locutionPlan(nomination, ruled, rules, members),
	);

/**
 * The links the answers accept under `settings`, each joining two pieces:
 * each unit's first piece that no free member took out.
 */
function acceptedMerges(
	located: LocutionAnswers,
	settings: LocutionSettings,
	out: ReadonlySet<number>,
): (readonly [number, number])[] {
	const links: (readonly [number, number])[] = [];
	const fixed = (id: string) => {
		const answer = located.answers[id];
		return answer?.type === "choice"
			? (answer.probabilities.fixed ?? 0)
			: 0;
	};
	for (const merge of located.merges)
		if (
			Math.min(
				fixed(`${mergeId(merge)}_l`),
				fixed(`${mergeId(merge)}_r`),
			) >= settings.floor
		) {
			const left = merge.left.find((id) => !out.has(id));
			const right = merge.right.find((id) => !out.has(id));
			if (left !== undefined && right !== undefined)
				links.push([left, right]);
		}
	return links;
}

/**
 * The membership with the accepted merges and without the free members:
 * the code rules applied again over `base` (membership before the rules)
 * plus each merge and what its members absorb, each merged unit a
 * Locution unless it holds a Saying, and then each free member out of its
 * unit (`withoutFreeMembers`).
 */
export function withLocutionChoice(
	nomination: Nomination,
	base: Membership,
	ruled: Membership,
	located: LocutionAnswers,
	rules: readonly CodeRule[],
	settings: LocutionSettings,
): Membership {
	const free =
		settings.members === undefined
			? []
			: freeMembers(located.checks, located.answers, settings.members);
	const out = new Set(free.flatMap(({ member }) => member));
	const links = acceptedMerges(located, settings, out);
	if (links.length === 0)
		return withoutFreeMembers(nomination, ruled, ruled, free);
	const merged: AssembledEdge[] = links.map((pieces) => ({
		pieces,
		source: "locution",
	}));
	const ids = nomination.sentence.pieces.map((piece) => piece.id);
	const kept = ruled.partition.flatMap((group) => [
		group.filter((id) => !out.has(id)),
		...free
			.filter(({ unit }) => groupKey(unit) === groupKey(group))
			.map(({ member }) => member),
	]);
	const joined = partitionOf(ids, [
		...kept.flatMap((group) =>
			group.slice(1).map((id) => [group[0] ?? id, id] as const),
		),
		...links,
	]).filter((group) => links.some(([left]) => group.includes(left)));
	const absorbed = settings.absorb
		? absorbedEdges(
				nomination,
				articleHosts(nomination),
				new Set(joined.flat()),
			)
		: [];
	const edges = [...base.edges, ...merged, ...absorbed];
	const result = withCodeRules(
		nomination,
		{
			...base,
			edges,
			partition: partitionOf(
				ids,
				edges.map(({ pieces }) => pieces),
			),
		},
		rules,
	);
	const locution = (group: readonly number[]) =>
		group.length > 1 &&
		joined.some((members) => members.some((id) => group.includes(id)));
	return withoutFreeMembers(
		nomination,
		{
			...result,
			familyOf: (group) => {
				const family = result.familyOf(group);
				return family !== "Saying" && locution(group)
					? "Locution"
					: family;
			},
		},
		ruled,
		free,
	);
}
