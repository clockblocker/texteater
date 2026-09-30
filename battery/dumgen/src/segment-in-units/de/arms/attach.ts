/**
 * Grouping by attachment: one Choice per piece, "which other piece forms one
 * unit with this one, or none", so a sentence of n pieces asks n questions
 * of n options instead of n² pairs. Code links a piece to its choice
 * (`argmax`) or to every piece whose probability in either direction clears
 * a threshold, and takes connected components.
 */
import type { Questions } from "promptsmith/typesafe";
import { choice, choiceOf } from "../../lab/jev.js";
import {
	type Arm,
	judgeRoutes,
	judgeState,
	type LinkJudgment,
	routeFrom,
} from "../arm.js";
import { outputOf, type Partition, partitionOf } from "../partition.js";
import { sentenceOf } from "../sentence.js";
import { thresholds } from "./pairs.js";

export const attachArm: Arm = {
	id: "attach",
	summary:
		"One Choice per piece over the other pieces or none; links above a threshold",
	async run(input, context) {
		const sentence = sentenceOf(input);
		const { state, ref } = judgeState(sentence, context);
		const questions: Questions = {};
		for (const piece of sentence.pieces)
			questions[`a_${piece.id}`] = choice(
				`In \`sentence\`, which other piece belongs to the same unit as ${ref(piece)}? A unit is one word with the pieces it owns (article, separable particle, auxiliaries, required reflexive, governed preposition), or one fixed multiword expression. If the unit has several other pieces, choose the one most closely tied to it.`,
				{
					...Object.fromEntries(
						sentence.pieces
							.filter((other) => other.id !== piece.id)
							.map((other) => [`p${other.id}`, other.text]),
					),
					none: `${piece.text} is a unit on its own`,
				},
			);
		const answers = await context.jev.ask({
			stage: "attach",
			state,
			questions,
			repetition: context.repetition,
			calls: context.calls,
		});
		const ids = sentence.pieces.map((piece) => piece.id);
		const probability = (from: number, to: number) =>
			choiceOf(answers, `a_${from}`).probabilities[`p${to}`] ?? 0;
		const links: LinkJudgment[] = [];
		for (const a of ids)
			for (const b of ids)
				if (a < b)
					links.push({
						left: a,
						right: b,
						probability: Math.max(
							probability(a, b),
							probability(b, a),
						),
					});
		const partitions = new Map<string, Partition>([
			[
				"argmax",
				partitionOf(
					ids,
					ids.flatMap((id) => {
						const picked = choiceOf(answers, `a_${id}`).choice;
						return picked === "none"
							? []
							: [[id, Number(picked.slice(1))] as const];
					}),
				),
			],
			...thresholds.map(
				(threshold) =>
					[
						`t${threshold}`,
						partitionOf(
							ids,
							links
								.filter((link) => link.probability >= threshold)
								.map(
									(link) => [link.left, link.right] as const,
								),
						),
					] as const,
			),
		]);
		const routes = await judgeRoutes(
			sentence,
			[...partitions.values()],
			context,
		);
		return {
			primary: "argmax",
			outputs: Object.fromEntries(
				[...partitions].map(([policy, partition]) => [
					policy,
					outputOf(sentence, partition, routeFrom(routes.identity)),
				]),
			),
			routes: [...routes.identity.values()],
			links,
		};
	},
};
