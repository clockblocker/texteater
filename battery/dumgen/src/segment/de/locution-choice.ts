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
 * No merge touches a piece a code rule decides (`boundPieces`) or a
 * Saying, nor a unit of one word the Rules keep apart whatever the judge
 * reads: nicht (de/nicht-is-part), a modal (de/modal-is-a-verb), and a
 * pronoun or determiner other than a reflexive, since a pronoun joins a
 * Locution only as its lexical reflexive (de/verb-owns-its-scattered-members)
 * or an object es that das cannot replace (de/fixed-member-test), which
 * nomination's own links decide. A Sentence with no candidate asks nothing.
 *
 * The first version asked one Choice over the whole wording and merged on
 * its `whole` share; it read free objects and pronouns as fixed (df28add5).
 * The second also asked bleiben with an infinitive
 * (de/bleiben-with-an-infinitive), which the judge never accepted (cfd482be).
 */
import { closedVerbForms } from "dumspec/inventories";
import type { Questions } from "promptsmith/typesafe";
import { type Answers, type Ask, askAny, choice } from "../ask.js";
import {
	type AssembledEdge,
	absorbedEdges,
	articleHosts,
	type Membership,
} from "./assembly.js";
import { fusedSiblings, reflexiveForms } from "./candidates.js";
import { boundPieces, type CodeRule, withCodeRules } from "./code-rules.js";
import { type Nomination, reaskedIdiomId, slotId } from "./nomination.js";
import { argmax, groupKey, partitionOf } from "./partition.js";
import { joinRefs } from "./sentence.js";

/** How the Locution Choice's answers become merges. */
export type LocutionSettings = {
	/** The `fixed` share each unit of a merge needs. */
	readonly floor: number;
	/** Whether a merged unit absorbs its members' fused pieces and a noun's opening preposition. */
	readonly absorb: boolean;
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
export type MergeCandidate = {
	readonly left: readonly number[];
	readonly right: readonly number[];
};

const modalForms = new Set(
	["dürfen", "können", "mögen", "müssen", "sollen", "wollen"].flatMap(
		(modal) => closedVerbForms[modal] ?? [],
	),
);

/** A unit of one word the Rules keep out of any Locution the judge proposes: nicht, a modal, a non-reflexive pronoun or determiner. */
function keptApart(
	nomination: Pick<Nomination, "sentence" | "inventory">,
	group: readonly number[],
): boolean {
	const [only] = group;
	const piece =
		group.length === 1 && only !== undefined
			? nomination.sentence.pieces[only - 1]
			: undefined;
	if (!piece) return false;
	const word = piece.text.toLowerCase();
	return (
		word === "nicht" ||
		modalForms.has(word) ||
		(!reflexiveForms.has(word) &&
			nomination.inventory.identityCandidates(piece.text).length > 0)
	);
}

/**
 * The pairs of units a sub-floor link joins: an idiom host share of at
 * least 0.25, first or re-asked, an expression Noul of at least 0.5, or a
 * fused word's pieces split between a unit of its own and one with a
 * possibly fixed word, between pieces of two units, neither a Saying, holding a bound piece, nor
 * one word the Rules keep apart.
 */
export function mergeCandidates(
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
			const top = argmax(
				Object.fromEntries(
					Object.entries(answer.probabilities).filter(
						([key]) => key !== "none",
					),
				),
			);
			if (top.key && top.share >= idiomFlag)
				flag(slot.piece.id, Number(top.key.slice(1)));
		}
	}
	for (const link of nomination.links)
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

export const mergeId = (candidate: MergeCandidate) =>
	`lc_${candidate.left.join("_")}_x_${candidate.right.join("_")}`;

/** The pieces as written, with … where pieces outside them stand between. */
export function wordingOf(
	nomination: Pick<Nomination, "sentence">,
	ids: readonly number[],
): string {
	const { pieces, segments } = nomination.sentence;
	const sorted = [...ids].sort((a, b) => a - b);
	let text = "";
	for (const [position, id] of sorted.entries()) {
		const piece = pieces[id - 1];
		if (!piece) continue;
		const previous = pieces[(sorted[position - 1] ?? 0) - 1];
		if (previous && previous.id === piece.id - 1)
			text += segments
				.slice(previous.segment + 1, piece.segment)
				.map((segment) => segment.text)
				.join("");
		else if (previous) text += " … ";
		text += piece.text;
	}
	return text;
}

const memberCriteria = {
	fixed: "A fixed part of one established expression with the other words, an idiom, support-verb collocation, fixed phrase or routine formula: the expression needs this very word, and an ordinary synonym or another word of its kind would break it (Kauf in nahm … in Kauf; Holzweg in war auf dem Holzweg)",
	free: "A free part: a subject, object, complement or modifier that the expression only takes, where another word of its kind could stand in the same sense, das for es included (die Kosten in nahm die Kosten in Kauf)",
	literal:
		"The words are meant literally here, so no expression joins them (Holzweg in ging auf dem Holzweg durch den Wald)",
	none: "No established expression joins these words (Hut in kaufte einen Hut)",
};

/** The pieces a merge would make one unit: both units and what they absorb. */
export function mergedPieces(
	nomination: Nomination,
	merge: MergeCandidate,
): number[] {
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
export function locutionQuestions(
	nomination: Nomination,
	merges: readonly MergeCandidate[],
): Questions {
	const { sentence, ref } = nomination;
	const questions: Questions = {};
	for (const merge of merges) {
		const whole = wordingOf(nomination, mergedPieces(nomination, merge));
		for (const [side, unit, other] of [
			["l", merge.left, merge.right],
			["r", merge.right, merge.left],
		] as const) {
			const wording = wordingOf(nomination, unit);
			questions[`${mergeId(merge)}_${side}`] = choice(
				`In \`sentence\`, ${joinRefs(sentence, ref, unit)} ("${wording}") may belong with ${joinRefs(sentence, ref, other)} ("${wordingOf(nomination, other)}") to one established multiword expression, "${whole}". What is "${wording}" there? A word's article, auxiliary, particle or reflexive counts with that word.`,
				memberCriteria,
			);
		}
	}
	return questions;
}

/** What the `locution` request was asked and answered. */
export type LocutionAnswers = {
	readonly merges: readonly MergeCandidate[];
	readonly answers: Answers;
};

/** Asks the `locution` request over a membership the code rules have applied to. */
export async function askLocutionChoice(
	nomination: Nomination,
	ruled: Membership,
	ask: Ask,
	rules: readonly CodeRule[],
): Promise<LocutionAnswers> {
	const bound = boundPieces(nomination, ruled, rules);
	const merges = mergeCandidates(nomination, ruled, bound);
	const answers = await askAny(ask, {
		stage: "locution",
		state: nomination.state,
		questions: locutionQuestions(nomination, merges),
	});
	return { merges, answers };
}

/** The links the answers accept under `settings`, each joining two pieces. */
export function acceptedMerges(
	located: LocutionAnswers,
	settings: LocutionSettings,
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
		)
			links.push([merge.left[0] ?? 0, merge.right[0] ?? 0]);
	return links;
}

/**
 * The membership with the accepted merges: the code rules applied again
 * over `base` (membership before the rules) plus each merge and what its
 * members absorb, each merged unit a Locution unless it holds a Saying.
 */
export function withLocutionChoice(
	nomination: Nomination,
	base: Membership,
	ruled: Membership,
	located: LocutionAnswers,
	rules: readonly CodeRule[],
	settings: LocutionSettings,
): Membership {
	const links = acceptedMerges(located, settings);
	if (links.length === 0) return ruled;
	const merged: AssembledEdge[] = links.map((pieces) => ({
		pieces,
		source: "locution",
	}));
	const ids = nomination.sentence.pieces.map((piece) => piece.id);
	const joined = partitionOf(ids, [
		...ruled.partition.flatMap((group) =>
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
	return {
		...result,
		familyOf: (group) => {
			const family = result.familyOf(group);
			return family !== "Saying" && locution(group) ? "Locution" : family;
		},
	};
}
