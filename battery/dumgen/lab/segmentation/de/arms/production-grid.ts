/**
 * X1's grid (`--opt grid=x1`): the Saying assembly at maxim@0.6, 0.7 and
 * 0.8 and the reference's whole + fragment at 0.4, under production's
 * floors (`prod+…`) and #762's (`762+…`: idiom 0.6, fixed 0.3), with step 0
 * and without it (`+nostep0`), each with closed-class identity and no code
 * rule, over the nomination without was … für. A group no batched route
 * request asked about routes `Unresolved`, unasked.
 */

import {
	type Floors,
	full07,
	type Membership,
	membershipOf,
	policyInput,
	type SayingAssembly,
	stepZeroMembership,
} from "../../../../src/segment/de/assembly.js";
import type { Nomination } from "../../../../src/segment/de/nomination.js";
import { productionUnitSettings } from "../../../../src/segment/de/units.js";
import type { Policies } from "./production-stage.js";

/** A membership setting: floors, the Saying assembly and whether step 0 runs. */
type Assembly = {
	readonly floors: Floors;
	readonly saying: SayingAssembly;
	readonly stepZero: boolean;
};

/** Production's floors with the idiom and fixedness floors #762 adopted for the reference. */
const floors762: Floors = {
	...productionUnitSettings.floors,
	idiom: 0.6,
	fixed: 0.3,
};

const sayingAssemblies: Readonly<Record<string, SayingAssembly>> = {
	"maxim@0.6": { floor: 0.6, maxim: true },
	"maxim@0.7": { floor: 0.7, maxim: true },
	"maxim@0.8": { floor: 0.8, maxim: true },
	"saying@0.4": { floor: 0.4, maxim: false },
};

/** Floors × Saying assembly × step 0, by policy name. */
const grid: Readonly<Record<string, Assembly>> = Object.fromEntries(
	(
		[
			["prod", productionUnitSettings.floors],
			["762", floors762],
		] as const
	).flatMap(([floorsName, floors]) =>
		Object.entries(sayingAssemblies).flatMap(([sayingName, saying]) =>
			[true, false].map((stepZero) => [
				`${floorsName}+${sayingName}${stepZero ? "" : "+nostep0"}`,
				{ floors, saying, stepZero },
			]),
		),
	),
);

/** Membership under an assembly; without step 0, candidates v3's links with the Saying Choice. */
function membershipUnder(
	nomination: Nomination,
	{ floors, saying, stepZero }: Assembly,
): Membership {
	if (stepZero) return membershipOf(nomination, floors, saying);
	if (floors.margin !== 0)
		throw Error("A satellite margin needs step 0's assembly");
	return stepZeroMembership(
		nomination,
		policyInput(nomination, {
			...full07,
			satellite: floors.satellite,
			idiom: floors.idiom,
			expression: floors.expression,
			fixed: floors.fixed,
		}),
		[],
		saying,
	);
}

export const gridPolicies: Policies = async (stage) => {
	const read = await stage.read([]);
	return Object.fromEntries(
		await Promise.all(
			Object.entries(grid).map(
				async ([name, assembly]) =>
					[
						name,
						await stage.units(
							read,
							membershipUnder(read.nomination, assembly),
							[],
							"unresolved",
						),
					] as const,
			),
		),
	);
};
