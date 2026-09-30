/**
 * Luna proposes the units and their routes in one structured-output call;
 * jev then verifies each multi-piece unit and each of its members and routes
 * every unit. Policies compose the two: Luna alone (the reference ceiling),
 * Luna's grouping with jev's routes, and jev vetoing or trimming Luna's
 * units at a threshold.
 */
import type { Questions } from "promptsmith/typesafe";
import { noul, noulOf } from "../../lab/jev.js";
import {
	type Arm,
	joinRefs,
	judgeRoutes,
	judgeState,
	option,
	routeFrom,
} from "../arm.js";
import { unitGuide } from "../guide.js";
import {
	groupKey,
	outputOf,
	type Partition,
	partitionOf,
} from "../partition.js";
import { allRoutes, type RouteKey, routeDescriptions } from "../routes.js";
import { pieceGloss, type Sentence, sentenceOf } from "../sentence.js";

const systemPrompt = `You segment one German sentence into units for a language learner's reader. A click on any word opens the biggest unit that contains it.

Input: the sentence and its numbered pieces. A written word may be split into pieces (zum = zu + m, where m stands for dem).

Output: units covering every piece exactly once. Each unit lists its piece numbers (discontinuous units are allowed: zog … an) and its route.

Rules:
${[unitGuide.task, ...unitGuide.lexeme_units, ...unitGuide.multiword_units].map((line) => `- ${line}`).join("\n")}

Routes (Family/Kind of the whole unit):
${allRoutes.map((key) => `- ${key}: ${routeDescriptions[key]}`).join("\n")}
- Unresolved: no defensible route (a nonce word, gibberish, a word broken off)`;

const outputSchema = {
	type: "object",
	properties: {
		units: {
			type: "array",
			items: {
				type: "object",
				properties: {
					pieces: { type: "array", items: { type: "integer" } },
					route: {
						type: "string",
						enum: [...allRoutes, "Unresolved"],
					},
				},
				required: ["pieces", "route"],
				additionalProperties: false,
			},
		},
	},
	required: ["units"],
	additionalProperties: false,
} as const;

type Proposal = {
	readonly units: readonly { pieces: number[]; route: string }[];
};

/** Luna's units as a partition: unknown ids dropped, repeats kept once, missing pieces alone. */
function proposalPartition(
	sentence: Sentence,
	proposal: Proposal,
): { partition: Partition; routes: Map<string, RouteKey> } {
	const seen = new Set<number>();
	const groups: number[][] = [];
	const routes = new Map<string, RouteKey>();
	for (const unit of proposal.units ?? []) {
		const ids = [...new Set(unit.pieces)]
			.filter(
				(id) =>
					id >= 1 && id <= sentence.pieces.length && !seen.has(id),
			)
			.sort((a, b) => a - b);
		if (ids.length === 0) continue;
		for (const id of ids) seen.add(id);
		groups.push(ids);
		routes.set(
			groupKey(ids),
			allRoutes.includes(unit.route) ? unit.route : "Unresolved",
		);
	}
	for (const piece of sentence.pieces)
		if (!seen.has(piece.id)) {
			groups.push([piece.id]);
			routes.set(groupKey([piece.id]), "Unresolved");
		}
	groups.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
	return { partition: groups, routes };
}

const unitId = (group: readonly number[]) => `u_${group.join("_")}`;
const memberId = (group: readonly number[], id: number) =>
	`m_${group.join("_")}__${id}`;

export const lunaArm: Arm = {
	id: "luna",
	summary:
		"Luna proposes units and routes; jev verifies units and members and routes them",
	usesLuna: true,
	async run(input, context) {
		if (!context.luna) throw Error("The luna arm needs a Luna client");
		const sentence = sentenceOf(input);
		const proposal = (await context.luna.generate({
			stage: "propose",
			systemPrompt,
			input: {
				sentence: sentence.text,
				pieces: sentence.pieces.map((piece) => ({
					id: piece.id,
					piece: pieceGloss(piece),
				})),
			},
			outputSchema,
			repetition: context.repetition,
			calls: context.calls,
			effort: option(context.options, "effort", "none"),
		})) as Proposal;
		const { partition, routes: lunaRoutes } = proposalPartition(
			sentence,
			proposal,
		);
		const { state, ref } = judgeState(sentence, context);
		const multi = partition.filter((group) => group.length > 1);
		const questions: Questions = {};
		for (const group of multi) {
			questions[unitId(group)] = noul(
				`In \`sentence\`, do the pieces ${joinRefs(sentence, ref, group)} together form one unit: one word with the pieces it owns (article, separable particle, auxiliaries, required reflexive, governed preposition), or one fixed multiword expression, with no free word added and no fixed word left out?`,
			);
			for (const id of group)
				questions[memberId(group, id)] = noul(
					`In \`sentence\`, is ${joinRefs(sentence, ref, [id])} a member of the unit formed by ${joinRefs(sentence, ref, group)}, rather than a free word of its own?`,
				);
		}
		const answers = await context.jev.ask({
			stage: "verify",
			state,
			questions,
			repetition: context.repetition,
			calls: context.calls,
		});
		const ids = sentence.pieces.map((piece) => piece.id);
		const partitions = new Map<string, Partition>([["luna", partition]]);
		for (const floor of [0.3, 0.5, 0.7])
			partitions.set(
				`veto${floor}`,
				partition.flatMap((group) =>
					group.length > 1 && noulOf(answers, unitId(group)) < floor
						? group.map((id) => [id])
						: [group],
				),
			);
		partitions.set(
			"trim0.5",
			partitionOf(
				ids,
				multi.flatMap((group) => {
					const kept = group.filter(
						(id) => noulOf(answers, memberId(group, id)) >= 0.5,
					);
					return kept
						.slice(1)
						.map((id) => [kept[0] ?? id, id] as const);
				}),
			),
		);
		const routes = await judgeRoutes(
			sentence,
			[...partitions.values()],
			context,
		);
		const jevRoute = routeFrom(routes.identity);
		const lunaFirst = (group: readonly number[]) =>
			lunaRoutes.get(groupKey(group)) ?? jevRoute(group);
		const outputs = {
			luna: outputOf(
				sentence,
				partition,
				(group) => lunaRoutes.get(groupKey(group)) ?? "Unresolved",
			),
			"luna+jevroute": outputOf(sentence, partition, jevRoute),
			...Object.fromEntries(
				[...partitions]
					.filter(([policy]) => policy !== "luna")
					.flatMap(([policy, groups]) => [
						[policy, outputOf(sentence, groups, jevRoute)],
						[
							`${policy}+lunaroute`,
							outputOf(sentence, groups, lunaFirst),
						],
					]),
			),
		};
		return {
			primary: "luna",
			outputs,
			routes: [...routes.identity.values()],
		};
	},
};
