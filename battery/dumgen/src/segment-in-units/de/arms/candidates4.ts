/**
 * candidates4 with `final=1 closed=1`, the configuration fa59d50e's runs
 * used and the production unit stage starts from (#843). Every policy
 * reads the same nomination and route answers:
 *
 * - `v3`: candidates v3's `full@0.7`, with neither step 0 nor closed-class
 *   identity.
 * - `step0`, `step0+saying` (the Saying Choice at 0.5) and
 *   `step0+saying+maxim@0.7` (the maxim counted, at 0.7), each also
 *   `+closed`. `step0+saying+maxim@0.7+closed` is production's setting,
 *   `productionUnitSettings`.
 *
 * The other levers (span, polish, alt, slots, fvg, trim) are retired;
 * ec467e8d keeps them. `--opt primary=<policy>` picks the headline policy.
 */

import * as Effect from "effect/Effect";
import type { SegmentInUnitsOutput } from "../../../evaluation/spec-corpus/segment-in-units.js";
import {
	articleHosts,
	assemble,
	full07,
	policyInput,
	type SayingAssembly,
	stepZeroInput,
	stepZeroMembership,
} from "../../../segment/de/assembly.js";
import { authoredInventory } from "../../../segment/de/inventory.js";
import { nominate } from "../../../segment/de/nomination.js";
import { groupKey, unitsOf } from "../../../segment/de/partition.js";
import {
	askRouteBatches,
	routeMembership,
	structuralRoute,
} from "../../../segment/de/routing.js";
import { type Arm, askOf } from "../arm.js";

const stepZeroPolicies: readonly (readonly [
	string,
	SayingAssembly | undefined,
])[] = [
	["step0", undefined],
	["step0+saying", { floor: 0.5, maxim: false }],
	["step0+saying+maxim@0.7", { floor: 0.7, maxim: true }],
];

export const candidates4Arm: Arm = {
	id: "candidates4",
	summary:
		"candidates v3 plus step 0, the Saying Choice and closed-class identity (final=1 closed=1); production's unit stage is its step0+saying+maxim@0.7+closed",
	async run(input, context) {
		const { primary, ...levers } = context.options;
		if (
			levers.final !== "1" ||
			levers.closed !== "1" ||
			Object.keys(levers).length !== 2
		)
			throw Error(
				"candidates4 runs only with --opt final=1 --opt closed=1; its other levers are retired (ec467e8d)",
			);
		const ask = askOf(context);
		const nomination = await Effect.runPromise(
			nominate(input, ask, authoredInventory),
		);
		const answers = await Effect.runPromise(
			askRouteBatches(nomination, ask),
		);
		const { sentence } = nomination;
		const outputs: Record<string, SegmentInUnitsOutput> = {};
		const base = policyInput(nomination, full07);
		const v3 = assemble(nomination, articleHosts(nomination), base);
		outputs.v3 = {
			units: unitsOf(
				sentence,
				v3.partition,
				structuralRoute(
					answers.routes.distributions,
					(group) =>
						answers.routes.identity.get(groupKey(group))?.choice ??
						"Unresolved",
					v3.familyOf,
				),
			),
		};
		const { input: zero, ranges } = stepZeroInput(nomination, base, 0.7);
		for (const [policy, saying] of stepZeroPolicies) {
			const routed = routeMembership(
				nomination,
				stepZeroMembership(nomination, zero, ranges, saying),
				answers,
			);
			outputs[policy] = {
				units: unitsOf(sentence, routed.partition, routed.openRoute),
			};
			outputs[`${policy}+closed`] = { units: routed.units() };
		}
		return {
			primary: primary ?? "step0+saying+maxim@0.7",
			outputs,
			routes: [...answers.routes.identity.values()],
			links: [],
		};
	},
};
