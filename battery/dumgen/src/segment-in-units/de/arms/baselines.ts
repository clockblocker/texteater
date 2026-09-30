/**
 * The two baselines: every piece its own unit (the grouping floor, and route
 * accuracy on one-word units), and the gold grouping with jev routing only
 * (route accuracy with grouping errors removed).
 */
import { type Arm, judgeRoutes, routeFrom } from "../arm.js";
import { outputOf, partitionOfUnits, singletons } from "../partition.js";
import { sentenceOf } from "../sentence.js";

export const singletonArm: Arm = {
	id: "singleton",
	summary: "Every piece its own unit; one route Choice per piece",
	async run(input, context) {
		const sentence = sentenceOf(input);
		const partition = singletons(sentence);
		const routes = await judgeRoutes(sentence, [partition], context);
		return {
			primary: "identity",
			outputs: {
				open: outputOf(sentence, partition, routeFrom(routes.open)),
				identity: outputOf(
					sentence,
					partition,
					routeFrom(routes.identity),
				),
			},
			routes: [...routes.identity.values()],
		};
	},
};

export const oracleArm: Arm = {
	id: "oracle",
	summary: "Gold grouping; jev routes each unit",
	needsOracle: true,
	async run(input, context) {
		if (!context.oracle) throw Error("The oracle arm needs the gold units");
		const sentence = sentenceOf(input);
		const partition = partitionOfUnits(sentence, context.oracle.units);
		const routes = await judgeRoutes(sentence, [partition], context);
		return {
			primary: "identity",
			outputs: {
				open: outputOf(sentence, partition, routeFrom(routes.open)),
				identity: outputOf(
					sentence,
					partition,
					routeFrom(routes.identity),
				),
			},
			routes: [...routes.identity.values()],
		};
	},
};
