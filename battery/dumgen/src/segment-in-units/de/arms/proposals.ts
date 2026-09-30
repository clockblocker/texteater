/** One bounded text proposal call supplies complete alternatives; Jev judges exact groups. */
import { z } from "zod";
import {
	segmentInUnitsInputSchema,
	type SegmentInUnitsInput,
} from "../../../evaluation/spec-corpus/segment-in-units.js";
import type { Arm, ArmContext, ArmResult } from "../arm.js";
import { ruleStatements, unitGuide } from "../guide.js";
import { groupKey, outputOf, type Partition, singletons } from "../partition.js";
import { pieceGloss, sentenceOf } from "../sentence.js";
import { judgeUnitGroups, type UnitGroupJudgments } from "../unit-groups.js";

export const proposalLimits = {
	pieces: 80,
	characters: 4096,
	partitions: 3,
	groups: 80,
	outputTokens: 4096,
	timeoutMs: 120_000,
} as const;

const responseSchema = z.strictObject({
	proposals: z.array(z.unknown()).min(1).max(proposalLimits.partitions),
});
const partitionSchema = z.strictObject({
	groups: z.array(z.array(z.int()).min(1).max(proposalLimits.pieces)).min(1).max(proposalLimits.groups),
});
const outputSchema = {
	type: "object",
	properties: {
		proposals: {
			type: "array",
			minItems: 1,
			maxItems: proposalLimits.partitions,
			items: {
				type: "object",
				properties: {
					groups: {
						type: "array",
						minItems: 1,
						maxItems: proposalLimits.groups,
						items: {
							type: "array",
							minItems: 1,
							maxItems: proposalLimits.pieces,
							items: { type: "integer", minimum: 1, maximum: proposalLimits.pieces },
						},
					},
				},
				required: ["groups"],
				additionalProperties: false,
			},
		},
	},
	required: ["proposals"],
	additionalProperties: false,
} as const;

const systemPrompt = `Propose exact biggest-unit memberships for one German sentence in a learner's reader. Input supplies source pieces with dense numeric ids; separate pieces of a fused written word are separate source coordinates. Return one to three distinct complete partitions. First give your best analysis; add another partition only when a genuinely plausible grouping differs. Every partition must cover every supplied id exactly once, including singleton units; discontinuous groups are allowed. Never include punctuation or invent ids, expand source members, or omit an uncertain word. Members marked sourceUnresolved must remain singleton. Give memberships only; a separate judge selects language, Family and Kind. Use the supplied authoritative German Rules and unit guide. Do not return explanations.`;

export type ProposalAdmission = {
	readonly index: number;
	readonly admitted: boolean;
	readonly reason?: "invalid-response" | "invalid-partition" | "unknown-piece" | "duplicate-piece" | "missing-piece" | "uncertain-source-group" | "duplicate-partition";
};

export type ProposalsResult = ArmResult & {
	readonly admission: readonly ProposalAdmission[];
	readonly proposals: readonly { readonly index: number; readonly groups: Partition; readonly meanSupport: number }[];
	readonly candidateCoverage: {
		readonly totalPieces: number;
		readonly candidatePieces: number;
		readonly candidateGroups: Partition;
		readonly admittedPartitions: number;
		readonly droppedPartitions: number;
	};
	readonly chosenPartition: number | null;
	readonly support: UnitGroupJudgments["support"];
	readonly identityHints: UnitGroupJudgments["identityHints"];
	readonly inventoryDecisions: UnitGroupJudgments["inventoryDecisions"];
	readonly fallbackReason?: "empty-source" | "source-limit" | "uncertain-source" | "no-admitted-partition";
};

/** Strict admission changes ordering only, never membership or source coverage. */
export function admitProposals(
	response: unknown,
	pieceCount: number,
	forced: ReadonlySet<number> = new Set(),
): { readonly admission: readonly ProposalAdmission[]; readonly proposals: readonly { readonly index: number; readonly groups: Partition }[] } {
	const parsed = responseSchema.safeParse(response);
	if (!parsed.success) return { admission: [{ index: -1, admitted: false, reason: "invalid-response" }], proposals: [] };
	const admission: ProposalAdmission[] = [];
	const proposals: { index: number; groups: Partition }[] = [];
	const keys = new Set<string>();
	for (const [index, proposal] of parsed.data.proposals.entries()) {
		const parsedPartition = partitionSchema.safeParse(proposal);
		let reason: ProposalAdmission["reason"] = parsedPartition.success ? undefined : "invalid-partition";
		const seen = new Set<number>();
		const groups = parsedPartition.success ? parsedPartition.data.groups.map((group) => [...group].sort((a, b) => a - b)).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0)) : [];
		if (!reason)
			for (const group of groups) {
				for (const id of group) {
					if (id < 1 || id > pieceCount) reason ??= "unknown-piece";
					if (seen.has(id)) reason ??= "duplicate-piece";
					seen.add(id);
				}
				if (group.length !== 1 && group.some((id) => forced.has(id))) reason ??= "uncertain-source-group";
			}
		if (!reason && seen.size !== pieceCount) reason = "missing-piece";
		const key = groups.map(groupKey).join(";");
		if (!reason && keys.has(key)) reason = "duplicate-partition";
		admission.push({ index, admitted: reason === undefined, ...(reason === undefined ? {} : { reason }) });
		if (!reason) {
			keys.add(key);
			proposals.push({ index, groups });
		}
	}
	return { admission, proposals };
}

/** The source adapter can supply unresolved original Segment coordinates. */
export async function runProposals(
	input: SegmentInUnitsInput,
	context: ArmContext,
	unresolvedSourceSegments: readonly number[] = [],
): Promise<ProposalsResult> {
	if (!segmentInUnitsInputSchema.safeParse(input).success) throw Error("Invalid proposal source");
	const sentence = sentenceOf(input);
	const pieceBySegment = new Map(sentence.pieces.map((piece) => [piece.segment, piece.id]));
	const forced = new Set<number>();
	for (const segment of unresolvedSourceSegments) {
		const id = pieceBySegment.get(segment);
		if (id === undefined) throw Error(`Invalid unresolved source Segment ${segment}`);
		forced.add(id);
	}
	const fallback = (reason: ProposalsResult["fallbackReason"], admission: readonly ProposalAdmission[] = []): ProposalsResult => ({
		primary: "fallback",
		outputs: { fallback: outputOf(sentence, singletons(sentence), () => "Unresolved") },
		admission,
		proposals: [],
		candidateCoverage: { totalPieces: sentence.pieces.length, candidatePieces: 0, candidateGroups: [], admittedPartitions: 0, droppedPartitions: admission.length },
		chosenPartition: null,
		support: [],
		identityHints: [],
		inventoryDecisions: [],
		fallbackReason: reason,
	});
	if (sentence.pieces.length === 0) return fallback("empty-source");
	if (sentence.pieces.length > proposalLimits.pieces || sentence.text.length > proposalLimits.characters) return fallback("source-limit");
	if (forced.size === sentence.pieces.length) return fallback("uncertain-source");
	if (!context.luna) throw Error("The proposals arm needs a Luna client");
	const response = await context.luna.generate({
		stage: "proposals",
		systemPrompt,
		input: {
			sentence: sentence.text,
			pieces: sentence.pieces.map((piece) => ({ id: piece.id, sourceSegment: piece.segment, piece: pieceGloss(piece), sourceUnresolved: forced.has(piece.id) })),
			unitGuide,
			rules: ruleStatements(),
		},
		outputSchema,
		repetition: context.repetition,
		calls: context.calls,
		maxRetries: 0,
		maxOutputTokens: proposalLimits.outputTokens,
		timeoutMs: proposalLimits.timeoutMs,
	});
	const admitted = admitProposals(response, sentence.pieces.length, forced);
	if (admitted.proposals.length === 0) return fallback("no-admitted-partition", admitted.admission);
	const unique = new Map<string, readonly number[]>();
	for (const proposal of admitted.proposals)
		for (const group of proposal.groups) unique.set(groupKey(group), group);
	const groups = [...unique.values()];
	const judged = await judgeUnitGroups(sentence, groups.filter((group) => !group.some((id) => forced.has(id))), context, "proposals-final");
	const support = new Map(judged.support.map((judgment) => [groupKey(judgment.group), judgment.probability]));
	const proposals = admitted.proposals.map((proposal) => ({
		...proposal,
		meanSupport: proposal.groups.reduce((sum, group) => sum + group.length * (support.get(groupKey(group)) ?? 0), 0) / sentence.pieces.length,
	}));
	// Membership stays a complete admitted partition. Equal scores keep the
	// proposer's original rank, and thresholds only abstain on route evidence.
	const chosen = proposals.reduce((best, proposal) => proposal.meanSupport > best.meanSupport ? proposal : best);
	const policies = [
		{ name: "first/raw", proposal: proposals[0] ?? chosen, support: 0, route: 0 },
		{ name: "best-support/raw", proposal: chosen, support: 0, route: 0 },
		...[0.5, 0.7, 0.8].map((floor) => ({ name: `best-support@${floor}`, proposal: chosen, support: floor, route: 0 })),
		{ name: "best-support@0.7+route@0.5", proposal: chosen, support: 0.7, route: 0.5 },
	];
	const outputs = Object.fromEntries(policies.flatMap((policy) =>
		(context.options.closed === "1" ? [false, true] : [false]).map((closed) => [
			`${policy.name}${closed ? "+closed" : ""}`,
			outputOf(sentence, policy.proposal.groups, (group) => {
				const key = groupKey(group);
				const route = (closed ? judged.closedRoutes.get(key) : undefined) ?? judged.routes.get(key);
				return group.some((id) => forced.has(id)) || (support.get(key) ?? 0) < policy.support || !route || route.confidence < policy.route ? "Unresolved" : route.choice;
			}),
		]),
	));
	return {
		primary: `best-support@0.7${context.options.closed === "1" ? "+closed" : ""}`,
		outputs,
		routes: [...judged.routes.values()],
		admission: admitted.admission,
		proposals,
		candidateCoverage: { totalPieces: sentence.pieces.length, candidatePieces: new Set(groups.flat()).size, candidateGroups: groups, admittedPartitions: proposals.length, droppedPartitions: admitted.admission.filter((item) => !item.admitted).length },
		chosenPartition: chosen.index,
		support: judged.support,
		identityHints: judged.identityHints,
		inventoryDecisions: judged.inventoryDecisions,
	};
}

export const proposalsArm = {
	id: "proposals",
	summary: "Bounded alternative complete partitions from Luna, with exact group judgments and whole-partition selection",
	usesLuna: true,
	run: runProposals,
} satisfies Arm;
