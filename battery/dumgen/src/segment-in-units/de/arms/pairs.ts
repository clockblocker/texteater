/**
 * Grouping by judging pairs of pieces, the legacy intake's approach.
 * `pairwise` asks one Noul per unordered pair; `anchored` asks from every
 * anchor whether each other piece belongs to its unit and averages both
 * directions. Code links the pairs above a threshold and takes connected
 * components; one policy per threshold, all from the same answers. A second
 * request routes every unit any threshold produced.
 */
import type { Questions } from "promptsmith/typesafe";
import { choice, choiceOf, noul, noulOf } from "../../lab/jev.js";
import {
	type Arm,
	type ArmContext,
	judgeRoutes,
	judgeState,
	type LinkJudgment,
	routeFrom,
} from "../arm.js";
import { outputOf, type Partition, partitionOf } from "../partition.js";
import { type Sentence, sentenceOf } from "../sentence.js";

export const thresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8] as const;

const unitDefinition =
	"one word with the pieces it owns (article, separable particle, auxiliaries, required reflexive, governed preposition), or one fixed multiword expression";

async function pairLinks(
	sentence: Sentence,
	context: ArmContext,
	directed: boolean,
): Promise<LinkJudgment[]> {
	const { state, ref } = judgeState(sentence, context);
	const questions: Questions = {};
	const { pieces } = sentence;
	for (const a of pieces)
		for (const b of pieces) {
			if (a.id === b.id) continue;
			if (directed)
				questions[`m_${a.id}_${b.id}`] = choice(
					`In \`sentence\`, is ${ref(b)} a member of the same unit as ${ref(a)}? A unit is ${unitDefinition}.`,
					{
						Include: "It is a member of that same unit",
						Exclude:
							"It belongs to another unit or is free material",
						Unresolved:
							"Its membership cannot be defensibly decided",
					},
				);
			else if (a.id < b.id)
				questions[`p_${a.id}_${b.id}`] = noul(
					`In \`sentence\`, do ${ref(a)} and ${ref(b)} belong to the same unit? A unit is ${unitDefinition}.`,
				);
		}
	const answers = await context.jev.ask({
		stage: directed ? "anchored" : "pairwise",
		state,
		questions,
		repetition: context.repetition,
		calls: context.calls,
	});
	const links: LinkJudgment[] = [];
	for (const a of pieces)
		for (const b of pieces) {
			if (a.id >= b.id) continue;
			const probability = directed
				? ((choiceOf(answers, `m_${a.id}_${b.id}`).probabilities
						.Include ?? 0) +
						(choiceOf(answers, `m_${b.id}_${a.id}`).probabilities
							.Include ?? 0)) /
					2
				: noulOf(answers, `p_${a.id}_${b.id}`);
			links.push({ left: a.id, right: b.id, probability });
		}
	return links;
}

export function thresholdPartitions(
	sentence: Sentence,
	links: readonly LinkJudgment[],
): Map<string, Partition> {
	const ids = sentence.pieces.map((piece) => piece.id);
	return new Map(
		thresholds.map((threshold) => [
			`t${threshold}`,
			partitionOf(
				ids,
				links
					.filter((link) => link.probability >= threshold)
					.map((link) => [link.left, link.right] as const),
			),
		]),
	);
}

function pairArm(id: string, directed: boolean): Arm {
	return {
		id,
		summary: directed
			? "Anchored membership Choice for every ordered pair, averaged; components at a threshold"
			: "One Noul per unordered pair; components at a threshold",
		async run(input, context) {
			const sentence = sentenceOf(input);
			const links = await pairLinks(sentence, context, directed);
			const partitions = thresholdPartitions(sentence, links);
			const routes = await judgeRoutes(
				sentence,
				[...partitions.values()],
				context,
			);
			const outputs = Object.fromEntries(
				[...partitions].map(([policy, partition]) => [
					policy,
					outputOf(sentence, partition, routeFrom(routes.identity)),
				]),
			);
			return {
				primary: "t0.5",
				outputs,
				routes: [...routes.identity.values()],
				links,
			};
		},
	};
}

export const pairwiseArm = pairArm("pairwise", false);
export const anchoredArm = pairArm("anchored", true);
