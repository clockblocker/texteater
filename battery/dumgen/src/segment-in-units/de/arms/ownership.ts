/**
 * Every piece chooses the first attested member of its biggest unit. Code
 * groups equal labels directly, without following pointers or joining links.
 * A second request checks each exact group and routes it in parallel.
 */
import type { Questions } from "promptsmith/typesafe";
import type { SegmentInUnitsInput } from "../../../evaluation/spec-corpus/segment-in-units.js";
import { choice, choiceOf } from "../../lab/jev.js";
import {
	type Arm,
	type ArmContext,
	type ArmResult,
	judgeState,
} from "../arm.js";
import { groupKey, outputOf } from "../partition.js";
import { pieceGloss, sentenceOf } from "../sentence.js";
import { judgeUnitGroups, type UnitGroupJudgments } from "../unit-groups.js";

export type OwnershipJudgment = {
	readonly piece: number;
	readonly owner?: number;
	readonly share: number;
	readonly confidence: number;
	/** Source uncertainty or a Choice exceeding the 255-option limit. */
	readonly forced: boolean;
};

export type OwnershipResult = ArmResult & {
	readonly inventoryDecisions: UnitGroupJudgments["inventoryDecisions"];
	readonly owners: readonly OwnershipJudgment[];
	readonly support: readonly {
		readonly group: readonly number[];
		readonly probability: number;
	}[];
	/** Raw diagnostic candidate groups before route/support acceptance and later cell refinement. */
	readonly identityHints?: readonly {
		readonly sourceSegment: number;
		readonly candidateGroup: string;
		readonly share: number;
		readonly confidence: number;
	}[];
};

const ownerId = (piece: number) => `owner_${piece}`;

/**
 * The optional source indices let the raw-text adapter preserve an uncertain
 * split as its own Unresolved unit without changing the gold harness input.
 */
export async function runOwnership(
	input: SegmentInUnitsInput,
	context: ArmContext,
	unresolvedSourceSegments: readonly number[] = [],
): Promise<OwnershipResult> {
	const sentence = sentenceOf(input);
	const { state, ref } = judgeState(sentence, context);
	const sourceUnresolved = new Set(unresolvedSourceSegments);
	const forced = new Set(
		sentence.pieces
			.filter((piece) => sourceUnresolved.has(piece.segment))
			.map((piece) => piece.id),
	);
	const questions: Questions = {};
	const candidatesByPiece = new Map<number, Set<number>>();
	for (const piece of sentence.pieces) {
		if (forced.has(piece.id)) continue;
		const candidates = sentence.pieces.filter(
			(candidate) =>
				candidate.id <= piece.id && !forced.has(candidate.id),
		);
		// Never truncate the possible owners to fit a request. The fallback
		// preserves coverage, and the final check can reject missing members.
		if (candidates.length + 1 > 255) {
			forced.add(piece.id);
			continue;
		}
		candidatesByPiece.set(
			piece.id,
			new Set(candidates.map((candidate) => candidate.id)),
		);
		questions[ownerId(piece.id)] = choice(
			`In \`sentence\`, which listed piece is the first attested member, in source order, of the biggest unit containing ${ref(piece)}? Choose that same first member for every piece of one unit, even across intervening free words. An article or auxiliary may be the first member; the label does not name the unit's grammatical Head. Choose p${piece.id} when ${ref(piece)} is itself the first member, including a unit on its own. Apply the supplied unit policy.`,
			{
				...Object.fromEntries(
					candidates.map((candidate) => [
						`p${candidate.id}`,
						`${pieceGloss(candidate)} (p${candidate.id})`,
					]),
				),
				Unresolved: "No listed first member can be defensibly selected",
			},
		);
	}
	const ownerAnswers = await context.jev.ask({
		stage: "ownership",
		state,
		questions,
		repetition: context.repetition,
		calls: context.calls,
	});
	const owners: OwnershipJudgment[] = sentence.pieces.map((piece) => {
		if (forced.has(piece.id))
			return { piece: piece.id, share: 0, confidence: 0, forced: true };
		const answer = choiceOf(ownerAnswers, ownerId(piece.id));
		const owner = /^p\d+$/u.test(answer.choice)
			? Number(answer.choice.slice(1))
			: undefined;
		return {
			piece: piece.id,
			...(owner !== undefined &&
			candidatesByPiece.get(piece.id)?.has(owner)
				? { owner }
				: {}),
			share: answer.probabilities[answer.choice] ?? 0,
			confidence: answer.confidence,
			forced: false,
		};
	});
	const byOwner = new Map<number, number[]>();
	for (const judgment of owners) {
		const label = judgment.owner ?? judgment.piece;
		const group = byOwner.get(label) ?? [];
		group.push(judgment.piece);
		byOwner.set(label, group);
	}
	const groups = [...byOwner.values()].sort(
		(left, right) => (left[0] ?? 0) - (right[0] ?? 0),
	);
	const selfOwned = (group: readonly number[]) => {
		const first = owners[(group[0] ?? 0) - 1];
		const owner = first?.owner;
		return (
			owner !== undefined &&
			group[0] === owner &&
			owners[owner - 1]?.owner === owner
		);
	};
	const known = groups.filter((group) => !group.some((id) => forced.has(id)));
	const { routes, closedRoutes, support, identityHints, inventoryDecisions } =
		await judgeUnitGroups(sentence, known, context);
	const closed = context.options.closed === "1";
	const supportByGroup = new Map(
		support.map((judgment) => [
			groupKey(judgment.group),
			judgment.probability,
		]),
	);
	const policies = [
		{ name: "raw", self: false, support: 0, route: 0 },
		{ name: "self", self: true, support: 0, route: 0 },
		...[0.5, 0.7, 0.8].map((floor) => ({
			name: `support@${floor}`,
			self: true,
			support: floor,
			route: 0,
		})),
		{ name: "support@0.7+route@0.5", self: true, support: 0.7, route: 0.5 },
		{ name: "support@0.8+route@0.8", self: true, support: 0.8, route: 0.8 },
	];
	const outputs: ArmResult["outputs"] = Object.fromEntries(
		policies.flatMap((policy) =>
			(closed ? [false, true] : [false]).map((withClosed) => [
				`${policy.name}${withClosed ? "+closed" : ""}`,
				outputOf(sentence, groups, (group) => {
					const key = groupKey(group);
					const judgment = routes.get(key);
					if (
						group.some((id) => forced.has(id)) ||
						(policy.self && !selfOwned(group)) ||
						(supportByGroup.get(key) ?? 0) < policy.support ||
						!judgment
					)
						return "Unresolved";
					const selected =
						(withClosed ? closedRoutes.get(key) : undefined) ??
						judgment;
					return selected.confidence < policy.route
						? "Unresolved"
						: selected.choice;
				}),
			]),
		),
	);
	return {
		primary: `support@0.7${closed ? "+closed" : ""}`,
		outputs,
		routes: [...routes.values()],
		owners,
		inventoryDecisions,
		support,
		...(identityHints.length > 0 ? { identityHints } : {}),
	};
}

export const ownershipArm = {
	id: "ownership",
	summary:
		"Canonical owner Choice, direct grouping, then exact membership and route judgments",
	run: runOwnership,
} satisfies Arm;
